#!/bin/bash
# ============================================================
# HCL Software Learning Hub — Stop (source deployment)
#
# Stops the UI and the API in one command. PostgreSQL keeps running
# (it is a system service) unless --with-db is given. No data is lost.
#
# Usage:
#   bash deploy/stop.sh [--with-db]
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
ok()     { echo -e "${GREEN}[ OK ]${NC} $*"; }
warn()   { echo -e "${YELLOW}[WARN]${NC} $*"; }
info()   { echo -e "  ${CYAN}->${NC} $*"; }
banner() { echo ""; echo "========================================"; echo "  $1"; echo "========================================"; }

WITH_DB=false
[ "${1:-}" = "--with-db" ] && WITH_DB=true

# shellcheck disable=SC1091
[ -f "$SCRIPT_DIR/hub.env" ] && . "$SCRIPT_DIR/hub.env"
UI_PORT="${UI_PORT:-5173}"
API_PORT="${API_PORT:-4000}"

PID_FILE="$INSTALL_DIR/run/hub.pid"

banner "Stopping ${APP_NAME:-hcl-learning-hub}"

STOPPED=false

# ── Terminate the whole process group recorded by start.sh ───────────────────
if [ -f "$PID_FILE" ]; then
  APP_PID="$(cat "$PID_FILE" 2>/dev/null || true)"
  if [ -n "$APP_PID" ] && kill -0 "$APP_PID" 2>/dev/null; then
    PGID="$(ps -o pgid= -p "$APP_PID" 2>/dev/null | tr -d ' ' || true)"
    if [ -n "$PGID" ]; then
      info "Sending SIGTERM to process group $PGID..."
      kill -TERM -"$PGID" 2>/dev/null || true
      for _ in $(seq 1 15); do
        kill -0 "$APP_PID" 2>/dev/null || break
        sleep 1
      done
      if kill -0 "$APP_PID" 2>/dev/null; then
        warn "Still alive — sending SIGKILL"
        kill -KILL -"$PGID" 2>/dev/null || true
      fi
    else
      kill -TERM "$APP_PID" 2>/dev/null || true
    fi
    STOPPED=true
    ok "Application process group stopped"
  else
    info "Recorded PID is no longer running"
  fi
  rm -f "$PID_FILE"
fi

# ── Fallback: anything still holding the ports ───────────────────────────────
for PORT in "$UI_PORT" "$API_PORT"; do
  PIDS="$(lsof -ti:"$PORT" 2>/dev/null || true)"
  if [ -n "$PIDS" ]; then
    info "Freeing port $PORT..."
    echo "$PIDS" | xargs -r kill -9 2>/dev/null || true
    STOPPED=true
    ok "Port $PORT released"
  else
    ok "Port $PORT is free"
  fi
done

[ "$STOPPED" = true ] || info "Nothing was running"

# ── Optional: stop PostgreSQL too ────────────────────────────────────────────
if [ "$WITH_DB" = true ]; then
  info "Stopping PostgreSQL..."
  sudo systemctl stop postgresql && ok "PostgreSQL stopped" || warn "Could not stop PostgreSQL"
else
  info "PostgreSQL left running (use --with-db to stop it as well)"
fi

ok "Stopped. All data is intact."
