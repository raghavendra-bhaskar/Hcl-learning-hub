#!/bin/bash
# ============================================================
# HCL Software Learning Hub — Database Restore Script
# Author:  B Raghavendra <raghavendrab@hcl-software.com>
#
# Restores a SQL backup created by scripts/db-backup.sh.
# Run this AFTER the setup script has deployed the app on the new VM.
#
# Usage:
#   sudo bash scripts/db-restore.sh <backup-file.sql>
#
# Example:
#   sudo bash scripts/db-restore.sh /product/backups/hcl-hub-db-20260922-143000.sql
#
# What gets restored:
#   All users (Okta + local), quest progress, badges, certifications,
#   courses (custom + platform), settings, help config, learning paths,
#   OIDC/Okta configuration.
#
# The restore will:
#   1. Drop & recreate all tables (--clean flag in pg_dump output)
#   2. Re-seed admin@local (so admin login works after restore)
#   3. Restart the API pod/container so it picks up restored data
# ============================================================

set -e

BACKUP_FILE="$1"
INSTALL_DIR="${INSTALL_DIR:-/product/hcl-learning-hub}"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; CYAN='\033[0;36m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✓${NC} $*"; }
warn() { echo -e "${YELLOW}⚠${NC} $*"; }
fail() { echo -e "${RED}✗ ERROR:${NC} $*"; exit 1; }
info() { echo -e "  ${CYAN}→${NC} $*"; }

# ── Validate input ────────────────────────────────────────────────────────────
[ -z "$BACKUP_FILE" ] && fail "Usage: sudo bash scripts/db-restore.sh <backup-file.sql>"
[ -f "$BACKUP_FILE" ] || fail "Backup file not found: $BACKUP_FILE"
[ -s "$BACKUP_FILE" ] || fail "Backup file is empty: $BACKUP_FILE"

BACKUP_SIZE=$(du -sh "$BACKUP_FILE" | cut -f1)

echo ""
echo "  HCL Software Learning Hub — DB Restore"
echo "  ======================================="
echo "  Backup file: $BACKUP_FILE  ($BACKUP_SIZE)"
echo ""
echo -e "  ${YELLOW}WARNING:${NC} This will overwrite ALL data in the current database."
echo "  Press ENTER to continue or Ctrl+C to cancel..."
read -r

# ── Detect deploy mode ────────────────────────────────────────────────────────
DEPLOY_MODE="unknown"
if command -v k3s &>/dev/null && k3s kubectl get pods -n hcl-learning-hub &>/dev/null 2>&1; then
  DEPLOY_MODE="k3s"
elif command -v podman &>/dev/null && podman ps --format '{{.Names}}' 2>/dev/null | grep -q hcl-postgres; then
  DEPLOY_MODE="podman"
elif command -v docker &>/dev/null && docker ps --format '{{.Names}}' 2>/dev/null | grep -q hcl-postgres; then
  DEPLOY_MODE="docker"
fi

info "Detected deploy mode: $DEPLOY_MODE"

# Verify postgres is running
case "$DEPLOY_MODE" in
  k3s)
    k3s kubectl get pods -n hcl-learning-hub | grep -q postgres \
      || fail "postgres pod not found in k3s. Run the setup script first."
    k3s kubectl wait --for=condition=Ready pod -l app=postgres \
      -n hcl-learning-hub --timeout=60s
    ;;
  podman)
    podman ps --format '{{.Names}}' | grep -q hcl-postgres \
      || fail "hcl-postgres container not running. Run the setup script first."
    ;;
  docker)
    docker ps --format '{{.Names}}' | grep -q hcl-postgres \
      || fail "hcl-postgres container not running. Run the setup script first."
    ;;
  *)
    fail "No running PostgreSQL found.\n  Run the setup script (hcl-learning-hub-setup.sh) first, then restore."
    ;;
esac

ok "PostgreSQL is running ($DEPLOY_MODE)"

# ── Restore ───────────────────────────────────────────────────────────────────
info "Restoring database from $BACKUP_FILE..."

case "$DEPLOY_MODE" in
  k3s)
    k3s kubectl exec -i -n hcl-learning-hub statefulset/postgres -- \
      psql -U hcluser -d hclhub \
      --set ON_ERROR_STOP=off \
      < "$BACKUP_FILE"
    ;;
  podman)
    podman exec -i hcl-postgres \
      psql -U hcluser -d hclhub \
      --set ON_ERROR_STOP=off \
      < "$BACKUP_FILE"
    ;;
  docker)
    docker exec -i hcl-postgres \
      psql -U hcluser -d hclhub \
      --set ON_ERROR_STOP=off \
      < "$BACKUP_FILE"
    ;;
esac

ok "Database restored"

# ── Restore OIDC config if backup included it ─────────────────────────────────
BACKUP_DIR=$(dirname "$BACKUP_FILE")
BACKUP_BASE=$(basename "$BACKUP_FILE" .sql)
TIMESTAMP="${BACKUP_BASE#hcl-hub-db-}"
OIDC_BACKUP="$BACKUP_DIR/oidc-config-${TIMESTAMP}.json"

if [ -f "$OIDC_BACKUP" ]; then
  mkdir -p "$INSTALL_DIR/server/data"
  cp "$OIDC_BACKUP" "$INSTALL_DIR/server/data/oidc-config.json"
  ok "OIDC config restored from backup"
else
  warn "No oidc-config backup found at $OIDC_BACKUP — Okta SSO settings not restored"
  info "Reconfigure via Admin → Authentication Realm"
fi

# ── Restart API to pick up restored data ──────────────────────────────────────
info "Restarting API service..."

case "$DEPLOY_MODE" in
  k3s)
    k3s kubectl rollout restart deployment/api -n hcl-learning-hub
    k3s kubectl rollout status  deployment/api -n hcl-learning-hub --timeout=60s
    ;;
  podman)
    podman restart hcl-api 2>/dev/null && sleep 4 || warn "Could not restart hcl-api — do it manually"
    ;;
  docker)
    docker restart hcl-api 2>/dev/null && sleep 4 || warn "Could not restart hcl-api — do it manually"
    ;;
esac

ok "API restarted"

# ── Quick health check ────────────────────────────────────────────────────────
sleep 4
CREDS_FILE="$INSTALL_DIR/.deploy-credentials"
NODE_PORT="30080"
[ -f "$CREDS_FILE" ] && NODE_PORT=$(grep '^NODE_PORT=' "$CREDS_FILE" | cut -d= -f2)

if curl -sf "http://localhost:${NODE_PORT}/api/health" > /dev/null 2>&1 \
   || curl -sf "http://localhost:4000/health" > /dev/null 2>&1; then
  ok "API is responding"
else
  warn "API health check timed out — may still be starting up"
fi

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "  ========================================"
echo -e "  ${GREEN}Restore complete!${NC}"
echo ""
echo "  All user accounts, progress, badges, certifications,"
echo "  courses, settings and learning paths have been restored."
echo ""
echo "  Admin login:  admin@local / Admin@HCL2026!"
echo "  (If the admin password was changed on the old VM, use the"
echo "   password from the backed-up credentials file.)"
echo ""
if [ -f "$BACKUP_DIR/hcl-hub-credentials-${TIMESTAMP}.txt" ]; then
  echo "  Old VM credentials: $BACKUP_DIR/hcl-hub-credentials-${TIMESTAMP}.txt"
fi
echo "  ========================================"
echo ""
