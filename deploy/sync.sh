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
#   bash deploy/sync.sh --restore backups/hcl-hub-20260928-120000.dump
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

RESTORE_FILE=""
NO_RESTART=false
BACKUP_ONLY=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --restore)     RESTORE_FILE="$2"; shift 2 ;;
    --no-restart)  NO_RESTART=true; shift ;;
    --backup-only) BACKUP_ONLY=true; shift ;;
    -h|--help)     sed -n '2,21p' "$0"; exit 0 ;;
    *) fail "Unknown argument: $1" ;;
  esac
done

# shellcheck disable=SC1091
if [ -f "$SCRIPT_DIR/hub.env" ]; then . "$SCRIPT_DIR/hub.env"; fi
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-hclhub}"
DB_USER="${DB_USER:-hcluser}"
GIT_BRANCH="${GIT_BRANCH:-main}"
# PGDG installs pg_dump/pg_restore outside /usr/bin.
if [ -n "${PG_BIN:-}" ]; then export PATH="$PG_BIN:$PATH"; fi

cd "$INSTALL_DIR"

CREDS="$INSTALL_DIR/.deploy-credentials"
[ -f "$CREDS" ] || fail "Missing $CREDS — run deploy/install.sh first"
DB_PASSWORD="$(grep -E '^DB_PASSWORD=' "$CREDS" | head -1 | cut -d= -f2-)"
[ -n "$DB_PASSWORD" ] || fail "DB_PASSWORD not found in $CREDS"

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="$INSTALL_DIR/backups"
BACKUP_FILE="$BACKUP_DIR/hcl-hub-${TIMESTAMP}.dump"
mkdir -p "$BACKUP_DIR"

banner "Sync — step 1/7: Back up the current database"

if PGPASSWORD="$DB_PASSWORD" pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
     --format=custom --no-owner --no-acl -f "$BACKUP_FILE" 2>/dev/null; then
  ok "Backup written: $BACKUP_FILE ($(du -h "$BACKUP_FILE" | cut -f1))"
else
  fail "pg_dump failed. Is PostgreSQL running? Nothing has been changed."
fi

# Keep the 10 most recent backups.
ls -1t "$BACKUP_DIR"/hcl-hub-*.dump 2>/dev/null | tail -n +11 | xargs -r rm -f
ok "Retaining the 10 most recent backups"

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
git fetch origin "$GIT_BRANCH" || fail "git fetch failed (token expired or no network?)"
git checkout "$GIT_BRANCH" >/dev/null 2>&1 || true
git pull --ff-only origin "$GIT_BRANCH" || fail "git pull failed — resolve manually, then re-run"
AFTER="$(git rev-parse --short HEAD)"

if [ "$BEFORE" = "$AFTER" ]; then
  ok "Already up to date ($AFTER)"
else
  ok "Updated ${BEFORE} -> ${AFTER}"
  git --no-pager log --oneline "${BEFORE}..${AFTER}" | head -20 || true
fi

banner "Sync — step 4/7: Dependencies"
npm install --no-fund --no-audit
npm install --prefix server --no-fund --no-audit
ok "Dependencies up to date"

banner "Sync — step 5/7: Prisma client and migrations"
npm run prisma:generate --prefix server >/dev/null
ok "Prisma client regenerated"
npm run prisma:deploy --prefix server \
  || warn "migrate deploy reported an issue — check above"
ok "Migrations applied"

banner "Sync — step 6/7: Optional restore"
if [ -n "$RESTORE_FILE" ]; then
  [ -f "$RESTORE_FILE" ] || fail "Restore file not found: $RESTORE_FILE"
  info "Restoring $RESTORE_FILE (this overwrites current data)..."
  MAGIC="$(head -c 5 "$RESTORE_FILE" | tr -d '\0' || true)"
  RESTORE_LOG="$INSTALL_DIR/restore-${TIMESTAMP}.log"
  set +e
  if [ "$MAGIC" = "PGDMP" ]; then
    PGPASSWORD="$DB_PASSWORD" pg_restore -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
      --clean --if-exists --no-owner --no-acl "$RESTORE_FILE" > "$RESTORE_LOG" 2>&1
  else
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
      --set ON_ERROR_STOP=off -f "$RESTORE_FILE" > "$RESTORE_LOG" 2>&1
  fi
  RC=$?
  set -e
  [ $RC -eq 0 ] && ok "Restore complete" || warn "Restore exited $RC — see $RESTORE_LOG"
else
  info "No --restore given — keeping the current data"
fi

banner "Sync — step 7/7: Restart"
if [ "$NO_RESTART" = true ]; then
  warn "--no-restart given. Start manually: bash deploy/start.sh"
  exit 0
fi

bash "$SCRIPT_DIR/start.sh"

echo ""
ok "Sync complete. Pre-sync backup: $BACKUP_FILE"
