#!/bin/bash
# ============================================================
# HCL Software Learning Hub — Sync (source deployment)
#
# Run this after any further development to bring the VM up to date:
#
#   1. Back up the CURRENT database (safety net, always taken first)
#   2. Stop the Hub
#   3. Pull the latest code from git
#   4. Reinstall dependencies for both workspaces
#   5. Regenerate the Prisma client and apply new migrations
#   6. Optionally restore a dump (--restore <file>)
#   7. Start the Hub again
#
# Usage:
#   bash deploy/sync.sh
#   bash deploy/sync.sh --code-only       # pull code, refresh deps, regenerate Prisma, restart
#   bash deploy/sync.sh --restore backups/hcl-hub-20260928-120000.dump
#   bash deploy/sync.sh --version 1.0.1   # tag this sync with a product version label
#   bash deploy/sync.sh --no-restart      # leave the Hub stopped
#   bash deploy/sync.sh --backup-only     # just take a dump and exit
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PATCHES_DIR="$INSTALL_DIR/patches"
PATCH_INDEX_FILE="$PATCHES_DIR/index.json"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; CYAN='\033[0;36m'; NC='\033[0m'
ok()     { echo -e "${GREEN}[ OK ]${NC} $*"; }
warn()   { echo -e "${YELLOW}[WARN]${NC} $*"; }
fail()   { echo -e "${RED}[FAIL]${NC} $*" >&2; exit 1; }
info()   { echo -e "  ${CYAN}->${NC} $*"; }
banner() { echo ""; echo "========================================"; echo "  $1"; echo "========================================"; }
MANUAL_ADMIN_DUMP_GLOB='hcl-hub-manual-admin-v*.dump'

ensure_execute_permissions() {
  local script=""
  for script in "$SCRIPT_DIR"/*.sh; do
    [ -f "$script" ] || continue
    chmod 755 "$script" 2>/dev/null || true
  done
}

normalize_permissions() {
  chmod -R u+rwX,go+rX "$INSTALL_DIR" 2>/dev/null || true
  ensure_execute_permissions
}

cleanup_release_pull_state() {
  [ -n "${RELEASE_PULL_STATE_DIR:-}" ] || return 0
  [ -d "$RELEASE_PULL_STATE_DIR" ] || return 0
  local staged_file=""
  local relative_path=""
  local target_path=""
  while IFS= read -r -d '' staged_file; do
    relative_path="${staged_file#"$RELEASE_PULL_STATE_DIR"/}"
    target_path="$INSTALL_DIR/$relative_path"
    mkdir -p "$(dirname "$target_path")"
    if [ "${RELEASE_STATE_RECORDED:-false}" = true ]; then
      [ -e "$target_path" ] || mv "$staged_file" "$target_path"
    else
      mv -f "$staged_file" "$target_path"
    fi
  done < <(find "$RELEASE_PULL_STATE_DIR" -type f -print0 2>/dev/null)
  rm -rf "$RELEASE_PULL_STATE_DIR"
  RELEASE_PULL_STATE_DIR=""
}

prepare_release_files_for_pull() {
  [ -d "$RELEASES_DIR" ] || return 0
  RELEASE_PULL_STATE_DIR="${RELEASE_PULL_STATE_DIR:-$(mktemp -d)}"
  local release_file=""
  local relative_path=""
  local staged_path=""
  while IFS= read -r -d '' release_file; do
    relative_path="${release_file#"$INSTALL_DIR"/}"
    if git ls-files --error-unmatch "$relative_path" >/dev/null 2>&1; then
      continue
    fi
    staged_path="$RELEASE_PULL_STATE_DIR/$relative_path"
    mkdir -p "$(dirname "$staged_path")"
    cp -f "$release_file" "$staged_path"
    rm -f "$release_file"
    info "Temporarily moved untracked runtime file: $relative_path"
  done < <(find "$RELEASES_DIR" -maxdepth 1 -type f -name '*.env' -print0 2>/dev/null)
}

finalize_sync_exit() {
  local exit_code="$1"
  cleanup_release_pull_state
  [ -n "${ASKPASS:-}" ] && rm -f "$ASKPASS"
  if [ "$exit_code" -ne 0 ] && [ "${NO_RESTART:-false}" != true ] && [ "${APP_STOPPED:-false}" = true ] && [ "${SYNC_COMPLETED:-false}" != true ]; then
    warn "Sync failed after stopping the Hub — attempting automatic restart"
    bash "$SCRIPT_DIR/start.sh" || warn "Automatic restart failed — start manually: bash deploy/start.sh"
  fi
}

resolve_restore_file() {
  local requested="$1"
  local -a dirs=("$INSTALL_DIR/backups" "$INSTALL_DIR/scripts" "/tmp")
  local manual_latest=""
  local latest_pointer="$INSTALL_DIR/backups/latest.dump"
  local latest=""

  if [ -n "$requested" ] && [ -f "$requested" ]; then
    printf '%s\n' "$requested"
    return 0
  fi

  if [ -n "$requested" ] && [ "$requested" != "latest" ]; then
    for dir in "${dirs[@]}"; do
      if [ -f "$dir/$requested" ]; then
        printf '%s\n' "$dir/$requested"
        return 0
      fi
    done
  fi

  manual_latest="$({
    ls -1t "$INSTALL_DIR"/scripts/$MANUAL_ADMIN_DUMP_GLOB 2>/dev/null || true
    ls -1t /tmp/$MANUAL_ADMIN_DUMP_GLOB 2>/dev/null || true
  } | head -1)"

  if [ -n "$manual_latest" ]; then
    printf '%s\n' "$manual_latest"
    return 0
  fi

  if [ -f "$latest_pointer" ]; then
    printf '%s\n' "$latest_pointer"
    return 0
  fi

  latest="$({
    ls -1t "$INSTALL_DIR"/backups/*.dump 2>/dev/null || true
    ls -1t "$INSTALL_DIR"/scripts/*.dump 2>/dev/null || true
    ls -1t /tmp/*.dump 2>/dev/null || true
  } | head -1)"

  [ -n "$latest" ] || return 1
  printf '%s\n' "$latest"
}

read_recorded_product_version() {
  local file_path="$1"
  [ -f "$file_path" ] || return 1
  grep -E '^PRODUCT_VERSION=' "$file_path" | head -1 | cut -d= -f2-
}

read_patch_index_field() {
  local field_name="$1"
  [ -f "$PATCH_INDEX_FILE" ] || return 1
  node - "$PATCH_INDEX_FILE" "$field_name" <<'NODE'
const fs = require('fs');

const [indexFile, fieldName] = process.argv.slice(2);
const raw = fs.readFileSync(indexFile, 'utf8').replace(/^\uFEFF/, '');
const data = JSON.parse(raw);
const value = data && typeof data[fieldName] === 'string' ? data[fieldName].trim() : '';
if (value) process.stdout.write(value);
NODE
}

default_product_version() {
  local recorded_version="$1"
  local fallback_version="$2"
  local approved_current="${PATCH_CURRENT_VERSION:-}"
  local approved_next="${PATCH_NEXT_UPGRADE_VERSION:-}"
  local recorded_major=""
  local approved_current_major=""

  if [ -n "$recorded_version" ]; then
    recorded_major="${recorded_version%%.*}"
  fi
  if [ -n "$approved_current" ]; then
    approved_current_major="${approved_current%%.*}"
  fi

  if [[ "$recorded_major" =~ ^[0-9]+$ ]] && [[ "$approved_current_major" =~ ^[0-9]+$ ]] && [ "$recorded_major" -lt "$approved_current_major" ]; then
    printf '%s\n' "$approved_current"
    return 0
  fi

  if [ -n "$approved_next" ]; then
    printf '%s\n' "$approved_next"
    return 0
  fi

  if [ -n "$approved_current" ] && [ -z "$recorded_version" ]; then
    printf '%s\n' "$approved_current"
    return 0
  fi

  increment_patch_version "${recorded_version:-$fallback_version}"
}

increment_patch_version() {
  local version="$1"
  local -a parts=()
  IFS='.' read -r -a parts <<< "$version"

  if [ "${#parts[@]}" -eq 1 ] && [[ "${parts[0]}" =~ ^[0-9]+$ ]]; then
    printf '%s\n' "${parts[0]}.1"
    return 0
  fi

  if [ "${#parts[@]}" -ge 2 ]; then
    local index=$((${#parts[@]} - 1))
    if [[ "${parts[$index]}" =~ ^[0-9]+$ ]]; then
      parts[$index]=$((${parts[$index]} + 1))
      printf '%s\n' "$(IFS='.'; echo "${parts[*]}")"
      return 0
    fi
  fi

  printf '%s\n' "${version:-${BASELINE_VERSION}.1}"
}

default_release_notes() {
  local product_version="$1"
  printf '%s\n' "Recorded deployment for version ${product_version}."
}

build_release_notes() {
  local product_version="$1"
  if [ -n "${BEFORE_FULL:-}" ] && [ -n "${AFTER_FULL:-}" ]; then
    local git_notes=""
    git_notes="$(git --no-pager log --oneline "${BEFORE_FULL}..${AFTER_FULL}" | head -20 || true)"
    if [ -n "$git_notes" ]; then
      printf '%s\n' "$git_notes"
      return 0
    fi
  fi
  default_release_notes "$product_version"
}

update_patch_archive() {
  local product_version="$1"
  local release_file="$2"
  local release_notes="$3"
  [ -f "$PATCH_INDEX_FILE" ] || return 0
  node - "$INSTALL_DIR" "$PATCH_INDEX_FILE" "$product_version" "$release_file" "$release_notes" <<'NODE'
const fs = require('fs');
const path = require('path');

const [installDir, indexFile, productVersion, releaseFile, releaseNotesText] = process.argv.slice(2);
const readJson = filePath => JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
const index = readJson(indexFile);
const major = String(productVersion || '').trim().split('.')[0];
if (!major) process.exit(0);
const availableVersions = Array.isArray(index.availableVersions) ? index.availableVersions : [];
const targetEntry = availableVersions.find(entry => String(entry.version) === major);
if (!targetEntry?.metadataFile) process.exit(0);

const metadataPath = path.resolve(installDir, targetEntry.metadataFile);
const metadata = fs.existsSync(metadataPath)
  ? readJson(metadataPath)
  : {
      version: major,
      displayVersion: `${major}.0.0`,
      defaultNextPatch: `${major}.1`,
      status: 'current',
      recordedReleaseMetadata: true,
      releaseMetadataSource: `releases/${path.basename(releaseFile)}`,
      releaseFile: `releases/${path.basename(releaseFile)}`,
      minorVersions: [],
      notes: [],
    };

const parseReleaseFile = relativePath => {
  const absolutePath = path.resolve(installDir, relativePath);
  if (!fs.existsSync(absolutePath)) return null;
  const values = {};
  for (const line of fs.readFileSync(absolutePath, 'utf8').split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator < 0) continue;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    if (key) values[key] = value;
  }
  return values;
};
const previousReleaseFile = 'releases/previous-release.env';
const previousRelease = parseReleaseFile(previousReleaseFile);

const toVersionParts = value => String(value || '').split('.').map(part => Number.parseInt(part, 10));
const compareVersions = (left, right) => {
  const leftParts = toVersionParts(left);
  const rightParts = toVersionParts(right);
  const maxLength = Math.max(leftParts.length, rightParts.length);
  for (let index = 0; index < maxLength; index += 1) {
    const leftPart = Number.isFinite(leftParts[index]) ? leftParts[index] : 0;
    const rightPart = Number.isFinite(rightParts[index]) ? rightParts[index] : 0;
    if (leftPart !== rightPart) return leftPart - rightPart;
  }
  return 0;
};

const normalizedVersion = String(productVersion).includes('.') ? String(productVersion) : `${major}.0`;
const normalizedReleaseFile = `releases/${path.basename(releaseFile)}`;
const releaseNotes = String(releaseNotesText || '')
  .split(/\r?\n/)
  .map(line => line.trim())
  .filter(Boolean);
const notes = releaseNotes.length ? releaseNotes : [`Recorded deployment for version ${normalizedVersion}.`];
const incrementVersion = value => {
  const parts = String(value || '').split('.').map(part => Number.parseInt(part, 10));
  if (parts.length === 1 && Number.isFinite(parts[0])) return `${parts[0]}.1`;
  if (parts.length >= 2) {
    const next = [...parts];
    const index = next.length - 1;
    next[index] = Number.isFinite(next[index]) ? next[index] + 1 : 1;
    return next.join('.');
  }
  return `${major}.1`;
};
const nextMinorVersion = incrementVersion(normalizedVersion);

metadata.version = metadata.version || major;
metadata.displayVersion = metadata.displayVersion || `${major}.0.0`;
metadata.defaultNextPatch = nextMinorVersion;
metadata.status = 'current';
metadata.recordedReleaseMetadata = true;
metadata.releaseMetadataSource = normalizedReleaseFile;
metadata.releaseFile = normalizedReleaseFile;
metadata.notes = notes;
metadata.minorVersions = Array.isArray(metadata.minorVersions) ? metadata.minorVersions : [];

const minorIndex = metadata.minorVersions.findIndex(entry => String(entry.version) === normalizedVersion);
const existingMinor = minorIndex >= 0 ? metadata.minorVersions[minorIndex] : null;
const minorRecord = {
  version: normalizedVersion,
  releaseFile: normalizedReleaseFile,
  archiveFile: typeof existingMinor?.archiveFile === 'string' ? existingMinor.archiveFile : '',
  archiveSourceDirectory: typeof existingMinor?.archiveSourceDirectory === 'string' ? existingMinor.archiveSourceDirectory : '',
  archiveModifiedAt: typeof existingMinor?.archiveModifiedAt === 'string' ? existingMinor.archiveModifiedAt : '',
  notes,
};
if (minorIndex >= 0) metadata.minorVersions[minorIndex] = minorRecord;
else metadata.minorVersions.push(minorRecord);
metadata.minorVersions.sort((left, right) => compareVersions(left.version, right.version));

const wholeMajorVersions = availableVersions
  .map(entry => String(entry.version || '').trim())
  .filter(value => /^\d+$/.test(value))
  .sort(compareVersions);
const nextMajorVersion = wholeMajorVersions.find(value => compareVersions(value, major) > 0) || '';
index.currentVersion = major;
index.nextUpgradeVersion = nextMajorVersion;
index.availableVersions = availableVersions.map(entry => {
  const entryMajor = String(entry.version || '').trim();
  if (!/^\d+$/.test(entryMajor)) return entry;
  const status = entryMajor === major ? 'current' : compareVersions(entryMajor, major) < 0 ? (compareVersions(entryMajor, String(Number.parseInt(major, 10) - 1)) === 0 ? 'previous' : 'archived') : 'next-upgrade';
  const defaultNextPatch = entryMajor === major ? nextMinorVersion : entry.defaultNextPatch;
  return { ...entry, status, defaultNextPatch };
});

for (const entry of index.availableVersions) {
  if (!entry?.metadataFile) continue;
  const entryMetadataPath = path.resolve(installDir, entry.metadataFile);
  if (!fs.existsSync(entryMetadataPath)) continue;
  const entryMetadata = readJson(entryMetadataPath);
  entryMetadata.status = entry.status || entryMetadata.status || '';
  fs.writeFileSync(entryMetadataPath, `${JSON.stringify(entryMetadata, null, 2)}\n`, 'utf8');
}

if (previousRelease?.PRODUCT_VERSION) {
  const previousMajor = String(previousRelease.PRODUCT_VERSION).trim().split('.')[0];
  const previousEntry = availableVersions.find(entry => String(entry.version) === previousMajor);
  if (previousEntry?.metadataFile) {
    const previousMetadataPath = path.resolve(installDir, previousEntry.metadataFile);
    if (fs.existsSync(previousMetadataPath)) {
      const previousMetadata = readJson(previousMetadataPath);
      const previousVersion = String(previousRelease.PRODUCT_VERSION).includes('.') ? String(previousRelease.PRODUCT_VERSION) : `${previousMajor}.0`;
      previousMetadata.status = 'previous';
      previousMetadata.recordedReleaseMetadata = true;
      previousMetadata.releaseMetadataSource = previousReleaseFile;
      previousMetadata.releaseFile = previousReleaseFile;
      previousMetadata.minorVersions = Array.isArray(previousMetadata.minorVersions) ? previousMetadata.minorVersions : [];
      const previousMinorIndex = previousMetadata.minorVersions.findIndex(entry => String(entry.version) === previousVersion);
      if (previousMinorIndex >= 0) {
        previousMetadata.minorVersions[previousMinorIndex] = {
          ...previousMetadata.minorVersions[previousMinorIndex],
          releaseFile: previousReleaseFile,
        };
      }
      fs.writeFileSync(previousMetadataPath, `${JSON.stringify(previousMetadata, null, 2)}\n`, 'utf8');
    }
  }
}

fs.writeFileSync(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, 'utf8');
fs.writeFileSync(indexFile, `${JSON.stringify(index, null, 2)}\n`, 'utf8');
NODE
}

RESTORE_FILE=""
NO_RESTART=false
BACKUP_ONLY=false
CODE_ONLY=false
NO_BACKUP=false
VERSION_LABEL=""
PATCH_RELEASE_NOTES="${PATCH_RELEASE_NOTES:-}"
RELEASE_PULL_STATE_DIR=""
RELEASE_STATE_RECORDED=false
APP_STOPPED=false
SYNC_COMPLETED=false
ASKPASS=""
trap 'finalize_sync_exit "$?"' EXIT

while [[ $# -gt 0 ]]; do
  case "$1" in
    --restore)     RESTORE_FILE="$2"; shift 2 ;;
    --version)     VERSION_LABEL="$2"; shift 2 ;;
    --no-restart)  NO_RESTART=true; shift ;;
    --backup-only) BACKUP_ONLY=true; shift ;;
    --code-only)   CODE_ONLY=true; shift ;;
    --no-backup)   NO_BACKUP=true; shift ;;
    -h|--help)     sed -n '2,21p' "$0"; exit 0 ;;
    *) fail "Unknown argument: $1" ;;
  esac
done

if [ "$CODE_ONLY" = true ] && { [ "$BACKUP_ONLY" = true ] || [ -n "$RESTORE_FILE" ]; }; then
  fail "--code-only cannot be combined with --backup-only or --restore"
fi
if [ "$BACKUP_ONLY" = true ] && [ "$NO_BACKUP" = true ]; then
  fail "--backup-only cannot be combined with --no-backup"
fi

# shellcheck disable=SC1091
if [ -f "$SCRIPT_DIR/hub.env" ]; then . "$SCRIPT_DIR/hub.env"; fi
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-hclhub}"
DB_USER="${DB_USER:-hcluser}"
GIT_BRANCH="${GIT_BRANCH:-main}"
DB_CONTAINER_NAME="${DB_CONTAINER_NAME:-hcl-postgres}"
DB_CONTAINER_ENGINE="${DB_CONTAINER_ENGINE:-}"
# PGDG installs pg_dump/pg_restore outside /usr/bin.
if [ -n "${PG_BIN:-}" ]; then export PATH="$PG_BIN:$PATH"; fi
# shellcheck disable=SC1091
if [ -f "$SCRIPT_DIR/db-runtime.sh" ]; then . "$SCRIPT_DIR/db-runtime.sh"; fi

ensure_execute_permissions

cd "$INSTALL_DIR"
normalize_permissions

CREDS="$INSTALL_DIR/.deploy-credentials"

if [ "$CODE_ONLY" = false ]; then
  [ -f "$CREDS" ] || fail "Missing $CREDS — run deploy/install.sh first"
  DB_PASSWORD="$(grep -E '^DB_PASSWORD=' "$CREDS" | head -1 | cut -d= -f2-)"
  [ -n "$DB_PASSWORD" ] || fail "DB_PASSWORD not found in $CREDS"
  resolve_db_runtime
fi

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="$INSTALL_DIR/backups"
BACKUP_FILE="$BACKUP_DIR/hcl-hub-${TIMESTAMP}.dump"
LATEST_BACKUP_FILE="$BACKUP_DIR/latest.dump"
RELEASES_DIR="$INSTALL_DIR/releases"
CURRENT_RELEASE_FILE="$RELEASES_DIR/current-release.env"
PREVIOUS_RELEASE_FILE="$RELEASES_DIR/previous-release.env"
BASELINE_VERSION="${BASELINE_VERSION:-6}"
PATCH_CURRENT_VERSION="$(read_patch_index_field currentVersion 2>/dev/null || true)"
PATCH_NEXT_UPGRADE_VERSION="$(read_patch_index_field nextUpgradeVersion 2>/dev/null || true)"
RECORDED_VERSION="$(read_recorded_product_version "$CURRENT_RELEASE_FILE" 2>/dev/null || true)"
RECORDED_BACKUP_FILE="$BACKUP_FILE"
PINNED_RESTORE_FILE=""
if [ "$CODE_ONLY" = false ] && [ -n "$RESTORE_FILE" ]; then
  RESTORE_FILE="$(resolve_restore_file "$RESTORE_FILE")" || fail "Restore file not found: $RESTORE_FILE"
  if [ "$(basename "$RESTORE_FILE")" = "latest.dump" ]; then
    PINNED_RESTORE_FILE="/tmp/hcl-hub-restore-${TIMESTAMP}.dump"
    cp -f "$RESTORE_FILE" "$PINNED_RESTORE_FILE"
    RESTORE_FILE="$PINNED_RESTORE_FILE"
    info "Pinned restore source before refreshing latest.dump: $RESTORE_FILE"
  fi
fi
if [ "$CODE_ONLY" = false ]; then
  mkdir -p "$BACKUP_DIR"
  mkdir -p "$RELEASES_DIR"
  if [ "$NO_BACKUP" = true ]; then
    banner "Sync — step 1/7: Safety backup skipped"
    RECORDED_BACKUP_FILE=""
    warn "--no-backup given — proceeding without a fresh VM safety backup"
  else
    banner "Sync — step 1/7: Back up the current database"
    if [ "$DB_RUNTIME_KIND" = "container" ]; then
      info "Detected containerized PostgreSQL via ${DB_RUNTIME_ENGINE}:${DB_RUNTIME_CONTAINER}"
    elif [ "$DB_RUNTIME_KIND" = "external" ]; then
      info "Detected external PostgreSQL at ${DB_HOST}:${DB_PORT}"
    else
      info "Detected host PostgreSQL at ${DB_HOST}:${DB_PORT}"
    fi

    if _db_dump "$BACKUP_FILE"; then
      ok "Backup written: $BACKUP_FILE ($(du -h "$BACKUP_FILE" | cut -f1))"
      cp -f "$BACKUP_FILE" "$LATEST_BACKUP_FILE"
      ok "Latest backup pointer updated: $LATEST_BACKUP_FILE"
    else
      fail "pg_dump failed. Fix the PostgreSQL client/auth issue shown above, or use --no-backup with --restore if you intentionally want to proceed without a fresh VM safety backup."
    fi

    # Keep the 10 most recent backups.
    ls -1t "$BACKUP_DIR"/hcl-hub-*.dump 2>/dev/null | tail -n +11 | xargs -r rm -f
    ok "Retaining the 10 most recent backups"
  fi
else
  banner "Code-only sync: database backup, migration and restore are skipped"
fi

if [ "$BACKUP_ONLY" = true ]; then
  ok "--backup-only: done. The Hub was not touched."
  exit 0
fi

banner "Sync — step 2/7: Stop the Hub"
bash "$SCRIPT_DIR/stop.sh" || warn "stop.sh reported an issue — continuing"
APP_STOPPED=true

banner "Sync — step 3/7: Pull the latest code"

# Reuse the token saved by install.sh, without exposing it in argv.
ASKPASS=""
if [ -f "$INSTALL_DIR/.hub-token" ]; then
  ASKPASS="$(mktemp)"; chmod 700 "$ASKPASS"
  cat > "$ASKPASS" <<'ASK'
#!/bin/bash
case "$1" in
  *[Uu]sername*) echo "x-access-token" ;;
  *) echo "${HCL_HUB_GIT_TOKEN}" ;;
esac
ASK
  export GIT_ASKPASS="$ASKPASS"
  HCL_HUB_GIT_TOKEN="$(cat "$INSTALL_DIR/.hub-token")"
  export HCL_HUB_GIT_TOKEN
  export GIT_TERMINAL_PROMPT=0
fi

if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  warn "Local modifications detected — stashing them"
  git stash push -m "sync.sh auto-stash ${TIMESTAMP}" || warn "git stash failed"
  info "Restore later with: git stash pop"
fi

prepare_release_files_for_pull

BEFORE="$(git rev-parse --short HEAD)"
BEFORE_FULL="$(git rev-parse HEAD)"
git fetch origin "$GIT_BRANCH" || fail "git fetch failed (token expired or no network?)"
git checkout "$GIT_BRANCH" >/dev/null 2>&1 || true
git pull --ff-only origin "$GIT_BRANCH" || fail "git pull failed — resolve manually, then re-run"
ensure_execute_permissions
normalize_permissions
AFTER="$(git rev-parse --short HEAD)"
AFTER_FULL="$(git rev-parse HEAD)"
PATCH_CURRENT_VERSION="$(read_patch_index_field currentVersion 2>/dev/null || printf '%s' "$PATCH_CURRENT_VERSION")"
PATCH_NEXT_UPGRADE_VERSION="$(read_patch_index_field nextUpgradeVersion 2>/dev/null || printf '%s' "$PATCH_NEXT_UPGRADE_VERSION")"
DEFAULT_VERSION_LABEL="$(default_product_version "$RECORDED_VERSION" "$BASELINE_VERSION")"
PRODUCT_VERSION="${VERSION_LABEL:-$DEFAULT_VERSION_LABEL}"
RELEASE_FILE="$RELEASES_DIR/release-${TIMESTAMP}-${AFTER}.env"
BASELINE_RELEASE_FILE="$RELEASES_DIR/release-${TIMESTAMP}-baseline-${BEFORE}.env"

if [ "$BEFORE" = "$AFTER" ]; then
  ok "Already up to date ($AFTER)"
else
  ok "Updated ${BEFORE} -> ${AFTER}"
  git --no-pager log --oneline "${BEFORE}..${AFTER}" | head -20 || true
fi

mkdir -p "$RELEASES_DIR"
if [ -f "$CURRENT_RELEASE_FILE" ]; then
  cp -f "$CURRENT_RELEASE_FILE" "$PREVIOUS_RELEASE_FILE"
elif [ "$PRODUCT_VERSION" != "$BASELINE_VERSION" ]; then
  cat > "$BASELINE_RELEASE_FILE" <<EOF
RELEASE_TIMESTAMP=${TIMESTAMP}
PRODUCT_VERSION=${BASELINE_VERSION}
GIT_BRANCH=${GIT_BRANCH}
PREVIOUS_COMMIT=${BEFORE_FULL}
CURRENT_COMMIT=${BEFORE_FULL}
PREVIOUS_SHORT_COMMIT=${BEFORE}
CURRENT_SHORT_COMMIT=${BEFORE}
PRE_SYNC_BACKUP=${RECORDED_BACKUP_FILE}
RESTORE_SOURCE=
SYNC_MODE=baseline
EOF
  cp -f "$BASELINE_RELEASE_FILE" "$PREVIOUS_RELEASE_FILE"
  ok "Baseline release metadata recorded: ${BASELINE_VERSION}"
fi
cat > "$RELEASE_FILE" <<EOF
RELEASE_TIMESTAMP=${TIMESTAMP}
PRODUCT_VERSION=${PRODUCT_VERSION}
GIT_BRANCH=${GIT_BRANCH}
PREVIOUS_COMMIT=${BEFORE_FULL}
CURRENT_COMMIT=${AFTER_FULL}
PREVIOUS_SHORT_COMMIT=${BEFORE}
CURRENT_SHORT_COMMIT=${AFTER}
PRE_SYNC_BACKUP=${RECORDED_BACKUP_FILE}
RESTORE_SOURCE=${RESTORE_FILE}
SYNC_MODE=$([ "$CODE_ONLY" = true ] && echo code-only || echo full)
EOF
cp -f "$RELEASE_FILE" "$CURRENT_RELEASE_FILE"
RELEASE_STATE_RECORDED=true
update_patch_archive "$PRODUCT_VERSION" "$RELEASE_FILE" "${PATCH_RELEASE_NOTES:-$(build_release_notes "$PRODUCT_VERSION")}" || warn "Patch archive update skipped"
ok "Release metadata recorded: ${PRODUCT_VERSION}"

banner "Sync — step 4/7: Dependencies"
npm install --no-fund --no-audit
npm install --prefix server --no-fund --no-audit
ok "Dependencies up to date"

banner "Sync — step 5/7: Prisma client and migrations"
npm run prisma:generate --prefix server >/dev/null
ok "Prisma client regenerated"
if [ "$CODE_ONLY" = false ]; then
  npm run prisma:deploy --prefix server \
    || warn "migrate deploy reported an issue — check above"
  ok "Migrations applied"
else
  info "--code-only: database migrations skipped"
fi

banner "Sync — step 6/7: Optional restore"
if [ "$CODE_ONLY" = true ]; then
  info "--code-only: database restore skipped"
elif [ -n "$RESTORE_FILE" ]; then
  RESTORE_FILE="$(resolve_restore_file "$RESTORE_FILE")" || fail "Restore file not found: $RESTORE_FILE"
  info "Restoring $RESTORE_FILE (this overwrites current data)..."
  MAGIC="$(head -c 5 "$RESTORE_FILE" | tr -d '\0' || true)"
  RESTORE_LOG="$INSTALL_DIR/restore-${TIMESTAMP}.log"
  set +e
  _db_restore "$RESTORE_FILE" "$RESTORE_LOG" "$MAGIC"
  RC=$?
  set -e
  [ $RC -eq 0 ] && ok "Restore complete" || warn "Restore exited $RC — see $RESTORE_LOG"
else
  info "No --restore given — keeping the current data"
fi

banner "Sync — step 7/7: Restart"
if [ "$NO_RESTART" = true ]; then
  normalize_permissions
  warn "--no-restart given. Start manually: bash deploy/start.sh"
  exit 0
fi

bash "$SCRIPT_DIR/start.sh"
normalize_permissions
SYNC_COMPLETED=true

echo ""
if [ "$CODE_ONLY" = true ]; then
  ok "Code-only sync complete. No database backup or migration was run."
else
  ok "Sync complete. Version: $PRODUCT_VERSION"
  ok "Pre-sync backup: $BACKUP_FILE"
fi
