#!/bin/bash
# ============================================================
# HCL Software Learning Hub — Kubernetes VM Setup Script
# Created by: B Raghavendra
# Email: raghavendrab@hcl-software.com
# Repo:  https://github.com/raghavendra-bhaskar/Hcl-learning-hub
#
# Usage:  sudo bash hcl-learning-hub-setup.sh [OPTIONS]
#
# Options:
#   --repo  <url>    GitHub repo URL (default: raghavendra-bhaskar/Hcl-learning-hub)
#   --host  <host>   Hostname or IP for FRONTEND_ORIGIN and Ingress
#   --port  <port>   NodePort for direct access without DNS (default: 30080)
#   --dir   <path>   Install directory (default: /product/hcl-learning-hub)
#
# Tested: Ubuntu 22.04 LTS / 24.04 LTS
# Installs: Docker (image build), k3s (Kubernetes), kubectl
# ============================================================

set -e

# ── Defaults ──────────────────────────────────────────────────────────────────
GITHUB_REPO="${GITHUB_REPO:-https://github.com/raghavendra-bhaskar/Hcl-learning-hub.git}"
INSTALL_DIR="${INSTALL_DIR:-/product/hcl-learning-hub}"
NODE_PORT="${NODE_PORT:-30080}"
IMAGE_REGISTRY="ghcr.io/raghavendra-bhaskar"

# ── Colour helpers ─────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; CYAN='\033[0;36m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✓${NC} $*"; }
warn() { echo -e "${YELLOW}⚠${NC} $*"; }
fail() { echo -e "${RED}✗ ERROR:${NC} $*"; exit 1; }
info() { echo -e "  ${CYAN}→${NC} $*"; }
banner() { echo ""; echo "========================================"; echo "  $1"; echo "========================================"; }

# ── Root check ────────────────────────────────────────────────────────────────
[ "$EUID" -ne 0 ] && fail "Run as root: sudo bash $0"

# Parse args
while [[ $# -gt 0 ]]; do
  case $1 in
    --repo)   GITHUB_REPO="$2"; shift 2 ;;
    --host)   SERVER_HOST="$2"; shift 2 ;;
    --port)   NODE_PORT="$2";   shift 2 ;;
    --dir)    INSTALL_DIR="$2"; shift 2 ;;
    *) warn "Unknown argument: $1"; shift ;;
  esac
done

# Auto-detect server IP/host if not provided
SERVER_HOST="${SERVER_HOST:-$(hostname -I | awk '{print $1}')}"

# ── Banner ────────────────────────────────────────────────────────────────────
clear
echo ""
echo "  ██╗  ██╗ ██████╗██╗      "
echo "  ██║  ██║██╔════╝██║      "
echo "  ███████║██║     ██║      "
echo "  ██╔══██║██║     ██║      "
echo "  ██║  ██║╚██████╗███████╗ "
echo "  ╚═╝  ╚═╝ ╚═════╝╚══════╝ "
echo ""
echo "  HCL Software Learning Hub"
echo "  Kubernetes Deployment Setup"
echo ""
echo "  Repo:      $GITHUB_REPO"
echo "  Directory: $INSTALL_DIR"
echo "  Host:      $SERVER_HOST"
echo "  NodePort:  $NODE_PORT"
echo ""

# ── Step 1: System packages ───────────────────────────────────────────────────
banner "Step 1: System Update & Base Packages"

chmod -x /etc/update-motd.d/* 2>/dev/null || true
apt-get update -y
apt-get install -y ca-certificates curl gnupg lsb-release git jq openssl

# File descriptor limits (same as ccs-new-vm-setup.sh)
grep -q 'fs.file-max' /etc/sysctl.conf 2>/dev/null || {
  echo '* soft nofile 1048576' >> /etc/security/limits.conf
  echo '* hard nofile 1048576' >> /etc/security/limits.conf
  echo 'fs.inotify.max_user_watches=1048576' >> /etc/sysctl.conf
  echo 'fs.file-max=2097152'                 >> /etc/sysctl.conf
  sysctl -p > /dev/null 2>&1
}
ok "Base packages and OS tuning complete"

# ── Step 2: Docker (needed to build container images) ─────────────────────────
banner "Step 2: Docker CE (for building images)"

if command -v docker &>/dev/null; then
  ok "Docker already installed: $(docker --version)"
else
  info "Installing Docker CE..."
  mkdir -p /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
    | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
    https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
    | tee /etc/apt/sources.list.d/docker.list > /dev/null
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io
  service docker start
  ok "Docker installed: $(docker --version)"
fi

# ── Step 3: k3s (lightweight Kubernetes) ─────────────────────────────────────
banner "Step 3: k3s — Lightweight Kubernetes"

if command -v k3s &>/dev/null && k3s kubectl version --client &>/dev/null 2>&1; then
  ok "k3s already installed: $(k3s --version | head -1)"
else
  info "Installing k3s (this may take 1–2 minutes)..."
  curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="--disable=traefik" sh -
  ok "k3s installed: $(k3s --version | head -1)"
fi

# Set up kubeconfig for root
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
mkdir -p ~/.kube
cp /etc/rancher/k3s/k3s.yaml ~/.kube/config

# Wait for k3s API server to be ready
info "Waiting for k3s to be ready..."
for i in $(seq 1 30); do
  k3s kubectl get nodes &>/dev/null && break
  sleep 3
done
k3s kubectl wait --for=condition=Ready node --all --timeout=120s
ok "k3s cluster is ready: $(k3s kubectl get nodes --no-headers | wc -l) node(s)"

# ── Step 4: Clone repository ──────────────────────────────────────────────────
banner "Step 4: Clone Repository"

mkdir -p /product

if [ -d "$INSTALL_DIR/.git" ]; then
  warn "Repository already exists — pulling latest..."
  cd "$INSTALL_DIR" && git pull
else
  info "Cloning $GITHUB_REPO..."
  git clone "$GITHUB_REPO" "$INSTALL_DIR"
fi
cd "$INSTALL_DIR"
ok "Repository ready at $INSTALL_DIR"

# ── Step 5: Build Docker images ───────────────────────────────────────────────
banner "Step 5: Build Docker Images"

API_IMAGE="hcl-learning-hub-api:local"
WEB_IMAGE="hcl-learning-hub-web:local"

info "Building API image (server/Dockerfile)..."
docker build -t "$API_IMAGE" ./server
ok "API image built: $API_IMAGE"

info "Building Web image (root Dockerfile — nginx + React)..."
docker build -t "$WEB_IMAGE" .
ok "Web image built: $WEB_IMAGE"

# ── Step 6: Import images into k3s (no registry needed) ───────────────────────
banner "Step 6: Import Images into k3s"

info "Exporting and importing API image into k3s containerd..."
docker save "$API_IMAGE" | k3s ctr images import -
ok "API image imported"

info "Exporting and importing Web image into k3s containerd..."
docker save "$WEB_IMAGE" | k3s ctr images import -
ok "Web image imported"

# ── Step 7: Generate secrets ──────────────────────────────────────────────────
banner "Step 7: Kubernetes Secrets & Config"

DB_PASS=$(openssl rand -hex 16)
JWT_SECRET=$(openssl rand -hex 32)
ADMIN_PASS="Admin@HCL2026!"

# Apply namespace first
k3s kubectl apply -f "$INSTALL_DIR/k8s/0-namespace.yaml"

# Create secret with generated values (override the template file)
k3s kubectl create secret generic hcl-learning-hub-secrets \
  --namespace=hcl-learning-hub \
  --from-literal=db-password="$DB_PASS" \
  --from-literal=jwt-secret="$JWT_SECRET" \
  --from-literal=admin-password="$ADMIN_PASS" \
  --dry-run=client -o yaml | k3s kubectl apply -f -

ok "Secrets created (auto-generated DB password + JWT secret)"

# Apply configmap
k3s kubectl apply -f "$INSTALL_DIR/k8s/2-configmap.yaml"
ok "ConfigMap applied"

# ── Step 8: Update manifests with local image names and NodePort ──────────────
banner "Step 8: Patch Manifests for Local Deployment"

# Patch the api and web deployments to use local images (imagePullPolicy: Never)
k3s kubectl apply -f "$INSTALL_DIR/k8s/3-postgres.yaml"

# Apply api manifest with patched image + imagePullPolicy
k3s kubectl apply -f - <<EOF
$(cat "$INSTALL_DIR/k8s/4-api.yaml" \
  | sed "s|ghcr.io/raghavendra-bhaskar/hcl-learning-hub-api:latest|${API_IMAGE}|g" \
  | sed "s|imagePullPolicy: Always|imagePullPolicy: Never|g" \
  | sed "s|http://hcl-learning-hub.hcl-software.com|http://${SERVER_HOST}:${NODE_PORT}|g")
EOF

k3s kubectl apply -f - <<EOF
$(cat "$INSTALL_DIR/k8s/5-web.yaml" \
  | sed "s|ghcr.io/raghavendra-bhaskar/hcl-learning-hub-web:latest|${WEB_IMAGE}|g" \
  | sed "s|imagePullPolicy: Always|imagePullPolicy: Never|g")
EOF

ok "Postgres, API, and Web manifests applied"

# Apply NodePort ingress for direct IP access
k3s kubectl apply -f - <<EOF
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
      nodePort: ${NODE_PORT}
EOF

ok "NodePort service applied — app accessible at http://${SERVER_HOST}:${NODE_PORT}"

# ── Step 9: Wait for pods to be ready ────────────────────────────────────────
banner "Step 9: Wait for Pods"

info "Waiting for postgres pod..."
k3s kubectl rollout status statefulset/postgres -n hcl-learning-hub --timeout=120s

info "Waiting for API pod..."
k3s kubectl rollout status deployment/api -n hcl-learning-hub --timeout=120s

info "Waiting for Web pod..."
k3s kubectl rollout status deployment/web -n hcl-learning-hub --timeout=60s

# ── Step 10: Health check ──────────────────────────────────────────────────────
banner "Step 10: Health Check"

sleep 5
if curl -sf "http://localhost:${NODE_PORT}/" > /dev/null 2>&1; then
  ok "Frontend responding on port ${NODE_PORT}"
else
  warn "Frontend not responding yet — pods may still be initialising"
  info "Check: k3s kubectl get pods -n hcl-learning-hub"
fi

# ── Save credentials ──────────────────────────────────────────────────────────
CREDS_FILE="$INSTALL_DIR/.deploy-credentials"
cat > "$CREDS_FILE" << EOF
# HCL Software Learning Hub — Deployment credentials
# Generated: $(date)
INSTALL_DIR=$INSTALL_DIR
SERVER_HOST=$SERVER_HOST
NODE_PORT=$NODE_PORT
DB_PASSWORD=$DB_PASS
JWT_SECRET=$JWT_SECRET
ADMIN_USERNAME=admin
ADMIN_PASSWORD=$ADMIN_PASS
ACCESS_URL=http://${SERVER_HOST}:${NODE_PORT}
EOF
chmod 600 "$CREDS_FILE"

# ── Summary ───────────────────────────────────────────────────────────────────
banner "Setup Complete!"
echo ""
echo -e "  ${GREEN}Application URL${NC}    http://${SERVER_HOST}:${NODE_PORT}"
echo -e "  ${GREEN}Admin Login${NC}        admin / Admin@HCL2026!"
echo -e "  ${GREEN}Credentials file${NC}   $CREDS_FILE"
echo ""
echo "  Next steps:"
echo "  1. Open http://${SERVER_HOST}:${NODE_PORT} in your browser"
echo "  2. Log in as admin / Admin@HCL2026!  (change password immediately)"
echo "  3. Admin → Authentication Realm → configure Okta SSO"
echo "  4. Admin → Okta Users → ⟳ Sync Managers from Okta"
echo ""
echo "  Kubernetes commands:"
echo "    k3s kubectl get pods -n hcl-learning-hub           # pod status"
echo "    k3s kubectl logs -n hcl-learning-hub deploy/api -f # API logs"
echo "    k3s kubectl logs -n hcl-learning-hub deploy/web -f # Web logs"
echo ""
echo "  Update to latest version:"
echo "    cd $INSTALL_DIR && git pull"
echo "    docker build -t hcl-learning-hub-api:local ./server"
echo "    docker build -t hcl-learning-hub-web:local ."
echo "    docker save hcl-learning-hub-api:local | k3s ctr images import -"
echo "    docker save hcl-learning-hub-web:local | k3s ctr images import -"
echo "    k3s kubectl rollout restart deployment/api deployment/web -n hcl-learning-hub"
echo ""
echo "========================================"
