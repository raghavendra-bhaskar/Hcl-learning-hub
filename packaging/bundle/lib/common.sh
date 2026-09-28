#!/bin/bash
# ============================================================
# HCL Software Learning Hub — Shared Bundle Helpers (Linux)
#
# Sourced by install.sh / start.sh / stop.sh / restore-db.sh.
# Never executed directly.
# ============================================================

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; CYAN='\033[0;36m'; NC='\033[0m'
ok()     { echo -e "${GREEN}[ OK ]${NC} $*"; }
warn()   { echo -e "${YELLOW}[WARN]${NC} $*"; }
fail()   { echo -e "${RED}[FAIL]${NC} $*" >&2; exit 1; }
info()   { echo -e "  ${CYAN}->${NC} $*"; }
banner() { echo ""; echo "========================================"; echo "  $1"; echo "========================================"; }

# Directory that holds this library (…/bundle/lib)
HCL_LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Bundle root (…/bundle)
HCL_BUNDLE_DIR="$(cd "$HCL_LIB_DIR/.." && pwd)"

# ── Load bundle.env into the environment ─────────────────────────────────────
load_bundle_env() {
  local envfile="${1:-$HCL_BUNDLE_DIR/bundle.env}"
  [ -f "$envfile" ] || fail "bundle.env not found at $envfile"
  # Only accept plain KEY=VALUE lines; ignore comments and blanks.
  while IFS='=' read -r key value; do
    case "$key" in ''|\#*) continue ;; esac
    key="${key//[[:space:]]/}"
    value="${value%%$'\r'}"
    [ -n "$key" ] && export "$key=$value"
  done < "$envfile"
}

# ── Detect an available container runtime ────────────────────────────────────
# Sets: CRT (command to use), CRT_KIND (docker|podman)
detect_runtime() {
  if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
    CRT="docker"; CRT_KIND="docker"
  elif command -v podman >/dev/null 2>&1; then
    CRT="podman"; CRT_KIND="podman"
  elif command -v docker >/dev/null 2>&1; then
    # docker binary present but daemon down — try to start it
    systemctl start docker >/dev/null 2>&1 || true
    sleep 3
    if docker info >/dev/null 2>&1; then CRT="docker"; CRT_KIND="docker"; else return 1; fi
  else
    return 1
  fi
  export CRT CRT_KIND
  return 0
}

# ── Container state helpers ──────────────────────────────────────────────────
container_exists()  { $CRT ps -a --format '{{.Names}}' 2>/dev/null | grep -qx "$1"; }
container_running() { $CRT ps    --format '{{.Names}}' 2>/dev/null | grep -qx "$1"; }

# Wait until PostgreSQL inside $DB_CONTAINER accepts connections.
wait_for_postgres() {
  local tries="${1:-60}"
  for _ in $(seq 1 "$tries"); do
    if $CRT exec "$DB_CONTAINER" pg_isready -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; then
      return 0
    fi
    sleep 2
  done
  return 1
}

# Wait until the web tier answers on $HTTP_PORT.
wait_for_http() {
  local tries="${1:-45}"
  for _ in $(seq 1 "$tries"); do
    if curl -sf -o /dev/null "http://127.0.0.1:${HTTP_PORT}/"; then return 0; fi
    sleep 2
  done
  return 1
}

# Read a value out of the saved credentials file.
read_cred() {
  local key="$1" file="${2:-$HCL_CREDS_FILE}"
  [ -f "$file" ] || return 1
  grep -E "^${key}=" "$file" | head -1 | cut -d= -f2-
}
