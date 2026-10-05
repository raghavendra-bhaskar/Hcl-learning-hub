#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ARGS=("$@")
HAS_VERSION=false
HAS_RESTORE=false
HAS_CODE_ONLY=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --version)
      HAS_VERSION=true
      shift 2
      ;;
    --restore)
      HAS_RESTORE=true
      shift 2
      ;;
    --code-only)
      HAS_CODE_ONLY=true
      shift
      ;;
    *)
      shift
      ;;
  esac
done

if [ "$HAS_VERSION" = false ]; then
  ARGS+=(--version 3)
fi

if [ "$HAS_CODE_ONLY" = false ] && [ "$HAS_RESTORE" = false ]; then
  ARGS+=(--restore latest)
fi

bash "$SCRIPT_DIR/sync.sh" "${ARGS[@]}"
