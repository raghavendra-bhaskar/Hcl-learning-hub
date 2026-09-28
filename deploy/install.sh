#!/bin/bash
# ============================================================
# HCL Software Learning Hub — Source Installer for a connected Linux VM
#
# Self-contained bootstrap: download ONLY this file, run it, and it
# installs every prerequisite, clones the repository, restores the
# database and leaves the Hub ready to start.
#
#   mkdir -p ~/software && cd ~/software
#   # download install.sh (see README), then:
#   bash install.sh
#
# Installs / configures:
#   git, curl, openssl        (dnf / apt)
#   Node.js 20 LTS            (NodeSource)
#   PostgreSQL server         (initdb, role, database, scram auth)
#   <parent>/hcl-learning-hub (git clone + npm install for BOTH workspaces)
#   server/.env               (generated secrets + correct FRONTEND_ORIGIN)
#   TLS certificate           (SAN matches this machine's FQDN)
#   Database                  (restored from scripts/backup.dump)
#
# Run as a NORMAL user that has sudo. Do NOT run with sudo directly, or
# node_modules and the git clone end up owned by root.
#
# Options:
#   --dir <path>      Parent directory for the clone (default: script location)
#   --repo <url>      Git repository URL
#   --branch <name>   Branch to check out (default: main)
#   --host <fqdn>     Public hostname (default: auto-detected FQDN)
#   --dump <file>     Database dump to restore (default: repo scripts/backup.dump)
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
    --dir)             PARENT_DIR="$2"; shift 2 ;;
    --repo)            GIT_REPO="$2"; shift 2 ;;
    --branch)          GIT_BRANCH="$2"; shift 2 ;;
    --host)            SERVER_FQDN="$2"; shift 2 ;;
    --dump)            DUMP_FILE="$2"; shift 2 ;;
    --token)           GITHUB_TOKEN="$2"; shift 2 ;;
    --skip-db-restore) SKIP_DB_RESTORE=true; shift ;;
    --no-save-token)   SAVE_TOKEN=false; shift ;;
    -h|--help)         sed -n '2,34p' "$0"; exit 0 ;;
    *) fail "Unknown argument: $1" ;;
  esac
done

[ "$(id -u)" -ne 0 ] || fail "Do not run as root. Run as your normal user (it will call sudo when needed):
  bash install.sh"

command -v sudo >/dev/null 2>&1 || fail "sudo is required but not installed"

APP_NAME="hcl-learning-hub"
INSTALL_DIR="$PARENT_DIR/$APP_NAME"
RUN_USER="$(id -un)"

[ -n "$SERVER_FQDN" ] || SERVER_FQDN="$(hostname -f 2>/dev/null || hostname)"
SHORT_HOST="${SERVER_FQDN%%.*}"
PRIMARY_IP="$(hostname -I 2>/dev/null | awk '{print $1}')"

UI_PORT=5173
API_PORT=4000
DB_NAME=hclhub
DB_USER=hcluser
DB_HOST=127.0.0.1
DB_PORT=5432

clear || true
cat <<BANNER

  HCL Software Learning Hub — Source Installer
  ============================================
  User     : ${RUN_USER}
  Install  : ${INSTALL_DIR}
  Hostname : ${SERVER_FQDN}
  Access   : https://${SERVER_FQDN}:${UI_PORT}

BANNER

# ── Step 1: OS detection & base packages ─────────────────────────────────────
banner "Step 1/9: Base packages"

[ -f /etc/os-release ] || fail "Cannot detect OS (/etc/os-release missing)"
. /etc/os-release
case "${ID,,}" in
  rhel|centos|rocky|almalinux|fedora) PKG=dnf ;;
  ubuntu|debian)                      PKG=apt ;;
  *) fail "Unsupported OS: $ID (supported: RHEL/Rocky/Alma/CentOS, Ubuntu/Debian)" ;;
esac
ok "OS: ${PRETTY_NAME:-$ID} (package manager: $PKG)"

if ! sudo -n true 2>/dev/null; then
  info "sudo password may be requested..."
fi

if [ "$PKG" = "dnf" ]; then
  sudo dnf install -y git curl openssl tar >/dev/null 2>&1 \
    || warn "Some base packages could not be installed — continuing"
else
  sudo apt-get update -y >/dev/null 2>&1 || true
  sudo apt-get install -y git curl openssl tar ca-certificates >/dev/null 2>&1 \
    || warn "Some base packages could not be installed — continuing"
fi
ok "Base packages present"

# ── Step 2: Node.js 20 ───────────────────────────────────────────────────────
banner "Step 2/9: Node.js 20 LTS"

NEED_NODE=true
if command -v node >/dev/null 2>&1; then
  NODE_MAJOR="$(node -v | sed 's/^v\([0-9]*\).*/\1/')"
  if [ "$NODE_MAJOR" -ge 20 ] 2>/dev/null; then
    NEED_NODE=false
    ok "Node.js already installed: $(node -v) (npm $(npm -v))"
  else
    warn "Node.js $(node -v) is too old — installing Node 20"
  fi
fi

if [ "$NEED_NODE" = true ]; then
  info "Installing Node.js 20 from NodeSource..."
  if [ "$PKG" = "dnf" ]; then
    curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash - >/dev/null
    sudo dnf install -y nodejs
  else
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash - >/dev/null
    sudo apt-get install -y nodejs
  fi
  ok "Node.js installed: $(node -v) (npm $(npm -v))"
fi

# npm 12 requires Node 22+; the npm bundled with Node 20 is the supported one.
info "Keep the bundled npm — do NOT run 'npm install -g npm@latest' on Node 20"

# ── Step 3: PostgreSQL ───────────────────────────────────────────────────────
banner "Step 3/9: PostgreSQL"

if ! command -v psql >/dev/null 2>&1; then
  info "Installing PostgreSQL server..."
  if [ "$PKG" = "dnf" ]; then
    sudo dnf install -y postgresql-server postgresql-contrib
  else
    sudo apt-get install -y postgresql postgresql-contrib
  fi
  ok "PostgreSQL installed"
else
  ok "PostgreSQL already installed: $(psql --version)"
fi

# RHEL needs an explicit initdb; Debian/Ubuntu initialise on install.
PGDATA_DIR="/var/lib/pgsql/data"
if [ "$PKG" = "dnf" ] && [ ! -f "$PGDATA_DIR/PG_VERSION" ]; then
  info "Initialising the PostgreSQL data directory..."
  sudo postgresql-setup --initdb >/dev/null 2>&1 \
    || sudo /usr/bin/postgresql-setup initdb >/dev/null 2>&1 \
    || fail "postgresql-setup --initdb failed"
  ok "Data directory initialised"
fi

sudo systemctl enable --now postgresql >/dev/null 2>&1 || fail "Could not start PostgreSQL"
for _ in $(seq 1 30); do
  sudo -u postgres psql -tAc 'SELECT 1' >/dev/null 2>&1 && break
  sleep 2
done
sudo -u postgres psql -tAc 'SELECT 1' >/dev/null 2>&1 || fail "PostgreSQL is not accepting connections"
ok "PostgreSQL is running"

# Prisma connects over TCP, so localhost must use password auth, not ident/peer.
HBA_FILE="$(sudo -u postgres psql -tAc 'SHOW hba_file' | tr -d '[:space:]')"
if [ -n "$HBA_FILE" ] && sudo test -f "$HBA_FILE"; then
  if sudo grep -Eq '^[[:space:]]*host[[:space:]]+all[[:space:]]+all[[:space:]]+(127\.0\.0\.1/32|::1/128)[[:space:]]+(ident|peer)' "$HBA_FILE"; then
    info "Enabling password auth for local TCP connections..."
    sudo cp "$HBA_FILE" "${HBA_FILE}.hcl-hub.bak"
    sudo sed -ri 's#^([[:space:]]*host[[:space:]]+all[[:space:]]+all[[:space:]]+(127\.0\.0\.1/32|::1/128)[[:space:]]+)(ident|peer)#\1scram-sha-256#' "$HBA_FILE"
    sudo systemctl reload postgresql
    ok "pg_hba.conf updated (backup: ${HBA_FILE}.hcl-hub.bak)"
  else
    ok "pg_hba.conf already allows password auth on localhost"
  fi
fi

# ── Step 4: Database role & schema ───────────────────────────────────────────
banner "Step 4/9: Database role and database"

DB_PASSWORD="$(openssl rand -hex 16)"

if sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" | grep -q 1; then
  info "Role ${DB_USER} exists — resetting its password"
  sudo -u postgres psql -c "ALTER ROLE ${DB_USER} WITH LOGIN PASSWORD '${DB_PASSWORD}';" >/dev/null
else
  sudo -u postgres psql -c "CREATE ROLE ${DB_USER} WITH LOGIN PASSWORD '${DB_PASSWORD}';" >/dev/null
  ok "Role ${DB_USER} created"
fi

if sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1; then
  ok "Database ${DB_NAME} already exists"
else
  sudo -u postgres createdb -O "${DB_USER}" "${DB_NAME}"
  ok "Database ${DB_NAME} created"
fi
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};" >/dev/null

# ── Step 5: Source code ──────────────────────────────────────────────────────
banner "Step 5/9: Source code"

mkdir -p "$PARENT_DIR" 2>/dev/null || sudo mkdir -p "$PARENT_DIR"
if [ ! -w "$PARENT_DIR" ]; then
  info "Taking ownership of $PARENT_DIR..."
  sudo chown -R "${RUN_USER}:${RUN_USER}" "$PARENT_DIR"
fi

# GIT_ASKPASS keeps the token out of argv, the remote URL and shell history.
ASKPASS=""
setup_askpass() {
  [ -n "$GITHUB_TOKEN" ] || return 0
  ASKPASS="$(mktemp)"
  chmod 700 "$ASKPASS"
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
else
  # Probe anonymously; only ask for a token if the repo is actually private.
  if [ -z "$GITHUB_TOKEN" ] && ! GIT_TERMINAL_PROMPT=0 git ls-remote "$GIT_REPO" >/dev/null 2>&1; then
    warn "This repository is private — a GitHub token is required."
    info "Use a fine-grained PAT with read-only 'Contents' access."
    read -rsp "  GitHub token (input hidden): " GITHUB_TOKEN; echo ""
    [ -n "$GITHUB_TOKEN" ] || fail "No token supplied"
  fi
  setup_askpass

  info "Cloning ${GIT_REPO} (branch ${GIT_BRANCH})..."
  git clone --branch "$GIT_BRANCH" "$GIT_REPO" "$INSTALL_DIR" \
    || fail "git clone failed. If the repo is private, check the token scope.
  A GitHub password will NOT work — password auth for Git was removed."
  ok "Cloned into $INSTALL_DIR"
fi

cd "$INSTALL_DIR"

# ── Step 6: Dependencies ─────────────────────────────────────────────────────
banner "Step 6/9: npm dependencies"

# Anything copied from another OS has the wrong native binaries.
rm -rf node_modules server/node_modules

info "Installing UI dependencies (root workspace)..."
npm install --no-fund --no-audit
info "Installing API dependencies (server workspace)..."
npm install --prefix server --no-fund --no-audit

# npm/cli#4828: a lockfile written on another OS can omit this platform's
# optional native packages, so vite/rollup fail only at runtime. Verify, and
# rebuild from scratch without the lockfile if the check fails.
if ! npx --no-install vite --version >/dev/null 2>&1; then
  warn "Native modules are incomplete (npm optional-dependency bug) — reinstalling"
  rm -rf node_modules package-lock.json
  npm install --no-fund --no-audit
  npx --no-install vite --version >/dev/null 2>&1 \
    || fail "vite still cannot start. Run 'npm install' manually in $INSTALL_DIR"
  ok "UI dependencies repaired"
fi

if ! ( cd server && node -e "require.resolve('@prisma/client')" >/dev/null 2>&1 ); then
  warn "API dependencies incomplete — reinstalling"
  rm -rf server/node_modules server/package-lock.json
  npm install --prefix server --no-fund --no-audit
fi

ok "Dependencies installed for $(node -p 'process.platform + "-" + process.arch')"

# ── Step 7: Configuration & certificates ─────────────────────────────────────
banner "Step 7/9: Configuration"

JWT_SECRET="$(openssl rand -hex 32)"
ADMIN_PASSWORD="$(openssl rand -hex 9)"
FRONTEND_ORIGIN="https://${SERVER_FQDN}:${UI_PORT}"

if [ -f server/.env ]; then
  cp server/.env "server/.env.bak.$(date +%Y%m%d-%H%M%S)"
  warn "Existing server/.env backed up"
fi

cat > server/.env <<ENVFILE
# Generated by deploy/install.sh on $(date -Iseconds)
DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

PORT=${API_PORT}
NODE_ENV=development
FRONTEND_ORIGIN=${FRONTEND_ORIGIN}

OKTA_ISSUER=
OKTA_AUDIENCE=api://default
OKTA_CLIENT_ID=
OKTA_MANAGER_CLAIM=manager
OKTA_MANAGER_ID_CLAIM=managerId

ENABLE_LOCAL_ADMIN=true
LOCAL_ADMIN_USERNAME=admin
LOCAL_ADMIN_PASSWORD=${ADMIN_PASSWORD}
LOCAL_ADMIN_JWT_SECRET=${JWT_SECRET}
ENVFILE
chmod 600 server/.env
ok "server/.env written (FRONTEND_ORIGIN=${FRONTEND_ORIGIN})"

# TLS certificate whose SAN covers the FQDN, short name and IP.
info "Generating TLS certificate for ${SERVER_FQDN}..."
rm -rf certs
CERT_CN="$SHORT_HOST" \
CERT_FQDN="$SERVER_FQDN" \
CERT_ALT_IPS="${PRIMARY_IP}" \
  node scripts/generate-certs.js
ok "Certificate generated"

# Deployment config consumed by start.sh / stop.sh / sync.sh
cat > deploy/hub.env <<HUBENV
APP_NAME=${APP_NAME}
SERVER_FQDN=${SERVER_FQDN}
UI_PORT=${UI_PORT}
API_PORT=${API_PORT}
DB_HOST=${DB_HOST}
DB_PORT=${DB_PORT}
DB_NAME=${DB_NAME}
DB_USER=${DB_USER}
GIT_REPO=${GIT_REPO}
GIT_BRANCH=${GIT_BRANCH}
HUBENV
chmod 600 deploy/hub.env

# Credentials summary (kept out of git by .gitignore)
cat > .deploy-credentials <<CREDS
# HCL Software Learning Hub — Deployment Credentials
# Generated: $(date -Iseconds)
INSTALL_DIR=${INSTALL_DIR}
SERVER_FQDN=${SERVER_FQDN}
ACCESS_URL=${FRONTEND_ORIGIN}
DB_NAME=${DB_NAME}
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}
JWT_SECRET=${JWT_SECRET}
ADMIN_USERNAME=admin
ADMIN_PASSWORD=${ADMIN_PASSWORD}
CREDS
chmod 600 .deploy-credentials
ok "Credentials saved to ${INSTALL_DIR}/.deploy-credentials"

if [ "$SAVE_TOKEN" = true ] && [ -n "$GITHUB_TOKEN" ]; then
  printf '%s' "$GITHUB_TOKEN" > .hub-token
  chmod 600 .hub-token
  ok "GitHub token stored at ${INSTALL_DIR}/.hub-token (mode 600) for sync.sh"
fi

# ── Step 8: Database restore + migrations ────────────────────────────────────
banner "Step 8/9: Database"

[ -n "$DUMP_FILE" ] || DUMP_FILE="$INSTALL_DIR/scripts/backup.dump"

if [ "$SKIP_DB_RESTORE" = true ]; then
  warn "--skip-db-restore given — starting with an empty database"
elif [ -f "$DUMP_FILE" ]; then
  info "Restoring database from $(basename "$DUMP_FILE")..."
  RESTORE_LOG="$INSTALL_DIR/restore-$(date +%Y%m%d-%H%M%S).log"
  MAGIC="$(head -c 5 "$DUMP_FILE" | tr -d '\0' || true)"
  set +e
  if [ "$MAGIC" = "PGDMP" ]; then
    PGPASSWORD="$DB_PASSWORD" pg_restore -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
      --clean --if-exists --no-owner --no-acl "$DUMP_FILE" > "$RESTORE_LOG" 2>&1
  else
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
      --set ON_ERROR_STOP=off -f "$DUMP_FILE" > "$RESTORE_LOG" 2>&1
  fi
  RC=$?
  set -e
  if [ $RC -ne 0 ]; then
    warn "Restore exited with code $RC — review $RESTORE_LOG"
    warn "Errors about missing roles or DROP statements are normal on a fresh database"
  else
    ok "Database restored"
  fi
else
  warn "No dump at $DUMP_FILE — the database will only contain the schema"
fi

info "Generating the Prisma client for this machine..."
npm run prisma:generate --prefix server >/dev/null
ok "Prisma client generated"

info "Applying database migrations..."
npm run prisma:deploy --prefix server >/dev/null 2>&1 \
  || warn "prisma migrate deploy reported an issue — check with: npm run prisma:deploy --prefix server"
ok "Migrations applied"

TABLES="$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  -tAc "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';" 2>/dev/null | tr -d '[:space:]' || true)"
ok "Database contains ${TABLES:-?} tables"

# ── Step 9: Firewall & finish ────────────────────────────────────────────────
banner "Step 9/9: Firewall"

if command -v firewall-cmd >/dev/null 2>&1 && sudo systemctl is-active --quiet firewalld 2>/dev/null; then
  sudo firewall-cmd --permanent --add-port="${UI_PORT}/tcp" >/dev/null 2>&1 || true
  sudo firewall-cmd --permanent --add-port="${API_PORT}/tcp" >/dev/null 2>&1 || true
  sudo firewall-cmd --reload >/dev/null 2>&1 || true
  ok "firewalld: ${UI_PORT}/tcp and ${API_PORT}/tcp opened"
elif command -v ufw >/dev/null 2>&1 && sudo ufw status 2>/dev/null | grep -q "Status: active"; then
  sudo ufw allow "${UI_PORT}/tcp" >/dev/null 2>&1 || true
  sudo ufw allow "${API_PORT}/tcp" >/dev/null 2>&1 || true
  ok "ufw: ${UI_PORT}/tcp and ${API_PORT}/tcp opened"
else
  warn "No managed firewall detected — ensure ${UI_PORT}/tcp is reachable"
fi

chmod +x deploy/*.sh 2>/dev/null || true

banner "Installation complete"
cat <<SUMMARY

  Application URL : ${FRONTEND_ORIGIN}
  Admin login     : admin / ${ADMIN_PASSWORD}
  Install dir     : ${INSTALL_DIR}
  Credentials     : ${INSTALL_DIR}/.deploy-credentials

  Start the Hub (UI + API in one command):
    bash ${INSTALL_DIR}/deploy/start.sh

  Stop it:
    bash ${INSTALL_DIR}/deploy/stop.sh

  Pull the latest code + back up the database:
    bash ${INSTALL_DIR}/deploy/sync.sh

  The certificate is self-signed: the browser shows a warning once.
  Click Advanced -> Proceed for both:
    ${FRONTEND_ORIGIN}
    https://${SERVER_FQDN}:${API_PORT}/health

SUMMARY
