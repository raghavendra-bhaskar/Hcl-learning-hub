#!/bin/bash
# ============================================================
# HCL Software Learning Hub — Offline (Air-gap) Installer for Linux
#
# Runs entirely from the bundle produced by packaging/build-bundle.sh.
# No internet access, no image registry and no npm install are required:
# every container image ships inside images/ as a tar archive.
#
# Usage:
#   sudo bash install.sh [OPTIONS]
#
# Options:
#   --dir  <path>   Install directory        (default /product/hcl-learning-hub)
#   --host <host>   Public hostname or IP    (auto-detected)
#   --port <port>   HTTP port for the UI     (default from bundle.env)
#   --admin-password <pw>   Local admin password (default: generated)
#   --dump <file>   DB dump to restore       (default db/backup.dump in bundle)
#   --skip-db-restore       Start with an empty database
#   --force                 Recreate containers even if they already exist
#   --yes                   Never prompt (unattended install)
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"
load_bundle_env "$SCRIPT_DIR/bundle.env"

INSTALL_DIR="/product/${APP_NAME}"
SERVER_HOST=""
DB_DUMP="$SCRIPT_DIR/db/backup.dump"
SKIP_DB_RESTORE=false
FORCE=false
ASSUME_YES=false
ADMIN_PASSWORD=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dir)              INSTALL_DIR="$2"; shift 2 ;;
    --host)             SERVER_HOST="$2"; shift 2 ;;
    --port)             HTTP_PORT="$2";   shift 2 ;;
    --admin-password)   ADMIN_PASSWORD="$2"; shift 2 ;;
    --dump)             DB_DUMP="$2";     shift 2 ;;
    --skip-db-restore)  SKIP_DB_RESTORE=true; shift ;;
    --force)            FORCE=true; shift ;;
    --yes|-y)           ASSUME_YES=true; shift ;;
    -h|--help)          sed -n '2,25p' "$0"; exit 0 ;;
    *) warn "Ignoring unknown argument: $1"; shift ;;
  esac
done

[ "$(id -u)" -eq 0 ] || fail "Run as root:  sudo bash install.sh"

[ -n "$SERVER_HOST" ] || SERVER_HOST="$(hostname -I 2>/dev/null | awk '{print $1}')"
[ -n "$SERVER_HOST" ] || SERVER_HOST="localhost"

clear || true
cat <<BANNER

  HCL Software Learning Hub — Offline Installer
  =============================================
  Version : ${APP_VERSION}
  Bundle  : ${SCRIPT_DIR}
  Install : ${INSTALL_DIR}
  Access  : http://${SERVER_HOST}:${HTTP_PORT}

BANNER

# ── Step 1: Pre-flight ───────────────────────────────────────────────────────
banner "Step 1/8: Pre-flight checks"

PREFLIGHT_OK=true

if [ -f /etc/os-release ]; then
  . /etc/os-release
  ok "OS: ${PRETTY_NAME:-$ID}"
else
  warn "Cannot read /etc/os-release — continuing"
fi

CPU_CORES=$(nproc 2>/dev/null || echo 0)
if [ "$CPU_CORES" -lt "$MIN_CPU_CORES" ]; then
  warn "CPU cores: ${CPU_CORES} (minimum ${MIN_CPU_CORES})"; PREFLIGHT_OK=false
else
  ok "CPU cores: ${CPU_CORES}"
fi

TOTAL_RAM_MB=$(free -m 2>/dev/null | awk '/^Mem:/{print $2}')
if [ -n "$TOTAL_RAM_MB" ] && [ "$TOTAL_RAM_MB" -lt "$MIN_RAM_MB" ]; then
  warn "RAM: ${TOTAL_RAM_MB}MB (minimum ${MIN_RAM_MB}MB / 4GB)"; PREFLIGHT_OK=false
else
  ok "RAM: ${TOTAL_RAM_MB:-unknown}MB"
fi

FREE_DISK_GB=$(df -BG "$(dirname "$INSTALL_DIR")" 2>/dev/null | awk 'NR==2{gsub("G","");print $4}')
[ -n "$FREE_DISK_GB" ] || FREE_DISK_GB=$(df -BG / | awk 'NR==2{gsub("G","");print $4}')
if [ "${FREE_DISK_GB:-0}" -lt "$MIN_DISK_GB" ]; then
  warn "Free disk: ${FREE_DISK_GB}GB (minimum ${MIN_DISK_GB}GB)"; PREFLIGHT_OK=false
else
  ok "Free disk: ${FREE_DISK_GB}GB"
fi

for PORT in "$HTTP_PORT" "$API_PORT"; do
  if ss -tln 2>/dev/null | grep -qE "[:.]${PORT}[[:space:]]"; then
    warn "Port ${PORT} is already in use"; PREFLIGHT_OK=false
  else
    ok "Port ${PORT} is free"
  fi
done

if [ "$PREFLIGHT_OK" = false ] && [ "$ASSUME_YES" = false ]; then
  echo ""
  read -r -p "  Pre-flight reported issues. Continue anyway? [y/N] " answer
  [[ "$answer" =~ ^[Yy]$ ]] || fail "Aborted by user"
fi

# ── Step 2: Container runtime ────────────────────────────────────────────────
banner "Step 2/8: Container runtime"

if detect_runtime; then
  ok "Using ${CRT_KIND}: $($CRT --version 2>/dev/null | head -1)"
else
  warn "No usable container runtime found"
  DOCKER_TGZ=$(ls "$SCRIPT_DIR"/runtime/docker-*.tgz 2>/dev/null | head -1 || true)
  if [ -n "$DOCKER_TGZ" ]; then
    info "Installing bundled Docker Engine from $(basename "$DOCKER_TGZ")..."
    tar -xzf "$DOCKER_TGZ" -C /tmp
    install -m 0755 /tmp/docker/* /usr/bin/
    cat > /etc/systemd/system/docker.service <<'UNIT'
[Unit]
Description=Docker Application Container Engine
After=network-online.target
Wants=network-online.target

[Service]
Type=notify
ExecStart=/usr/bin/dockerd -H unix:///var/run/docker.sock
ExecReload=/bin/kill -s HUP $MAINPID
LimitNOFILE=1048576
LimitNPROC=infinity
LimitCORE=infinity
TasksMax=infinity
Delegate=yes
KillMode=process
Restart=always

[Install]
WantedBy=multi-user.target
UNIT
    systemctl daemon-reload
    systemctl enable --now docker
    sleep 5
    detect_runtime || fail "Bundled Docker Engine failed to start. Check: journalctl -u docker"
    ok "Docker Engine installed: $($CRT --version | head -1)"
  else
    fail "Install a container runtime first, then re-run:
    RHEL/Rocky/Alma : sudo dnf install -y podman
    Ubuntu/Debian   : sudo apt-get install -y podman
  Or rebuild the bundle with --with-docker to embed the Docker Engine."
  fi
fi

# Podman resolves short names interactively; always use fully-qualified refs.
if [ "$CRT_KIND" = "podman" ]; then
  info "Podman detected — using fully-qualified image references"
fi

# ── Step 3: Install files ────────────────────────────────────────────────────
banner "Step 3/8: Installing bundle files"

mkdir -p "$INSTALL_DIR"
cp -r "$SCRIPT_DIR/." "$INSTALL_DIR/"
chmod +x "$INSTALL_DIR"/*.sh "$INSTALL_DIR"/lib/*.sh 2>/dev/null || true
ok "Bundle copied to $INSTALL_DIR"

HCL_CREDS_FILE="$INSTALL_DIR/.deploy-credentials"

# ── Step 4: Load container images ────────────────────────────────────────────
banner "Step 4/8: Loading container images (offline)"

IMAGE_DIR="$INSTALL_DIR/images"
[ -d "$IMAGE_DIR" ] || fail "images/ directory missing from bundle"

shopt -s nullglob
IMAGE_TARS=("$IMAGE_DIR"/*.tar "$IMAGE_DIR"/*.tar.gz)
shopt -u nullglob
[ "${#IMAGE_TARS[@]}" -gt 0 ] || fail "No image archives found in $IMAGE_DIR"

for TAR in "${IMAGE_TARS[@]}"; do
  info "Loading $(basename "$TAR")..."
  $CRT load -i "$TAR" >/dev/null || fail "Failed to load $(basename "$TAR")"
done
ok "${#IMAGE_TARS[@]} image archive(s) loaded"

for IMG in "$API_IMAGE" "$WEB_IMAGE" "$DB_IMAGE"; do
  $CRT image exists "$IMG" 2>/dev/null || $CRT image inspect "$IMG" >/dev/null 2>&1 \
    || fail "Image $IMG is missing after load — rebuild the bundle"
done
ok "All required images present locally"

# ── Step 5: Secrets ──────────────────────────────────────────────────────────
banner "Step 5/8: Secrets"

_rand() { head -c "$1" /dev/urandom | od -An -tx1 | tr -d ' \n'; }

if [ -f "$HCL_CREDS_FILE" ] && [ "$FORCE" = false ]; then
  DB_PASSWORD=$(read_cred DB_PASSWORD || true)
  JWT_SECRET=$(read_cred JWT_SECRET || true)
  [ -n "$ADMIN_PASSWORD" ] || ADMIN_PASSWORD=$(read_cred ADMIN_PASSWORD || true)
  ok "Reusing existing credentials from previous install"
fi

DB_PASSWORD="${DB_PASSWORD:-$(_rand 16)}"
JWT_SECRET="${JWT_SECRET:-$(_rand 32)}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-$(_rand 9)}"
ok "Database password, JWT secret and admin password ready"

# ── Step 6: Start the stack ──────────────────────────────────────────────────
banner "Step 6/8: Starting containers"

if [ "$FORCE" = true ]; then
  info "--force: removing any existing containers"
  $CRT rm -f "$WEB_CONTAINER" "$API_CONTAINER" "$DB_CONTAINER" >/dev/null 2>&1 || true
fi

$CRT network create "$STACK_NETWORK" >/dev/null 2>&1 || true
$CRT volume  create "$DB_VOLUME"     >/dev/null 2>&1 || true
$CRT volume  create "$API_VOLUME"    >/dev/null 2>&1 || true

if container_exists "$DB_CONTAINER"; then
  $CRT start "$DB_CONTAINER" >/dev/null
  ok "PostgreSQL container already existed — started"
else
  info "Starting PostgreSQL..."
  $CRT run -d --name "$DB_CONTAINER" \
    --network "$STACK_NETWORK" --network-alias postgres \
    -e POSTGRES_DB="$DB_NAME" \
    -e POSTGRES_USER="$DB_USER" \
    -e POSTGRES_PASSWORD="$DB_PASSWORD" \
    -v "$DB_VOLUME:/var/lib/postgresql/data" \
    --restart unless-stopped \
    "$DB_IMAGE" >/dev/null
  ok "PostgreSQL started"
fi

info "Waiting for PostgreSQL to accept connections..."
wait_for_postgres 60 || fail "PostgreSQL did not become ready. Check: $CRT logs $DB_CONTAINER"
ok "PostgreSQL is ready"

# ── Step 7: Restore the database dump ────────────────────────────────────────
banner "Step 7/8: Database restore"

if [ "$SKIP_DB_RESTORE" = true ]; then
  warn "--skip-db-restore given — starting with an empty database"
elif [ -f "$DB_DUMP" ]; then
  HCL_CREDS_FILE="$HCL_CREDS_FILE" \
  DB_PASSWORD="$DB_PASSWORD" \
  bash "$INSTALL_DIR/restore-db.sh" --dump "$DB_DUMP" --dir "$INSTALL_DIR" --yes
else
  warn "No dump found at $DB_DUMP — the application will start with an empty database"
  info "Restore later with: sudo bash $INSTALL_DIR/restore-db.sh --dump <file>"
fi

# ── Step 8: API + Web ────────────────────────────────────────────────────────
banner "Step 8/8: Starting API and Web tiers"

$CRT rm -f "$API_CONTAINER" "$WEB_CONTAINER" >/dev/null 2>&1 || true

info "Starting API..."
# Container alias MUST be "api": nginx.conf proxies /api/ to http://api:4000/
$CRT run -d --name "$API_CONTAINER" \
  --network "$STACK_NETWORK" --network-alias api \
  -e DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/${DB_NAME}" \
  -e NODE_ENV=production \
  -e PORT="$API_PORT" \
  -e FRONTEND_ORIGIN="http://${SERVER_HOST}:${HTTP_PORT}" \
  -e ENABLE_LOCAL_ADMIN=true \
  -e LOCAL_ADMIN_USERNAME="$ADMIN_USERNAME" \
  -e LOCAL_ADMIN_PASSWORD="$ADMIN_PASSWORD" \
  -e LOCAL_ADMIN_JWT_SECRET="$JWT_SECRET" \
  -v "$API_VOLUME:/app/data" \
  --restart unless-stopped \
  "$API_IMAGE" >/dev/null
ok "API started (running Prisma migrations on boot)"

info "Starting Web (nginx)..."
$CRT run -d --name "$WEB_CONTAINER" \
  --network "$STACK_NETWORK" --network-alias web \
  -p "${HTTP_PORT}:80" \
  --restart unless-stopped \
  "$WEB_IMAGE" >/dev/null
ok "Web started"

# ── Firewall ─────────────────────────────────────────────────────────────────
if command -v firewall-cmd >/dev/null 2>&1 && systemctl is-active --quiet firewalld 2>/dev/null; then
  firewall-cmd --permanent --add-port="${HTTP_PORT}/tcp" >/dev/null 2>&1 || true
  firewall-cmd --reload >/dev/null 2>&1 || true
  ok "firewalld: ${HTTP_PORT}/tcp opened (5432 intentionally left closed)"
elif command -v ufw >/dev/null 2>&1 && ufw status 2>/dev/null | grep -q "Status: active"; then
  ufw allow "${HTTP_PORT}/tcp" >/dev/null 2>&1 || true
  ok "ufw: ${HTTP_PORT}/tcp opened"
else
  warn "No managed firewall detected — ensure ${HTTP_PORT}/tcp is reachable and 5432/tcp is not"
fi

# ── Auto-start on boot ───────────────────────────────────────────────────────
if command -v systemctl >/dev/null 2>&1; then
  cat > /etc/systemd/system/${APP_NAME}.service <<UNIT
[Unit]
Description=HCL Software Learning Hub
After=network-online.target docker.service
Wants=network-online.target

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=${INSTALL_DIR}
ExecStart=/bin/bash ${INSTALL_DIR}/start.sh
ExecStop=/bin/bash ${INSTALL_DIR}/stop.sh

[Install]
WantedBy=multi-user.target
UNIT
  systemctl daemon-reload
  systemctl enable "${APP_NAME}.service" >/dev/null 2>&1 || true
  ok "Auto-start registered: systemctl start|stop ${APP_NAME}"
fi

# ── Save credentials ─────────────────────────────────────────────────────────
cat > "$HCL_CREDS_FILE" <<CREDS
# HCL Software Learning Hub — Deployment Credentials
# Generated: $(date -Iseconds)
APP_VERSION=${APP_VERSION}
INSTALL_DIR=${INSTALL_DIR}
SERVER_HOST=${SERVER_HOST}
HTTP_PORT=${HTTP_PORT}
CONTAINER_RUNTIME=${CRT_KIND}
DB_NAME=${DB_NAME}
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}
JWT_SECRET=${JWT_SECRET}
ADMIN_USERNAME=${ADMIN_USERNAME}
ADMIN_PASSWORD=${ADMIN_PASSWORD}
ACCESS_URL=http://${SERVER_HOST}:${HTTP_PORT}
CREDS
chmod 600 "$HCL_CREDS_FILE"
ok "Credentials saved to $HCL_CREDS_FILE (mode 600)"

# ── Health check ─────────────────────────────────────────────────────────────
banner "Health check"
if wait_for_http 45; then
  ok "Frontend is responding on http://127.0.0.1:${HTTP_PORT}/"
else
  warn "Frontend did not respond yet — the API may still be applying migrations"
  info "Check: $CRT logs -f $API_CONTAINER"
fi

banner "Installation complete"
cat <<SUMMARY

  Application URL : http://${SERVER_HOST}:${HTTP_PORT}
  Admin login     : ${ADMIN_USERNAME} / ${ADMIN_PASSWORD}
  Credentials     : ${HCL_CREDS_FILE}
  Runtime         : ${CRT_KIND}

  Manage the stack:
    sudo bash ${INSTALL_DIR}/start.sh      # start  (or: systemctl start ${APP_NAME})
    sudo bash ${INSTALL_DIR}/stop.sh       # stop   (or: systemctl stop  ${APP_NAME})
    sudo bash ${INSTALL_DIR}/restore-db.sh --dump <file>

  Logs:
    ${CRT} logs -f ${API_CONTAINER}
    ${CRT} logs -f ${WEB_CONTAINER}

SUMMARY
