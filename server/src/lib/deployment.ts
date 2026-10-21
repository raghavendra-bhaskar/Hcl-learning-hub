import { spawn } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '../../..');
const DEPLOY_DIR = join(REPO_ROOT, 'deploy');
const BACKUPS_DIR = join(REPO_ROOT, 'backups');
const SCRIPTS_DIR = join(REPO_ROOT, 'scripts');
const PATCHES_DIR = join(REPO_ROOT, 'patches');
const RELEASES_DIR = join(REPO_ROOT, 'releases');
const LOGS_DIR = join(REPO_ROOT, 'logs');
const PATCHES_INDEX_FILE = join(PATCHES_DIR, 'index.json');
const CURRENT_RELEASE_FILE = join(RELEASES_DIR, 'current-release.env');
const PREVIOUS_RELEASE_FILE = join(RELEASES_DIR, 'previous-release.env');
const UPGRADE_SCRIPT = join(DEPLOY_DIR, 'upgrade.sh');
const ROLLBACK_SCRIPT = join(DEPLOY_DIR, 'rollback.sh');
const BASELINE_VERSION = '6';
const MANUAL_ADMIN_BACKUP_PATTERN = /^hcl-hub-manual-admin-v\d+-\d{8}-\d{6}\.dump$/i;

type RunResult = { stdout: string; stderr: string; code: number };

export type ReleaseInfo = {
  filePath: string;
  releaseTimestamp: string;
  productVersion: string;
  gitBranch: string;
  previousCommit: string;
  currentCommit: string;
  previousShortCommit: string;
  currentShortCommit: string;
  preSyncBackup: string;
  restoreSource: string;
  syncMode: string;
};

export type BackupInfo = {
  filePath: string;
  fileName: string;
  modifiedAt: string;
  sizeBytes: number;
};

type PatchIndexVersion = {
  version: string;
  displayVersion: string;
  defaultNextPatch: string;
  status: string;
  metadataFile: string;
};

type PatchMinorVersionRecord = {
  version: string;
  releaseFile: string;
  archiveFile: string;
  archiveSourceDirectory: string;
  archiveModifiedAt: string;
  notes: string[];
};

type PatchVersionRecord = PatchIndexVersion & {
  recordedReleaseMetadata: boolean;
  releaseMetadataSource: string;
  releaseFile: string;
  archiveFile: string;
  archiveSourceDirectory: string;
  archiveModifiedAt: string;
  minorVersions: PatchMinorVersionRecord[];
  notes: string[];
};

type PatchArchive = {
  product: string;
  purpose: string;
  currentVersion: string;
  nextUpgradeVersion: string;
  versions: PatchVersionRecord[];
};

type DeploymentVersionOption = {
  value: string;
  label: string;
  status: string;
  available: boolean;
  isMinor: boolean;
  notes: string[];
  releaseFilePath: string;
  archiveFilePath: string;
};

function run(command: string, args: string[], cwd = REPO_ROOT) {
  return new Promise<RunResult>((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, { cwd, env: process.env, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', chunk => { stdout += chunk.toString(); });
    child.stderr.on('data', chunk => { stderr += chunk.toString(); });
    child.on('error', rejectPromise);
    child.on('close', code => resolvePromise({ stdout: stdout.trim(), stderr: stderr.trim(), code: code ?? 0 }));
  });
}

function shellQuote(value: string) {
  return `'${String(value).replace(/'/g, `'"'"'`)}'`;
}

function parseEnvFile(filePath: string) {
  const values: Record<string, string> = {};
  if (!existsSync(filePath)) return values;
  const text = readFileSync(filePath, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue;
    const index = line.indexOf('=');
    if (index < 0) continue;
    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim();
    if (key) values[key] = value;
  }
  return values;
}

function readJsonFile<T>(filePath: string, fallbackValue: T) {
  try {
    if (!existsSync(filePath)) return fallbackValue;
    return JSON.parse(readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '')) as T;
  } catch {
    return fallbackValue;
  }
}

function getMajorVersion(version: string) {
  const value = String(version || '').trim();
  const numeric = Number.parseInt(value.split('.')[0] || '', 10);
  return Number.isFinite(numeric) ? numeric : null;
}

function isWholeMajorVersion(version: string) {
  return /^\d+$/.test(String(version || '').trim());
}

function formatVersionLabel(version: string) {
  return isWholeMajorVersion(version) ? `${version}.0` : version;
}

function compareVersions(a: string, b: string) {
  const aParts = String(a || '').split('.').map(part => Number.parseInt(part, 10));
  const bParts = String(b || '').split('.').map(part => Number.parseInt(part, 10));
  const maxLength = Math.max(aParts.length, bParts.length);
  for (let index = 0; index < maxLength; index += 1) {
    const aPart = Number.isFinite(aParts[index]) ? aParts[index] : 0;
    const bPart = Number.isFinite(bParts[index]) ? bParts[index] : 0;
    if (aPart !== bPart) return aPart - bPart;
  }
  return 0;
}

function sameVersion(a: string, b: string) {
  if (a === b) return true;
  if (isWholeMajorVersion(a) && formatVersionLabel(a) === b) return true;
  if (isWholeMajorVersion(b) && formatVersionLabel(b) === a) return true;
  return false;
}

function resolveRepoPath(filePath: string) {
  return filePath ? join(REPO_ROOT, filePath) : '';
}

function hasArchiveFile(filePath: string) {
  const resolvedPath = resolveRepoPath(filePath);
  return Boolean(resolvedPath && existsSync(resolvedPath));
}

function toReleaseArray(currentRelease: ReleaseInfo | null, previousRelease: ReleaseInfo | null) {
  const recorded = getReleaseFiles().map(filePath => readReleaseFile(filePath)).filter(Boolean) as ReleaseInfo[];
  const releases: ReleaseInfo[] = [];
  for (const release of [currentRelease, previousRelease, ...recorded]) {
    if (!release?.productVersion) continue;
    if (!releases.some(existing => existing.filePath === release.filePath || (existing.productVersion === release.productVersion && existing.currentCommit === release.currentCommit))) {
      releases.push(release);
    }
  }
  return releases.sort((left, right) => compareVersions(left.productVersion, right.productVersion));
}

function findReleaseByVersion(releases: ReleaseInfo[], version: string) {
  return releases.find(release => sameVersion(release.productVersion, version)) || null;
}

function readPatchArchive(): PatchArchive {
  const rawIndex = readJsonFile<{ product?: string; purpose?: string; currentVersion?: string; nextUpgradeVersion?: string; availableVersions?: PatchIndexVersion[] }>(PATCHES_INDEX_FILE, {});
  const versions = (rawIndex.availableVersions || []).map(entry => {
    const metadataPath = entry.metadataFile ? join(REPO_ROOT, entry.metadataFile) : '';
    const metadata = metadataPath
      ? readJsonFile<Partial<PatchVersionRecord>>(metadataPath, {})
      : {};
    return {
      version: metadata.version || entry.version,
      displayVersion: metadata.displayVersion || entry.displayVersion || entry.version,
      defaultNextPatch: metadata.defaultNextPatch || entry.defaultNextPatch || '',
      status: metadata.status || entry.status || '',
      metadataFile: entry.metadataFile || '',
      recordedReleaseMetadata: Boolean(metadata.recordedReleaseMetadata),
      releaseMetadataSource: metadata.releaseMetadataSource || '',
      releaseFile: metadata.releaseFile || '',
      archiveFile: typeof metadata.archiveFile === 'string' ? metadata.archiveFile : '',
      archiveSourceDirectory: typeof metadata.archiveSourceDirectory === 'string' ? metadata.archiveSourceDirectory : '',
      archiveModifiedAt: typeof metadata.archiveModifiedAt === 'string' ? metadata.archiveModifiedAt : '',
      minorVersions: Array.isArray(metadata.minorVersions)
        ? metadata.minorVersions
          .filter(record => record && typeof record.version === 'string')
          .map(record => ({
            version: record.version || '',
            releaseFile: typeof record.releaseFile === 'string' ? record.releaseFile : '',
            archiveFile: typeof record.archiveFile === 'string' ? record.archiveFile : '',
            archiveSourceDirectory: typeof record.archiveSourceDirectory === 'string' ? record.archiveSourceDirectory : '',
            archiveModifiedAt: typeof record.archiveModifiedAt === 'string' ? record.archiveModifiedAt : '',
            notes: Array.isArray(record.notes) ? record.notes.filter(note => typeof note === 'string') : [],
          }))
          .sort((left, right) => compareVersions(left.version, right.version))
        : [],
      notes: Array.isArray(metadata.notes) ? metadata.notes.filter(note => typeof note === 'string') : [],
    };
  }).sort((left, right) => compareVersions(left.version, right.version));
  return {
    product: rawIndex.product || 'HCL Learning Hub',
    purpose: rawIndex.purpose || '',
    currentVersion: rawIndex.currentVersion || BASELINE_VERSION,
    nextUpgradeVersion: rawIndex.nextUpgradeVersion || '',
    versions,
  };
}

function readReleaseFile(filePath: string): ReleaseInfo | null {
  if (!existsSync(filePath)) return null;
  const values = parseEnvFile(filePath);
  return {
    filePath,
    releaseTimestamp: values.RELEASE_TIMESTAMP || '',
    productVersion: values.PRODUCT_VERSION || '',
    gitBranch: values.GIT_BRANCH || '',
    previousCommit: values.PREVIOUS_COMMIT || '',
    currentCommit: values.CURRENT_COMMIT || '',
    previousShortCommit: values.PREVIOUS_SHORT_COMMIT || '',
    currentShortCommit: values.CURRENT_SHORT_COMMIT || '',
    preSyncBackup: values.PRE_SYNC_BACKUP || '',
    restoreSource: values.RESTORE_SOURCE || '',
    syncMode: values.SYNC_MODE || '',
  };
}

function getReleaseFiles() {
  if (!existsSync(RELEASES_DIR)) return [];
  return readdirSync(RELEASES_DIR)
    .filter(name => /^release-.*\.env$/i.test(name))
    .map(name => join(RELEASES_DIR, name))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
}

function toVersionParts(version: string) {
  return String(version || '').split('.').map(part => Number.parseInt(part, 10));
}

function incrementVersion(version: string) {
  const parts = toVersionParts(version);
  if (parts.length && parts.every(part => Number.isFinite(part))) {
    if (parts.length === 1) return `${parts[0]}.1`;
    const next = [...parts];
    next[next.length - 1] += 1;
    return next.join('.');
  }
  const numeric = Number.parseInt(String(version || '').trim(), 10);
  if (Number.isFinite(numeric)) return `${numeric}.1`;
  return version ? `${version}.1` : '6.1';
}

function statBackup(filePath: string): BackupInfo | null {
  if (!filePath || !existsSync(filePath)) return null;
  const stats = statSync(filePath);
  return {
    filePath,
    fileName: filePath.split(/[/\\]/).pop() || filePath,
    modifiedAt: stats.mtime.toISOString(),
    sizeBytes: stats.size,
  };
}

function getBackupPriority(filePath: string) {
  const fileName = filePath.split(/[/\\]/).pop() || '';
  // Prefer the newest manually captured admin dump so upgrades restore the same backup that was
  // explicitly taken for the VM before code changes, then fall back to latest.dump and other dumps.
  if (MANUAL_ADMIN_BACKUP_PATTERN.test(fileName)) return 3;
  if (fileName === 'latest.dump') return 2;
  return 1;
}

function listBackupCandidates() {
  const directories = [BACKUPS_DIR, SCRIPTS_DIR, join(REPO_ROOT, 'server', 'backups')].filter((directory, index, all) => all.indexOf(directory) === index);
  const files: string[] = [];
  for (const directory of directories) {
    if (!existsSync(directory)) continue;
    for (const name of readdirSync(directory)) {
      if (!name.endsWith('.dump')) continue;
      files.push(join(directory, name));
    }
  }
  return files.sort((a, b) => {
    const priorityDelta = getBackupPriority(b) - getBackupPriority(a);
    if (priorityDelta !== 0) return priorityDelta;
    return statSync(b).mtimeMs - statSync(a).mtimeMs;
  });
}

function findLatestBackup() {
  const backups = listBackupCandidates();
  return backups.length ? statBackup(backups[0]) : null;
}

function findVersionBackup(version: string) {
  const major = getMajorVersion(version);
  if (!major) return null;
  const pattern = new RegExp(`^hcl-hub-manual-admin-v${major}-\\d{8}-\\d{6}\\.dump$`, 'i');
  const match = listBackupCandidates().find(filePath => pattern.test(filePath.split(/[/\\]/).pop() || ''));
  return match ? statBackup(match) : null;
}

function buildUpgradeOptions(currentVersion: string, patchArchive: PatchArchive): DeploymentVersionOption[] {
  const options: DeploymentVersionOption[] = [];
  const currentMajor = getMajorVersion(currentVersion || '');
  const approvedCurrentVersion = patchArchive.currentVersion || BASELINE_VERSION;
  const approvedCurrentMajor = getMajorVersion(approvedCurrentVersion);
  const approvedCurrentRecord = patchArchive.versions.find(version => sameVersion(version.version, approvedCurrentVersion)) || null;
  if (currentMajor !== null && approvedCurrentMajor !== null && currentMajor < approvedCurrentMajor) {
    options.push({
      value: approvedCurrentVersion,
      label: approvedCurrentVersion,
      status: approvedCurrentRecord?.status || 'current',
      available: true,
      isMinor: false,
      notes: approvedCurrentRecord?.notes?.length ? approvedCurrentRecord.notes : [`Promotes this VM to the approved current major version ${approvedCurrentVersion}.`],
      releaseFilePath: approvedCurrentRecord?.releaseFile || '',
      archiveFilePath: approvedCurrentRecord?.archiveFile || '',
    });
    return options;
  }
  const nextMinorVersion = incrementVersion(currentVersion || patchArchive.currentVersion || BASELINE_VERSION);
  options.push({
    value: nextMinorVersion,
    label: nextMinorVersion,
    status: 'minor-upgrade',
    available: true,
    isMinor: true,
    notes: [`Tracks the next change on the current major version ${getMajorVersion(currentVersion) ?? currentVersion}.`],
    releaseFilePath: '',
    archiveFilePath: '',
  });
  const nextMajorVersion = patchArchive.nextUpgradeVersion;
  const nextMajorRecord = patchArchive.versions.find(version => version.version === nextMajorVersion);
  if (nextMajorVersion && compareVersions(nextMajorVersion, currentVersion) > 0 && !options.some(option => sameVersion(option.value, nextMajorVersion))) {
    options.push({
      value: nextMajorVersion,
      label: nextMajorVersion,
      status: nextMajorRecord?.status || 'next-upgrade',
      available: true,
      isMinor: false,
      notes: nextMajorRecord?.notes || [],
      releaseFilePath: nextMajorRecord?.releaseFile || '',
      archiveFilePath: nextMajorRecord?.archiveFile || '',
    });
  }
  return options;
}

function findPatchVersionRecord(patchArchive: PatchArchive, version: string) {
  const major = getMajorVersion(version);
  if (!major) return null;
  return patchArchive.versions.find(record => getMajorVersion(record.version) === major) || null;
}

function findPatchMinorRecord(patchArchive: PatchArchive, version: string) {
  const versionRecord = findPatchVersionRecord(patchArchive, version);
  if (!versionRecord) return null;
  return versionRecord.minorVersions.find(record => sameVersion(record.version, version)) || null;
}

function buildRollbackOptions(currentVersion: string, patchArchive: PatchArchive, releases: ReleaseInfo[]) {
  const currentMajor = getMajorVersion(currentVersion);
  if (!currentMajor) return [] as DeploymentVersionOption[];
  const options: DeploymentVersionOption[] = [];
  const currentMajorRecord = patchArchive.versions.find(version => getMajorVersion(version.version) === currentMajor) || null;
  const olderMajors = patchArchive.versions.filter(version => {
    const major = getMajorVersion(version.version);
    return major !== null && major < currentMajor;
  });
  for (const version of olderMajors) {
    const release = findReleaseByVersion(releases, version.version);
    const archiveAvailable = hasArchiveFile(version.archiveFile);
    options.push({
      value: release?.productVersion || version.version,
      label: version.version,
      status: version.status,
      available: Boolean(release || archiveAvailable),
      isMinor: false,
      notes: version.notes,
      releaseFilePath: release?.filePath || version.releaseFile || '',
      archiveFilePath: archiveAvailable ? resolveRepoPath(version.archiveFile) : '',
    });
  }
  const currentMajorHistory = [
    ...(currentMajorRecord?.minorVersions || []).map(record => record.version),
    ...releases.filter(release => getMajorVersion(release.productVersion) === currentMajor).map(release => release.productVersion),
  ]
    .filter((value, index, all) => value && all.findIndex(candidate => sameVersion(candidate, value)) === index)
    .sort(compareVersions);
  for (const version of currentMajorHistory) {
    const isActiveCurrentVersion = version === currentVersion || (!isWholeMajorVersion(currentVersion) && sameVersion(version, currentVersion));
    if (isActiveCurrentVersion) continue;
    const release = findReleaseByVersion(releases, version);
    const archiveMinor = currentMajorRecord?.minorVersions.find(record => sameVersion(record.version, version)) || null;
    const archiveAvailable = hasArchiveFile(archiveMinor?.archiveFile || '');
    options.push({
      value: release?.productVersion || version,
      label: formatVersionLabel(version),
      status: 'minor-history',
      available: Boolean(release || archiveAvailable),
      isMinor: true,
      notes: archiveMinor?.notes?.length ? archiveMinor.notes : release ? [`Recorded deployment for version ${formatVersionLabel(release.productVersion)}.`] : [],
      releaseFilePath: release?.filePath || archiveMinor?.releaseFile || '',
      archiveFilePath: archiveAvailable ? resolveRepoPath(archiveMinor?.archiveFile || '') : '',
    });
  }
  return options;
}

async function getGitSummary() {
  try {
    const branchResult = await run('git', ['rev-parse', '--abbrev-ref', 'HEAD']);
    const branch = branchResult.stdout || 'main';
    const currentCommitResult = await run('git', ['rev-parse', 'HEAD']);
    const currentShortResult = await run('git', ['rev-parse', '--short', 'HEAD']);
    await run('git', ['fetch', 'origin', branch]);
    const remoteCommitResult = await run('git', ['rev-parse', `origin/${branch}`]);
    const remoteShortResult = await run('git', ['rev-parse', '--short', `origin/${branch}`]);
    const countsResult = await run('git', ['rev-list', '--left-right', '--count', `HEAD...origin/${branch}`]);
    const [localAheadRaw, remoteAheadRaw] = countsResult.stdout.split(/\s+/);
    const incomingResult = await run('git', ['log', '--oneline', '--max-count', '12', `HEAD..origin/${branch}`]);
    const outgoingResult = await run('git', ['log', '--oneline', '--max-count', '12', `origin/${branch}..HEAD`]);
    return {
      branch,
      currentCommit: currentCommitResult.stdout,
      currentShortCommit: currentShortResult.stdout,
      remoteCommit: remoteCommitResult.stdout,
      remoteShortCommit: remoteShortResult.stdout,
      localAhead: Number.parseInt(localAheadRaw || '0', 10) || 0,
      remoteAhead: Number.parseInt(remoteAheadRaw || '0', 10) || 0,
      incomingCommits: incomingResult.stdout ? incomingResult.stdout.split(/\r?\n/).filter(Boolean) : [],
      outgoingCommits: outgoingResult.stdout ? outgoingResult.stdout.split(/\r?\n/).filter(Boolean) : [],
      error: '',
    };
  } catch (error) {
    return {
      branch: '',
      currentCommit: '',
      currentShortCommit: '',
      remoteCommit: '',
      remoteShortCommit: '',
      localAhead: 0,
      remoteAhead: 0,
      incomingCommits: [] as string[],
      outgoingCommits: [] as string[],
      error: error instanceof Error ? error.message : 'Git metadata unavailable',
    };
  }
}

async function getCommitRange(fromCommit: string, toCommit: string) {
  if (!fromCommit || !toCommit) return [];
  try {
    const result = await run('git', ['log', '--oneline', '--max-count', '20', `${fromCommit}..${toCommit}`]);
    return result.stdout ? result.stdout.split(/\r?\n/).filter(Boolean) : [];
  } catch {
    return [];
  }
}

export function getDeploymentStatus(fallbackVersion = BASELINE_VERSION) {
  const patchArchive = readPatchArchive();
  const currentRelease = readReleaseFile(CURRENT_RELEASE_FILE);
  const previousRelease = readReleaseFile(PREVIOUS_RELEASE_FILE);
  const releases = toReleaseArray(currentRelease, previousRelease);
  const latestBackup = findLatestBackup();
  const currentVersion = currentRelease?.productVersion || patchArchive.currentVersion || fallbackVersion;
  const upgradeOptions = buildUpgradeOptions(currentVersion, patchArchive);
  const rollbackOptions = buildRollbackOptions(currentVersion, patchArchive, releases);
  return {
    currentVersion,
    suggestedVersion: incrementVersion(currentVersion),
    nextUpgradeVersion: patchArchive.nextUpgradeVersion || '',
    currentRelease,
    previousRelease,
    patchArchive,
    releases,
    upgradeOptions,
    rollbackOptions,
    latestBackup,
    scripts: {
      upgrade: existsSync(UPGRADE_SCRIPT),
      rollback: existsSync(ROLLBACK_SCRIPT),
    },
    paths: {
      repoRoot: REPO_ROOT,
      deployDir: DEPLOY_DIR,
      backupsDir: BACKUPS_DIR,
      releasesDir: RELEASES_DIR,
    },
  };
}

export async function getUpgradePreview(fallbackVersion = BASELINE_VERSION) {
  const status = getDeploymentStatus(fallbackVersion);
  const git = await getGitSummary();
  const latestBackup = status.latestBackup;
  const currentBackup = statBackup(status.currentRelease?.preSyncBackup || '');
  const hasNewerBackup = Boolean(latestBackup && (!currentBackup || latestBackup.filePath !== currentBackup.filePath));
  const selectedUpgrade = status.upgradeOptions[0] || null;
  return {
    ...status,
    git,
    currentBackup,
    hasCodeUpdates: git.remoteAhead > 0,
    hasNewerBackup,
    upgradeSummary: {
      targetVersion: selectedUpgrade?.value || status.suggestedVersion,
      incomingCommits: git.incomingCommits,
      releaseNotes: selectedUpgrade?.notes || [],
      latestBackup: latestBackup?.fileName || '',
      currentReleaseBackup: currentBackup?.fileName || '',
    },
  };
}

export async function getRollbackPreview(targetVersion: string | undefined, fallbackVersion = BASELINE_VERSION) {
  const status = getDeploymentStatus(fallbackVersion);
  const requestedOption = targetVersion
    ? status.rollbackOptions.find(option => sameVersion(option.value, targetVersion) || option.label === targetVersion) || null
    : status.rollbackOptions.find(option => option.available) || null;
  if (requestedOption && !requestedOption.available) throw new Error(`Rollback version is not available on this VM: ${requestedOption.label}`);
  const selectedVersion = requestedOption?.value || targetVersion || status.previousRelease?.productVersion || '';
  const targetRelease = findReleaseByVersion(
    status.releases,
    selectedVersion,
  ) || (targetVersion ? null : status.previousRelease);
  const targetMinorRecord = findPatchMinorRecord(status.patchArchive, selectedVersion);
  const targetVersionRecord = findPatchVersionRecord(status.patchArchive, selectedVersion);
  const targetArchivePath = requestedOption?.archiveFilePath || resolveRepoPath(targetMinorRecord?.archiveFile || targetVersionRecord?.archiveFile || '');
  if (!targetRelease && !targetArchivePath) throw new Error(targetVersion ? `Release version not found: ${targetVersion}` : 'No previous release available for rollback.');
  const commitsToRemove = targetRelease ? await getCommitRange(targetRelease.currentCommit, status.currentRelease?.currentCommit || '') : [];
  const latestBackup = status.latestBackup;
  const restoreBackup = findVersionBackup(selectedVersion) || statBackup(status.currentRelease?.preSyncBackup || '') || latestBackup;
  return {
    ...status,
    targetRelease,
    targetArchive: targetArchivePath ? {
      filePath: targetArchivePath,
      sourceDirectory: targetMinorRecord?.archiveSourceDirectory || targetVersionRecord?.archiveSourceDirectory || '',
      modifiedAt: targetMinorRecord?.archiveModifiedAt || targetVersionRecord?.archiveModifiedAt || '',
    } : null,
    restoreBackup,
    rollbackSummary: {
      targetVersion: targetRelease?.productVersion || requestedOption?.label || selectedVersion || fallbackVersion,
      targetCommit: targetRelease?.currentShortCommit || targetRelease?.currentCommit || '',
      commitsToRemove,
      releaseNotes: requestedOption?.notes || [],
      archiveFile: targetArchivePath || '',
      restoreBackup: restoreBackup?.fileName || '',
    },
  };
}

function ensureRunnableScript(scriptPath: string) {
  if (!existsSync(scriptPath)) throw new Error(`Deployment script not found: ${scriptPath}`);
  if (process.platform === 'win32') throw new Error('Deployment actions can only be started from the Linux VM runtime. Use the preview here, then run the script on the VM.');
  try {
    chmodSync(scriptPath, 0o755);
  } catch {
    // The VM upgrade path already retries permission normalization inside sync.sh, so a chmod
    // failure here should not block preview-driven upgrades unless the script is missing.
  }
}

function resolveApprovedUpgradeVersion(versionLabel: string) {
  const status = getDeploymentStatus();
  const requested = String(versionLabel || '').trim();
  const selected = status.upgradeOptions.find(option => sameVersion(option.value, requested) || option.label === requested) || null;
  if (!selected) throw new Error(`Upgrade version is not approved: ${versionLabel}`);
  return selected.value;
}

function resolveApprovedRollbackVersion(targetVersion: string) {
  const status = getDeploymentStatus();
  const requested = String(targetVersion || '').trim();
  const selected = status.rollbackOptions.find(option => sameVersion(option.value, requested) || option.label === requested) || null;
  if (!selected) throw new Error(`Rollback version is not approved: ${targetVersion}`);
  if (!selected.available) throw new Error(`Rollback version is not available on this VM: ${selected.label}`);
  return selected.value;
}

function timestamp() {
  return new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
}

export function startUpgrade(versionLabel: string) {
  ensureRunnableScript(UPGRADE_SCRIPT);
  const approvedVersion = resolveApprovedUpgradeVersion(versionLabel);
  mkdirSync(LOGS_DIR, { recursive: true });
  const logFile = join(LOGS_DIR, `upgrade-${timestamp()}.log`);
  const latestBackup = findLatestBackup();
  const restoreArg = latestBackup ? ` --restore ${shellQuote(latestBackup.filePath)}` : '';
  const child = spawn('bash', ['-lc', `sleep 2; bash ${shellQuote(UPGRADE_SCRIPT)} --version ${shellQuote(approvedVersion)}${restoreArg} > ${shellQuote(logFile)} 2>&1`], {
    cwd: REPO_ROOT,
    detached: true,
    stdio: 'ignore',
    env: process.env,
  });
  child.unref();
  return { started: true, action: 'upgrade', versionLabel: approvedVersion, logFile, restoreBackup: latestBackup?.fileName || '' };
}

export function startRollback(targetVersion: string) {
  ensureRunnableScript(ROLLBACK_SCRIPT);
  const approvedVersion = resolveApprovedRollbackVersion(targetVersion);
  mkdirSync(LOGS_DIR, { recursive: true });
  const logFile = join(LOGS_DIR, `rollback-${timestamp()}.log`);
  const child = spawn('bash', ['-lc', `sleep 2; bash ${shellQuote(ROLLBACK_SCRIPT)} --to-version ${shellQuote(approvedVersion)} --yes > ${shellQuote(logFile)} 2>&1`], {
    cwd: REPO_ROOT,
    detached: true,
    stdio: 'ignore',
    env: process.env,
  });
  child.unref();
  return { started: true, action: 'rollback', targetVersion: approvedVersion, logFile };
}
