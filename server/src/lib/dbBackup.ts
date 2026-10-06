import { spawn } from 'node:child_process';
import { copyFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'node:fs';
import { delimiter, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SERVER_ROOT = resolve(__dirname, '../..');
const REPO_ROOT = resolve(SERVER_ROOT, '..');
const REPO_BACKUP_DIR = join(REPO_ROOT, 'backups');
const SCRIPTS_BACKUP_DIR = join(REPO_ROOT, 'scripts');
const LEGACY_BACKUP_DIR = join(SERVER_ROOT, 'backups');

export type DatabaseConnectionInfo = {
  host: string;
  port: string;
  user: string;
  password: string;
  database: string;
};

export type DatabaseBackupResult = {
  filePath: string;
  fileName: string;
  sizeBytes: number;
  createdAt: string;
  label: string;
};

function sanitizeLabel(label: string) {
  return (label || 'manual')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'manual';
}

function timestampForFile(date = new Date()) {
  const yyyy = String(date.getFullYear());
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${yyyy}${mm}${dd}-${hh}${mi}${ss}`;
}

function run(command: string, args: string[], env: NodeJS.ProcessEnv) {
  return new Promise<void>((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, { env, stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', chunk => { stderr += chunk.toString(); });
    child.on('error', err => {
      const message = (err as NodeJS.ErrnoException)?.code === 'ENOENT'
        ? `Backup tool not found: ${command}. Install PostgreSQL client tools or set PG_DUMP_PATH.`
        : err.message;
      rejectPromise(new Error(message));
    });
    child.on('close', code => {
      if (code === 0) return resolvePromise();
      rejectPromise(new Error(stderr.trim() || `${command} exited with code ${code}`));
    });
  });
}

function findExecutableOnPath(fileName: string) {
  const pathEntries = String(process.env.PATH || '')
    .split(delimiter)
    .map(entry => entry.trim())
    .filter(Boolean);
  for (const entry of pathEntries) {
    const candidate = join(entry, fileName);
    if (existsSync(candidate)) return candidate;
  }
  return '';
}

function findNewestLinuxPgExecutable(fileName: string) {
  const candidates: Array<{ version: number; filePath: string }> = [];
  const configuredBin = process.env.PG_BIN?.trim();

  if (configuredBin) {
    const configuredCandidate = join(configuredBin, fileName);
    if (existsSync(configuredCandidate)) return configuredCandidate;
  }

  if (existsSync('/usr')) {
    readdirSync('/usr')
      .map(name => ({ name, version: Number.parseInt(name.replace(/^pgsql-/, ''), 10) || 0 }))
      .filter(entry => entry.version > 0)
      .forEach(entry => {
        candidates.push({ version: entry.version, filePath: join('/usr', entry.name, 'bin', fileName) });
      });
  }

  if (existsSync('/usr/lib/postgresql')) {
    readdirSync('/usr/lib/postgresql')
      .map(name => ({ name, version: Number.parseInt(name, 10) || 0 }))
      .filter(entry => entry.version > 0)
      .forEach(entry => {
        candidates.push({ version: entry.version, filePath: join('/usr/lib/postgresql', entry.name, 'bin', fileName) });
      });
  }

  const match = candidates
    .filter(candidate => existsSync(candidate.filePath))
    .sort((a, b) => b.version - a.version)[0];

  return match?.filePath || '';
}

function getDefaultBackupDirectory() {
  const configured = process.env.BACKUP_DIR?.trim();
  if (configured) return configured;
  if (existsSync(SCRIPTS_BACKUP_DIR)) return SCRIPTS_BACKUP_DIR;
  if (existsSync(REPO_BACKUP_DIR)) return REPO_BACKUP_DIR;
  return SCRIPTS_BACKUP_DIR;
}

function getPgDumpCommand() {
  const configured = process.env.PG_DUMP_PATH?.trim();
  if (configured && existsSync(configured)) return configured;
  if (configured) return configured;

  if (process.platform !== 'win32') {
    const preferredLinuxClient = findNewestLinuxPgExecutable('pg_dump');
    if (preferredLinuxClient) return preferredLinuxClient;
  }

  const fromPath = findExecutableOnPath(process.platform === 'win32' ? 'pg_dump.exe' : 'pg_dump');
  if (fromPath) return fromPath;

  const candidates = process.platform === 'win32'
    ? [
      'C:/Program Files/PostgreSQL/18/bin/pg_dump.exe',
      'C:/Program Files/PostgreSQL/17/bin/pg_dump.exe',
      'C:/Program Files/PostgreSQL/16/bin/pg_dump.exe',
      'C:/Program Files/PostgreSQL/15/bin/pg_dump.exe',
      'C:/Program Files/PostgreSQL/14/bin/pg_dump.exe',
      'C:/Program Files/PostgreSQL/13/bin/pg_dump.exe',
    ]
    : ['pg_dump'];

  if (process.platform === 'win32') {
    const postgresRoot = 'C:/Program Files/PostgreSQL';
    if (existsSync(postgresRoot)) {
      const versionedCandidates = readdirSync(postgresRoot)
        .map(name => ({ name, numeric: Number.parseInt(name, 10) || 0 }))
        .sort((a, b) => b.numeric - a.numeric)
        .map(entry => join(postgresRoot, entry.name, 'bin', 'pg_dump.exe'));
      candidates.unshift(...versionedCandidates);
    }
  }

  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }

  return process.platform === 'win32' ? 'pg_dump.exe' : 'pg_dump';
}

export function parseDatabaseUrl(databaseUrl = process.env.DATABASE_URL || ''): DatabaseConnectionInfo {
  if (!databaseUrl) throw new Error('DATABASE_URL is not configured');
  const parsed = new URL(databaseUrl);
  return {
    host: parsed.hostname || '127.0.0.1',
    port: parsed.port || '5432',
    user: decodeURIComponent(parsed.username || ''),
    password: decodeURIComponent(parsed.password || ''),
    database: decodeURIComponent(parsed.pathname.replace(/^\//, '') || ''),
  };
}

export function buildDatabaseUrl(connection: DatabaseConnectionInfo, database: string) {
  const parsed = new URL('postgresql://localhost');
  parsed.username = encodeURIComponent(connection.user);
  parsed.password = encodeURIComponent(connection.password);
  parsed.hostname = connection.host;
  parsed.port = connection.port;
  parsed.pathname = `/${database}`;
  return parsed.toString();
}

export function getBackupDirectory(directory = getDefaultBackupDirectory()) {
  if (!existsSync(directory)) mkdirSync(directory, { recursive: true });
  return directory;
}

export function getVersionedBackupPath(label: string, directory = getDefaultBackupDirectory()) {
  const safeLabel = sanitizeLabel(label);
  const dir = getBackupDirectory(directory);
  const prefix = `hcl-hub-${safeLabel}-v`;
  const existingVersions = existsSync(dir)
    ? readdirSync(dir)
      .map(name => {
        const match = name.match(new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\d+)`));
        return match ? Number.parseInt(match[1], 10) || 0 : 0;
      })
      .filter(version => version > 0)
    : [];
  const nextVersion = (existingVersions.length ? Math.max(...existingVersions) : 0) + 1;
  return join(dir, `hcl-hub-${safeLabel}-v${nextVersion}-${timestampForFile()}.dump`);
}

function updateLatestBackupPointer(filePath: string) {
  const latestPointer = join(getBackupDirectory(REPO_BACKUP_DIR), 'latest.dump');
  copyFileSync(filePath, latestPointer);
  return latestPointer;
}

export async function createDatabaseBackup(options?: { label?: string; directory?: string }) {
  const label = sanitizeLabel(options?.label || 'manual');
  const filePath = getVersionedBackupPath(label, options?.directory || getDefaultBackupDirectory());
  const fileName = filePath.split(/[/\\]/).pop() || filePath;
  const connection = parseDatabaseUrl();
  const pgDumpCommand = getPgDumpCommand();
  const env = { ...process.env, PGPASSWORD: connection.password };
  const args = [
    '-h', connection.host,
    '-p', connection.port,
    '-U', connection.user,
    '-d', connection.database,
    '--format=custom',
    '--no-owner',
    '--no-acl',
    '-f', filePath,
  ];

  await run(pgDumpCommand, args, env);
  updateLatestBackupPointer(filePath);

  const stats = statSync(filePath);
  return {
    filePath,
    fileName,
    sizeBytes: stats.size,
    createdAt: new Date().toISOString(),
    label,
  } satisfies DatabaseBackupResult;
}
