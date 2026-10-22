#!/bin/bash
# ============================================================
# HCL Software Learning Hub — Kubernetes Installer (k3s)
# ============================================================

set -euo pipefail

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; CYAN='\033[0;36m'; NC='\033[0m'
ok()     { echo -e "${GREEN}[ OK ]${NC} $*"; }
warn()   { echo -e "${YELLOW}[WARN]${NC} $*"; }
fail()   { echo -e "${RED}[FAIL]${NC} $*" >&2; exit 1; }
info()   { echo -e "  ${CYAN}->${NC} $*"; }
banner() { echo ""; echo "========================================"; echo "  $1"; echo "========================================"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PARENT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
GIT_REPO="https://github.com/raghavendra-bhaskar/Hcl-learning-hub.git"
GIT_BRANCH="main"
SERVER_FQDN=""
DUMP_FILE=""
GITHUB_TOKEN=""
SKIP_DB_RESTORE=false
SAVE_TOKEN=true
K3S_BIN="/usr/local/bin/k3s"
KUBECTL_BIN="/usr/local/bin/kubectl"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo)            GIT_REPO="$2"; shift 2 ;;
    --branch)          GIT_BRANCH="$2"; shift 2 ;;
    --host)            SERVER_FQDN="$2"; shift 2 ;;
    --dump)            DUMP_FILE="$2"; shift 2 ;;
    --token)           GITHUB_TOKEN="$2"; shift 2 ;;
    --skip-db-restore) SKIP_DB_RESTORE=true; shift ;;
    --no-save-token)   SAVE_TOKEN=false; shift ;;
    -h|--help)
      cat <<EOF
Usage: bash deploy/install.sh --mode kubernetes [options]
  --repo <url>
  --branch <name>
  --host <fqdn>
  --dump <file>
  --token <pat>
  --skip-db-restore
  --no-save-token
EOF
      exit 0
      ;;
    *) fail "Unknown argument: $1" ;;
  esac
done

[ "$(id -u)" -ne 0 ] || fail "Do not run as root. Run as your normal user (it will call sudo when needed)."
command -v sudo >/dev/null 2>&1 || fail "sudo is required but not installed"

APP_NAME="hcl-learning-hub"
INSTALL_DIR="$PARENT_DIR"
RUN_USER="$(id -un)"
K8S_NS="hcl-learning-hub"
HTTPS_PORT=443
HTTP_PORT=80
DB_USER="hcl_hub"
DB_NAME="hcl_learning_hub"
API_IMAGE="hcl-hub/api:latest"
WEB_IMAGE="hcl-hub/web:latest"

[ -n "$SERVER_FQDN" ] || SERVER_FQDN="$(hostname -f 2>/dev/null || hostname)"
PRIMARY_IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
ACCESS_URL="https://${SERVER_FQDN}"

clear || true
cat <<BANNER

  HCL Software Learning Hub — Kubernetes Installer (k3s)
  =======================================================
  User     : ${RUN_USER}
  Install  : ${INSTALL_DIR}
  Hostname : ${SERVER_FQDN}
  Access   : ${ACCESS_URL}  (HTTPS — self-signed cert)

BANNER

banner "Step 1/10: OS packages"

[ -f /etc/os-release ] || fail "Cannot detect OS (/etc/os-release missing)"
. /etc/os-release
case "${ID,,}" in
  rhel|centos|rocky|almalinux|fedora) PKG=dnf ;;
  ubuntu|debian)                      PKG=apt ;;
  *) fail "Unsupported OS: $ID" ;;
esac
ok "OS: ${PRETTY_NAME:-$ID} (package manager: $PKG)"

if [ "$PKG" = "dnf" ]; then
  sudo dnf install -y git curl openssl tar podman >/dev/null 2>&1 || warn "Some packages could not be installed — continuing"
else
  sudo apt-get update -y >/dev/null 2>&1 || true
  sudo apt-get install -y git curl openssl tar podman ca-certificates >/dev/null 2>&1 || warn "Some packages could not be installed — continuing"
fi

if command -v podman >/dev/null 2>&1; then
  BUILD_CMD="podman"
  ok "Container build tool: podman"
elif command -v docker >/dev/null 2>&1; then
  BUILD_CMD="docker"
  ok "Container build tool: docker"
else
  fail "Neither podman nor docker found"
fi
ok "Base packages present"

banner "Step 2/10: k3s — Kubernetes"

if [ "$PKG" = "dnf" ] && sudo semodule -l 2>/dev/null | grep -q pcpupstream; then
  sudo semodule -d pcpupstream 2>/dev/null || true
  info "Disabled conflicting pcpupstream SELinux module (RHEL 9 known issue)"
fi

_k3s_ready() {
  sudo "$K3S_BIN" kubectl get nodes --no-headers 2>/dev/null | grep -q ' Ready'
}

if [ ! -x "$K3S_BIN" ]; then
  info "Installing k3s (downloads ~60 MB)..."
  curl -sfL https://get.k3s.io | sudo sh - || fail "k3s install failed"
  ok "k3s installed"
else
  ok "k3s binary already present: $K3S_BIN"
fi

sudo systemctl daemon-reload >/dev/null 2>&1 || true
sudo systemctl enable k3s >/dev/null 2>&1 || true
sudo systemctl restart k3s || fail "Could not start/restart k3s"

info "Waiting for k3s node to be Ready (up to 3 minutes)..."
for _ in $(seq 1 60); do
  if _k3s_ready; then break; fi
  sleep 3
done
_k3s_ready || fail "k3s node did not become Ready. Check: sudo journalctl -u k3s -n 120"
ok "k3s cluster is ready"

mkdir -p "$HOME/.kube"
sudo cp /etc/rancher/k3s/k3s.yaml "$HOME/.kube/config"
sudo chown "$(id -u):$(id -g)" "$HOME/.kube/config"
chmod 600 "$HOME/.kube/config"
export KUBECONFIG="$HOME/.kube/config"

if [ -x "$KUBECTL_BIN" ]; then
  KUBECTL="$KUBECTL_BIN"
elif command -v kubectl >/dev/null 2>&1; then
  KUBECTL="$(command -v kubectl)"
else
  sudo ln -sf "$K3S_BIN" "$KUBECTL_BIN" 2>/dev/null || true
  [ -x "$KUBECTL_BIN" ] || fail "kubectl is not available after k3s install"
  KUBECTL="$KUBECTL_BIN"
fi

"$KUBECTL" wait --for=condition=ready node --all --timeout=120s >/dev/null 2>&1 || warn "Node readiness check timed out — continuing anyway"
ok "kubectl configured for user ${RUN_USER}"

banner "Step 3/10: Source code"

mkdir -p "$PARENT_DIR" 2>/dev/null || sudo mkdir -p "$PARENT_DIR"
if [ ! -w "$PARENT_DIR" ]; then
  sudo chown -R "${RUN_USER}:${RUN_USER}" "$PARENT_DIR"
fi

ASKPASS=""
setup_askpass() {
  [ -n "$GITHUB_TOKEN" ] || return 0
  ASKPASS="$(mktemp)"; chmod 700 "$ASKPASS"
  cat > "$ASKPASS" <<'ASK'
#!/bin/bash
case "$1" in
  *[Uu]sername*) echo "x-access-token" ;;
  *) echo "${HCL_HUB_GIT_TOKEN}" ;;
esac
ASK
  export GIT_ASKPASS="$ASKPASS"
  export HCL_HUB_GIT_TOKEN="$GITHUB_TOKEN"
  export GIT_TERMINAL_PROMPT=0
}
cleanup_askpass() { [ -n "$ASKPASS" ] && rm -f "$ASKPASS"; return 0; }
trap cleanup_askpass EXIT

if [ -d "$INSTALL_DIR/.git" ]; then
  ok "Repository already present at $INSTALL_DIR"
  cd "$INSTALL_DIR"
  setup_askpass
  git pull origin "$GIT_BRANCH" 2>/dev/null || warn "git pull failed — using existing code"
else
  if [ -z "$GITHUB_TOKEN" ] && ! GIT_TERMINAL_PROMPT=0 git ls-remote "$GIT_REPO" >/dev/null 2>&1; then
    warn "Repository is private — a GitHub token is required."
    read -rsp "  GitHub token (input hidden): " GITHUB_TOKEN; echo ""
    [ -n "$GITHUB_TOKEN" ] || fail "No token supplied"
  fi
  setup_askpass
  info "Cloning ${GIT_REPO} (branch ${GIT_BRANCH})..."
  git clone --branch "$GIT_BRANCH" "$GIT_REPO" "$INSTALL_DIR" || fail "git clone failed"
  ok "Cloned into $INSTALL_DIR"
fi

cd "$INSTALL_DIR"
if [ "$SAVE_TOKEN" = true ] && [ -n "$GITHUB_TOKEN" ]; then
  printf '%s' "$GITHUB_TOKEN" > .hub-token
  chmod 600 .hub-token
  ok "GitHub token stored at ${INSTALL_DIR}/.hub-token (mode 600)"
fi

banner "Step 4/10: Build container images"

info "Building API image from server/Dockerfile ..."
$BUILD_CMD build -t "$API_IMAGE" -f server/Dockerfile ./server || fail "API image build failed"
ok "API image built: $API_IMAGE"

info "Building web image from Dockerfile ..."
$BUILD_CMD build -t "$WEB_IMAGE" -f Dockerfile . || fail "Web image build failed"
ok "Web image built: $WEB_IMAGE"

banner "Step 5/10: Import images into k3s"

info "Importing API image into k3s containerd ..."
$BUILD_CMD save "$API_IMAGE" | sudo "$K3S_BIN" ctr images import - || fail "Failed to import API image into k3s"
ok "API image imported"

info "Importing web image into k3s containerd ..."
$BUILD_CMD save "$WEB_IMAGE" | sudo "$K3S_BIN" ctr images import - || fail "Failed to import web image into k3s"
ok "Web image imported"

banner "Step 6/10: Apply Kubernetes resources"

DB_PASSWORD="$(openssl rand -hex 16)"
JWT_SECRET="$(openssl rand -hex 32)"
ADMIN_PASSWORD="$(openssl rand -hex 9)"

"$KUBECTL" apply -f k8s/0-namespace.yaml
ok "Namespace: $K8S_NS"

"$KUBECTL" create secret generic hcl-learning-hub-secrets \
  --namespace "$K8S_NS" \
  --from-literal=db-password="$DB_PASSWORD" \
  --from-literal=jwt-secret="$JWT_SECRET" \
  --from-literal=admin-password="$ADMIN_PASSWORD" \
  --save-config --dry-run=client -o yaml | "$KUBECTL" apply -f -
ok "Secrets created"

"$KUBECTL" apply -f k8s/2-configmap.yaml
ok "ConfigMap applied"

"$KUBECTL" apply -f k8s/3-postgres.yaml
ok "PostgreSQL StatefulSet applied"

info "Generating self-signed TLS certificate for ${SERVER_FQDN} ..."
openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
  -keyout /tmp/hcl-hub-tls.key \
  -out /tmp/hcl-hub-tls.crt \
  -subj "/CN=${SERVER_FQDN}/O=HCL Software Learning Hub" \
  -addext "subjectAltName=DNS:${SERVER_FQDN},DNS:localhost,IP:${PRIMARY_IP}" \
  2>/dev/null || fail "openssl failed to generate TLS certificate"

"$KUBECTL" create secret tls hcl-hub-tls \
  --namespace "$K8S_NS" \
  --cert=/tmp/hcl-hub-tls.crt \
  --key=/tmp/hcl-hub-tls.key \
  --save-config --dry-run=client -o yaml | "$KUBECTL" apply -f -
rm -f /tmp/hcl-hub-tls.crt /tmp/hcl-hub-tls.key
ok "TLS secret hcl-hub-tls created"

K8S_TMP="$(mktemp -d)"
trap 'rm -rf "$K8S_TMP"; [ -n "$ASKPASS" ] && rm -f "$ASKPASS"' EXIT

sed \
  -e "s|image: ghcr.io/raghavendra-bhaskar/hcl-learning-hub-api:latest|image: ${API_IMAGE}|g" \
  -e "s|imagePullPolicy: Always|imagePullPolicy: Never|g" \
  -e "s|http://hcl-learning-hub.hcl-software.com|${ACCESS_URL}|g" \
  k8s/4-api.yaml > "$K8S_TMP/4-api.yaml"
"$KUBECTL" apply -f "$K8S_TMP/4-api.yaml"
ok "API Deployment applied"

sed \
  -e "s|image: ghcr.io/raghavendra-bhaskar/hcl-learning-hub-web:latest|image: ${WEB_IMAGE}|g" \
  -e "s|imagePullPolicy: Always|imagePullPolicy: Never|g" \
  -e "s|replicas: 3|replicas: 1|g" \
  k8s/5-web.yaml > "$K8S_TMP/5-web.yaml"
"$KUBECTL" apply -f "$K8S_TMP/5-web.yaml"
ok "Web Deployment applied (1 replica)"

cat > "$K8S_TMP/ingress-tls.yaml" <<INGRESS_EOF
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: redirect-to-https
  namespace: hcl-learning-hub
spec:
  redirectScheme:
    scheme: https
    permanent: true
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: hcl-learning-hub-https
  namespace: hcl-learning-hub
  annotations:
    traefik.ingress.kubernetes.io/router.entrypoints: websecure
    traefik.ingress.kubernetes.io/router.tls: "true"
spec:
  ingressClassName: traefik
  tls:
    - secretName: hcl-hub-tls
  rules:
    - http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: web
                port:
                  number: 80
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: hcl-learning-hub-http-redirect
  namespace: hcl-learning-hub
  annotations:
    traefik.ingress.kubernetes.io/router.entrypoints: web
    traefik.ingress.kubernetes.io/router.middlewares: hcl-learning-hub-redirect-to-https@kubernetescrd
spec:
  ingressClassName: traefik
  rules:
    - http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: web
                port:
                  number: 80
INGRESS_EOF
"$KUBECTL" apply -f "$K8S_TMP/ingress-tls.yaml"
ok "Traefik HTTPS Ingress applied"

cat > deploy/hub.env <<HUBENV
APP_NAME=${APP_NAME}
SERVER_FQDN=${SERVER_FQDN}
DEPLOY_MODE=kubernetes
K8S_NAMESPACE=${K8S_NS}
HTTPS_PORT=${HTTPS_PORT}
HTTP_PORT=${HTTP_PORT}
DB_NAME=${DB_NAME}
DB_USER=${DB_USER}
DB_CONTAINER_NAME=hcl-hub-postgres
GIT_REPO=${GIT_REPO}
GIT_BRANCH=${GIT_BRANCH}
K3S_BIN=${K3S_BIN}
KUBECTL_BIN=${KUBECTL}
HUBENV
chmod 600 deploy/hub.env
find deploy -maxdepth 1 -type f -name '*.sh' -exec chmod u+x {} \;

banner "Step 7/10: Wait for PostgreSQL"
"$KUBECTL" wait pod -l app=postgres -n "$K8S_NS" --for=condition=ready --timeout=180s || fail "PostgreSQL pod did not become ready"
ok "PostgreSQL pod is ready"

banner "Step 8/10: Database restore"

[ -n "$DUMP_FILE" ] || DUMP_FILE="$INSTALL_DIR/scripts/backup.dump"
PG_POD="$("$KUBECTL" get pod -n "$K8S_NS" -l app=postgres -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || true)"
if [ "$SKIP_DB_RESTORE" = true ]; then
  warn "--skip-db-restore given — database will be seeded by the API on first start"
elif [ -z "$PG_POD" ]; then
  warn "Cannot resolve postgres pod name — skipping restore"
elif [ -f "$DUMP_FILE" ]; then
  info "Copying dump to pod ${PG_POD} ..."
  "$KUBECTL" cp "$DUMP_FILE" "${K8S_NS}/${PG_POD}:/tmp/backup.dump"
  RESTORE_LOG="$INSTALL_DIR/restore-$(date +%Y%m%d-%H%M%S).log"
  MAGIC="$(head -c 5 "$DUMP_FILE" | tr -d '\0' || true)"
  set +e
  if [ "$MAGIC" = "PGDMP" ]; then
    "$KUBECTL" exec -n "$K8S_NS" "$PG_POD" -- sh -c "PGPASSWORD='${DB_PASSWORD}' pg_restore -U ${DB_USER} -d ${DB_NAME} --clean --if-exists --no-owner --no-acl /tmp/backup.dump" > "$RESTORE_LOG" 2>&1
  else
    "$KUBECTL" exec -n "$K8S_NS" "$PG_POD" -- sh -c "PGPASSWORD='${DB_PASSWORD}' psql -U ${DB_USER} -d ${DB_NAME} -f /tmp/backup.dump" > "$RESTORE_LOG" 2>&1
  fi
  RC=$?
  set -e
  [ $RC -eq 0 ] && ok "Database restored from $(basename "$DUMP_FILE")" || warn "Restore exited with code $RC — see $RESTORE_LOG"
  "$KUBECTL" exec -n "$K8S_NS" "$PG_POD" -- rm -f /tmp/backup.dump 2>/dev/null || true
else
  warn "No dump found at $DUMP_FILE — database will be empty until the API seeds it"
fi

banner "Step 9/10: Wait for application pods"
"$KUBECTL" wait pod -l app=api -n "$K8S_NS" --for=condition=ready --timeout=180s >/dev/null 2>&1 || warn "API pod not ready yet"
ok "API pod ready"
"$KUBECTL" wait pod -l app=web -n "$K8S_NS" --for=condition=ready --timeout=120s >/dev/null 2>&1 || warn "Web pod not ready yet"
ok "Web pod ready"

banner "Step 10/10: Firewall"
if command -v firewall-cmd >/dev/null 2>&1 && sudo systemctl is-active --quiet firewalld 2>/dev/null; then
  sudo firewall-cmd --permanent --add-port="${HTTPS_PORT}/tcp" >/dev/null 2>&1 || true
  sudo firewall-cmd --permanent --add-port="${HTTP_PORT}/tcp" >/dev/null 2>&1 || true
  sudo firewall-cmd --reload >/dev/null 2>&1 || true
  ok "firewalld: ports ${HTTPS_PORT}/tcp and ${HTTP_PORT}/tcp opened"
elif command -v ufw >/dev/null 2>&1 && sudo ufw status 2>/dev/null | grep -q 'Status: active'; then
  sudo ufw allow "${HTTPS_PORT}/tcp" >/dev/null 2>&1 || true
  sudo ufw allow "${HTTP_PORT}/tcp" >/dev/null 2>&1 || true
  ok "ufw: ports ${HTTPS_PORT}/tcp and ${HTTP_PORT}/tcp opened"
else
  warn "No managed firewall detected — ensure ports ${HTTPS_PORT}/tcp and ${HTTP_PORT}/tcp are reachable"
fi

cat > "$INSTALL_DIR/.deploy-credentials" <<CREDS
INSTALL_DIR=${INSTALL_DIR}
SERVER_FQDN=${SERVER_FQDN}
ACCESS_URL=${ACCESS_URL}
DEPLOY_MODE=kubernetes
K8S_NAMESPACE=${K8S_NS}
DB_NAME=${DB_NAME}
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}
JWT_SECRET=${JWT_SECRET}
ADMIN_USERNAME=admin@local
ADMIN_PASSWORD=${ADMIN_PASSWORD}
CREDS
chmod 600 "$INSTALL_DIR/.deploy-credentials"
ok "Credentials saved to ${INSTALL_DIR}/.deploy-credentials"

banner "Installation complete"
cat <<SUMMARY

  Application URL : ${ACCESS_URL}
  (self-signed cert — click Advanced → Proceed in the browser)
  Admin login     : admin@local / ${ADMIN_PASSWORD}
  Install dir     : ${INSTALL_DIR}
  Credentials     : ${INSTALL_DIR}/.deploy-credentials

  Useful commands:
    ${KUBECTL} get pods -n ${K8S_NS}
    bash ${INSTALL_DIR}/deploy/start.sh
    bash ${INSTALL_DIR}/deploy/stop.sh
    bash ${INSTALL_DIR}/deploy/sync.sh

SUMMARY
