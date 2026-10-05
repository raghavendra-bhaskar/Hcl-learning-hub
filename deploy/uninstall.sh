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

TAKE_BACKUP=true
PURGE_DB=false
PURGE_BACKUPS=false
ASSUME_YES=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-backup)     TAKE_BACKUP=false; shift ;;
    --purge-db)      PURGE_DB=true; shift ;;
    --purge-backups) PURGE_BACKUPS=true; shift ;;
    --yes)           ASSUME_YES=true; shift ;;
    -h|--help)
      sed -n '1,20p' "$0"
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
PG_SERVICE="${PG_SERVICE:-postgresql}"
EXTERNAL_DB="${EXTERNAL_DB:-false}"
if [ -n "${PG_BIN:-}" ]; then export PATH="$PG_BIN:$PATH"; fi

CREDS="$INSTALL_DIR/.deploy-credentials"
DB_PASSWORD=""
if [ -f "$CREDS" ]; then
  DB_PASSWORD="$(grep -E '^DB_PASSWORD=' "$CREDS" | head -1 | cut -d= -f2- || true)"
fi

banner "Uninstall summary"
info "Install dir    : $INSTALL_DIR"
info "Take backup    : $TAKE_BACKUP"
info "Purge backups  : $PURGE_BACKUPS"
info "Purge DB       : $PURGE_DB"

if [ "$ASSUME_YES" != true ]; then
  read -r -p "Proceed with uninstall? [y/N] " CONFIRM
  case "$CONFIRM" in
    y|Y|yes|YES) ;;
    *) fail "Uninstall cancelled" ;;
  esac
fi

if [ "$TAKE_BACKUP" = true ]; then
  banner "Uninstall — step 1/4: Backup"
  bash "$SCRIPT_DIR/sync.sh" --backup-only || warn "Backup step reported an issue"
else
  banner "Uninstall — step 1/4: Backup skipped"
fi

banner "Uninstall — step 2/4: Stop the Hub"
bash "$SCRIPT_DIR/stop.sh" --with-db || warn "stop.sh reported an issue"

if [ "$PURGE_DB" = true ] && [ "$EXTERNAL_DB" != true ] && [ -n "$DB_PASSWORD" ]; then
  banner "Uninstall — step 3/4: Remove local database objects"
  set +e
  PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS \"$DB_NAME\";" >/dev/null 2>&1
  PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "DROP ROLE IF EXISTS \"$DB_USER\";" >/dev/null 2>&1
  set -e
  if command -v systemctl >/dev/null 2>&1; then
    sudo systemctl stop "$PG_SERVICE" >/dev/null 2>&1 || true
  fi
  ok "Requested local database cleanup complete"
else
  banner "Uninstall — step 3/4: Database kept"
fi

banner "Uninstall — step 4/4: Remove application files"
PRESERVED_BACKUP_DIR="${INSTALL_DIR}-preserved-backups"
if [ "$PURGE_BACKUPS" != true ]; then
  rm -rf "$PRESERVED_BACKUP_DIR"
  mkdir -p "$PRESERVED_BACKUP_DIR"
  if [ -d "$INSTALL_DIR/backups" ]; then
    cp -a "$INSTALL_DIR/backups/." "$PRESERVED_BACKUP_DIR/" 2>/dev/null || true
  fi
fi
rm -rf "$INSTALL_DIR"
if [ "$PURGE_BACKUPS" != true ] && [ -d "$PRESERVED_BACKUP_DIR" ]; then
  ok "Backups preserved at $PRESERVED_BACKUP_DIR"
fi
ok "Application files removed"
