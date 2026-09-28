#!/bin/bash
# ============================================================
# HCL Software Learning Hub — Start (source deployment)
#
# ONE command starts everything: PostgreSQL, the API and the UI.
# You never need to run "npm run dev" in AI-Quest and again in server/ —
# the root dev script already runs both, and this wraps it as a
# background service with logs, a PID file and health checks.
#
# Usage:
#   bash deploy/start.sh [--foreground]
#
#   --foreground   Run attached to this terminal (Ctrl+C stops it)
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

FOREGROUND=false
if [ "${1:-}" = "--foreground" ]; then FOREGROUND=true; fi

# shellcheck disable=SC1091
if [ -f "$SCRIPT_DIR/hub.env" ]; then . "$SCRIPT_DIR/hub.env"; fi
SERVER_FQDN="${SERVER_FQDN:-$(hostname -f 2>/dev/null || hostname)}"
UI_PORT="${UI_PORT:-5173}"
API_PORT="${API_PORT:-4000}"
PG_SERVICE="${PG_SERVICE:-postgresql}"
EXTERNAL_DB="${EXTERNAL_DB:-false}"
# PGDG installs psql/pg_dump outside /usr/bin.
if [ -n "${PG_BIN:-}" ]; then export PATH="$PG_BIN:$PATH"; fi

LOG_DIR="$INSTALL_DIR/logs"
RUN_DIR="$INSTALL_DIR/run"
PID_FILE="$RUN_DIR/hub.pid"
LOG_FILE="$LOG_DIR/hub.log"
mkdir -p "$LOG_DIR" "$RUN_DIR"

cd "$INSTALL_DIR"

banner "Starting ${APP_NAME:-hcl-learning-hub}"

# ── Guard: already running? ──────────────────────────────────────────────────
if [ -f "$PID_FILE" ]; then
  EXISTING="$(cat "$PID_FILE" 2>/dev/null || true)"
  if [ -n "$EXISTING" ] && kill -0 "$EXISTING" 2>/dev/null; then
    warn "Already running (PID $EXISTING). Stop it first: bash deploy/stop.sh"
    exit 0
  fi
  rm -f "$PID_FILE"
fi

# ── PostgreSQL ───────────────────────────────────────────────────────────────
if [ "$EXTERNAL_DB" = true ]; then
  ok "Using an external database — not managing a local service"
elif command -v systemctl >/dev/null 2>&1; then
  if systemctl is-active --quiet "$PG_SERVICE" 2>/dev/null; then
    ok "PostgreSQL is running ($PG_SERVICE)"
  else
    info "Starting PostgreSQL ($PG_SERVICE)..."
    sudo systemctl start "$PG_SERVICE" || fail "Could not start $PG_SERVICE"
    ok "PostgreSQL started"
  fi
fi

# ── Dependency sanity check ──────────────────────────────────────────────────
[ -d node_modules ]        || fail "node_modules missing. Run: npm install"
[ -d server/node_modules ] || fail "server/node_modules missing. Run: npm install --prefix server"
[ -f server/.env ]         || fail "server/.env missing. Re-run deploy/install.sh"

# A client generated on another OS fails at the first query, not at startup.
# Every Linux engine is named libquery_engine-<target>.so.node.
if [ -d server/node_modules/.prisma/client ]; then
  if ! ls server/node_modules/.prisma/client/libquery_engine-*.so.node >/dev/null 2>&1; then
    warn "Prisma client has no Linux query engine — regenerating..."
    npm run prisma:generate --prefix server >/dev/null
    ok "Prisma client regenerated"
  fi
else
  info "Generating the Prisma client..."
  npm run prisma:generate --prefix server >/dev/null
fi

# ── Free the ports ───────────────────────────────────────────────────────────
for PORT in "$API_PORT" "$UI_PORT"; do
  PIDS="$(lsof -ti:"$PORT" 2>/dev/null || true)"
  if [ -n "$PIDS" ]; then
    warn "Port $PORT in use — freeing it"
    echo "$PIDS" | xargs -r kill -9 2>/dev/null || true
    sleep 1
  fi
done

# ── Launch ───────────────────────────────────────────────────────────────────
if [ "$FOREGROUND" = true ]; then
  info "Running in the foreground — press Ctrl+C to stop"
  exec npm run dev
fi

info "Starting API + UI (single process group)..."
# setsid puts npm and all its children in one process group so stop.sh can
# terminate the whole tree, not just the npm wrapper.
if command -v setsid >/dev/null 2>&1; then
  setsid nohup npm run dev >> "$LOG_FILE" 2>&1 < /dev/null &
else
  nohup npm run dev >> "$LOG_FILE" 2>&1 < /dev/null &
fi
APP_PID=$!
echo "$APP_PID" > "$PID_FILE"
ok "Launched (PID $APP_PID), logging to $LOG_FILE"

# ── Health checks ────────────────────────────────────────────────────────────
info "Waiting for the API on port ${API_PORT}..."
API_UP=false
for _ in $(seq 1 45); do
  if curl -skf "http://127.0.0.1:${API_PORT}/health" >/dev/null 2>&1; then API_UP=true; break; fi
  if ! kill -0 "$APP_PID" 2>/dev/null; then break; fi
  sleep 2
done
[ "$API_UP" = true ] && ok "API is responding" || warn "API did not respond yet"

info "Waiting for the UI on port ${UI_PORT}..."
UI_UP=false
for _ in $(seq 1 45); do
  if curl -skf "https://127.0.0.1:${UI_PORT}/" >/dev/null 2>&1 \
     || curl -sf "http://127.0.0.1:${UI_PORT}/" >/dev/null 2>&1; then UI_UP=true; break; fi
  if ! kill -0 "$APP_PID" 2>/dev/null; then break; fi
  sleep 2
done
[ "$UI_UP" = true ] && ok "UI is responding" || warn "UI did not respond yet"

if ! kill -0 "$APP_PID" 2>/dev/null; then
  rm -f "$PID_FILE"
  echo ""
  tail -n 30 "$LOG_FILE" || true
  fail "The Hub exited during startup. Full log: $LOG_FILE"
fi

banner "Running"
cat <<SUMMARY

  Application : https://${SERVER_FQDN}:${UI_PORT}
  API health  : https://${SERVER_FQDN}:${API_PORT}/health
  Logs        : tail -f ${LOG_FILE}
  Stop        : bash ${INSTALL_DIR}/deploy/stop.sh

SUMMARY

if [ "$API_UP" != true ] || [ "$UI_UP" != true ]; then
  warn "Something is still starting — check the log above."
fi
