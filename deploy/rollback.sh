#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; CYAN='\033[0;36m'; NC='\033[0m'
ok()     { echo -e "${GREEN}[ OK ]${NC} $*"; }
warn()   { echo -e "${YELLOW}[WARN]${NC} $*"; }
fail()   { echo -e "${RED}[FAIL]${NC} $*" >&2; exit 1; }
info()   { echo -e "  ${CYAN}->${NC} $*"; }
banner() { echo ""; echo "========================================"; echo "  $1"; echo "========================================"; }

TARGET_VERSION=""
RESTORE_FILE=""
NO_RESTORE=false
NO_RESTART=false
ASSUME_YES=false

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
if [ -n "${PG_BIN:-}" ]; then export PATH="$PG_BIN:$PATH"; fi

cd "$INSTALL_DIR"

CREDS="$INSTALL_DIR/.deploy-credentials"
[ -f "$CREDS" ] || fail "Missing $CREDS"
DB_PASSWORD="$(grep -E '^DB_PASSWORD=' "$CREDS" | head -1 | cut -d= -f2-)"
[ -n "$DB_PASSWORD" ] || fail "DB_PASSWORD not found in $CREDS"

BACKUP_DIR="$INSTALL_DIR/backups"
RELEASES_DIR="$INSTALL_DIR/releases"
CURRENT_RELEASE_FILE="$RELEASES_DIR/current-release.env"
PREVIOUS_RELEASE_FILE="$RELEASES_DIR/previous-release.env"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
SAFETY_BACKUP="$BACKUP_DIR/rollback-safety-${TIMESTAMP}.dump"
mkdir -p "$BACKUP_DIR" "$RELEASES_DIR"

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

if [ -n "$TARGET_VERSION" ]; then
  TARGET_RELEASE_FILE="$(find_release_file "$TARGET_VERSION")" || fail "Release version not found: $TARGET_VERSION"
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

TARGET_PRODUCT_VERSION="$(grep -E '^PRODUCT_VERSION=' "$TARGET_RELEASE_FILE" | head -1 | cut -d= -f2-)"
TARGET_COMMIT="$(grep -E '^CURRENT_COMMIT=' "$TARGET_RELEASE_FILE" | head -1 | cut -d= -f2-)"
[ -n "$TARGET_COMMIT" ] || fail "Target release file is missing CURRENT_COMMIT: $TARGET_RELEASE_FILE"

if [ "$NO_RESTORE" = false ]; then
  if [ -n "$RESTORE_FILE" ]; then
    RESTORE_FILE="$(resolve_restore_file "$RESTORE_FILE")" || fail "Restore file not found: $RESTORE_FILE"
  elif [ -n "$CURRENT_PRE_SYNC_BACKUP" ] && [ -f "$CURRENT_PRE_SYNC_BACKUP" ]; then
    RESTORE_FILE="$CURRENT_PRE_SYNC_BACKUP"
  else
    RESTORE_FILE="$(resolve_restore_file latest)" || fail "No backup dump found for rollback"
  fi
fi

banner "Rollback summary"
info "Current version: ${CURRENT_VERSION:-unknown}"
info "Target version : ${TARGET_PRODUCT_VERSION:-unknown}"
info "Target commit  : $TARGET_COMMIT"
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
if PGPASSWORD="$DB_PASSWORD" pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" --format=custom --no-owner --no-acl -f "$SAFETY_BACKUP" 2>/dev/null; then
  ok "Safety backup written: $SAFETY_BACKUP"
else
  fail "Could not take the rollback safety backup"
fi

banner "Rollback — step 2/5: Stop the Hub"
bash "$SCRIPT_DIR/stop.sh" || warn "stop.sh reported an issue — continuing"

banner "Rollback — step 3/5: Switch code"
if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  warn "Local modifications detected — stashing them"
  git stash push -m "rollback.sh auto-stash ${TIMESTAMP}" || warn "git stash failed"
fi
git checkout "$TARGET_COMMIT" >/dev/null 2>&1 || fail "Could not checkout commit $TARGET_COMMIT"
ok "Checked out $TARGET_COMMIT"

banner "Rollback — step 4/5: Dependencies and Prisma"
npm install --no-fund --no-audit
npm install --prefix server --no-fund --no-audit
npm run prisma:generate --prefix server >/dev/null
ok "Dependencies and Prisma client refreshed"

if [ "$NO_RESTORE" = false ]; then
  banner "Rollback — step 5/5: Restore database"
  MAGIC="$(head -c 5 "$RESTORE_FILE" | tr -d '\0' || true)"
  RESTORE_LOG="$INSTALL_DIR/rollback-restore-${TIMESTAMP}.log"
  set +e
  if [ "$MAGIC" = "PGDMP" ]; then
    PGPASSWORD="$DB_PASSWORD" pg_restore -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" --clean --if-exists --no-owner --no-acl "$RESTORE_FILE" > "$RESTORE_LOG" 2>&1
  else
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" --set ON_ERROR_STOP=off -f "$RESTORE_FILE" > "$RESTORE_LOG" 2>&1
  fi
  RC=$?
  set -e
  [ $RC -eq 0 ] && ok "Restore complete" || warn "Restore exited $RC — see $RESTORE_LOG"
  npm run prisma:deploy --prefix server >/dev/null || warn "prisma migrate deploy reported an issue after restore"
else
  banner "Rollback — step 5/5: Database restore skipped"
fi

if [ -f "$CURRENT_RELEASE_FILE" ]; then cp -f "$CURRENT_RELEASE_FILE" "$PREVIOUS_RELEASE_FILE"; fi
cp -f "$TARGET_RELEASE_FILE" "$CURRENT_RELEASE_FILE"

if [ "$NO_RESTART" = true ]; then
  warn "--no-restart given. Start manually: bash deploy/start.sh"
  exit 0
fi

bash "$SCRIPT_DIR/start.sh"

echo ""
ok "Rollback complete. Active version: ${TARGET_PRODUCT_VERSION:-unknown}"
ok "Safety backup: $SAFETY_BACKUP"
if [ "$NO_RESTORE" = false ]; then
  ok "Restored from: $RESTORE_FILE"
fi
