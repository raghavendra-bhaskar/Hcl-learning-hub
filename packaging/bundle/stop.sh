#!/bin/bash
# ============================================================
# HCL Software Learning Hub — Stop (Linux)
#
# Stops the web, API and database tiers in reverse dependency order.
# Containers and volumes are preserved — no data is lost.
#
# Usage: sudo bash stop.sh [--remove]
#   --remove   Also delete the containers (volumes are kept).
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"
load_bundle_env "$SCRIPT_DIR/bundle.env"

REMOVE=false
[ "${1:-}" = "--remove" ] && REMOVE=true

detect_runtime || fail "No container runtime available (docker/podman)"

banner "Stopping ${APP_NAME}"

# Reverse order: web first so users stop hitting a half-stopped API.
for NAME in "$WEB_CONTAINER" "$API_CONTAINER" "$DB_CONTAINER"; do
  if container_running "$NAME"; then
    $CRT stop -t 20 "$NAME" >/dev/null
    ok "$NAME stopped"
  elif container_exists "$NAME"; then
    ok "$NAME already stopped"
  else
    warn "$NAME does not exist"
  fi
done

if [ "$REMOVE" = true ]; then
  for NAME in "$WEB_CONTAINER" "$API_CONTAINER" "$DB_CONTAINER"; do
    $CRT rm -f "$NAME" >/dev/null 2>&1 && ok "$NAME removed" || true
  done
  warn "Containers removed. Volumes ${DB_VOLUME} and ${API_VOLUME} were kept."
  info "Re-create the stack with: sudo bash install.sh --skip-db-restore"
fi

ok "All services stopped. Data volumes are intact."
