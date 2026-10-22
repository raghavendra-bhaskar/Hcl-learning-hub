#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PATCHES_DIR="$INSTALL_DIR/patches"
ARCHIVE_RESTORE_SCRIPT="$INSTALL_DIR/scripts/restore-version-archive.py"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; CYAN='\033[0;36m'; NC='\033[0m'
ok()     { echo -e "${GREEN}[ OK ]${NC} $*"; }
warn()   { echo -e "${YELLOW}[WARN]${NC} $*"; }
fail()   { echo -e "${RED}[FAIL]${NC} $*" >&2; exit 1; }
info()   { echo -e "  ${CYAN}->${NC} $*"; }
banner() { echo ""; echo "========================================"; echo "  $1"; echo "========================================"; }

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

prepare_release_files_for_checkout() {
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

finalize_rollback_exit() {
  local exit_code="$1"
  cleanup_release_pull_state
  if [ "$exit_code" -ne 0 ] && [ "${NO_RESTART:-false}" != true ] && [ "${APP_STOPPED:-false}" = true ] && [ "${ROLLBACK_COMPLETED:-false}" != true ]; then
    warn "Rollback failed after stopping the Hub — attempting automatic restart"
    bash "$SCRIPT_DIR/start.sh" || warn "Automatic restart failed — start manually: bash deploy/start.sh"
  fi
}

TARGET_VERSION=""
RESTORE_FILE=""
NO_RESTORE=false
NO_RESTART=false
ASSUME_YES=false
RELEASE_PULL_STATE_DIR=""
RELEASE_STATE_RECORDED=false
APP_STOPPED=false
ROLLBACK_COMPLETED=false
trap 'finalize_rollback_exit "$?"' EXIT

while [[ $# -gt 0 ]]; do
  case "$1" in
    --to-version) TARGET_VERSION="$2"; shift 2 ;;
    --restore)    RESTORE_FILE="$2"; shift 2 ;;
    --no-restore) NO_RESTORE=true; shift ;;
    --no-restart) NO_RESTART=true; shift ;;
    --yes)        ASSUME_YES=true; shift ;;
    -h|--help)
      sed -n '1,28p' "$0"
      exit 0
      ;;
    *) fail "Unknown argument: $1" ;;
  esac
done

if [ -f "$SCRIPT_DIR/hub.env" ]; then . "$SCRIPT_DIR/hub.env"; fi
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-hclhub}"
DB_USER="${DB_USER:-hcluser}"
GIT_BRANCH="${GIT_BRANCH:-main}"
DB_CONTAINER_NAME="${DB_CONTAINER_NAME:-hcl-postgres}"
DB_CONTAINER_ENGINE="${DB_CONTAINER_ENGINE:-}"
if [ -n "${PG_BIN:-}" ]; then export PATH="$PG_BIN:$PATH"; fi
# shellcheck disable=SC1091
if [ -f "$SCRIPT_DIR/db-runtime.sh" ]; then . "$SCRIPT_DIR/db-runtime.sh"; fi

cd "$INSTALL_DIR"

CREDS="$INSTALL_DIR/.deploy-credentials"
[ -f "$CREDS" ] || fail "Missing $CREDS"
DB_PASSWORD="$(grep -E '^DB_PASSWORD=' "$CREDS" | head -1 | cut -d= -f2-)"
[ -n "$DB_PASSWORD" ] || fail "DB_PASSWORD not found in $CREDS"
resolve_db_runtime

BACKUP_DIR="$INSTALL_DIR/backups"
RELEASES_DIR="$INSTALL_DIR/releases"
CURRENT_RELEASE_FILE="$RELEASES_DIR/current-release.env"
PREVIOUS_RELEASE_FILE="$RELEASES_DIR/previous-release.env"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
SAFETY_BACKUP="$BACKUP_DIR/rollback-safety-${TIMESTAMP}.dump"
mkdir -p "$BACKUP_DIR" "$RELEASES_DIR"
TARGET_RELEASE_FILE=""
TARGET_ARCHIVE_FILE=""
TARGET_SOURCE_DIRECTORY=""

resolve_restore_file() {
  local requested="$1"
  local -a dirs=("$INSTALL_DIR/backups" "$INSTALL_DIR/scripts" "/tmp")
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

  latest="$({
    ls -1t "$INSTALL_DIR"/backups/*.dump 2>/dev/null || true
    ls -1t "$INSTALL_DIR"/scripts/*.dump 2>/dev/null || true
    ls -1t /tmp/*.dump 2>/dev/null || true
  } | head -1)"

  [ -n "$latest" ] || return 1
  printf '%s\n' "$latest"
}

find_version_backup_file() {
  local version="$1"
  local major="${version%%.*}"
  local match=""
  [[ "$major" =~ ^[0-9]+$ ]] || return 1
  match="$({
    ls -1t "$INSTALL_DIR"/scripts/hcl-hub-manual-admin-v${major}-*.dump 2>/dev/null || true
    ls -1t "$INSTALL_DIR"/backups/hcl-hub-manual-admin-v${major}-*.dump 2>/dev/null || true
    ls -1t /tmp/hcl-hub-manual-admin-v${major}-*.dump 2>/dev/null || true
  } | head -1)"
  [ -n "$match" ] || return 1
  printf '%s\n' "$match"
}

find_release_file() {
  local version="$1"
  local candidate=""
  for candidate in "$RELEASES_DIR"/release-*.env; do
    [ -f "$candidate" ] || continue
    if grep -Eq "^PRODUCT_VERSION=${version}$" "$candidate"; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done
  return 1
}

find_archive_file() {
  local version="$1"
  node - "$INSTALL_DIR" "$version" <<'NODE'
const fs = require('fs');
const path = require('path');

const [installDir, targetVersion] = process.argv.slice(2);
const major = String(targetVersion || '').trim().split('.')[0];
if (!major) process.exit(1);
const versionFile = path.join(installDir, 'patches', `version-${major}.json`);
if (!fs.existsSync(versionFile)) process.exit(1);
const data = JSON.parse(fs.readFileSync(versionFile, 'utf8').replace(/^\uFEFF/, ''));
const sameVersion = (left, right) => {
  if (left === right) return true;
  const normalize = value => /^\d+$/.test(String(value || '').trim()) ? `${value}.0` : String(value || '').trim();
  return normalize(left) === normalize(right);
};
const minor = Array.isArray(data.minorVersions)
  ? data.minorVersions.find(entry => sameVersion(entry.version, targetVersion))
  : null;
const archiveFile = (minor && minor.archiveFile) || data.archiveFile || '';
const sourceDirectory = (minor && minor.archiveSourceDirectory) || data.archiveSourceDirectory || '';
if (!archiveFile) process.exit(1);
const resolved = path.resolve(installDir, archiveFile);
if (!fs.existsSync(resolved)) process.exit(1);
process.stdout.write(`${resolved}\n${sourceDirectory}`);
NODE
}

if [ -n "$TARGET_VERSION" ]; then
  TARGET_RELEASE_FILE="$(find_release_file "$TARGET_VERSION" 2>/dev/null || true)"
  if [ -z "$TARGET_RELEASE_FILE" ]; then
    ARCHIVE_INFO="$(find_archive_file "$TARGET_VERSION" 2>/dev/null || true)"
    if [ -z "$ARCHIVE_INFO" ]; then
      fail "Release version not found: $TARGET_VERSION"
    fi
    TARGET_ARCHIVE_FILE="$(printf '%s\n' "$ARCHIVE_INFO" | sed -n '1p')"
    TARGET_SOURCE_DIRECTORY="$(printf '%s\n' "$ARCHIVE_INFO" | sed -n '2p')"
  fi
elif [ -f "$PREVIOUS_RELEASE_FILE" ]; then
  TARGET_RELEASE_FILE="$PREVIOUS_RELEASE_FILE"
else
  fail "No previous release metadata found in $RELEASES_DIR"
fi

CURRENT_VERSION=""
CURRENT_COMMIT=""
CURRENT_PRE_SYNC_BACKUP=""
if [ -f "$CURRENT_RELEASE_FILE" ]; then
  CURRENT_VERSION="$(grep -E '^PRODUCT_VERSION=' "$CURRENT_RELEASE_FILE" | head -1 | cut -d= -f2-)"
  CURRENT_COMMIT="$(grep -E '^CURRENT_COMMIT=' "$CURRENT_RELEASE_FILE" | head -1 | cut -d= -f2-)"
  CURRENT_PRE_SYNC_BACKUP="$(grep -E '^PRE_SYNC_BACKUP=' "$CURRENT_RELEASE_FILE" | head -1 | cut -d= -f2-)"
fi

TARGET_PRODUCT_VERSION="$TARGET_VERSION"
TARGET_COMMIT=""
if [ -n "$TARGET_RELEASE_FILE" ]; then
  TARGET_PRODUCT_VERSION="$(grep -E '^PRODUCT_VERSION=' "$TARGET_RELEASE_FILE" | head -1 | cut -d= -f2-)"
  TARGET_COMMIT="$(grep -E '^CURRENT_COMMIT=' "$TARGET_RELEASE_FILE" | head -1 | cut -d= -f2-)"
  [ -n "$TARGET_COMMIT" ] || fail "Target release file is missing CURRENT_COMMIT: $TARGET_RELEASE_FILE"
elif [ -z "$TARGET_PRODUCT_VERSION" ]; then
  fail "Target version is required for archive rollback"
fi

if [ "$NO_RESTORE" = false ]; then
  if [ -n "$RESTORE_FILE" ]; then
    RESTORE_FILE="$(resolve_restore_file "$RESTORE_FILE")" || fail "Restore file not found: $RESTORE_FILE"
  elif RESTORE_FILE="$(find_version_backup_file "$TARGET_PRODUCT_VERSION" 2>/dev/null || true)"; [ -n "$RESTORE_FILE" ]; then
    info "Using version-matched restore dump: $RESTORE_FILE"
  elif [ -n "$CURRENT_PRE_SYNC_BACKUP" ] && [ -f "$CURRENT_PRE_SYNC_BACKUP" ]; then
    RESTORE_FILE="$CURRENT_PRE_SYNC_BACKUP"
  else
    RESTORE_FILE="$(resolve_restore_file latest)" || fail "No backup dump found for rollback"
  fi
fi

banner "Rollback summary"
info "Current version: ${CURRENT_VERSION:-unknown}"
info "Target version : ${TARGET_PRODUCT_VERSION:-unknown}"
if [ -n "$TARGET_RELEASE_FILE" ]; then
  info "Target commit  : $TARGET_COMMIT"
else
  info "Target archive : $TARGET_ARCHIVE_FILE"
fi
if [ "$DB_RUNTIME_KIND" = "container" ]; then
  info "Database runtime: ${DB_RUNTIME_ENGINE}:${DB_RUNTIME_CONTAINER}"
elif [ "$DB_RUNTIME_KIND" = "external" ]; then
  info "Database runtime: external (${DB_HOST}:${DB_PORT})"
else
  info "Database runtime: host (${DB_HOST}:${DB_PORT})"
fi
if [ "$NO_RESTORE" = false ]; then
  info "Restore dump   : $RESTORE_FILE"
else
  info "Restore dump   : skipped (--no-restore)"
fi

if [ "$ASSUME_YES" != true ]; then
  read -r -p "Proceed with rollback? [y/N] " CONFIRM
  case "$CONFIRM" in
    y|Y|yes|YES) ;;
    *) fail "Rollback cancelled" ;;
  esac
fi

banner "Rollback — step 1/5: Safety backup"
if _db_dump "$SAFETY_BACKUP" 2>/dev/null; then
  ok "Safety backup written: $SAFETY_BACKUP"
else
  fail "Could not take the rollback safety backup"
fi

banner "Rollback — step 2/5: Stop the Hub"
bash "$SCRIPT_DIR/stop.sh" || warn "stop.sh reported an issue — continuing"
APP_STOPPED=true

banner "Rollback — step 3/5: Switch code"
if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  warn "Local modifications detected — stashing them"
  git stash push -m "rollback.sh auto-stash ${TIMESTAMP}" || warn "git stash failed"
fi
prepare_release_files_for_checkout
if [ -n "$TARGET_RELEASE_FILE" ]; then
  git checkout "$TARGET_COMMIT" >/dev/null 2>&1 || fail "Could not checkout commit $TARGET_COMMIT"
  ok "Checked out $TARGET_COMMIT"
else
  command -v python3 >/dev/null 2>&1 || fail "python3 is required for archive-backed rollback"
  [ -f "$ARCHIVE_RESTORE_SCRIPT" ] || fail "Archive restore script not found: $ARCHIVE_RESTORE_SCRIPT"
  python3 "$ARCHIVE_RESTORE_SCRIPT" "$TARGET_ARCHIVE_FILE" "$INSTALL_DIR" || fail "Could not restore archive $TARGET_ARCHIVE_FILE"
  ok "Archive restored from $TARGET_ARCHIVE_FILE"
fi

banner "Rollback — step 4/5: Dependencies and Prisma"
if [ "${DEPLOY_MODE:-}" = "containers" ]; then
  ENGINE="${CONTAINER_ENGINE:-podman}"
  command -v "$ENGINE" >/dev/null 2>&1 || fail "Container engine not found: $ENGINE"
  "$ENGINE" build -t hcl-hub/api:latest -f server/Dockerfile ./server || fail "API image build failed"
  "$ENGINE" build -t hcl-hub/web:latest -f Dockerfile . || fail "Web image build failed"
  ok "Container images rebuilt"
else
  npm install --no-fund --no-audit
  npm install --prefix server --no-fund --no-audit
  npm run prisma:generate --prefix server >/dev/null
  ok "Dependencies and Prisma client refreshed"
fi

if [ "$NO_RESTORE" = false ]; then
  banner "Rollback — step 5/5: Restore database"
  MAGIC="$(head -c 5 "$RESTORE_FILE" | tr -d '\0' || true)"
  RESTORE_LOG="$INSTALL_DIR/rollback-restore-${TIMESTAMP}.log"
  set +e
  _db_restore "$RESTORE_FILE" "$RESTORE_LOG" "$MAGIC"
  RC=$?
  set -e
  [ $RC -eq 0 ] && ok "Restore complete" || warn "Restore exited $RC — see $RESTORE_LOG"
  if [ "${DEPLOY_MODE:-}" != "containers" ]; then
    npm run prisma:deploy --prefix server >/dev/null || warn "prisma migrate deploy reported an issue after restore"
  fi
else
  banner "Rollback — step 5/5: Database restore skipped"
fi

if [ -f "$CURRENT_RELEASE_FILE" ]; then cp -f "$CURRENT_RELEASE_FILE" "$PREVIOUS_RELEASE_FILE"; fi
if [ -n "$TARGET_RELEASE_FILE" ]; then
  cp -f "$TARGET_RELEASE_FILE" "$CURRENT_RELEASE_FILE"
else
  cat > "$CURRENT_RELEASE_FILE" <<EOF
RELEASE_TIMESTAMP=${TIMESTAMP}
PRODUCT_VERSION=${TARGET_PRODUCT_VERSION}
GIT_BRANCH=${GIT_BRANCH}
PREVIOUS_COMMIT=${CURRENT_COMMIT}
CURRENT_COMMIT=archive:${TARGET_PRODUCT_VERSION}
PREVIOUS_SHORT_COMMIT=${CURRENT_COMMIT:0:7}
CURRENT_SHORT_COMMIT=archive
PRE_SYNC_BACKUP=${SAFETY_BACKUP}
RESTORE_SOURCE=${RESTORE_FILE}
SYNC_MODE=archive-rollback
EOF
fi
RELEASE_STATE_RECORDED=true

if [ "$NO_RESTART" = true ]; then
  warn "--no-restart given. Start manually: bash deploy/start.sh"
  exit 0
fi

bash "$SCRIPT_DIR/start.sh"
ROLLBACK_COMPLETED=true

echo ""
ok "Rollback complete. Active version: ${TARGET_PRODUCT_VERSION:-unknown}"
ok "Safety backup: $SAFETY_BACKUP"
if [ "$NO_RESTORE" = false ]; then
  ok "Restored from: $RESTORE_FILE"
fi
