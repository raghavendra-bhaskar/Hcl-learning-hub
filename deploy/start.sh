#!/bin/bash
# ============================================================
# HCL Software Learning Hub — Start
#
# Starts the application. Detects deployment mode automatically:
#   kubernetes  — scales up Deployments via kubectl
#   source      — starts PostgreSQL + API + UI via npm run dev
#
# Usage:
#   bash deploy/start.sh [--foreground]
#
#   --foreground   (source mode only) run in the foreground
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

# ── Container mode ────────────────────────────────────────────────────────────
if [ "${DEPLOY_MODE:-}" = "containers" ]; then
  ENGINE="${CONTAINER_ENGINE:-podman}"
  command -v "$ENGINE" >/dev/null 2>&1 || fail "Container engine not found: $ENGINE"
  NETWORK_NAME="${NETWORK_NAME:-hcl-hub-net}"
  DB_CONTAINER_NAME="${DB_CONTAINER_NAME:-hcl-hub-postgres}"
  API_CONTAINER_NAME="${API_CONTAINER_NAME:-hcl-hub-api}"
  WEB_CONTAINER_NAME="${WEB_CONTAINER_NAME:-hcl-hub-web}"
  DB_VOLUME="${DB_VOLUME:-hcl-hub-postgres-data}"
  API_VOLUME="${API_VOLUME:-hcl-hub-api-data}"
  HTTPS_PORT="${HTTPS_PORT:-443}"
  HTTP_PORT="${HTTP_PORT:-80}"
  CREDS="$INSTALL_DIR/.deploy-credentials"
  [ -f "$CREDS" ] || fail "Missing $CREDS"
  DB_PASSWORD="$(grep -E '^DB_PASSWORD=' "$CREDS" | head -1 | cut -d= -f2-)"
  JWT_SECRET="$(grep -E '^JWT_SECRET=' "$CREDS" | head -1 | cut -d= -f2-)"
  ADMIN_PASSWORD="$(grep -E '^ADMIN_PASSWORD=' "$CREDS" | head -1 | cut -d= -f2-)"
  [ -n "$DB_PASSWORD" ] || fail "DB_PASSWORD not found in $CREDS"
  RUNTIME_DIR="$INSTALL_DIR/deploy/runtime"
  CERT_DIR="$RUNTIME_DIR/certs"

  banner "Starting ${APP_NAME:-hcl-learning-hub} (Containers)"

  "$ENGINE" network inspect "$NETWORK_NAME" >/dev/null 2>&1 || "$ENGINE" network create "$NETWORK_NAME" >/dev/null

  if "$ENGINE" ps -a --format '{{.Names}}' 2>/dev/null | grep -Fxq "$DB_CONTAINER_NAME"; then
    "$ENGINE" start "$DB_CONTAINER_NAME" >/dev/null 2>&1 || true
  else
    "$ENGINE" run -d \
      --name "$DB_CONTAINER_NAME" \
      --network "$NETWORK_NAME" \
      --restart unless-stopped \
      -e POSTGRES_DB="${DB_NAME:-hcl_learning_hub}" \
      -e POSTGRES_USER="${DB_USER:-hcl_hub}" \
      -e POSTGRES_PASSWORD="$DB_PASSWORD" \
      -v "$DB_VOLUME:/var/lib/postgresql/data" \
      postgres:16-alpine >/dev/null || fail "Could not start PostgreSQL container"
  fi

  for _ in $(seq 1 60); do
    if "$ENGINE" exec "$DB_CONTAINER_NAME" pg_isready -U "${DB_USER:-hcl_hub}" -d "${DB_NAME:-hcl_learning_hub}" >/dev/null 2>&1; then break; fi
    sleep 2
  done
  "$ENGINE" exec "$DB_CONTAINER_NAME" pg_isready -U "${DB_USER:-hcl_hub}" -d "${DB_NAME:-hcl_learning_hub}" >/dev/null 2>&1 \
    || fail "PostgreSQL container did not become ready"
  ok "PostgreSQL ready"

  "$ENGINE" rm -f "$API_CONTAINER_NAME" >/dev/null 2>&1 || true
  "$ENGINE" run -d \
    --name "$API_CONTAINER_NAME" \
    --network "$NETWORK_NAME" \
    --restart unless-stopped \
    -e DATABASE_URL="postgresql://${DB_USER:-hcl_hub}:${DB_PASSWORD}@${DB_CONTAINER_NAME}:5432/${DB_NAME:-hcl_learning_hub}" \
    -e NODE_ENV=production \
    -e PORT=4000 \
    -e FRONTEND_ORIGIN="https://${SERVER_FQDN}" \
    -e ENABLE_LOCAL_ADMIN=true \
    -e LOCAL_ADMIN_USERNAME=admin \
    -e LOCAL_ADMIN_PASSWORD="$ADMIN_PASSWORD" \
    -e LOCAL_ADMIN_JWT_SECRET="$JWT_SECRET" \
    -v "$API_VOLUME:/app/data" \
    hcl-hub/api:latest >/dev/null || fail "Could not start API container"
  ok "API container started"

  [ -f "$RUNTIME_DIR/nginx.ssl.conf" ] || fail "Missing $RUNTIME_DIR/nginx.ssl.conf"
  [ -f "$CERT_DIR/tls.crt" ] || fail "Missing TLS cert: $CERT_DIR/tls.crt"
  [ -f "$CERT_DIR/tls.key" ] || fail "Missing TLS key: $CERT_DIR/tls.key"
  "$ENGINE" rm -f "$WEB_CONTAINER_NAME" >/dev/null 2>&1 || true
  "$ENGINE" run -d \
    --name "$WEB_CONTAINER_NAME" \
    --network "$NETWORK_NAME" \
    --restart unless-stopped \
    -p "${HTTP_PORT}:80" \
    -p "${HTTPS_PORT}:443" \
    -v "$RUNTIME_DIR/nginx.ssl.conf:/etc/nginx/conf.d/default.conf:ro" \
    -v "$CERT_DIR:/etc/nginx/certs:ro" \
    hcl-hub/web:latest >/dev/null || fail "Could not start web container"
  ok "Web container started"

  banner "Running"
  cat <<CONTAINER_SUMMARY

  Application : https://${SERVER_FQDN}
  Logs (API)  : $ENGINE logs -f ${API_CONTAINER_NAME}
  Logs (web)  : $ENGINE logs -f ${WEB_CONTAINER_NAME}
  Stop        : bash ${INSTALL_DIR}/deploy/stop.sh

CONTAINER_SUMMARY
  exit 0
fi

# ── Kubernetes mode ───────────────────────────────────────────────────────────
if [ "${DEPLOY_MODE:-}" = "kubernetes" ]; then
  K8S_NS="${K8S_NAMESPACE:-hcl-learning-hub}"
  API_REPLICAS="${API_REPLICAS:-1}"
  WEB_REPLICAS="${WEB_REPLICAS:-1}"
  export KUBECONFIG="${KUBECONFIG:-$HOME/.kube/config}"
  KUBECTL="${KUBECTL_BIN:-}"
  if [ -z "$KUBECTL" ] || [ ! -x "$KUBECTL" ]; then
    if [ -x /usr/local/bin/kubectl ]; then
      KUBECTL="/usr/local/bin/kubectl"
    elif command -v kubectl >/dev/null 2>&1; then
      KUBECTL="$(command -v kubectl)"
    else
      fail "kubectl not found. Re-run deploy/install.sh --mode kubernetes"
    fi
  fi

  banner "Starting ${APP_NAME:-hcl-learning-hub} (Kubernetes)"

  # PostgreSQL remains a single-primary StatefulSet in this deployment design.
  # Always scale it to exactly one replica unless the manifests are redesigned
  # for HA Postgres with replication/failover support.
  info "Ensuring PostgreSQL is running ..."
  $KUBECTL scale statefulset/postgres -n "$K8S_NS" --replicas=1 2>/dev/null || true
  $KUBECTL wait pod -l app=postgres -n "$K8S_NS" \
    --for=condition=ready --timeout=120s 2>/dev/null \
    && ok "PostgreSQL ready" || warn "PostgreSQL not ready yet — continuing anyway"

  # API and web are stateless and can scale horizontally. The default values
  # come from deploy/hub.env written by install-kubernetes.sh.
  info "Scaling API to ${API_REPLICAS} replica(s) and web to ${WEB_REPLICAS} replica(s) ..."
  $KUBECTL scale deployment/api -n "$K8S_NS" --replicas="$API_REPLICAS" 2>/dev/null || true
  $KUBECTL scale deployment/web -n "$K8S_NS" --replicas="$WEB_REPLICAS" 2>/dev/null || true
  $KUBECTL rollout status deployment/api -n "$K8S_NS" --timeout=120s 2>/dev/null \
    && ok "API deployment ready" || warn "API rollout still in progress"
  $KUBECTL rollout status deployment/web -n "$K8S_NS" --timeout=120s 2>/dev/null \
    && ok "Web deployment ready" || warn "Web rollout still in progress"

  banner "Running"
  cat <<K8S_SUMMARY

  Application : https://${SERVER_FQDN}
  Logs (API)  : $KUBECTL logs -n ${K8S_NS} -l app=api -f
  Logs (web)  : $KUBECTL logs -n ${K8S_NS} -l app=web -f
  Stop        : bash ${INSTALL_DIR}/deploy/stop.sh

K8S_SUMMARY
  exit 0
fi

# ── Source / process mode (legacy) ───────────────────────────────────────────
UI_PORT="${UI_PORT:-5173}"
API_PORT="${API_PORT:-4000}"
PG_SERVICE="${PG_SERVICE:-postgresql}"
EXTERNAL_DB="${EXTERNAL_DB:-false}"
DB_CONTAINER_NAME="${DB_CONTAINER_NAME:-hcl-postgres}"
DB_CONTAINER_ENGINE="${DB_CONTAINER_ENGINE:-}"
# PGDG installs psql/pg_dump outside /usr/bin.
if [ -n "${PG_BIN:-}" ]; then export PATH="$PG_BIN:$PATH"; fi
# shellcheck disable=SC1091
if [ -f "$SCRIPT_DIR/db-runtime.sh" ]; then . "$SCRIPT_DIR/db-runtime.sh"; fi

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
start_db_runtime

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
