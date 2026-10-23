#!/bin/bash
# ============================================================
# HCL Software Learning Hub — Connected VM Installer Wrapper
#
# Self-contained bootstrap: download ONLY this file, run it, and it
# prompts for the connected-VM runtime mode before dispatching to the
# correct worker installer.
#
#   mkdir -p ~/software && cd ~/software
#   bash install.sh
#
# Modes:
#   containers   Build local images and run Podman/Docker containers on the VM
#   kubernetes   Build local images, import them into k3s, and run Kubernetes workloads
#
# Run as a NORMAL user that has sudo. Do NOT run with sudo directly.
#
# Options:
#   --mode <name>    containers | kubernetes
#   --repo <url>      Git repository URL
#   --branch <name>   Branch to check out (default: main)
#   --host <fqdn>     Forwarded to the worker installer
#   --dump <file>     Forwarded to the worker installer
#   --token <pat>     GitHub token for a private repo (default: prompt)
#   --skip-db-restore Forwarded to the worker installer
#   --no-save-token   Do not store the token for sync.sh / later pulls
# ============================================================

set -euo pipefail

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; CYAN='\033[0;36m'; NC='\033[0m'
ok()     { echo -e "${GREEN}[ OK ]${NC} $*"; }
warn()   { echo -e "${YELLOW}[WARN]${NC} $*"; }
fail()   { echo -e "${RED}[FAIL]${NC} $*" >&2; exit 1; }
info()   { echo -e "  ${CYAN}->${NC} $*"; }
banner() { echo ""; echo "========================================"; echo "  $1"; echo "========================================"; }

MODE=""
FORWARD_ARGS=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --mode)
      MODE="$2"
      shift 2
      ;;
    -h|--help)
      cat <<EOF
HCL Software Learning Hub installer

Usage:
  bash deploy/install.sh --mode containers [options]
  bash deploy/install.sh --mode kubernetes [options]

Modes:
  containers   Run with Docker or Podman containers on this VM
  kubernetes   Run with k3s / Kubernetes on this VM

If --mode is omitted, the installer asks you to choose.
EOF
      exit 0
      ;;
    *)
      FORWARD_ARGS+=("$1")
      shift
      ;;
  esac
done

if [ -z "$MODE" ]; then
  echo "Choose installation mode:"
  echo "  1) containers  - Docker/Podman containers on this VM"
  echo "  2) kubernetes  - k3s / Kubernetes on this VM"
  read -r -p "Select [1-2]: " MODE_CHOICE
  case "$MODE_CHOICE" in
    1) MODE="containers" ;;
    2) MODE="kubernetes" ;;
    *) fail "Invalid selection: ${MODE_CHOICE:-<empty>}" ;;
  esac
fi

SCRIPT_HOME="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_ROOT="$SCRIPT_HOME"
if [ ! -f "$SCRIPT_HOME/install-containers.sh" ] && [ ! -f "$SCRIPT_HOME/install-kubernetes.sh" ]; then
  TARGET_ROOT="$SCRIPT_HOME/hcl-learning-hub/deploy"

  GIT_REPO="https://github.com/raghavendra-bhaskar/Hcl-learning-hub.git"
  GIT_BRANCH="main"
  GITHUB_TOKEN=""
  idx=0
  while [ $idx -lt ${#FORWARD_ARGS[@]} ]; do
    case "${FORWARD_ARGS[$idx]}" in
      --repo)
        idx=$((idx + 1))
        [ $idx -lt ${#FORWARD_ARGS[@]} ] && GIT_REPO="${FORWARD_ARGS[$idx]}"
        ;;
      --branch)
        idx=$((idx + 1))
        [ $idx -lt ${#FORWARD_ARGS[@]} ] && GIT_BRANCH="${FORWARD_ARGS[$idx]}"
        ;;
      --token)
        idx=$((idx + 1))
        [ $idx -lt ${#FORWARD_ARGS[@]} ] && GITHUB_TOKEN="${FORWARD_ARGS[$idx]}"
        ;;
    esac
    idx=$((idx + 1))
  done

  command -v git >/dev/null 2>&1 || fail "git is required to bootstrap the installer"
  command -v sudo >/dev/null 2>&1 || fail "sudo is required to bootstrap the installer"
  if [ ! -d "$SCRIPT_HOME/hcl-learning-hub/.git" ]; then
    ASKPASS=""
    if [ -n "$GITHUB_TOKEN" ]; then
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
    fi
    mkdir -p "$SCRIPT_HOME"
    git clone --branch "$GIT_BRANCH" "$GIT_REPO" "$SCRIPT_HOME/hcl-learning-hub" || fail "git clone failed during bootstrap"
    [ -n "$ASKPASS" ] && rm -f "$ASKPASS" || true
  fi
fi

case "$MODE" in
  containers)
    exec bash "$TARGET_ROOT/install-containers.sh" "${FORWARD_ARGS[@]}"
    ;;
  kubernetes)
    exec bash "$TARGET_ROOT/install-kubernetes.sh" "${FORWARD_ARGS[@]}"
    ;;
  *)
    fail "Unknown mode: $MODE (expected: containers or kubernetes)"
    ;;
esac
