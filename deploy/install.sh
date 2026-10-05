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
#   --database-url <url>  Use an existing PostgreSQL instead of installing one
#   --pg-version <n>  PGDG major version when falling back (default: 16)
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
DATABASE_URL_OVERRIDE=""
EXTERNAL_DB=false
PG_MAJOR=16

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dir)             PARENT_DIR="$2"; shift 2 ;;
    --repo)            GIT_REPO="$2"; shift 2 ;;
    --branch)          GIT_BRANCH="$2"; shift 2 ;;
    --host)            SERVER_FQDN="$2"; shift 2 ;;
    --dump)            DUMP_FILE="$2"; shift 2 ;;
    --token)           GITHUB_TOKEN="$2"; shift 2 ;;
    --database-url)    DATABASE_URL_OVERRIDE="$2"; shift 2 ;;
    --pg-version)      PG_MAJOR="$2"; shift 2 ;;
    --skip-db-restore) SKIP_DB_RESTORE=true; shift ;;
    --no-save-token)   SAVE_TOKEN=false; shift ;;
    -h|--help)         sed -n '2,36p' "$0"; exit 0 ;;
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

# npm 12 requires Node 22+; whichever npm ships with your Node is the safe one.
info "Keep the bundled npm — do NOT run 'npm install -g npm@latest'"

# ── Step 3: PostgreSQL ───────────────────────────────────────────────────────
banner "Step 3/9: PostgreSQL"

PG_SERVICE="postgresql"
PG_BIN=""

if [ -n "$DATABASE_URL_OVERRIDE" ]; then
  # postgresql://user:password@host:port/dbname
  _rest="${DATABASE_URL_OVERRIDE#*://}"
  _creds="${_rest%%@*}"
  _hostpart="${_rest#*@}"
  DB_USER="${_creds%%:*}"
  DB_PASSWORD="${_creds#*:}"
  _hostport="${_hostpart%%/*}"
  DB_NAME="${_hostpart#*/}"; DB_NAME="${DB_NAME%%\?*}"
  DB_HOST="${_hostport%%:*}"
  DB_PORT="${_hostport#*:}"
  if [ "$DB_PORT" = "$DB_HOST" ]; then DB_PORT=5432; fi
  EXTERNAL_DB=true
  ok "Using the external database ${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
  command -v psql >/dev/null 2>&1 \
    || warn "psql client not found — the dump restore step will be skipped"
elif ls /usr/pgsql-*/bin/psql >/dev/null 2>&1; then
  ok "PostgreSQL already installed (PGDG)"
elif command -v psql >/dev/null 2>&1 && sudo test -d /var/lib/pgsql; then
  ok "PostgreSQL already installed: $(psql --version)"
elif [ "$PKG" = "apt" ]; then
  info "Installing PostgreSQL server..."
  sudo apt-get install -y postgresql postgresql-contrib || fail "PostgreSQL install failed"
  ok "PostgreSQL installed"
else
  info "Installing PostgreSQL server..."
  if sudo dnf install -y postgresql-server postgresql-contrib 2>/dev/null; then
    ok "PostgreSQL installed from the distribution repositories"
  else
    # RHEL without a valid subscription cannot see AppStream; PGDG is public.
    warn "Distribution packages unavailable (expired RHEL subscription?)"
    info "Falling back to the PostgreSQL community (PGDG) repository..."
    EL_VER="${VERSION_ID%%.*}"
    PGDG_REPO=/etc/yum.repos.d/pgdg-redhat-all.repo

    # A previous failed run can leave this file behind with broken URLs, which
    # would break every later dnf call, so disable pgdg while adding the RPM.
    if ! sudo test -f "$PGDG_REPO"; then
      sudo dnf --disablerepo="pgdg*" install -y \
        "https://download.postgresql.org/pub/repos/yum/reporpms/EL-${EL_VER}-x86_64/pgdg-redhat-repo-latest.noarch.rpm" \
        || fail "Could not add the PGDG repository.

  No PostgreSQL package source is reachable. Pick one:
    1. Restore the RHEL subscription:  sudo subscription-manager refresh
    2. Point at an existing database:  bash install.sh --database-url postgresql://user:pass@host:5432/hclhub
    3. Run PostgreSQL in a container and use option 2 against it."
    else
      info "PGDG repository already present — reusing it"
    fi

    # PGDG publishes per MAJOR release (rhel-9), but RHEL expands $releasever to
    # the minor version (9.0), producing a 404. Pin the URLs to the major.
    if sudo test -f "$PGDG_REPO"; then
      sudo test -f "${PGDG_REPO}.hcl-hub.bak" || sudo cp "$PGDG_REPO" "${PGDG_REPO}.hcl-hub.bak"
      sudo sed -i "s|rhel-\$releasever-|rhel-${EL_VER}-|g" "$PGDG_REPO"
      ok "PGDG repo URLs pinned to EL${EL_VER} (backup: ${PGDG_REPO}.hcl-hub.bak)"
    fi

    sudo dnf -qy --disablerepo="pgdg*" module disable postgresql >/dev/null 2>&1 || true
    sudo dnf clean all >/dev/null 2>&1 || true

    # Every pgdg<N> repo is enabled by default; one unreachable version aborts
    # the whole transaction, so enable only the major we are installing.
    if ! sudo dnf --disablerepo="pgdg*" --enablerepo="pgdg${PG_MAJOR}" \
           install -y "postgresql${PG_MAJOR}-server" "postgresql${PG_MAJOR}-contrib"; then
      fail "PGDG install of postgresql${PG_MAJOR}-server failed.

  Try a different major version, or use an existing database:
    bash install.sh --pg-version 15
    bash install.sh --database-url postgresql://user:pass@host:5432/hclhub

  To run PostgreSQL in a container instead:
    podman run -d --name hcl-postgres -p 5432:5432 \\
      -e POSTGRES_USER=hcluser -e POSTGRES_PASSWORD=<pick-one> -e POSTGRES_DB=hclhub \\
      -v hcl-pgdata:/var/lib/postgresql/data --restart unless-stopped \\
      docker.io/postgres:16-alpine
    bash install.sh --database-url postgresql://hcluser:<pick-one>@127.0.0.1:5432/hclhub"
    fi
    PG_SERVICE="postgresql-${PG_MAJOR}"
    PG_BIN="/usr/pgsql-${PG_MAJOR}/bin"
    ok "PostgreSQL ${PG_MAJOR} installed from PGDG"
  fi
fi

if [ "$EXTERNAL_DB" = false ]; then
  # PGDG installs outside /usr/bin, so put its tools on PATH for this script.
  if [ -z "$PG_BIN" ]; then
    for CANDIDATE in /usr/pgsql-*/bin; do
      if [ -x "$CANDIDATE/psql" ]; then PG_BIN="$CANDIDATE"; fi
    done
  fi
  if [ -n "$PG_BIN" ]; then
    # Derive the major from the path so a pre-existing PGDG install (which may
    # be a different version than --pg-version) gets the right service name.
    _found="${PG_BIN#/usr/pgsql-}"; _found="${_found%/bin}"
    if [ -n "$_found" ] && [ "$_found" != "$PG_BIN" ]; then PG_MAJOR="$_found"; fi
    export PATH="$PG_BIN:$PATH"
    PG_SERVICE="postgresql-${PG_MAJOR}"
  fi

  # RHEL needs an explicit initdb; Debian/Ubuntu initialise on install.
  if [ "$PKG" = "dnf" ]; then
    if [ -n "$PG_BIN" ]; then
      PGDATA_DIR="/var/lib/pgsql/${PG_MAJOR}/data"
      PG_SETUP="${PG_BIN}/postgresql-${PG_MAJOR}-setup"
    else
      PGDATA_DIR="/var/lib/pgsql/data"
      PG_SETUP="$(command -v postgresql-setup || echo /usr/bin/postgresql-setup)"
    fi
    if ! sudo test -f "$PGDATA_DIR/PG_VERSION"; then
      info "Initialising the data directory at $PGDATA_DIR..."
      sudo "$PG_SETUP" initdb >/dev/null 2>&1 \
        || sudo "$PG_SETUP" --initdb >/dev/null 2>&1 \
        || fail "postgresql initdb failed"
      ok "Data directory initialised"
    fi
  fi

  sudo systemctl enable --now "$PG_SERVICE" >/dev/null 2>&1 \
    || fail "Could not start ${PG_SERVICE}. Check: sudo journalctl -u ${PG_SERVICE}"
  for _ in $(seq 1 30); do
    sudo -u postgres "${PG_BIN:+$PG_BIN/}psql" -tAc 'SELECT 1' >/dev/null 2>&1 && break
    sleep 2
  done
  sudo -u postgres "${PG_BIN:+$PG_BIN/}psql" -tAc 'SELECT 1' >/dev/null 2>&1 \
    || fail "PostgreSQL is not accepting connections"
  ok "PostgreSQL is running (service: ${PG_SERVICE})"

  # Prisma connects over TCP, so localhost must use password auth, not ident/peer.
  HBA_FILE="$(sudo -u postgres "${PG_BIN:+$PG_BIN/}psql" -tAc 'SHOW hba_file' | tr -d '[:space:]')"
  if [ -n "$HBA_FILE" ] && sudo test -f "$HBA_FILE"; then
    if sudo grep -Eq '^[[:space:]]*host[[:space:]]+all[[:space:]]+all[[:space:]]+(127\.0\.0\.1/32|::1/128)[[:space:]]+(ident|peer)' "$HBA_FILE"; then
      info "Enabling password auth for local TCP connections..."
      sudo cp "$HBA_FILE" "${HBA_FILE}.hcl-hub.bak"
      sudo sed -ri 's#^([[:space:]]*host[[:space:]]+all[[:space:]]+all[[:space:]]+(127\.0\.0\.1/32|::1/128)[[:space:]]+)(ident|peer)#\1scram-sha-256#' "$HBA_FILE"
      sudo systemctl reload "$PG_SERVICE"
      ok "pg_hba.conf updated (backup: ${HBA_FILE}.hcl-hub.bak)"
    else
      ok "pg_hba.conf already allows password auth on localhost"
    fi
  fi
fi

# ── Step 4: Database role & schema ───────────────────────────────────────────
banner "Step 4/9: Database role and database"

if [ "$EXTERNAL_DB" = true ]; then
  if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
       -tAc 'SELECT 1' >/dev/null 2>&1; then
    ok "Connected to the external database"
  else
    fail "Cannot connect with the supplied --database-url"
  fi
else
  DB_PASSWORD="$(openssl rand -hex 16)"
  PSQL_ADMIN=("sudo" "-u" "postgres" "${PG_BIN:+$PG_BIN/}psql")

  if "${PSQL_ADMIN[@]}" -tAc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" | grep -q 1; then
    info "Role ${DB_USER} exists — resetting its password"
    "${PSQL_ADMIN[@]}" -c "ALTER ROLE ${DB_USER} WITH LOGIN PASSWORD '${DB_PASSWORD}';" >/dev/null
  else
    "${PSQL_ADMIN[@]}" -c "CREATE ROLE ${DB_USER} WITH LOGIN PASSWORD '${DB_PASSWORD}';" >/dev/null
    ok "Role ${DB_USER} created"
  fi

  if "${PSQL_ADMIN[@]}" -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1; then
    ok "Database ${DB_NAME} already exists"
  else
    sudo -u postgres "${PG_BIN:+$PG_BIN/}createdb" -O "${DB_USER}" "${DB_NAME}"
    ok "Database ${DB_NAME} created"
  fi
  "${PSQL_ADMIN[@]}" -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};" >/dev/null
fi

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
DB_CONTAINER_NAME=${DB_CONTAINER_NAME:-hcl-postgres}
DB_CONTAINER_ENGINE=${DB_CONTAINER_ENGINE:-}
PG_SERVICE=${PG_SERVICE}
PG_BIN=${PG_BIN}
EXTERNAL_DB=${EXTERNAL_DB}
GIT_REPO=${GIT_REPO}
GIT_BRANCH=${GIT_BRANCH}
HUBENV
chmod 600 deploy/hub.env

find deploy -maxdepth 1 -type f -name '*.sh' -exec chmod u+x {} \;
ok "Deploy scripts marked executable"

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
ADMIN_USERNAME=admin@local
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

  # A custom archive stores its format version at byte 6; pg_restore refuses
  # anything newer than itself. 1.15 needs PG16, 1.16 needs PG17, and so on.
  if [ "$MAGIC" = "PGDMP" ]; then
    ARCHIVE_VMIN="$(od -An -tu1 -j6 -N1 "$DUMP_FILE" 2>/dev/null | tr -d ' ' || true)"
    PGR_MAJOR="$(pg_restore --version 2>/dev/null | awk '{print $NF}' | cut -d. -f1 || true)"
    if [ -n "$ARCHIVE_VMIN" ] && [ -n "$PGR_MAJOR" ] && [ "$ARCHIVE_VMIN" -ge 15 ] 2>/dev/null; then
      NEED_MAJOR=$((ARCHIVE_VMIN + 1))
      if [ "$PGR_MAJOR" -lt "$NEED_MAJOR" ] 2>/dev/null; then
        warn "Dump archive version 1.${ARCHIVE_VMIN} needs pg_restore ${NEED_MAJOR}+, but this host has ${PGR_MAJOR}"
        info "Restore will fail. Use a PostgreSQL ${NEED_MAJOR}+ container and restore with ITS pg_restore:"
        info "  podman cp '$DUMP_FILE' hcl-postgres:/tmp/backup.dump"
        info "  podman exec -e PGPASSWORD=<pw> hcl-postgres pg_restore -U ${DB_USER} -d ${DB_NAME} \\"
        info "      --clean --if-exists --no-owner --no-acl /tmp/backup.dump"
      fi
    fi
  fi
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

# Local login authenticates against the User table, so an empty or failed
# restore would leave no way in. Seed admin@local when no ADMIN row exists.
ADMINS="$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  -tAc "SELECT count(*) FROM \"User\" WHERE role='ADMIN';" 2>/dev/null | tr -d '[:space:]' || true)"
USERS="$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  -tAc "SELECT count(*) FROM \"User\";" 2>/dev/null | tr -d '[:space:]' || true)"

if [ "${ADMINS:-0}" = "0" ]; then
  info "No ADMIN user found — seeding admin@local..."
  npm run seed:admin >/dev/null 2>&1 \
    && ok "Local admin created: admin@local" \
    || warn "Could not seed admin@local — run manually: npm run seed:admin"
else
  ok "Existing users preserved (${USERS:-?} total, ${ADMINS} admin)"
fi

if [ "${USERS:-0}" = "0" ] || [ "${USERS:-0}" = "1" ]; then
  warn "The User table has ${USERS:-0} row(s) — the dump's users were NOT restored"
  info "Check the restore log above, then re-restore with a matching pg_restore version"
fi

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
  Admin login     : admin@local / ${ADMIN_PASSWORD}
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
