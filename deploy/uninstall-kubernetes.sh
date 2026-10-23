#!/bin/bash
# ============================================================
# HCL Software Learning Hub — Kubernetes Uninstall Helper
#
# Removes the Kubernetes deployment created by deploy/install.sh
# when it was run in --mode kubernetes.
#
# Default behavior:
#   - delete the namespace and all workloads/services/ingress/secrets inside it
#   - keep the local git checkout on disk
#
# Optional behavior:
#   --purge-pvc    also delete the standalone postgres/api PVC objects after the
#                  namespace is removed, in case the storage class leaves them behind
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; CYAN='\033[0;36m'; NC='\033[0m'
ok()     { echo -e "${GREEN}[ OK ]${NC} $*"; }
warn()   { echo -e "${YELLOW}[WARN]${NC} $*"; }
fail()   { echo -e "${RED}[FAIL]${NC} $*" >&2; exit 1; }
info()   { echo -e "  ${CYAN}->${NC} $*"; }
banner() { echo ""; echo "========================================"; echo "  $1"; echo "========================================"; }

PURGE_PVC=false
ASSUME_YES=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --purge-pvc) PURGE_PVC=true; shift ;;
    --yes)       ASSUME_YES=true; shift ;;
    -h|--help)
      sed -n '2,16p' "$0"
      exit 0
      ;;
    *) fail "Unknown argument: $1" ;;
  esac
done

# shellcheck disable=SC1091
if [ -f "$SCRIPT_DIR/hub.env" ]; then . "$SCRIPT_DIR/hub.env"; fi

K8S_NS="${K8S_NAMESPACE:-hcl-learning-hub}"
export KUBECONFIG="${KUBECONFIG:-$HOME/.kube/config}"
KUBECTL="${KUBECTL_BIN:-}"
if [ -z "$KUBECTL" ] || [ ! -x "$KUBECTL" ]; then
  if [ -x /usr/local/bin/kubectl ]; then
    KUBECTL="/usr/local/bin/kubectl"
  elif command -v kubectl >/dev/null 2>&1; then
    KUBECTL="$(command -v kubectl)"
  else
    fail "kubectl not found. Export KUBECONFIG and ensure kubectl is installed first."
  fi
fi

banner "Kubernetes uninstall summary"
info "Install dir : $INSTALL_DIR"
info "Namespace   : $K8S_NS"
info "Purge PVCs  : $PURGE_PVC"

if [ "$ASSUME_YES" != true ]; then
  read -r -p "Delete namespace ${K8S_NS}? [y/N] " CONFIRM
  case "$CONFIRM" in
    y|Y|yes|YES) ;;
    *) fail "Uninstall cancelled" ;;
  esac
fi

if "$KUBECTL" get namespace "$K8S_NS" >/dev/null 2>&1; then
  banner "Step 1/2: Delete namespace"
  "$KUBECTL" delete namespace "$K8S_NS" --wait=true
  ok "Namespace removed: $K8S_NS"
else
  warn "Namespace $K8S_NS not found — nothing to delete"
fi

if [ "$PURGE_PVC" = true ]; then
  banner "Step 2/2: Delete lingering PVCs"
  "$KUBECTL" delete pvc postgres-pvc api-data-pvc -n "$K8S_NS" --ignore-not-found=true >/dev/null 2>&1 || true
  ok "PVC delete request submitted"
else
  banner "Step 2/2: PVC cleanup skipped"
fi

ok "Kubernetes uninstall complete"
