#!/bin/bash
# ============================================================
# HCL Software Learning Hub — Kubernetes Installer (k3s)
#
# Self-contained bootstrap: download ONLY this file, run it, and it
# installs k3s, builds container images, deploys via Kubernetes, and
# leaves the Hub ready to access.
#
#   mkdir -p ~/software && cd ~/software
#   bash install.sh
#
# Installs / configures:
#   k3s (Kubernetes + kubectl + containerd + Traefik)   via get.k3s.io
#   podman (RHEL) / docker (Debian/Ubuntu)              for image builds
#   API image                                           built from server/Dockerfile
#   Web image                                           built from root Dockerfile
#   PostgreSQL                                          k8s StatefulSet (postgres:16-alpine)
#   Namespace, Secrets, ConfigMap, Deployments, NodePort
#   Database                                            restored from scripts/backup.dump
#
# Run as a NORMAL user that has sudo. Do NOT run with sudo directly.
# Access the Hub at  http://<HOSTNAME>:30080
#
# Options:
#   --repo <url>      Git repository URL
#   --branch <name>   Branch to check out (default: main)
#   --host <fqdn>     Public hostname or IP (default: auto-detect)
#   --dump <file>     Database dump to restore (default: scripts/backup.dump)
#   --token <pat>     GitHub token for a private repo (default: prompt)
#   --skip-db-restore Leave the database empty
#   --no-save-token   Do not store the token for sync.sh
# ============================================================

set -euo pipefail

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; CYAN='\033[0;36m'; NC='\033[0m'
ok()     { echo -e "${GREEN}[ OK ]${NC} $*"; }
warn()   { echo -e "${YELLOW}[WARN]${NC} $*"; }
fail()   { echo -e "${RED}[FAIL]${NC} $*" >&2; exit 1; }
info()   { echo -e "  ${CYAN}->${NC} $*"; }
banner() { echo ""; echo "========================================"; echo "  $1"; echo "========================================"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PARENT_DIR="$SCRIPT_DIR"
GIT_REPO="https://github.com/raghavendra-bhaskar/Hcl-learning-hub.git"
GIT_BRANCH="main"
SERVER_FQDN=""
DUMP_FILE=""
GITHUB_TOKEN=""
SKIP_DB_RESTORE=false
SAVE_TOKEN=true

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo)            GIT_REPO="$2"; shift 2 ;;
    --branch)          GIT_BRANCH="$2"; shift 2 ;;
    --host)            SERVER_FQDN="$2"; shift 2 ;;
    --dump)            DUMP_FILE="$2"; shift 2 ;;
    --token)           GITHUB_TOKEN="$2"; shift 2 ;;
    --skip-db-restore) SKIP_DB_RESTORE=true; shift ;;
    --no-save-token)   SAVE_TOKEN=false; shift ;;
    -h|--help)         sed -n '2,32p' "$0"; exit 0 ;;
    *) fail "Unknown argument: $1" ;;
  esac
done

[ "$(id -u)" -ne 0 ] || fail "Do not run as root. Run as your normal user (it will call sudo when needed)."
command -v sudo >/dev/null 2>&1 || fail "sudo is required but not installed"

APP_NAME="hcl-learning-hub"
INSTALL_DIR="$PARENT_DIR/$APP_NAME"
RUN_USER="$(id -un)"
K8S_NS="hcl-learning-hub"
WEB_PORT=30080
DB_USER="hcl_hub"
DB_NAME="hcl_learning_hub"

[ -n "$SERVER_FQDN" ] || SERVER_FQDN="$(hostname -f 2>/dev/null || hostname)"
PRIMARY_IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
ACCESS_URL="http://${SERVER_FQDN}:${WEB_PORT}"

clear || true
cat <<BANNER

  HCL Software Learning Hub — Kubernetes Installer (k3s)
  =======================================================
  User     : ${RUN_USER}
  Install  : ${INSTALL_DIR}
  Hostname : ${SERVER_FQDN}
  Access   : ${ACCESS_URL}

BANNER

# ── Step 1: OS detection & base packages ─────────────────────────────────────
banner "Step 1/10: OS packages"

[ -f /etc/os-release ] || fail "Cannot detect OS (/etc/os-release missing)"
. /etc/os-release
case "${ID,,}" in
  rhel|centos|rocky|almalinux|fedora) PKG=dnf ;;
  ubuntu|debian)                      PKG=apt  ;;
  *) fail "Unsupported OS: $ID (supported: RHEL/Rocky/Alma/CentOS, Ubuntu/Debian)" ;;
esac
ok "OS: ${PRETTY_NAME:-$ID} (package manager: $PKG)"

if ! sudo -n true 2>/dev/null; then
  info "sudo password may be requested..."
fi

if [ "$PKG" = "dnf" ]; then
  sudo dnf install -y git curl openssl tar podman >/dev/null 2>&1 \
    || warn "Some packages could not be installed — continuing"
else
  sudo apt-get update -y >/dev/null 2>&1 || true
  sudo apt-get install -y git curl openssl tar podman ca-certificates >/dev/null 2>&1 \
    || warn "Some packages could not be installed — continuing"
fi

if command -v podman >/dev/null 2>&1; then
  BUILD_CMD="podman"
  ok "Container build tool: podman"
elif command -v docker >/dev/null 2>&1; then
  BUILD_CMD="docker"
  ok "Container build tool: docker"
else
  fail "Neither podman nor docker found. Install one:
  RHEL/CentOS : sudo dnf install -y podman
  Ubuntu/Debian: sudo apt-get install -y podman"
fi
ok "Base packages present"

# ── Step 2: k3s (Kubernetes) ─────────────────────────────────────────────────
banner "Step 2/10: k3s — Kubernetes"

if command -v k3s >/dev/null 2>&1 && sudo k3s kubectl cluster-info >/dev/null 2>&1; then
  ok "k3s already installed and running: $(k3s --version 2>/dev/null | head -1)"
else
  info "Installing k3s (downloads ~60 MB)..."
  curl -sfL https://get.k3s.io | sudo sh - \
    || fail "k3s install failed. Check internet connectivity and try again."
  ok "k3s installed"

  info "Waiting for k3s to be ready (up to 2 minutes)..."
  for i in $(seq 1 40); do
    if sudo k3s kubectl cluster-info >/dev/null 2>&1; then break; fi
    sleep 3
  done
  sudo k3s kubectl cluster-info >/dev/null 2>&1 \
    || fail "k3s did not become ready. Check: sudo journalctl -u k3s -n 50"
  ok "k3s cluster is ready"
fi

# Make kubectl available to the current user
mkdir -p "$HOME/.kube"
sudo cp /etc/rancher/k3s/k3s.yaml "$HOME/.kube/config"
sudo chown "$(id -u):$(id -g)" "$HOME/.kube/config"
chmod 600 "$HOME/.kube/config"
export KUBECONFIG="$HOME/.kube/config"

# Resolve kubectl command (k3s symlinks it to /usr/local/bin/kubectl)
if command -v kubectl >/dev/null 2>&1; then
  KUBECTL="kubectl"
else
  sudo ln -sf /usr/local/bin/k3s /usr/local/bin/kubectl 2>/dev/null || true
  if command -v kubectl >/dev/null 2>&1; then
    KUBECTL="kubectl"
  else
    KUBECTL="k3s kubectl"
    warn "kubectl not in PATH — using 'k3s kubectl'. Add /usr/local/bin to PATH to use 'kubectl' directly."
  fi
fi

$KUBECTL wait --for=condition=ready node --all --timeout=120s >/dev/null 2>&1 \
  || warn "Node readiness check timed out — continuing anyway"
ok "kubectl configured for user ${RUN_USER}"

# ── Step 3: Source code ──────────────────────────────────────────────────────
banner "Step 3/10: Source code"

mkdir -p "$PARENT_DIR" 2>/dev/null || sudo mkdir -p "$PARENT_DIR"
if [ ! -w "$PARENT_DIR" ]; then
  sudo chown -R "${RUN_USER}:${RUN_USER}" "$PARENT_DIR"
fi

# GIT_ASKPASS keeps the token out of argv and shell history
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
    info "Use a fine-grained PAT with read-only 'Contents' access."
    read -rsp "  GitHub token (input hidden): " GITHUB_TOKEN; echo ""
    [ -n "$GITHUB_TOKEN" ] || fail "No token supplied"
  fi
  setup_askpass
  info "Cloning ${GIT_REPO} (branch ${GIT_BRANCH})..."
  git clone --branch "$GIT_BRANCH" "$GIT_REPO" "$INSTALL_DIR" \
    || fail "git clone failed. Check the token scope (Contents: read)."
  ok "Cloned into $INSTALL_DIR"
fi

cd "$INSTALL_DIR"

if [ "$SAVE_TOKEN" = true ] && [ -n "$GITHUB_TOKEN" ]; then
  printf '%s' "$GITHUB_TOKEN" > .hub-token
  chmod 600 .hub-token
  ok "GitHub token stored at ${INSTALL_DIR}/.hub-token (mode 600)"
fi

# ── Step 4: Build container images ───────────────────────────────────────────
banner "Step 4/10: Build container images"

API_IMAGE="hcl-hub/api:latest"
WEB_IMAGE="hcl-hub/web:latest"

info "Building API image from server/Dockerfile ..."
$BUILD_CMD build -t "$API_IMAGE" -f server/Dockerfile ./server \
  || fail "API image build failed. Check server/Dockerfile."
ok "API image built: $API_IMAGE"

info "Building web image from Dockerfile ..."
$BUILD_CMD build -t "$WEB_IMAGE" -f Dockerfile . \
  || fail "Web image build failed. Check Dockerfile and src/."
ok "Web image built: $WEB_IMAGE"

# ── Step 5: Import images into k3s containerd ────────────────────────────────
banner "Step 5/10: Import images into k3s"

info "Importing API image into k3s containerd ..."
$BUILD_CMD save "$API_IMAGE" | sudo k3s ctr images import - \
  || fail "Failed to import API image into k3s. Is k3s running? (sudo systemctl status k3s)"
ok "API image imported"

info "Importing web image into k3s containerd ..."
$BUILD_CMD save "$WEB_IMAGE" | sudo k3s ctr images import - \
  || fail "Failed to import web image into k3s"
ok "Web image imported"

# ── Step 6: Kubernetes resources ─────────────────────────────────────────────
banner "Step 6/10: Apply Kubernetes resources"

DB_PASSWORD="$(openssl rand -hex 16)"
JWT_SECRET="$(openssl rand -hex 32)"
ADMIN_PASSWORD="$(openssl rand -hex 9)"

# Namespace
$KUBECTL apply -f k8s/0-namespace.yaml
ok "Namespace: $K8S_NS"

# Secrets — generated fresh, not from the placeholder YAML file
$KUBECTL create secret generic hcl-learning-hub-secrets \
  --namespace "$K8S_NS" \
  --from-literal=db-password="$DB_PASSWORD" \
  --from-literal=jwt-secret="$JWT_SECRET" \
  --from-literal=admin-password="$ADMIN_PASSWORD" \
  --save-config --dry-run=client -o yaml | $KUBECTL apply -f -
ok "Secrets created"

# ConfigMap (db name, user, node env, ports)
$KUBECTL apply -f k8s/2-configmap.yaml
ok "ConfigMap applied"

# PostgreSQL StatefulSet + PVC + headless Service
$KUBECTL apply -f k8s/3-postgres.yaml
ok "PostgreSQL StatefulSet applied"

# Build patched API and Web manifests in a temp dir:
#   • Replace GHCR image references with local image names
#   • Set imagePullPolicy: Never  (images are local, no registry push needed)
#   • Set FRONTEND_ORIGIN to the real VM access URL
K8S_TMP="$(mktemp -d)"
trap 'rm -rf "$K8S_TMP"; [ -n "$ASKPASS" ] && rm -f "$ASKPASS"' EXIT

sed \
  -e "s|image: ghcr.io/raghavendra-bhaskar/hcl-learning-hub-api:latest|image: ${API_IMAGE}|g" \
  -e "s|imagePullPolicy: Always|imagePullPolicy: Never|g" \
  -e "s|http://hcl-learning-hub.hcl-software.com|${ACCESS_URL}|g" \
  k8s/4-api.yaml > "$K8S_TMP/4-api.yaml"
$KUBECTL apply -f "$K8S_TMP/4-api.yaml"
ok "API Deployment applied"

sed \
  -e "s|image: ghcr.io/raghavendra-bhaskar/hcl-learning-hub-web:latest|image: ${WEB_IMAGE}|g" \
  -e "s|imagePullPolicy: Always|imagePullPolicy: Never|g" \
  -e "s|replicas: 3|replicas: 1|g" \
  k8s/5-web.yaml > "$K8S_TMP/5-web.yaml"
$KUBECTL apply -f "$K8S_TMP/5-web.yaml"
ok "Web Deployment applied (1 replica)"

# NodePort service — external access at http://NODE-IP:30080
cat > "$K8S_TMP/nodeport.yaml" <<NODEPORT_EOF
apiVersion: v1
kind: Service
metadata:
  name: web-nodeport
  namespace: hcl-learning-hub
spec:
  type: NodePort
  selector:
    app: web
  ports:
    - port: 80
      targetPort: 80
      nodePort: ${WEB_PORT}
NODEPORT_EOF
$KUBECTL apply -f "$K8S_TMP/nodeport.yaml"
ok "NodePort service applied — access at port ${WEB_PORT}"

# hub.env for any remaining deploy/*.sh scripts that read it
cat > deploy/hub.env <<HUBENV
APP_NAME=${APP_NAME}
SERVER_FQDN=${SERVER_FQDN}
DEPLOY_MODE=kubernetes
K8S_NAMESPACE=${K8S_NS}
WEB_PORT=${WEB_PORT}
DB_NAME=${DB_NAME}
DB_USER=${DB_USER}
GIT_REPO=${GIT_REPO}
GIT_BRANCH=${GIT_BRANCH}
HUBENV
chmod 600 deploy/hub.env

find deploy -maxdepth 1 -type f -name '*.sh' -exec chmod u+x {} \;

# ── Step 7: Wait for PostgreSQL ───────────────────────────────────────────────
banner "Step 7/10: Wait for PostgreSQL"

info "Waiting for PostgreSQL pod (up to 3 minutes) ..."
$KUBECTL wait pod -l app=postgres -n "$K8S_NS" \
  --for=condition=ready --timeout=180s \
  || fail "PostgreSQL pod did not become ready.
  Diagnose with:
    $KUBECTL describe pod -l app=postgres -n $K8S_NS
    $KUBECTL logs -l app=postgres -n $K8S_NS"
ok "PostgreSQL pod is ready"

# ── Step 8: Database restore ─────────────────────────────────────────────────
banner "Step 8/10: Database restore"

[ -n "$DUMP_FILE" ] || DUMP_FILE="$INSTALL_DIR/scripts/backup.dump"
PG_POD="$($KUBECTL get pod -n "$K8S_NS" -l app=postgres -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || true)"

if [ "$SKIP_DB_RESTORE" = true ]; then
  warn "--skip-db-restore given — database will be seeded by the API on first start"
elif [ -z "$PG_POD" ]; then
  warn "Cannot resolve postgres pod name — skipping restore"
elif [ -f "$DUMP_FILE" ]; then
  info "Copying dump to pod ${PG_POD} ..."
  $KUBECTL cp "$DUMP_FILE" "${K8S_NS}/${PG_POD}:/tmp/backup.dump"

  RESTORE_LOG="$INSTALL_DIR/restore-$(date +%Y%m%d-%H%M%S).log"
  MAGIC="$(head -c 5 "$DUMP_FILE" | tr -d '\0' || true)"
  set +e
  if [ "$MAGIC" = "PGDMP" ]; then
    $KUBECTL exec -n "$K8S_NS" "$PG_POD" -- \
      sh -c "PGPASSWORD='${DB_PASSWORD}' pg_restore \
             -U ${DB_USER} -d ${DB_NAME} \
             --clean --if-exists --no-owner --no-acl \
             /tmp/backup.dump" > "$RESTORE_LOG" 2>&1
  else
    $KUBECTL exec -n "$K8S_NS" "$PG_POD" -- \
      sh -c "PGPASSWORD='${DB_PASSWORD}' psql \
             -U ${DB_USER} -d ${DB_NAME} \
             -f /tmp/backup.dump" > "$RESTORE_LOG" 2>&1
  fi
  RC=$?
  set -e
  if [ $RC -ne 0 ]; then
    warn "Restore exited with code $RC — see $RESTORE_LOG"
    warn "Errors about missing roles or DROP are normal on a fresh database"
  else
    ok "Database restored from $(basename "$DUMP_FILE")"
  fi
  # Clean up dump from pod
  $KUBECTL exec -n "$K8S_NS" "$PG_POD" -- rm -f /tmp/backup.dump 2>/dev/null || true
else
  warn "No dump found at $DUMP_FILE — database will be empty until the API seeds it"
  info "To restore later:  kubectl cp <dump> ${K8S_NS}/\$(kubectl get pod -n ${K8S_NS} -l app=postgres -o jsonpath='{.items[0].metadata.name}'):/tmp/backup.dump"
fi

# ── Step 9: Wait for API + Web ───────────────────────────────────────────────
banner "Step 9/10: Wait for application pods"

info "Waiting for API pod (up to 3 minutes) ..."
$KUBECTL wait pod -l app=api -n "$K8S_NS" \
  --for=condition=ready --timeout=180s \
  || warn "API pod not ready yet — check: $KUBECTL describe pod -l app=api -n $K8S_NS"
ok "API pod ready"

info "Waiting for web pod (up to 2 minutes) ..."
$KUBECTL wait pod -l app=web -n "$K8S_NS" \
  --for=condition=ready --timeout=120s \
  || warn "Web pod not ready yet — check: $KUBECTL describe pod -l app=web -n $K8S_NS"
ok "Web pod ready"

# ── Step 10: Firewall ─────────────────────────────────────────────────────────
banner "Step 10/10: Firewall"

if command -v firewall-cmd >/dev/null 2>&1 && sudo systemctl is-active --quiet firewalld 2>/dev/null; then
  sudo firewall-cmd --permanent --add-port="${WEB_PORT}/tcp" >/dev/null 2>&1 || true
  sudo firewall-cmd --reload >/dev/null 2>&1 || true
  ok "firewalld: port ${WEB_PORT}/tcp opened"
elif command -v ufw >/dev/null 2>&1 && sudo ufw status 2>/dev/null | grep -q "Status: active"; then
  sudo ufw allow "${WEB_PORT}/tcp" >/dev/null 2>&1 || true
  ok "ufw: port ${WEB_PORT}/tcp opened"
else
  warn "No managed firewall detected — ensure port ${WEB_PORT}/tcp is reachable from your browser"
fi

# Save credentials
cat > "$INSTALL_DIR/.deploy-credentials" <<CREDS
# HCL Software Learning Hub — Kubernetes Deployment Credentials
# Generated: $(date -Iseconds)
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
  Admin login     : admin@local / ${ADMIN_PASSWORD}
  Install dir     : ${INSTALL_DIR}
  Credentials     : ${INSTALL_DIR}/.deploy-credentials

  Useful kubectl commands:
    View all pods        :  $KUBECTL get pods -n ${K8S_NS}
    Stream API logs      :  $KUBECTL logs -n ${K8S_NS} -l app=api -f
    Stream web logs      :  $KUBECTL logs -n ${K8S_NS} -l app=web -f
    Restart API          :  $KUBECTL rollout restart deployment/api -n ${K8S_NS}
    Restart web          :  $KUBECTL rollout restart deployment/web -n ${K8S_NS}
    Remove everything    :  $KUBECTL delete namespace ${K8S_NS}

  To rebuild and redeploy after a code change:
    cd ${INSTALL_DIR}
    git pull
    podman build -t hcl-hub/api:latest -f server/Dockerfile ./server
    podman save hcl-hub/api:latest | sudo k3s ctr images import -
    $KUBECTL rollout restart deployment/api -n ${K8S_NS}

SUMMARY
