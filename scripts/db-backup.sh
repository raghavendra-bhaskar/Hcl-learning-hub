#!/bin/bash
# ============================================================
# HCL Software Learning Hub — Database Backup Script
# Author:  B Raghavendra <raghavendrab@hcl-software.com>
#
# Run this BEFORE decommissioning a VM to preserve all data:
#   users, progress, badges, certifications, courses, settings,
#   learning paths, Okta config, help session settings.
#
# Usage:
#   sudo bash scripts/db-backup.sh [backup-dir]
#
# Default backup dir: /product/backups
# Output:  hcl-hub-db-YYYYMMDD-HHMMSS.sql  (SQL dump)
#          hcl-hub-credentials-YYYYMMDD.txt (copy of .deploy-credentials)
#
# After backup — copy to safe storage:
#   scp /product/backups/hcl-hub-db-*.sql  user@safe-host:/backups/
#
# Restore on new VM (after running setup script):
#   sudo bash scripts/db-restore.sh /path/to/hcl-hub-db-YYYYMMDD-HHMMSS.sql
# ============================================================

set -e

BACKUP_DIR="${1:-/product/backups}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUP_DIR/hcl-hub-db-${TIMESTAMP}.sql"
INSTALL_DIR="${INSTALL_DIR:-/product/hcl-learning-hub}"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; CYAN='\033[0;36m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✓${NC} $*"; }
warn() { echo -e "${YELLOW}⚠${NC} $*"; }
fail() { echo -e "${RED}✗ ERROR:${NC} $*"; exit 1; }
info() { echo -e "  ${CYAN}→${NC} $*"; }

echo ""
echo "  HCL Software Learning Hub — DB Backup"
echo "  ======================================"
echo "  Timestamp:  $TIMESTAMP"
echo "  Output dir: $BACKUP_DIR"
echo ""

mkdir -p "$BACKUP_DIR"

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

# ── Perform the dump ──────────────────────────────────────────────────────────
case "$DEPLOY_MODE" in
  k3s)
    info "Dumping PostgreSQL via k3s exec..."
    # Wait for postgres pod to be ready
    k3s kubectl wait --for=condition=Ready pod -l app=postgres \
      -n hcl-learning-hub --timeout=30s 2>/dev/null || true
    k3s kubectl exec -n hcl-learning-hub statefulset/postgres -- \
      pg_dump -U hcluser -d hclhub \
      --no-owner --no-acl --clean --if-exists \
      > "$BACKUP_FILE"
    ;;
  podman)
    info "Dumping PostgreSQL via podman exec..."
    podman exec hcl-postgres \
      pg_dump -U hcluser -d hclhub \
      --no-owner --no-acl --clean --if-exists \
      > "$BACKUP_FILE"
    ;;
  docker)
    info "Dumping PostgreSQL via docker exec..."
    docker exec hcl-postgres \
      pg_dump -U hcluser -d hclhub \
      --no-owner --no-acl --clean --if-exists \
      > "$BACKUP_FILE"
    ;;
  *)
    # Fallback: try psql directly if postgres is local
    if command -v pg_dump &>/dev/null; then
      warn "No container runtime detected — trying local pg_dump..."
      pg_dump -U hcluser -d hclhub \
        --no-owner --no-acl --clean --if-exists \
        > "$BACKUP_FILE" 2>/dev/null \
        || fail "Could not connect to PostgreSQL. Ensure hcl-postgres container is running."
    else
      fail "No running PostgreSQL found.\n  Detected mode: $DEPLOY_MODE\n  Ensure hcl-postgres container is running:\n    k3s kubectl get pods -n hcl-learning-hub\n    podman ps"
    fi
    ;;
esac

BACKUP_SIZE=$(du -sh "$BACKUP_FILE" 2>/dev/null | cut -f1)
ok "SQL dump saved: $BACKUP_FILE  ($BACKUP_SIZE)"

# ── Verify dump is non-empty ──────────────────────────────────────────────────
if [ ! -s "$BACKUP_FILE" ]; then
  fail "Backup file is empty — something went wrong with pg_dump"
fi

# Count approximate tables backed up
TABLE_COUNT=$(grep -c '^CREATE TABLE\|^COPY ' "$BACKUP_FILE" 2>/dev/null || echo "?")
info "Tables found in dump: ~${TABLE_COUNT}"

# ── Copy credentials file ─────────────────────────────────────────────────────
CREDS_SRC="$INSTALL_DIR/.deploy-credentials"
if [ -f "$CREDS_SRC" ]; then
  CREDS_COPY="$BACKUP_DIR/hcl-hub-credentials-${TIMESTAMP}.txt"
  cp "$CREDS_SRC" "$CREDS_COPY"
  chmod 600 "$CREDS_COPY"
  ok "Credentials copied: $CREDS_COPY"
else
  warn ".deploy-credentials not found at $CREDS_SRC (backup still complete)"
fi

# ── Also backup oidc-config.json if present ───────────────────────────────────
OIDC_SRC="$INSTALL_DIR/server/data/oidc-config.json"
if [ -f "$OIDC_SRC" ]; then
  cp "$OIDC_SRC" "$BACKUP_DIR/oidc-config-${TIMESTAMP}.json"
  ok "OIDC config backed up: oidc-config-${TIMESTAMP}.json"
fi

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "  ========================================"
echo -e "  ${GREEN}Backup complete!${NC}"
echo ""
echo "  Files saved to: $BACKUP_DIR"
ls -lh "$BACKUP_DIR/hcl-hub-"*"-${TIMESTAMP}"* 2>/dev/null | awk '{print "    "$NF, $5}'
echo ""
echo "  IMPORTANT — Copy these files to safe storage before decommissioning:"
echo "    scp $BACKUP_FILE  user@safe-host:/backups/"
echo ""
echo "  To restore on a new VM (after running the setup script):"
echo "    sudo bash ${INSTALL_DIR}/scripts/db-restore.sh $BACKUP_FILE"
echo "  ========================================"
echo ""
