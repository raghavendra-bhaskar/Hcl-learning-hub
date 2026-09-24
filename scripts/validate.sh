#!/bin/bash
# ============================================================
# HCL Software Learning Hub — Deployment Validation Script
# Author:  B Raghavendra <raghavendrab@hcl-software.com>
#
# Run this after the setup script OR any update to verify that
# the application is fully functional.
#
# Usage:
#   sudo bash scripts/validate.sh [--port <port>] [--host <host>]
#
# Checks performed:
#   1. Container / pod status (k3s / podman / docker)
#   2. Port availability and firewall rules
#   3. PostgreSQL connectivity and schema
#   4. API health endpoint
#   5. Frontend reachability
#   6. Admin login test
#   7. Security (PostgreSQL not exposed externally)
# ============================================================

set -e

INSTALL_DIR="${INSTALL_DIR:-/product/hcl-learning-hub}"
NODE_PORT="30080"
SERVER_HOST=""

# Parse args
while [[ $# -gt 0 ]]; do
  case $1 in
    --port) NODE_PORT="$2"; shift 2 ;;
    --host) SERVER_HOST="$2"; shift 2 ;;
    *) shift ;;
  esac
done

# Load from credentials file if present
CREDS_FILE="$INSTALL_DIR/.deploy-credentials"
if [ -f "$CREDS_FILE" ]; then
  eval "$(grep -E '^(NODE_PORT|SERVER_HOST|DEPLOY_MODE)=' "$CREDS_FILE")"
fi

SERVER_HOST="${SERVER_HOST:-$(hostname -I | awk '{print $1}')}"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'
ok()     { echo -e "  ${GREEN}✓${NC} $*"; PASS=$((PASS+1)); }
warn()   { echo -e "  ${YELLOW}⚠${NC} $*"; WARN=$((WARN+1)); }
fail()   { echo -e "  ${RED}✗${NC} $*"; FAIL=$((FAIL+1)); }
info()   { echo -e "  ${CYAN}→${NC} $*"; }
section(){ echo ""; echo -e "${BOLD}$*${NC}"; echo "  $(printf '%.0s─' {1..50})"; }

PASS=0; WARN=0; FAIL=0

echo ""
echo "  ██╗  ██╗ ██████╗██╗     "
echo "  HCL Software Learning Hub"
echo "  Deployment Validation"
echo ""
echo "  Host:    ${SERVER_HOST}:${NODE_PORT}"
echo "  Mode:    ${DEPLOY_MODE:-auto-detect}"
echo ""

# ── Detect deploy mode ────────────────────────────────────────────────────────
if [ -z "$DEPLOY_MODE" ]; then
  if command -v k3s &>/dev/null && k3s kubectl get ns hcl-learning-hub &>/dev/null 2>&1; then
    DEPLOY_MODE="k3s"
  elif command -v podman &>/dev/null && podman ps --format '{{.Names}}' 2>/dev/null | grep -q hcl-; then
    DEPLOY_MODE="podman"
  elif command -v docker &>/dev/null && docker ps --format '{{.Names}}' 2>/dev/null | grep -q hcl-; then
    DEPLOY_MODE="docker"
  else
    DEPLOY_MODE="unknown"
  fi
fi

# ── 1. Container / Pod Status ─────────────────────────────────────────────────
section "1. Container / Pod Status  [mode: $DEPLOY_MODE]"

case "$DEPLOY_MODE" in
  k3s)
    NS="hcl-learning-hub"
    # Check each required resource
    for RESOURCE in "statefulset/postgres" "deployment/api" "deployment/web"; do
      READY=$(k3s kubectl get "$RESOURCE" -n "$NS" \
        -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
      DESIRED=$(k3s kubectl get "$RESOURCE" -n "$NS" \
        -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "1")
      if [ "${READY:-0}" -ge "${DESIRED:-1}" ] 2>/dev/null; then
        ok "$RESOURCE: ${READY}/${DESIRED} ready"
      else
        fail "$RESOURCE: ${READY:-0}/${DESIRED:-1} ready — not all replicas up"
      fi
    done
    info "All pods:"
    k3s kubectl get pods -n "$NS" --no-headers 2>/dev/null \
      | awk '{printf "    %-40s %s/%s  %s\n", $1, $2, $3, $4}' || true
    ;;
  podman|docker)
    CMD="$DEPLOY_MODE"
    for NAME in hcl-postgres hcl-api hcl-web; do
      STATUS=$($CMD inspect --format '{{.State.Status}}' "$NAME" 2>/dev/null || echo "missing")
      if [ "$STATUS" = "running" ]; then
        ok "$NAME: running"
      elif [ "$STATUS" = "missing" ]; then
        fail "$NAME: container not found"
      else
        fail "$NAME: status=$STATUS (expected: running)"
      fi
    done
    ;;
  *)
    fail "Could not detect deploy mode — no k3s namespace or running containers found"
    ;;
esac

# ── 2. Port Checks ────────────────────────────────────────────────────────────
section "2. Required Ports"

echo "  Port matrix:"
echo "    ${NODE_PORT}/tcp  App (NodePort)         — must be open to users"
echo "    4000/tcp    API                    — internal (nginx → api)"
echo "    5432/tcp    PostgreSQL             — internal ONLY (must NOT be open externally)"
echo ""

# Check what's listening
for PORT in "$NODE_PORT" 4000 5432; do
  if ss -tlnp 2>/dev/null | grep -q ":${PORT} " || \
     netstat -tlnp 2>/dev/null | grep -q ":${PORT}"; then
    PROC=$(ss -tlnp 2>/dev/null | grep ":${PORT} " | awk '{print $NF}' | head -1)
    ok "Port ${PORT} is listening  (${PROC})"
  else
    if [ "$PORT" = "5432" ]; then
      warn "Port 5432 not visible via ss — may be inside container network (OK for podman/docker)"
    else
      fail "Port ${PORT} is NOT listening — service may be down"
    fi
  fi
done

# Firewall check
echo ""
info "Firewall status:"
if command -v firewall-cmd &>/dev/null && systemctl is-active --quiet firewalld 2>/dev/null; then
  OPEN_PORTS=$(firewall-cmd --list-ports 2>/dev/null)
  echo "    firewalld active. Open ports: ${OPEN_PORTS:-none}"
  echo "$OPEN_PORTS" | grep -q "${NODE_PORT}/tcp" \
    && ok "firewalld: port ${NODE_PORT}/tcp is open" \
    || fail "firewalld: port ${NODE_PORT}/tcp is NOT open — run: firewall-cmd --permanent --add-port=${NODE_PORT}/tcp && firewall-cmd --reload"
  echo "$OPEN_PORTS" | grep -q "5432/tcp" \
    && fail "SECURITY: PostgreSQL port 5432/tcp is open in firewalld — CLOSE IT: firewall-cmd --permanent --remove-port=5432/tcp && firewall-cmd --reload" \
    || ok "firewalld: port 5432/tcp correctly NOT exposed"
elif command -v ufw &>/dev/null; then
  UFW_STATUS=$(ufw status 2>/dev/null)
  echo "$UFW_STATUS" | grep -q "Status: active" \
    && echo "    ufw active" \
    || echo "    ufw inactive"
  echo "$UFW_STATUS" | grep -q "${NODE_PORT}" \
    && ok "ufw: port ${NODE_PORT} is open" \
    || warn "ufw: port ${NODE_PORT} rule not found (may be inactive or managed externally)"
  echo "$UFW_STATUS" | grep -q "5432" \
    && fail "SECURITY: PostgreSQL port 5432 is open in ufw — CLOSE IT: ufw delete allow 5432" \
    || ok "ufw: port 5432 correctly NOT exposed"
else
  warn "No firewall tool detected (firewalld/ufw) — verify external firewall rules manually"
  info "  Required open to users:  ${NODE_PORT}/tcp"
  info "  Must be blocked:         5432/tcp (PostgreSQL)"
fi

# ── 3. PostgreSQL Connectivity ────────────────────────────────────────────────
section "3. PostgreSQL Database"

case "$DEPLOY_MODE" in
  k3s)
    DB_RESULT=$(k3s kubectl exec -n hcl-learning-hub statefulset/postgres -- \
      psql -U hcluser -d hclhub -c '\dt' 2>&1 || echo "ERROR")
    ;;
  podman|docker)
    DB_RESULT=$($DEPLOY_MODE exec hcl-postgres \
      psql -U hcluser -d hclhub -c '\dt' 2>&1 || echo "ERROR")
    ;;
  *)
    DB_RESULT="SKIP"
    ;;
esac

if echo "$DB_RESULT" | grep -q "ERROR\|SKIP"; then
  fail "PostgreSQL: could not connect or query DB"
  info "  Error: $DB_RESULT"
else
  # Count tables
  TABLE_COUNT=$(echo "$DB_RESULT" | grep -c '^ public' || echo "0")
  if [ "$TABLE_COUNT" -ge 14 ]; then
    ok "PostgreSQL: connected, ${TABLE_COUNT} tables found (expected 14)"
  elif [ "$TABLE_COUNT" -gt 0 ]; then
    warn "PostgreSQL: connected but only ${TABLE_COUNT}/14 tables — migrations may be incomplete"
  else
    fail "PostgreSQL: connected but no tables found — migrations not applied"
  fi
fi

# ── 4. API Health ─────────────────────────────────────────────────────────────
section "4. API Health"

API_HEALTH=$(curl -sf --connect-timeout 5 "http://localhost:4000/health" 2>/dev/null \
  || curl -sf --connect-timeout 5 "http://${SERVER_HOST}:4000/health" 2>/dev/null \
  || echo "FAIL")

if echo "$API_HEALTH" | grep -q '"ok":true\|{"status":"ok"'; then
  ok "API /health: OK"
elif [ "$API_HEALTH" != "FAIL" ]; then
  warn "API /health returned unexpected response: $API_HEALTH"
else
  fail "API /health: no response on port 4000"
  info "  Check logs:"
  [ "$DEPLOY_MODE" = "k3s" ] \
    && info "  k3s kubectl logs -n hcl-learning-hub deploy/api --tail=20" \
    || info "  $DEPLOY_MODE logs hcl-api --tail=20"
fi

# OIDC config endpoint
OIDC_RESP=$(curl -sf --connect-timeout 5 "http://localhost:4000/oidc-config" 2>/dev/null \
  || curl -sf --connect-timeout 5 "http://${SERVER_HOST}:4000/oidc-config" 2>/dev/null \
  || echo "FAIL")

if [ "$OIDC_RESP" = "FAIL" ]; then
  fail "API /oidc-config: no response"
elif echo "$OIDC_RESP" | grep -q '"enabled"'; then
  ENABLED=$(echo "$OIDC_RESP" | grep -o '"enabled":[^,}]*' | cut -d: -f2)
  ok "API /oidc-config: OK (SSO enabled: ${ENABLED})"
else
  warn "API /oidc-config: unexpected response"
fi

# ── 5. Frontend Reachability ──────────────────────────────────────────────────
section "5. Frontend (nginx)"

# Try localhost first
FRONTEND_LOCAL=$(curl -sf --connect-timeout 5 -o /dev/null -w "%{http_code}" \
  "http://localhost:${NODE_PORT}/" 2>/dev/null || echo "000")

if [ "$FRONTEND_LOCAL" = "200" ]; then
  ok "Frontend localhost:${NODE_PORT} → HTTP 200"
else
  fail "Frontend localhost:${NODE_PORT} → HTTP ${FRONTEND_LOCAL} (expected 200)"
fi

# Try via server IP
FRONTEND_IP=$(curl -sf --connect-timeout 5 -o /dev/null -w "%{http_code}" \
  "http://${SERVER_HOST}:${NODE_PORT}/" 2>/dev/null || echo "000")

if [ "$FRONTEND_IP" = "200" ]; then
  ok "Frontend http://${SERVER_HOST}:${NODE_PORT}/ → HTTP 200"
else
  warn "Frontend via server IP → HTTP ${FRONTEND_IP} (may indicate firewall/routing issue)"
fi

# API proxy through nginx
NGINX_PROXY=$(curl -sf --connect-timeout 5 -o /dev/null -w "%{http_code}" \
  "http://localhost:${NODE_PORT}/api/health" 2>/dev/null || echo "000")

if [ "$NGINX_PROXY" = "200" ]; then
  ok "nginx → API proxy (/api/health) → HTTP 200"
else
  warn "nginx → API proxy → HTTP ${NGINX_PROXY} (nginx may not be forwarding /api/* to port 4000)"
fi

# ── 6. Admin Login Test ───────────────────────────────────────────────────────
section "6. Admin Login (API)"

# Load admin password from credentials if available
ADMIN_PASS="Admin@HCL2026!"
[ -f "$CREDS_FILE" ] && ADMIN_PASS=$(grep '^ADMIN_PASSWORD=' "$CREDS_FILE" | cut -d= -f2)

LOGIN_RESP=$(curl -sf --connect-timeout 5 -X POST \
  "http://localhost:4000/auth/local/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@local\",\"password\":\"${ADMIN_PASS}\"}" 2>/dev/null \
  || echo "FAIL")

if echo "$LOGIN_RESP" | grep -q '"token"'; then
  ok "Admin login (admin@local): success — JWT token received"
elif echo "$LOGIN_RESP" | grep -q '"error"\|"message"'; then
  MSG=$(echo "$LOGIN_RESP" | grep -o '"message":"[^"]*"' | head -1)
  fail "Admin login failed: $MSG"
  info "  Re-seed admin: npm run seed:admin  (or: k3s kubectl exec -n hcl-learning-hub deploy/api -- node scripts/seed-admin.mjs)"
else
  fail "Admin login: no response from API"
fi

# ── 7. Security Checks ────────────────────────────────────────────────────────
section "7. Security"

# Check DB password is not the hardcoded default
if [ -f "$CREDS_FILE" ]; then
  DB_PASS=$(grep '^DB_PASSWORD=' "$CREDS_FILE" | cut -d= -f2)
  if [ ${#DB_PASS} -ge 24 ]; then
    ok "DB password: strong (${#DB_PASS} chars, auto-generated)"
  else
    warn "DB password appears weak — check $CREDS_FILE"
  fi
  JWT=$(grep '^JWT_SECRET=' "$CREDS_FILE" | cut -d= -f2)
  if [ ${#JWT} -ge 32 ]; then
    ok "JWT secret: strong (${#JWT} chars)"
  else
    warn "JWT secret appears short — rotate it"
  fi
else
  warn ".deploy-credentials not found at $CREDS_FILE — cannot verify secrets"
fi

# OIDC configured?
if echo "$OIDC_RESP" | grep -q '"enabled":true'; then
  ok "Okta SSO is configured and enabled"
else
  warn "Okta SSO not configured — only admin@local login available"
  info "  Configure via: Admin → Authentication Realm"
fi

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "  ========================================"
TOTAL=$((PASS+WARN+FAIL))
echo -e "  Validation complete: ${TOTAL} checks"
echo -e "  ${GREEN}✓ Passed: ${PASS}${NC}   ${YELLOW}⚠ Warnings: ${WARN}${NC}   ${RED}✗ Failed: ${FAIL}${NC}"
echo ""

if [ "$FAIL" -gt 0 ]; then
  echo -e "  ${RED}RESULT: FAILED — ${FAIL} critical issue(s) require attention.${NC}"
  echo ""
  echo "  Useful debug commands:"
  if [ "$DEPLOY_MODE" = "k3s" ]; then
    echo "    k3s kubectl get pods -n hcl-learning-hub"
    echo "    k3s kubectl logs -n hcl-learning-hub deploy/api --tail=30"
    echo "    k3s kubectl logs -n hcl-learning-hub deploy/web --tail=20"
    echo "    k3s kubectl describe pod -n hcl-learning-hub -l app=api"
  else
    echo "    $DEPLOY_MODE ps"
    echo "    $DEPLOY_MODE logs hcl-api --tail=30"
    echo "    $DEPLOY_MODE logs hcl-web --tail=20"
    echo "    $DEPLOY_MODE logs hcl-postgres --tail=20"
  fi
elif [ "$WARN" -gt 0 ]; then
  echo -e "  ${YELLOW}RESULT: PASSED WITH WARNINGS — Review items above.${NC}"
else
  echo -e "  ${GREEN}RESULT: ALL CHECKS PASSED — Application is healthy!${NC}"
fi

echo ""
echo "  App URL:    http://${SERVER_HOST}:${NODE_PORT}"
echo "  Admin:      admin@local / ${ADMIN_PASS}"
echo "  ========================================"
echo ""

# Exit with failure code if critical checks failed
[ "$FAIL" -eq 0 ]
