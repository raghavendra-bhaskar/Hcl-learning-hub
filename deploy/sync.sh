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

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; CYAN='\033[0;36m'; NC='\033[0m'
ok()     { echo -e "${GREEN}[ OK ]${NC} $*"; }
warn()   { echo -e "${YELLOW}[WARN]${NC} $*"; }
fail()   { echo -e "${RED}[FAIL]${NC} $*" >&2; exit 1; }
info()   { echo -e "  ${CYAN}->${NC} $*"; }
banner() { echo ""; echo "========================================"; echo "  $1"; echo "========================================"; }

ensure_execute_permissions() {
  local script=""
  for script in "$SCRIPT_DIR"/*.sh; do
    [ -f "$script" ] || continue
    chmod u+x "$script" 2>/dev/null || true
  done
}

normalize_permissions() {
  chmod -R 777 "$INSTALL_DIR" 2>/dev/null || true
}

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

RESTORE_FILE=""
NO_RESTART=false
BACKUP_ONLY=false
CODE_ONLY=false
NO_BACKUP=false
VERSION_LABEL=""

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
cleanup() { [ -n "$ASKPASS" ] && rm -f "$ASKPASS"; return 0; }
trap cleanup EXIT

if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  warn "Local modifications detected — stashing them"
  git stash push -m "sync.sh auto-stash ${TIMESTAMP}" || warn "git stash failed"
  info "Restore later with: git stash pop"
fi

BEFORE="$(git rev-parse --short HEAD)"
BEFORE_FULL="$(git rev-parse HEAD)"
git fetch origin "$GIT_BRANCH" || fail "git fetch failed (token expired or no network?)"
git checkout "$GIT_BRANCH" >/dev/null 2>&1 || true
git pull --ff-only origin "$GIT_BRANCH" || fail "git pull failed — resolve manually, then re-run"
normalize_permissions
AFTER="$(git rev-parse --short HEAD)"
AFTER_FULL="$(git rev-parse HEAD)"
PACKAGE_VERSION="$(node -p "require('./package.json').version" 2>/dev/null || echo '0.0.0')"
DEFAULT_VERSION_LABEL="${PACKAGE_VERSION}-${TIMESTAMP}-${AFTER}"
PRODUCT_VERSION="${VERSION_LABEL:-$DEFAULT_VERSION_LABEL}"
RELEASE_FILE="$RELEASES_DIR/release-${TIMESTAMP}-${AFTER}.env"
BASELINE_VERSION="${BASELINE_VERSION:-2}"
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

echo ""
if [ "$CODE_ONLY" = true ]; then
  ok "Code-only sync complete. No database backup or migration was run."
else
  ok "Sync complete. Version: $PRODUCT_VERSION"
  ok "Pre-sync backup: $BACKUP_FILE"
fi
