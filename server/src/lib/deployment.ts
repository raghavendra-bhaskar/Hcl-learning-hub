import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '../../..');
const DEPLOY_DIR = join(REPO_ROOT, 'deploy');
const BACKUPS_DIR = join(REPO_ROOT, 'backups');
const SCRIPTS_DIR = join(REPO_ROOT, 'scripts');
const RELEASES_DIR = join(REPO_ROOT, 'releases');
const LOGS_DIR = join(REPO_ROOT, 'logs');
const CURRENT_RELEASE_FILE = join(RELEASES_DIR, 'current-release.env');
const PREVIOUS_RELEASE_FILE = join(RELEASES_DIR, 'previous-release.env');
const UPGRADE_SCRIPT = join(DEPLOY_DIR, 'upgrade.sh');
const ROLLBACK_SCRIPT = join(DEPLOY_DIR, 'rollback.sh');

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
    const next = [...parts];
    next[next.length - 1] += 1;
    return next.join('.');
  }
  const numeric = Number.parseInt(String(version || '').trim(), 10);
  if (Number.isFinite(numeric)) return String(numeric + 1);
  return version ? `${version}-next` : '3';
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
  return files.sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
}

function findLatestBackup() {
  const latestPointer = join(BACKUPS_DIR, 'latest.dump');
  const pointerInfo = statBackup(latestPointer);
  if (pointerInfo) return pointerInfo;
  const backups = listBackupCandidates();
  return backups.length ? statBackup(backups[0]) : null;
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

export function getDeploymentStatus(fallbackVersion = '2') {
  const currentRelease = readReleaseFile(CURRENT_RELEASE_FILE);
  const previousRelease = readReleaseFile(PREVIOUS_RELEASE_FILE);
  const releases = getReleaseFiles().map(filePath => readReleaseFile(filePath)).filter(Boolean) as ReleaseInfo[];
  const latestBackup = findLatestBackup();
  const currentVersion = currentRelease?.productVersion || fallbackVersion;
  return {
    currentVersion,
    suggestedVersion: incrementVersion(currentVersion),
    currentRelease,
    previousRelease,
    releases,
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

export async function getUpgradePreview(fallbackVersion = '2') {
  const status = getDeploymentStatus(fallbackVersion);
  const git = await getGitSummary();
  const latestBackup = status.latestBackup;
  const currentBackup = statBackup(status.currentRelease?.preSyncBackup || '');
  const hasNewerBackup = Boolean(latestBackup && (!currentBackup || latestBackup.filePath !== currentBackup.filePath));
  return {
    ...status,
    git,
    currentBackup,
    hasCodeUpdates: git.remoteAhead > 0,
    hasNewerBackup,
    upgradeSummary: {
      targetVersion: status.suggestedVersion,
      incomingCommits: git.incomingCommits,
      latestBackup: latestBackup?.fileName || '',
      currentReleaseBackup: currentBackup?.fileName || '',
    },
  };
}

export async function getRollbackPreview(targetVersion: string | undefined, fallbackVersion = '2') {
  const status = getDeploymentStatus(fallbackVersion);
  const targetRelease = targetVersion
    ? status.releases.find(release => release.productVersion === targetVersion) || null
    : status.previousRelease;
  if (!targetRelease) throw new Error(targetVersion ? `Release version not found: ${targetVersion}` : 'No previous release available for rollback.');
  const commitsToRemove = await getCommitRange(targetRelease.currentCommit, status.currentRelease?.currentCommit || '');
  const latestBackup = status.latestBackup;
  const restoreBackup = statBackup(status.currentRelease?.preSyncBackup || '') || latestBackup;
  return {
    ...status,
    targetRelease,
    restoreBackup,
    rollbackSummary: {
      targetVersion: targetRelease.productVersion || fallbackVersion,
      targetCommit: targetRelease.currentShortCommit || targetRelease.currentCommit,
      commitsToRemove,
      restoreBackup: restoreBackup?.fileName || '',
    },
  };
}

function ensureRunnableScript(scriptPath: string) {
  if (!existsSync(scriptPath)) throw new Error(`Deployment script not found: ${scriptPath}`);
  if (process.platform === 'win32') throw new Error('Deployment actions can only be started from the Linux VM runtime. Use the preview here, then run the script on the VM.');
}

function timestamp() {
  return new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
}

export function startUpgrade(versionLabel: string) {
  ensureRunnableScript(UPGRADE_SCRIPT);
  mkdirSync(LOGS_DIR, { recursive: true });
  const logFile = join(LOGS_DIR, `upgrade-${timestamp()}.log`);
  const latestBackup = findLatestBackup();
  const restoreArg = latestBackup ? ` --restore ${shellQuote('latest')}` : '';
  const child = spawn('bash', ['-lc', `bash ${shellQuote(UPGRADE_SCRIPT)} --version ${shellQuote(versionLabel)}${restoreArg} > ${shellQuote(logFile)} 2>&1`], {
    cwd: REPO_ROOT,
    detached: true,
    stdio: 'ignore',
    env: process.env,
  });
  child.unref();
  return { started: true, action: 'upgrade', versionLabel, logFile, restoreBackup: latestBackup?.fileName || '' };
}

export function startRollback(targetVersion: string) {
  ensureRunnableScript(ROLLBACK_SCRIPT);
  mkdirSync(LOGS_DIR, { recursive: true });
  const logFile = join(LOGS_DIR, `rollback-${timestamp()}.log`);
  const child = spawn('bash', ['-lc', `bash ${shellQuote(ROLLBACK_SCRIPT)} --to-version ${shellQuote(targetVersion)} --yes > ${shellQuote(logFile)} 2>&1`], {
    cwd: REPO_ROOT,
    detached: true,
    stdio: 'ignore',
    env: process.env,
  });
  child.unref();
  return { started: true, action: 'rollback', targetVersion, logFile };
}
