#!/bin/bash
# ============================================================
# HCL Software Learning Hub — Start (Linux)
#
# Starts the database, API and web tiers in dependency order.
# Safe to run repeatedly; already-running containers are left alone.
#
# Usage: sudo bash start.sh [--quiet]
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"
load_bundle_env "$SCRIPT_DIR/bundle.env"

HCL_CREDS_FILE="$SCRIPT_DIR/.deploy-credentials"
QUIET=false
[ "${1:-}" = "--quiet" ] && QUIET=true

detect_runtime || fail "No container runtime available (docker/podman)"

banner "Starting ${APP_NAME}"

for NAME in "$DB_CONTAINER" "$API_CONTAINER" "$WEB_CONTAINER"; do
  container_exists "$NAME" \
    || fail "Container '$NAME' does not exist. Run the installer first: sudo bash install.sh"
done

if container_running "$DB_CONTAINER"; then
  ok "Database already running"
else
  $CRT start "$DB_CONTAINER" >/dev/null
  ok "Database started"
fi

info "Waiting for PostgreSQL..."
wait_for_postgres 60 || fail "PostgreSQL did not become ready. Check: $CRT logs $DB_CONTAINER"
ok "PostgreSQL ready"

for NAME in "$API_CONTAINER" "$WEB_CONTAINER"; do
  if container_running "$NAME"; then
    ok "$NAME already running"
  else
    $CRT start "$NAME" >/dev/null
    ok "$NAME started"
  fi
done

if [ "$QUIET" = false ]; then
  info "Waiting for the web tier to answer..."
  HOST=$(read_cred SERVER_HOST "$HCL_CREDS_FILE" || echo localhost)
  if wait_for_http 45; then
    ok "Learning Hub is up: http://${HOST}:${HTTP_PORT}"
  else
    warn "Web tier not responding yet — the API may still be applying migrations"
    info "Check: $CRT logs -f $API_CONTAINER"
  fi
  echo ""
  $CRT ps --filter "name=hcl-" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || true
  echo ""
fi
