import '../server/src/load-env.ts';
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDatabaseBackup } from '../server/src/lib/dbBackup.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const scriptsDir = join(repoRoot, 'scripts');
const backupsDir = join(repoRoot, 'backups');
const installBaselinePath = join(scriptsDir, 'backup.dump');
const latestPointerPath = join(backupsDir, 'latest.dump');

async function main() {
  if (!existsSync(scriptsDir)) mkdirSync(scriptsDir, { recursive: true });
  if (!existsSync(backupsDir)) mkdirSync(backupsDir, { recursive: true });

  // Capture a fresh custom-format dump from the current development database.
  // This reuses the same pg_dump discovery logic as the admin backup endpoint,
  // so Windows/Linux PostgreSQL client resolution stays consistent.
  const backup = await createDatabaseBackup({ label: 'manual-admin' });

  // Promote the newly captured dump into the repository baseline used by fresh
  // installs, offline bundles, and any workflow that still expects backup.dump.
  copyFileSync(backup.filePath, installBaselinePath);
  copyFileSync(backup.filePath, latestPointerPath);

  console.log('[dump] fresh development dump captured');
  console.log(`[dump] versioned backup : ${backup.filePath}`);
  console.log(`[dump] install baseline : ${installBaselinePath}`);
  console.log(`[dump] latest pointer   : ${latestPointerPath}`);
}

main().catch((error) => {
  console.error('[dump] failed to refresh install dump:', error instanceof Error ? error.message : error);
  process.exit(1);
});
