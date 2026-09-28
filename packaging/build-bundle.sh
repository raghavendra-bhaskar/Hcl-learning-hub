#!/bin/bash
# ============================================================
# HCL Software Learning Hub — Offline Bundle Builder (Linux/macOS)
#
# Run this ONCE on a machine that HAS internet and a container runtime.
# It produces a self-contained archive that installs on an air-gapped host
# with no registry access:
#
#   dist-bundle/hcl-learning-hub-<version>-linux.tar.gz
#
# Bundle contents:
#   images/      api, web and postgres images saved as tar archives
#   db/          backup.dump restored automatically at install time
#   lib/         shared bash helpers
#   install.sh   start.sh  stop.sh  restore-db.sh  bundle.env
#   runtime/     (optional, --with-docker) Docker Engine static binaries
#
# Usage:
#   bash packaging/build-bundle.sh [--with-docker] [--docker-version 27.3.1]
#                                  [--dump <file>] [--output <dir>]
# ============================================================

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUNDLE_SRC="$REPO_ROOT/packaging/bundle"
OUTPUT_DIR="$REPO_ROOT/dist-bundle"
DUMP_SRC="$REPO_ROOT/scripts/backup.dump"
WITH_DOCKER=false
DOCKER_VERSION="27.3.1"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; CYAN='\033[0;36m'; NC='\033[0m'
ok()   { echo -e "${GREEN}[ OK ]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
fail() { echo -e "${RED}[FAIL]${NC} $*" >&2; exit 1; }
info() { echo -e "  ${CYAN}->${NC} $*"; }
step() { echo ""; echo "=== $1 ==="; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    --with-docker)    WITH_DOCKER=true; shift ;;
    --docker-version) DOCKER_VERSION="$2"; shift 2 ;;
    --dump)           DUMP_SRC="$2"; shift 2 ;;
    --output)         OUTPUT_DIR="$2"; shift 2 ;;
    -h|--help)        sed -n '2,22p' "$0"; exit 0 ;;
    *) fail "Unknown argument: $1" ;;
  esac
done

# ── Read bundle.env for image names / version ────────────────────────────────
source "$BUNDLE_SRC/lib/common.sh"
load_bundle_env "$BUNDLE_SRC/bundle.env"

detect_runtime || fail "Docker or Podman is required to build the bundle"
ok "Build runtime: $CRT_KIND"

STAGING="$OUTPUT_DIR/staging-linux"
ARCHIVE="$OUTPUT_DIR/${APP_NAME}-${APP_VERSION}-linux.tar.gz"

rm -rf "$STAGING"
mkdir -p "$STAGING/images" "$STAGING/db" "$STAGING/runtime"

# ── 1. Build application images ──────────────────────────────────────────────
step "1/5  Building application images"

info "Building API image: $API_IMAGE"
$CRT build -t "$API_IMAGE" "$REPO_ROOT/server" || fail "API image build failed"
ok "API image built"

info "Building Web image: $WEB_IMAGE"
$CRT build -t "$WEB_IMAGE" "$REPO_ROOT" || fail "Web image build failed"
ok "Web image built"

info "Pulling database image: $DB_IMAGE"
$CRT pull "$DB_IMAGE" || fail "Could not pull $DB_IMAGE — this step needs internet"
ok "Database image pulled"

# ── 2. Export images to tar ──────────────────────────────────────────────────
step "2/5  Exporting images for offline load"

save_image() {
  local image="$1" out="$2"
  info "Saving $image -> $(basename "$out")"
  $CRT save -o "$out" "$image" || fail "Failed to save $image"
}

save_image "$API_IMAGE" "$STAGING/images/01-api.tar"
save_image "$WEB_IMAGE" "$STAGING/images/02-web.tar"
save_image "$DB_IMAGE"  "$STAGING/images/03-postgres.tar"
ok "Images exported ($(du -sh "$STAGING/images" | cut -f1))"

# ── 3. Database dump ─────────────────────────────────────────────────────────
step "3/5  Adding database dump"

if [ -f "$DUMP_SRC" ]; then
  cp "$DUMP_SRC" "$STAGING/db/backup.dump"
  ok "Dump added: $(basename "$DUMP_SRC") ($(du -h "$DUMP_SRC" | cut -f1))"
else
  warn "No dump at $DUMP_SRC — the bundle will install an empty database"
fi

OIDC_SRC="$(dirname "$DUMP_SRC")/oidc-config.json"
[ -f "$OIDC_SRC" ] && cp "$OIDC_SRC" "$STAGING/db/oidc-config.json" && ok "OIDC config added"

# ── 4. Optional: embed the Docker Engine ─────────────────────────────────────
step "4/5  Container runtime payload"

if [ "$WITH_DOCKER" = true ]; then
  ARCH=$(uname -m)
  DOCKER_URL="https://download.docker.com/linux/static/stable/${ARCH}/docker-${DOCKER_VERSION}.tgz"
  info "Downloading $DOCKER_URL"
  curl -fSL "$DOCKER_URL" -o "$STAGING/runtime/docker-${DOCKER_VERSION}.tgz" \
    || fail "Could not download the Docker Engine static build"
  ok "Docker Engine ${DOCKER_VERSION} embedded ($(du -h "$STAGING/runtime/docker-${DOCKER_VERSION}.tgz" | cut -f1))"
else
  echo "Rebuild with --with-docker to embed the Docker Engine static binaries." \
    > "$STAGING/runtime/README.txt"
  info "Skipped (target host must already have podman or docker)"
fi

# ── 5. Scripts, docs and archive ─────────────────────────────────────────────
step "5/5  Assembling archive"

for f in bundle.env install.sh start.sh stop.sh restore-db.sh; do
  cp "$BUNDLE_SRC/$f" "$STAGING/"
done
mkdir -p "$STAGING/lib"
cp "$BUNDLE_SRC/lib/common.sh" "$STAGING/lib/"
chmod +x "$STAGING"/*.sh

# Reference material shipped for operators
mkdir -p "$STAGING/docs"
for doc in README.md PROJECT_OVERVIEW.md; do
  [ -f "$REPO_ROOT/$doc" ] && cp "$REPO_ROOT/$doc" "$STAGING/docs/"
done
cp "$BUNDLE_SRC/BUNDLE-README.md" "$STAGING/README.md" 2>/dev/null || true

cat > "$STAGING/MANIFEST.txt" <<MANIFEST
HCL Software Learning Hub — Offline Bundle
Version    : ${APP_VERSION}
Platform   : linux
Built on   : $(date -Iseconds)
Built with : ${CRT_KIND}
Images     : ${API_IMAGE}, ${WEB_IMAGE}, ${DB_IMAGE}
Database   : $([ -f "$STAGING/db/backup.dump" ] && echo 'backup.dump included' || echo 'none (empty install)')
Runtime    : $([ "$WITH_DOCKER" = true ] && echo "docker-${DOCKER_VERSION}.tgz included" || echo 'host-provided (podman/docker)')

Install:
  tar -xzf $(basename "$ARCHIVE")
  cd ${APP_NAME}-${APP_VERSION}-linux
  sudo bash install.sh
MANIFEST

mkdir -p "$OUTPUT_DIR"
STAGE_NAME="${APP_NAME}-${APP_VERSION}-linux"
rm -rf "$OUTPUT_DIR/$STAGE_NAME"
mv "$STAGING" "$OUTPUT_DIR/$STAGE_NAME"

tar -czf "$ARCHIVE" -C "$OUTPUT_DIR" "$STAGE_NAME"
rm -rf "$OUTPUT_DIR/$STAGE_NAME"

# Integrity checksum for transfer verification
( cd "$OUTPUT_DIR" && sha256sum "$(basename "$ARCHIVE")" > "$(basename "$ARCHIVE").sha256" )

ok "Bundle ready: $ARCHIVE ($(du -h "$ARCHIVE" | cut -f1))"
ok "Checksum:     ${ARCHIVE}.sha256"
echo ""
echo "  Copy to the air-gapped host, then:"
echo "    tar -xzf $(basename "$ARCHIVE")"
echo "    cd ${STAGE_NAME}"
echo "    sudo bash install.sh"
echo ""
