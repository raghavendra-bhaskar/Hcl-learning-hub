#!/bin/bash
# ============================================================
# HCL Software Learning Hub — Container Installer
# ============================================================

set -euo pipefail

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; CYAN='\033[0;36m'; NC='\033[0m'
ok()     { echo -e "${GREEN}[ OK ]${NC} $*"; }
warn()   { echo -e "${YELLOW}[WARN]${NC} $*"; }
fail()   { echo -e "${RED}[FAIL]${NC} $*" >&2; exit 1; }
info()   { echo -e "  ${CYAN}->${NC} $*"; }
banner() { echo ""; echo "========================================"; echo "  $1"; echo "========================================"; }
port_is_bound() {
  local port="$1"
  if command -v ss >/dev/null 2>&1; then
    ss -ltnH "( sport = :${port} )" 2>/dev/null | grep -q .
    return $?
  fi
  return 1
}
format_https_url() {
  local host="$1"
  local port="$2"
  if [ "$port" = "443" ]; then
    printf 'https://%s\n' "$host"
  else
    printf 'https://%s:%s\n' "$host" "$port"
  fi
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PARENT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
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
    -h|--help)
      cat <<EOF
Usage: bash deploy/install.sh --mode containers [options]
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
HTTPS_PORT=30080
HTTP_PORT=30081
DB_USER="hcl_hub"
DB_NAME="hcl_learning_hub"
DB_CONTAINER_NAME="hcl-hub-postgres"
API_CONTAINER_NAME="hcl-hub-api"
WEB_CONTAINER_NAME="hcl-hub-web"
NETWORK_NAME="hcl-hub-net"
DB_VOLUME="hcl-hub-postgres-data"
API_VOLUME="hcl-hub-api-data"
API_IMAGE="hcl-hub/api:latest"
WEB_IMAGE="hcl-hub/web:latest"
POSTGRES_IMAGE="docker.io/library/postgres:16-alpine"

[ -n "$SERVER_FQDN" ] || SERVER_FQDN="$(hostname -f 2>/dev/null || hostname)"
PRIMARY_IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
if [ "$HTTPS_PORT" = "443" ] && port_is_bound 443; then
  warn "Host port 443 is already in use; using 30080 for the container HTTPS endpoint"
  HTTPS_PORT=30080
fi
if [ "$HTTP_PORT" = "80" ] && port_is_bound 80; then
  warn "Host port 80 is already in use; using 30081 for the container HTTP endpoint"
  HTTP_PORT=30081
fi
[ "$HTTP_PORT" != "$HTTPS_PORT" ] || HTTP_PORT=30081
ACCESS_URL="$(format_https_url "$SERVER_FQDN" "$HTTPS_PORT")"

clear || true
cat <<BANNER

  HCL Software Learning Hub — Container Installer
  ===============================================
  User     : ${RUN_USER}
  Install  : ${INSTALL_DIR}
  Hostname : ${SERVER_FQDN}
  Access   : ${ACCESS_URL}  (HTTPS — self-signed cert)

BANNER

banner "Step 1/9: OS packages"

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
  ENGINE="podman"
  ok "Container engine: podman"
elif command -v docker >/dev/null 2>&1; then
  ENGINE="docker"
  ok "Container engine: docker"
else
  fail "Neither podman nor docker found"
fi

version_ge() {
  [ "$(printf '%s\n%s\n' "$2" "$1" | sort -V | head -1)" = "$2" ]
}
runtime_version_ok() {
  local runtime_path runtime_name runtime_version minimum_version
  runtime_path="$1"
  [ -x "$runtime_path" ] || return 1
  runtime_name="$(basename "$runtime_path")"
  runtime_version="$("$runtime_path" --version 2>/dev/null | sed -n '1{s/.*version[[:space:]]\([0-9][0-9.]*\).*/\1/p;q}')"
  [ -n "$runtime_version" ] || return 1
  if [ "$runtime_name" = "crun" ]; then
    minimum_version="1.14.3"
  else
    minimum_version="1.1.11"
  fi
  version_ge "$runtime_version" "$minimum_version"
}
configure_podman_runtime() {
  local current_runtime configured_runtime candidate conf_dir conf_file
  [ "$ENGINE" = "podman" ] || return 0
  current_runtime="$(podman info --format '{{.Host.OCIRuntime.Path}}' 2>/dev/null || true)"
  if [ -n "$current_runtime" ] && runtime_version_ok "$current_runtime"; then
    ok "Podman OCI runtime: $current_runtime"
    return 0
  fi
  configured_runtime=""
  for candidate in /usr/local/bin/crun "$(command -v crun 2>/dev/null || true)" "$(command -v runc 2>/dev/null || true)" /usr/bin/crun /usr/sbin/runc /usr/bin/runc; do
    [ -n "$candidate" ] || continue
    if runtime_version_ok "$candidate"; then
      configured_runtime="$candidate"
      break
    fi
  done
  [ -n "$configured_runtime" ] || fail "Podman is installed, but no compatible OCI runtime was found. Update crun to >= 1.14.3 or install a current runc."
  conf_dir="$HOME/.config/containers"
  conf_file="$conf_dir/containers.conf"
  mkdir -p "$conf_dir"
  cat > "$conf_file" <<EOF
[engine]
runtime = "$configured_runtime"
EOF
  runtime_version_ok "$configured_runtime" || fail "Configured Podman runtime is still incompatible: $configured_runtime"
  ok "Podman OCI runtime configured: $configured_runtime"
}
configure_podman_runtime
if [ "$ENGINE" = "podman" ]; then
  sudo sysctl -w net.ipv4.ip_unprivileged_port_start=80 >/dev/null 2>&1 || true
  if [ -d /etc/sysctl.d ]; then
    printf '%s\n' 'net.ipv4.ip_unprivileged_port_start=80' | sudo tee /etc/sysctl.d/99-hcl-learning-hub.conf >/dev/null 2>&1 || true
  fi
  info "Configured unprivileged low ports for rootless Podman (80/443)"
fi
ok "Base packages present"

banner "Step 2/9: Source code"

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

# Pick the freshest repo-shipped baseline dump for a clean install.
# Order matters:
#   1. explicit --dump passed by the operator
#   2. newest manual admin capture in scripts/
#   3. refreshed latest pointer in backups/
#   4. legacy static scripts/backup.dump fallback
resolve_install_dump() {
  local latest_manual=""
  local latest_pointer="$INSTALL_DIR/backups/latest.dump"
  if [ -n "$DUMP_FILE" ]; then
    printf '%s\n' "$DUMP_FILE"
    return 0
  fi
  latest_manual="$(ls -1t "$INSTALL_DIR"/scripts/hcl-hub-manual-admin-v*.dump 2>/dev/null | head -1 || true)"
  if [ -n "$latest_manual" ]; then
    printf '%s\n' "$latest_manual"
    return 0
  fi
  if [ -f "$latest_pointer" ]; then
    printf '%s\n' "$latest_pointer"
    return 0
  fi
  printf '%s\n' "$INSTALL_DIR/scripts/backup.dump"
}

ensure_execute_permissions() {
  while IFS= read -r -d '' script; do
    chmod 755 "$script" 2>/dev/null || true
  done < <(
    find "$INSTALL_DIR" \
      \( -path "$INSTALL_DIR/.git" -o -path "$INSTALL_DIR/.git/*" \
         -o -path "$INSTALL_DIR/node_modules" -o -path "$INSTALL_DIR/node_modules/*" \
         -o -path "$INSTALL_DIR/server/node_modules" -o -path "$INSTALL_DIR/server/node_modules/*" \
         -o -path "$INSTALL_DIR/dist" -o -path "$INSTALL_DIR/dist/*" \
         -o -path "$INSTALL_DIR/server/dist" -o -path "$INSTALL_DIR/server/dist/*" \) -prune \
      -o -type f -name '*.sh' -print0 2>/dev/null
  )
}

normalize_permissions() {
  chmod -R u+rwX,go+rX "$INSTALL_DIR" 2>/dev/null || true
  ensure_execute_permissions
}

banner "Step 3/9: Build container images"
$ENGINE build -t "$API_IMAGE" -f server/Dockerfile ./server || fail "API image build failed"
ok "API image built: $API_IMAGE"
$ENGINE build -t "$WEB_IMAGE" -f Dockerfile . || fail "Web image build failed"
ok "Web image built: $WEB_IMAGE"

banner "Step 4/9: HTTPS runtime config"
RUNTIME_DIR="$INSTALL_DIR/deploy/runtime"
CERT_DIR="$RUNTIME_DIR/certs"
mkdir -p "$CERT_DIR"
openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
  -keyout "$CERT_DIR/tls.key" \
  -out "$CERT_DIR/tls.crt" \
  -subj "/CN=${SERVER_FQDN}/O=HCL Software Learning Hub" \
  -addext "subjectAltName=DNS:${SERVER_FQDN},DNS:localhost,IP:${PRIMARY_IP}" \
  2>/dev/null || fail "openssl failed to generate TLS certificate"
cat > "$RUNTIME_DIR/nginx.ssl.conf" <<NGINX_EOF
server {
    listen 80;
    server_name _;
    return 301 https://\$host\$request_uri;
}
server {
    listen 443 ssl;
    server_name _;
    ssl_certificate /etc/nginx/certs/tls.crt;
    ssl_certificate_key /etc/nginx/certs/tls.key;
    root /usr/share/nginx/html;
    index index.html;
    location /api/ {
        proxy_pass         http://${API_CONTAINER_NAME}:4000/;
        proxy_http_version 1.1;
        proxy_set_header   Host              \$host;
        proxy_set_header   X-Real-IP         \$remote_addr;
        proxy_set_header   X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
        proxy_read_timeout 150s;
    }
    location / {
        try_files \$uri \$uri/ /index.html;
    }
    location = /index.html {
        add_header Cache-Control "no-store, no-cache, must-revalidate";
    }
    location ~* \.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
NGINX_EOF
chmod 600 "$CERT_DIR/tls.crt" "$CERT_DIR/tls.key"
ok "TLS cert and nginx HTTPS config generated"

banner "Step 5/9: Runtime secrets"
DB_PASSWORD="$(openssl rand -hex 16)"
JWT_SECRET="$(openssl rand -hex 32)"
ADMIN_PASSWORD="$(openssl rand -hex 9)"
cat > "$INSTALL_DIR/.deploy-credentials" <<CREDS
INSTALL_DIR=${INSTALL_DIR}
SERVER_FQDN=${SERVER_FQDN}
ACCESS_URL=${ACCESS_URL}
DEPLOY_MODE=containers
CONTAINER_ENGINE=${ENGINE}
NETWORK_NAME=${NETWORK_NAME}
DB_CONTAINER_NAME=${DB_CONTAINER_NAME}
API_CONTAINER_NAME=${API_CONTAINER_NAME}
WEB_CONTAINER_NAME=${WEB_CONTAINER_NAME}
DB_VOLUME=${DB_VOLUME}
API_VOLUME=${API_VOLUME}
HTTPS_PORT=${HTTPS_PORT}
HTTP_PORT=${HTTP_PORT}
DB_NAME=${DB_NAME}
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}
JWT_SECRET=${JWT_SECRET}
ADMIN_USERNAME=admin@local
ADMIN_PASSWORD=${ADMIN_PASSWORD}
CREDS
chmod 600 "$INSTALL_DIR/.deploy-credentials"
ok "Credentials saved to ${INSTALL_DIR}/.deploy-credentials"

cat > deploy/hub.env <<HUBENV
APP_NAME=${APP_NAME}
SERVER_FQDN=${SERVER_FQDN}
DEPLOY_MODE=containers
CONTAINER_ENGINE=${ENGINE}
NETWORK_NAME=${NETWORK_NAME}
DB_CONTAINER_NAME=${DB_CONTAINER_NAME}
API_CONTAINER_NAME=${API_CONTAINER_NAME}
WEB_CONTAINER_NAME=${WEB_CONTAINER_NAME}
DB_VOLUME=${DB_VOLUME}
API_VOLUME=${API_VOLUME}
HTTPS_PORT=${HTTPS_PORT}
HTTP_PORT=${HTTP_PORT}
DB_NAME=${DB_NAME}
DB_USER=${DB_USER}
GIT_REPO=${GIT_REPO}
GIT_BRANCH=${GIT_BRANCH}
HUBENV
chmod 600 deploy/hub.env
normalize_permissions

banner "Step 6/9: Start PostgreSQL container"
$ENGINE network inspect "$NETWORK_NAME" >/dev/null 2>&1 || $ENGINE network create "$NETWORK_NAME" >/dev/null
if $ENGINE ps -a --format '{{.Names}}' | grep -Fxq "$DB_CONTAINER_NAME"; then
  $ENGINE start "$DB_CONTAINER_NAME" >/dev/null 2>&1 || true
else
  $ENGINE run -d \
    --name "$DB_CONTAINER_NAME" \
    --network "$NETWORK_NAME" \
    --restart unless-stopped \
    -e POSTGRES_DB="${DB_NAME}" \
    -e POSTGRES_USER="${DB_USER}" \
    -e POSTGRES_PASSWORD="${DB_PASSWORD}" \
    -v "$DB_VOLUME:/var/lib/postgresql/data" \
    "$POSTGRES_IMAGE" >/dev/null || fail "Could not start PostgreSQL container"
fi
for _ in $(seq 1 60); do
  if $ENGINE exec "$DB_CONTAINER_NAME" pg_isready -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; then break; fi
  sleep 2
done
$ENGINE exec "$DB_CONTAINER_NAME" pg_isready -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1 || fail "PostgreSQL container did not become ready"
ok "PostgreSQL container is ready"

banner "Step 7/9: Database restore"
DUMP_FILE="$(resolve_install_dump)"
info "Install restore source: $DUMP_FILE"
if [ "$SKIP_DB_RESTORE" = true ]; then
  warn "--skip-db-restore given — database will be seeded by the API on first start"
elif [ -f "$DUMP_FILE" ]; then
  info "Copying dump into PostgreSQL container ..."
  $ENGINE cp "$DUMP_FILE" "$DB_CONTAINER_NAME:/tmp/backup.dump"
  MAGIC="$(head -c 5 "$DUMP_FILE" | tr -d '\0' || true)"
  RESTORE_LOG="$INSTALL_DIR/restore-$(date +%Y%m%d-%H%M%S).log"
  set +e
  if [ "$MAGIC" = "PGDMP" ]; then
    $ENGINE exec -e PGPASSWORD="$DB_PASSWORD" "$DB_CONTAINER_NAME" pg_restore -U "$DB_USER" -d "$DB_NAME" --clean --if-exists --no-owner --no-acl /tmp/backup.dump > "$RESTORE_LOG" 2>&1
  else
    $ENGINE exec -e PGPASSWORD="$DB_PASSWORD" "$DB_CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -f /tmp/backup.dump > "$RESTORE_LOG" 2>&1
  fi
  RC=$?
  set -e
  [ $RC -eq 0 ] && ok "Database restored from $(basename "$DUMP_FILE")" || warn "Restore exited with code $RC — see $RESTORE_LOG"
  $ENGINE exec "$DB_CONTAINER_NAME" rm -f /tmp/backup.dump >/dev/null 2>&1 || true
else
  warn "No dump found at $DUMP_FILE — database will be empty until the API seeds it"
fi

banner "Step 8/9: Start application containers"
bash "$INSTALL_DIR/deploy/start.sh"

banner "Step 9/9: Firewall"
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

banner "Installation complete"
cat <<SUMMARY

  Application URL : ${ACCESS_URL}
  (self-signed cert — click Advanced → Proceed in the browser)
  Admin login     : admin@local / ${ADMIN_PASSWORD}
  Install dir     : ${INSTALL_DIR}
  Credentials     : ${INSTALL_DIR}/.deploy-credentials

  Useful commands:
    bash ${INSTALL_DIR}/deploy/start.sh
    bash ${INSTALL_DIR}/deploy/stop.sh
    bash ${INSTALL_DIR}/deploy/sync.sh

SUMMARY
