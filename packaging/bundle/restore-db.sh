#!/bin/bash
# ============================================================
# HCL Software Learning Hub — Database Restore (Linux)
#
# Restores a PostgreSQL dump into the running stack. Supports both
# custom-format dumps (pg_dump -Fc, magic "PGDMP" -> pg_restore) and
# plain SQL dumps (-> psql). Called automatically by install.sh and
# usable standalone afterwards.
#
# Usage:
#   sudo bash restore-db.sh [--dump <file>] [--dir <install-dir>] [--yes]
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"
load_bundle_env "$SCRIPT_DIR/bundle.env"

INSTALL_DIR="$SCRIPT_DIR"
DUMP_FILE="$SCRIPT_DIR/db/backup.dump"
ASSUME_YES=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dump)   DUMP_FILE="$2";   shift 2 ;;
    --dir)    INSTALL_DIR="$2"; shift 2 ;;
    --yes|-y) ASSUME_YES=true;  shift ;;
    *) warn "Ignoring unknown argument: $1"; shift ;;
  esac
done

HCL_CREDS_FILE="${HCL_CREDS_FILE:-$INSTALL_DIR/.deploy-credentials}"

[ -f "$DUMP_FILE" ] || fail "Dump file not found: $DUMP_FILE"
[ -s "$DUMP_FILE" ] || fail "Dump file is empty: $DUMP_FILE"

detect_runtime || fail "No container runtime available"

container_running "$DB_CONTAINER" \
  || fail "Container $DB_CONTAINER is not running. Start the stack first: bash start.sh"

# Credentials: env var wins, then the saved credentials file.
DB_PASSWORD="${DB_PASSWORD:-$(read_cred DB_PASSWORD "$HCL_CREDS_FILE" || true)}"

DUMP_SIZE=$(du -h "$DUMP_FILE" | cut -f1)

# ── Format detection ─────────────────────────────────────────────────────────
# pg_dump custom/tar archives start with the 5-byte magic string "PGDMP".
MAGIC=$(head -c 5 "$DUMP_FILE" | tr -d '\0' || true)
if [ "$MAGIC" = "PGDMP" ]; then
  DUMP_FORMAT="custom"
else
  DUMP_FORMAT="plain"
fi

echo ""
echo "  Database restore"
echo "  ----------------"
echo "  Dump    : $DUMP_FILE ($DUMP_SIZE)"
echo "  Format  : $DUMP_FORMAT"
echo "  Target  : ${DB_NAME} @ ${DB_CONTAINER} (${CRT_KIND})"
echo ""

if [ "$ASSUME_YES" = false ]; then
  warn "This OVERWRITES all data currently in the ${DB_NAME} database."
  read -r -p "  Continue? [y/N] " answer
  [[ "$answer" =~ ^[Yy]$ ]] || fail "Aborted by user"
fi

# ── Pause the API so it cannot write mid-restore ─────────────────────────────
API_WAS_RUNNING=false
if container_running "$API_CONTAINER"; then
  API_WAS_RUNNING=true
  info "Stopping API during restore..."
  $CRT stop "$API_CONTAINER" >/dev/null 2>&1 || true
fi

wait_for_postgres 30 || fail "PostgreSQL is not accepting connections"

# ── Copy the dump into the container and restore ─────────────────────────────
info "Copying dump into the database container..."
$CRT cp "$DUMP_FILE" "${DB_CONTAINER}:/tmp/hcl-restore.dump"

RESTORE_LOG="$INSTALL_DIR/restore-$(date +%Y%m%d-%H%M%S).log"

info "Restoring (${DUMP_FORMAT} format)..."
set +e
if [ "$DUMP_FORMAT" = "custom" ]; then
  # --clean --if-exists makes the restore repeatable; --no-owner/--no-acl
  # detaches it from roles that do not exist on this host.
  $CRT exec -e PGPASSWORD="$DB_PASSWORD" "$DB_CONTAINER" \
    pg_restore -U "$DB_USER" -d "$DB_NAME" \
      --clean --if-exists --no-owner --no-acl --single-transaction \
      /tmp/hcl-restore.dump > "$RESTORE_LOG" 2>&1
  RESTORE_RC=$?
else
  $CRT exec -e PGPASSWORD="$DB_PASSWORD" "$DB_CONTAINER" \
    psql -U "$DB_USER" -d "$DB_NAME" --set ON_ERROR_STOP=off \
    -f /tmp/hcl-restore.dump > "$RESTORE_LOG" 2>&1
  RESTORE_RC=$?
fi
set -e

$CRT exec "$DB_CONTAINER" rm -f /tmp/hcl-restore.dump >/dev/null 2>&1 || true

if [ "$RESTORE_RC" -ne 0 ]; then
  warn "Restore finished with a non-zero exit code ($RESTORE_RC)"
  warn "Review $RESTORE_LOG — errors about missing roles or DROP statements are usually harmless"
else
  ok "Database restored from $(basename "$DUMP_FILE")"
fi

# ── Sanity check: Prisma migration history ───────────────────────────────────
HAS_MIGRATIONS=$($CRT exec -e PGPASSWORD="$DB_PASSWORD" "$DB_CONTAINER" \
  psql -U "$DB_USER" -d "$DB_NAME" -tAc \
  "SELECT to_regclass('public._prisma_migrations') IS NOT NULL;" 2>/dev/null | tr -d '[:space:]' || true)

if [ "$HAS_MIGRATIONS" = "t" ]; then
  ok "Prisma migration history present — 'prisma migrate deploy' will apply only new migrations"
else
  warn "Restored dump has no _prisma_migrations table"
  info "The API will try to apply every migration on boot, which can fail on existing tables."
  info "If the API crash-loops, run: $CRT exec $API_CONTAINER npx prisma migrate resolve --applied <migration>"
fi

TABLE_COUNT=$($CRT exec -e PGPASSWORD="$DB_PASSWORD" "$DB_CONTAINER" \
  psql -U "$DB_USER" -d "$DB_NAME" -tAc \
  "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';" 2>/dev/null | tr -d '[:space:]' || true)
ok "Database now contains ${TABLE_COUNT:-?} tables in schema public"

# ── Optional OIDC config bundled alongside the dump ──────────────────────────
OIDC_FILE="$(dirname "$DUMP_FILE")/oidc-config.json"
if [ -f "$OIDC_FILE" ]; then
  $CRT cp "$OIDC_FILE" "${API_CONTAINER}:/app/data/oidc-config.json" >/dev/null 2>&1 \
    && ok "Okta/OIDC configuration restored" \
    || warn "Could not copy oidc-config.json into the API container"
fi

# ── Resume the API ───────────────────────────────────────────────────────────
if [ "$API_WAS_RUNNING" = true ]; then
  info "Restarting API..."
  $CRT start "$API_CONTAINER" >/dev/null 2>&1 || warn "Could not restart $API_CONTAINER"
fi

ok "Restore complete. Log: $RESTORE_LOG"
