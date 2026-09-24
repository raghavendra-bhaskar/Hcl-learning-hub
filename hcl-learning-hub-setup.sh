#!/bin/bash
# ============================================================
# HCL Software Learning Hub — Universal VM Setup Script
# Author:  B Raghavendra <raghavendrab@hcl-software.com>
# Repo:    https://github.com/raghavendra-bhaskar/Hcl-learning-hub
#
# Usage:   sudo bash hcl-learning-hub-setup.sh [OPTIONS]
#
# Options:
#   --repo  <url>   GitHub repo URL (default: raghavendra-bhaskar/Hcl-learning-hub)
#   --host  <host>  Server hostname or IP (auto-detected if omitted)
#   --port  <port>  NodePort for direct access (default: 30080)
#   --dir   <path>  Install directory (default: /product/hcl-learning-hub)
#
# Supported OS:
#   Ubuntu 22.04+ / Debian 12+  (apt)
#   RHEL 8/9 / CentOS Stream 8/9 / Rocky / AlmaLinux  (dnf/yum)
#
# Modes (auto-detected):
#   Online   — internet reachable: installs Docker CE + k3s, clones from GitHub
#   Air-gap  — no internet: uses pre-installed Podman, expects source at --dir
#              On RHEL: auto-mounts /dev/sr0 -> /cdrom for local dnf repos
#
# DB Backup / Restore (run before decommissioning a VM):
#   sudo bash scripts/db-backup.sh          # saves SQL dump + credentials
#   sudo bash scripts/db-restore.sh <file>  # restores on new VM after setup
# ============================================================

set -e

# ── Defaults ──────────────────────────────────────────────────────────────────
GITHUB_REPO="${GITHUB_REPO:-https://github.com/raghavendra-bhaskar/Hcl-learning-hub.git}"
INSTALL_DIR="${INSTALL_DIR:-/product/hcl-learning-hub}"
NODE_PORT="${NODE_PORT:-30080}"
NAMESPACE="hcl-learning-hub"
API_IMAGE="hcl-learning-hub-api:local"
WEB_IMAGE="hcl-learning-hub-web:local"

# ── Colour helpers ─────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'
ok()     { echo -e "${GREEN}✓${NC} $*"; }
warn()   { echo -e "${YELLOW}⚠${NC} $*"; }
fail()   { echo -e "${RED}✗ ERROR:${NC} $*"; exit 1; }
info()   { echo -e "  ${CYAN}→${NC} $*"; }
banner() { echo ""; echo "========================================"; echo "  $1"; echo "========================================"; }

# ── Root check ────────────────────────────────────────────────────────────────
[ "$EUID" -ne 0 ] && fail "Run as root: sudo bash $0"

# ── Parse args ────────────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case $1 in
    --repo) GITHUB_REPO="$2"; shift 2 ;;
    --host) SERVER_HOST="$2"; shift 2 ;;
    --port) NODE_PORT="$2";   shift 2 ;;
    --dir)  INSTALL_DIR="$2"; shift 2 ;;
    *) warn "Unknown argument: $1"; shift ;;
  esac
done

SERVER_HOST="${SERVER_HOST:-$(hostname -I | awk '{print $1}')}"

# ── Step 0: OS + Internet Detection ───────────────────────────────────────────
banner "Step 0: Detecting System & Network"

[ -f /etc/os-release ] || fail "Cannot detect OS — /etc/os-release not found"
. /etc/os-release
OS_ID="${ID,,}"
OS_VER="${VERSION_ID%%.*}"

case "$OS_ID" in
  ubuntu|debian)                        PKG_FAMILY="debian" ;;
  rhel|centos|rocky|almalinux|fedora)   PKG_FAMILY="rhel"   ;;
  *) fail "Unsupported OS: $OS_ID. Supported: Ubuntu, Debian, RHEL, CentOS, Rocky, AlmaLinux" ;;
esac

ok "OS: ${PRETTY_NAME} (family: ${PKG_FAMILY}, version: ${OS_VER})"

HAS_INTERNET=false
if curl -sf --connect-timeout 6 --max-time 10 https://github.com > /dev/null 2>&1; then
  HAS_INTERNET=true
  ok "Network: ONLINE — using internet install mode"
else
  warn "Network: OFFLINE — switching to air-gap mode (podman)"
fi

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
echo "  HCL Software Learning Hub — Universal Setup"
echo ""
echo "  OS:      ${PRETTY_NAME}"
echo "  Mode:    $([ "$HAS_INTERNET" = true ] && echo 'Online  (Docker + k3s)' || echo 'Air-gap (Podman)')"
echo "  Repo:    ${GITHUB_REPO}"
echo "  Install: ${INSTALL_DIR}"
echo "  Access:  http://${SERVER_HOST}:${NODE_PORT}"
echo ""

# ── Pre-flight Checks ────────────────────────────────────────────────────────
banner "Pre-flight: Port & Resource Checks"

PREFLIGHT_OK=true

# Required ports
# 30080 (or custom) — app NodePort accessible to users
# 4000  — API (internal; exposed to nginx, not necessarily to internet)
# 5432  — PostgreSQL (internal only, should NOT be open to internet)
REQUIRED_PORTS=("${NODE_PORT}" "4000")
INTERNAL_PORTS=("5432")

info "Checking required ports..."

for PORT in "${REQUIRED_PORTS[@]}"; do
  if ss -tlnp 2>/dev/null | grep -q ":${PORT} " || \
     netstat -tlnp 2>/dev/null | grep -q ":${PORT} "; then
    warn "Port ${PORT} is already in use — another process may conflict:"
    ss -tlnp 2>/dev/null | grep ":${PORT} " || netstat -tlnp 2>/dev/null | grep ":${PORT} "
    PREFLIGHT_OK=false
  else
    ok "Port ${PORT} is free"
  fi
done

# Firewall: auto-open app port (NodePort only — API + DB stay internal)
info "Checking firewall rules for port ${NODE_PORT}..."

if command -v firewall-cmd &>/dev/null && systemctl is-active --quiet firewalld 2>/dev/null; then
  if firewall-cmd --list-ports 2>/dev/null | grep -q "${NODE_PORT}/tcp"; then
    ok "firewalld: port ${NODE_PORT}/tcp already open"
  else
    info "firewalld: opening port ${NODE_PORT}/tcp..."
    firewall-cmd --permanent --add-port="${NODE_PORT}/tcp" && firewall-cmd --reload
    ok "firewalld: port ${NODE_PORT}/tcp opened"
  fi
  # Warn if PostgreSQL port is exposed externally
  if firewall-cmd --list-ports 2>/dev/null | grep -q "5432/tcp"; then
    warn "PostgreSQL port 5432 is open in firewall — CLOSE IT for security:"
    warn "  firewall-cmd --permanent --remove-port=5432/tcp && firewall-cmd --reload"
  else
    ok "PostgreSQL port 5432 is correctly blocked by firewalld"
  fi
elif command -v ufw &>/dev/null && ufw status 2>/dev/null | grep -q "Status: active"; then
  if ufw status 2>/dev/null | grep -q "${NODE_PORT}"; then
    ok "ufw: port ${NODE_PORT} already open"
  else
    info "ufw: allowing port ${NODE_PORT}/tcp..."
    ufw allow "${NODE_PORT}/tcp"
    ok "ufw: port ${NODE_PORT}/tcp opened"
  fi
  if ufw status 2>/dev/null | grep -q "5432"; then
    warn "PostgreSQL port 5432 is open in ufw — CLOSE IT: ufw delete allow 5432"
  else
    ok "PostgreSQL port 5432 correctly not exposed via ufw"
  fi
else
  warn "No active firewall detected (firewalld/ufw). If a firewall is managed externally:"
  info "  Ensure port ${NODE_PORT}/tcp is open for users to access the app"
  info "  Ensure port 5432/tcp is NOT open externally (PostgreSQL internal only)"
fi

# Disk space check (need at least 5GB free for images + DB)
FREE_GB=$(df -BG / 2>/dev/null | awk 'NR==2{gsub("G",""); print $4}')
if [ -n "$FREE_GB" ] && [ "$FREE_GB" -lt 5 ] 2>/dev/null; then
  warn "Low disk space: only ${FREE_GB}GB free. At least 5GB recommended."
  PREFLIGHT_OK=false
else
  ok "Disk space: ${FREE_GB}GB free"
fi

# Memory check (recommend >= 2GB)
FREE_MEM_MB=$(free -m 2>/dev/null | awk '/^Mem:/{print $7}')
if [ -n "$FREE_MEM_MB" ] && [ "$FREE_MEM_MB" -lt 1024 ] 2>/dev/null; then
  warn "Low memory: ${FREE_MEM_MB}MB free. 2GB+ recommended for k3s + PostgreSQL + API."
else
  ok "Memory: ${FREE_MEM_MB}MB available"
fi

if [ "$PREFLIGHT_OK" = false ]; then
  warn "Pre-flight checks found issues. Review warnings above."
  echo "  Press ENTER to continue anyway, or Ctrl+C to abort..."
  read -r
else
  ok "All pre-flight checks passed"
fi

# ── Step 1: System Packages ───────────────────────────────────────────────────
banner "Step 1: System Packages"

_pkg_install() {
  if [ "$PKG_FAMILY" = "debian" ]; then
    chmod -x /etc/update-motd.d/* 2>/dev/null || true
    apt-get update -y
    apt-get install -y "$@"
  else
    # RHEL family — mount CDROM repo if offline and /cdrom not mounted
    if [ "$HAS_INTERNET" = false ]; then
      if grep -ql 'file:///cdrom' /etc/yum.repos.d/*.repo 2>/dev/null && ! mountpoint -q /cdrom 2>/dev/null; then
        info "Mounting RHEL ISO at /cdrom for local packages..."
        mkdir -p /cdrom
        mount /dev/sr0 /cdrom 2>/dev/null \
          || mount /dev/cdrom /cdrom 2>/dev/null \
          || warn "Could not mount CDROM — base packages may fail"
      fi
    fi
    if command -v dnf &>/dev/null; then
      dnf install -y "$@" 2>/dev/null || warn "Some packages unavailable — continuing"
    else
      yum install -y "$@" 2>/dev/null || warn "Some packages unavailable — continuing"
    fi
  fi
}

if [ "$PKG_FAMILY" = "debian" ]; then
  _pkg_install ca-certificates curl gnupg lsb-release git jq openssl
else
  _pkg_install ca-certificates curl git jq openssl
fi

# File descriptor limits
grep -q 'fs.file-max' /etc/sysctl.conf 2>/dev/null || {
  echo '* soft nofile 1048576' >> /etc/security/limits.conf
  echo '* hard nofile 1048576' >> /etc/security/limits.conf
  echo 'fs.inotify.max_user_watches=1048576' >> /etc/sysctl.conf
  echo 'fs.file-max=2097152'                 >> /etc/sysctl.conf
  sysctl -p > /dev/null 2>&1
}
ok "Base packages and kernel limits configured"

# ── Step 2: Container Runtime ─────────────────────────────────────────────────
banner "Step 2: Container Runtime"

CONTAINER_RT=""
USE_PODMAN=false

if command -v docker &>/dev/null; then
  CONTAINER_RT="docker"
  ok "Docker already installed: $(docker --version)"
elif command -v podman &>/dev/null; then
  CONTAINER_RT="podman"
  USE_PODMAN=true
  ok "Podman already installed: $(podman --version)"
elif [ "$HAS_INTERNET" = true ]; then
  info "Installing Docker CE..."
  if [ "$PKG_FAMILY" = "debian" ]; then
    mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
      | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
      https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
      | tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt-get update -y
    apt-get install -y docker-ce docker-ce-cli containerd.io
    service docker start || systemctl start docker
  else
    # RHEL family
    _pkg_install yum-utils 2>/dev/null || true
    if command -v dnf &>/dev/null; then
      dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
      dnf install -y docker-ce docker-ce-cli containerd.io
    else
      yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
      yum install -y docker-ce docker-ce-cli containerd.io
    fi
    systemctl enable --now docker
  fi
  CONTAINER_RT="docker"
  ok "Docker CE installed: $(docker --version)"
else
  fail "No container runtime found (docker/podman) and no internet.\nOn RHEL: sudo dnf install -y podman  then re-run this script."
fi

# Provide 'docker' shim for podman so build commands are identical
if [ "$USE_PODMAN" = true ] && ! command -v docker &>/dev/null; then
  ln -sf "$(command -v podman)" /usr/local/bin/docker 2>/dev/null || true
fi

# ── Step 3: Kubernetes ────────────────────────────────────────────────────────
banner "Step 3: Kubernetes / Orchestration"

USE_PODMAN_DEPLOY=false

if command -v k3s &>/dev/null && k3s kubectl version --client &>/dev/null 2>&1; then
  ok "k3s already installed: $(k3s --version | head -1)"
  export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
elif [ "$HAS_INTERNET" = true ]; then
  info "Installing k3s (lightweight Kubernetes)..."
  curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="--disable=traefik" sh -
  export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
  mkdir -p ~/.kube && cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
  info "Waiting for k3s node to be ready..."
  for i in $(seq 1 30); do k3s kubectl get nodes &>/dev/null && break; sleep 3; done
  k3s kubectl wait --for=condition=Ready node --all --timeout=120s
  ok "k3s installed and ready: $(k3s --version | head -1)"
else
  warn "k3s not available and no internet — using Podman for deployment"
  USE_PODMAN_DEPLOY=true
  command -v podman &>/dev/null || fail "Podman is required for air-gap deployment.\n  sudo dnf install -y podman  then re-run."
  ok "Deployment engine: podman (air-gap mode)"
fi

# ── Step 4: Source Code ───────────────────────────────────────────────────────
banner "Step 4: Source Code"

mkdir -p /product

if [ -d "$INSTALL_DIR/.git" ]; then
  if [ "$HAS_INTERNET" = true ]; then
    info "Updating existing repository..."
    git -C "$INSTALL_DIR" pull
  else
    ok "Source at $INSTALL_DIR (skipping pull — offline)"
  fi
elif [ "$HAS_INTERNET" = true ]; then
  info "Cloning ${GITHUB_REPO}..."
  git clone "$GITHUB_REPO" "$INSTALL_DIR"
elif [ -f "$INSTALL_DIR/package.json" ]; then
  ok "Source found at $INSTALL_DIR (pre-copied, air-gap)"
else
  fail "No source code at $INSTALL_DIR and no internet to clone.\n\nCopy the project from your Windows machine:\n  scp -r /path/to/Hcl-learning-hub hcluser@${SERVER_HOST}:${INSTALL_DIR}\nThen re-run this script."
fi

cd "$INSTALL_DIR"
ok "Source ready at $INSTALL_DIR"

# ── Step 5: Build Container Images ───────────────────────────────────────────
banner "Step 5: Build Container Images"

info "Building API image (server/)..."
$CONTAINER_RT build -t "$API_IMAGE" ./server
ok "API image built: $API_IMAGE"

info "Building Web image (nginx + React SPA)..."
$CONTAINER_RT build -t "$WEB_IMAGE" .
ok "Web image built: $WEB_IMAGE"

# ── Step 6: Generate Secrets ──────────────────────────────────────────────────
banner "Step 6: Secrets & Credentials"

DB_PASS=$(openssl rand -hex 16)
JWT_SECRET=$(openssl rand -hex 32)
ADMIN_PASS="Admin@HCL2026!"

ok "Secrets generated (DB password + JWT secret)"

# ── Step 7: Deploy ────────────────────────────────────────────────────────────
banner "Step 7: Deploy"

if [ "$USE_PODMAN_DEPLOY" = true ]; then
  # ── Air-gap: Podman deployment ─────────────────────────────────────────────
  info "Creating podman network: $NAMESPACE..."
  podman network create $NAMESPACE 2>/dev/null || true

  info "Starting PostgreSQL..."
  podman run -d --name hcl-postgres \
    --network $NAMESPACE \
    -e POSTGRES_DB=hclhub \
    -e POSTGRES_USER=hcluser \
    -e "POSTGRES_PASSWORD=${DB_PASS}" \
    -v hcl-pgdata:/var/lib/postgresql/data \
    --restart unless-stopped \
    docker.io/postgres:15-alpine 2>/dev/null || {
      # Fallback to UBI PostgreSQL (available in RHEL registries)
      warn "docker.io/postgres not available — trying UBI image..."
      podman run -d --name hcl-postgres \
        --network $NAMESPACE \
        -e POSTGRESQL_USER=hcluser \
        -e "POSTGRESQL_PASSWORD=${DB_PASS}" \
        -e POSTGRESQL_DATABASE=hclhub \
        -v hcl-pgdata:/var/lib/postgresql/data \
        --restart unless-stopped \
        registry.access.redhat.com/ubi8/postgresql-15 \
        || fail "No PostgreSQL image available locally.\nSave and transfer it:\n  podman pull postgres:15-alpine\n  podman save postgres:15-alpine | gzip | ssh user@${SERVER_HOST} 'podman load'"
    }

  sleep 8
  info "Starting API..."
  podman run -d --name hcl-api \
    --network $NAMESPACE \
    -e "DATABASE_URL=postgresql://hcluser:${DB_PASS}@hcl-postgres:5432/hclhub" \
    -e "JWT_SECRET=${JWT_SECRET}" \
    -e "ADMIN_PASSWORD=${ADMIN_PASS}" \
    -e "FRONTEND_ORIGIN=http://${SERVER_HOST}:${NODE_PORT}" \
    -p 4000:4000 \
    --restart unless-stopped \
    "$API_IMAGE"

  info "Starting Web (nginx)..."
  podman run -d --name hcl-web \
    --network $NAMESPACE \
    -p "${NODE_PORT}:80" \
    --restart unless-stopped \
    "$WEB_IMAGE"

  # Register systemd units so containers restart after reboot
  for SVC in hcl-postgres hcl-api hcl-web; do
    podman generate systemd --new --name "$SVC" \
      > "/etc/systemd/system/${SVC}.service" 2>/dev/null || true
  done
  systemctl daemon-reload 2>/dev/null || true
  systemctl enable hcl-postgres hcl-api hcl-web 2>/dev/null || true
  ok "Containers started and registered for auto-start on reboot"

else
  # ── k3s deployment ──────────────────────────────────────────────────────────
  info "Importing images into k3s containerd..."
  docker save "$API_IMAGE" | k3s ctr images import -
  docker save "$WEB_IMAGE" | k3s ctr images import -
  ok "Images imported into k3s"

  k3s kubectl apply -f "$INSTALL_DIR/k8s/0-namespace.yaml"

  k3s kubectl create secret generic hcl-learning-hub-secrets \
    --namespace=$NAMESPACE \
    --from-literal=db-password="$DB_PASS" \
    --from-literal=jwt-secret="$JWT_SECRET" \
    --from-literal=admin-password="$ADMIN_PASS" \
    --dry-run=client -o yaml | k3s kubectl apply -f -

  k3s kubectl apply -f "$INSTALL_DIR/k8s/2-configmap.yaml"
  k3s kubectl apply -f "$INSTALL_DIR/k8s/3-postgres.yaml"

  k3s kubectl apply -f - <<MANIFEST
$(sed \
  -e "s|ghcr.io/raghavendra-bhaskar/hcl-learning-hub-api:latest|${API_IMAGE}|g" \
  -e "s|imagePullPolicy: Always|imagePullPolicy: Never|g" \
  -e "s|http://hcl-learning-hub.hcl-software.com|http://${SERVER_HOST}:${NODE_PORT}|g" \
  "$INSTALL_DIR/k8s/4-api.yaml")
MANIFEST

  k3s kubectl apply -f - <<MANIFEST
$(sed \
  -e "s|ghcr.io/raghavendra-bhaskar/hcl-learning-hub-web:latest|${WEB_IMAGE}|g" \
  -e "s|imagePullPolicy: Always|imagePullPolicy: Never|g" \
  "$INSTALL_DIR/k8s/5-web.yaml")
MANIFEST

  k3s kubectl apply -f - <<MANIFEST
apiVersion: v1
kind: Service
metadata:
  name: web-nodeport
  namespace: ${NAMESPACE}
spec:
  type: NodePort
  selector:
    app: web
  ports:
    - port: 80
      targetPort: 80
      nodePort: ${NODE_PORT}
MANIFEST

  info "Waiting for pods to be ready..."
  k3s kubectl rollout status statefulset/postgres -n $NAMESPACE --timeout=120s
  k3s kubectl rollout status deployment/api        -n $NAMESPACE --timeout=120s
  k3s kubectl rollout status deployment/web        -n $NAMESPACE --timeout=60s
  ok "All pods running"
fi

# ── Step 8: Health Check ──────────────────────────────────────────────────────
banner "Step 8: Health Check"

sleep 6
if curl -sf "http://localhost:${NODE_PORT}/" > /dev/null 2>&1; then
  ok "Frontend responding at http://localhost:${NODE_PORT}/"
else
  warn "Not responding yet — containers may still be initialising (normal for first boot)"
  [ "$USE_PODMAN_DEPLOY" = true ] \
    && info "Check: podman ps" \
    || info "Check: k3s kubectl get pods -n ${NAMESPACE}"
fi

# ── Save Credentials ──────────────────────────────────────────────────────────
CREDS_FILE="$INSTALL_DIR/.deploy-credentials"
cat > "$CREDS_FILE" <<CREDS
# HCL Software Learning Hub — Deployment Credentials
# Generated: $(date)
INSTALL_DIR=${INSTALL_DIR}
SERVER_HOST=${SERVER_HOST}
NODE_PORT=${NODE_PORT}
DB_PASSWORD=${DB_PASS}
JWT_SECRET=${JWT_SECRET}
ADMIN_USERNAME=admin@local
ADMIN_PASSWORD=${ADMIN_PASS}
ACCESS_URL=http://${SERVER_HOST}:${NODE_PORT}
DEPLOY_MODE=$([ "$USE_PODMAN_DEPLOY" = true ] && echo 'podman' || echo 'k3s')
OS=${PRETTY_NAME}
INSTALLED_AT=$(date -Iseconds)
CREDS
chmod 600 "$CREDS_FILE"
ok "Credentials saved to $CREDS_FILE"

# ── Summary ───────────────────────────────────────────────────────────────────
banner "Setup Complete!"
echo ""
echo -e "  ${GREEN}Application URL${NC}   http://${SERVER_HOST}:${NODE_PORT}"
echo -e "  ${GREEN}Admin Login${NC}       admin@local / Admin@HCL2026!"
echo -e "  ${GREEN}Credentials${NC}       $CREDS_FILE"
echo -e "  ${GREEN}Deploy Mode${NC}       $([ "$USE_PODMAN_DEPLOY" = true ] && echo 'Podman (air-gap)' || echo 'k3s (Kubernetes)')"
echo ""
echo "  Next steps:"
echo "  1. Open http://${SERVER_HOST}:${NODE_PORT} in your browser"
echo "  2. Log in: admin@local / Admin@HCL2026!"
echo "  3. Admin → Authentication Realm → configure Okta SSO"
echo "  4. Admin → Okta Users → Sync Managers from Okta"
echo ""
if [ "$USE_PODMAN_DEPLOY" = true ]; then
  echo "  Manage containers:"
  echo "    podman ps                          # status"
  echo "    podman logs -f hcl-api             # API logs"
  echo "    podman logs -f hcl-web             # Web logs"
  echo "    podman restart hcl-api hcl-web     # restart after config change"
else
  echo "  Manage Kubernetes:"
  echo "    k3s kubectl get pods -n ${NAMESPACE}"
  echo "    k3s kubectl logs -n ${NAMESPACE} deploy/api -f"
  echo "    k3s kubectl rollout restart deployment/api deployment/web -n ${NAMESPACE}"
fi
echo ""
echo "  Before decommissioning this VM — backup your data:"
echo "    sudo bash ${INSTALL_DIR}/scripts/db-backup.sh"
echo "    # Copy the .sql file to a safe location, then restore on the new VM:"
echo "    sudo bash ${INSTALL_DIR}/scripts/db-restore.sh <backup-file.sql>"
echo ""
echo "  Update to latest version:"
echo "    cd ${INSTALL_DIR} && git pull"
echo "    $CONTAINER_RT build -t ${API_IMAGE} ./server"
echo "    $CONTAINER_RT build -t ${WEB_IMAGE} ."
if [ "$USE_PODMAN_DEPLOY" = false ]; then
  echo "    docker save ${API_IMAGE} | k3s ctr images import -"
  echo "    docker save ${WEB_IMAGE} | k3s ctr images import -"
  echo "    k3s kubectl rollout restart deployment/api deployment/web -n ${NAMESPACE}"
else
  echo "    podman stop hcl-api hcl-web && podman rm hcl-api hcl-web"
  echo "    podman run -d ... (re-run deploy step above)"
fi
echo ""
echo "========================================"
