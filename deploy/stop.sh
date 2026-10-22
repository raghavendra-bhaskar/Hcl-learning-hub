#!/bin/bash
# ============================================================
# HCL Software Learning Hub — Stop
#
# Stops the application.  Detects deployment mode automatically:
#   kubernetes  — scales down api + web Deployments (keeps PostgreSQL)
#   source      — kills the npm process / frees ports
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
if [ "${1:-}" = "--with-db" ]; then WITH_DB=true; fi

# shellcheck disable=SC1091
if [ -f "$SCRIPT_DIR/hub.env" ]; then . "$SCRIPT_DIR/hub.env"; fi

# ── Container mode ────────────────────────────────────────────────────────────
if [ "${DEPLOY_MODE:-}" = "containers" ]; then
  ENGINE="${CONTAINER_ENGINE:-podman}"
  command -v "$ENGINE" >/dev/null 2>&1 || { warn "Container engine not found: $ENGINE"; exit 1; }
  DB_CONTAINER_NAME="${DB_CONTAINER_NAME:-hcl-hub-postgres}"
  API_CONTAINER_NAME="${API_CONTAINER_NAME:-hcl-hub-api}"
  WEB_CONTAINER_NAME="${WEB_CONTAINER_NAME:-hcl-hub-web}"

  banner "Stopping ${APP_NAME:-hcl-learning-hub} (Containers)"

  info "Stopping application containers ..."
  "$ENGINE" stop "$WEB_CONTAINER_NAME" "$API_CONTAINER_NAME" >/dev/null 2>&1 || true
  ok "Application containers stopped"

  if [ "$WITH_DB" = true ]; then
    info "Stopping PostgreSQL container ..."
    "$ENGINE" stop "$DB_CONTAINER_NAME" >/dev/null 2>&1 || true
    ok "PostgreSQL stopped"
  else
    info "PostgreSQL keeps running (use --with-db to stop it too)"
  fi

  ok "Stopped. All data is intact."
  exit 0
fi

# ── Kubernetes mode ───────────────────────────────────────────────────────────
if [ "${DEPLOY_MODE:-}" = "kubernetes" ]; then
  K8S_NS="${K8S_NAMESPACE:-hcl-learning-hub}"
  export KUBECONFIG="${KUBECONFIG:-$HOME/.kube/config}"
  KUBECTL="${KUBECTL_BIN:-}"
  if [ -z "$KUBECTL" ] || [ ! -x "$KUBECTL" ]; then
    if [ -x /usr/local/bin/kubectl ]; then
      KUBECTL="/usr/local/bin/kubectl"
    elif command -v kubectl >/dev/null 2>&1; then
      KUBECTL="$(command -v kubectl)"
    else
      warn "kubectl not found"
      exit 1
    fi
  fi

  banner "Stopping ${APP_NAME:-hcl-learning-hub} (Kubernetes)"

  info "Scaling API and web deployments to 0 ..."
  $KUBECTL scale deployment/api deployment/web -n "$K8S_NS" --replicas=0 \
    2>/dev/null && ok "API and web pods stopped" || warn "kubectl scale failed — pods may still be running"

  if [ "$WITH_DB" = true ]; then
    info "Scaling PostgreSQL StatefulSet to 0 ..."
    $KUBECTL scale statefulset/postgres -n "$K8S_NS" --replicas=0 2>/dev/null \
      && ok "PostgreSQL stopped" || warn "kubectl scale postgres failed"
  else
    info "PostgreSQL keeps running (use --with-db to stop it too)"
  fi

  ok "Stopped. All data is intact."
  exit 0
fi

# ── Source / process mode (legacy) ───────────────────────────────────────────
UI_PORT="${UI_PORT:-5173}"
API_PORT="${API_PORT:-4000}"
PG_SERVICE="${PG_SERVICE:-postgresql}"
EXTERNAL_DB="${EXTERNAL_DB:-false}"
DB_CONTAINER_NAME="${DB_CONTAINER_NAME:-hcl-postgres}"
DB_CONTAINER_ENGINE="${DB_CONTAINER_ENGINE:-}"
# shellcheck disable=SC1091
if [ -f "$SCRIPT_DIR/db-runtime.sh" ]; then . "$SCRIPT_DIR/db-runtime.sh"; fi

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
  stop_db_runtime
else
  info "PostgreSQL left running (use --with-db to stop it as well)"
fi

ok "Stopped. All data is intact."
