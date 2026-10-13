#!/bin/bash

set -e

PROJECT_DIR="/root/projects/GetMyGuide"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${GREEN}[DEPLOY]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC}  $1"; }
fail() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# SSH deploy runs non-interactively. ~/.bashrc returns before nvm is loaded
# when PS1 is unset, so pnpm and pm2 are missing unless we load nvm here.
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ -s "$NVM_DIR/nvm.sh" ]; then
	# shellcheck disable=SC1091
	. "$NVM_DIR/nvm.sh"
fi
command -v pnpm >/dev/null 2>&1 || fail "pnpm not found after loading nvm"
command -v pm2 >/dev/null 2>&1 || fail "pm2 not found after loading nvm"

require_pm2_online() {
  local name="$1"
  local status=""
  local deadline=$((SECONDS + 30))

  while (( SECONDS < deadline )); do
    status=$(pm2 jlist 2>/dev/null | python3 -c '
import json, sys
name = sys.argv[1]
try:
    data = json.load(sys.stdin)
except Exception:
    data = []
for proc in data:
    if proc.get("name") == name:
        print(proc.get("pm2_env", {}).get("status", ""))
        break
else:
    print("missing")
' "$name" || true)
    if [[ "$status" == "online" ]]; then
      log "$name is online"
      return 0
    fi
    sleep 2
  done

  fail "$name is not online (last status: ${status:-unknown})"
}

# Any HTTP status other than a connection failure counts. The API has no health route.
require_http() {
  local url="$1"
  local code="000"
  local deadline=$((SECONDS + 30))

  while (( SECONDS < deadline )); do
    code=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 10 "$url" || true)
    if [[ -n "$code" && "$code" != "000" ]]; then
      log "$url responded with HTTP $code"
      return 0
    fi
    sleep 3
  done

  fail "$url did not respond within 30 seconds (last code: ${code})"
}

log "Starting redeployment..."

log "Pulling latest code from origin/main..."
cd "$PROJECT_DIR"
git pull --ff-only origin main || fail "Git pull failed"

log "Installing backend dependencies..."
cd "$BACKEND_DIR"
pnpm install --frozen-lockfile || fail "Backend pnpm install failed"

log "Building backend..."
pnpm run build || fail "Backend build failed"

log "Installing frontend dependencies..."
cd "$FRONTEND_DIR"
pnpm install --frozen-lockfile || fail "Frontend pnpm install failed"

log "Building frontend..."
pnpm run build || fail "Frontend build failed"

log "Restarting backend (PM2: get-my-guide-be)..."
pm2 restart get-my-guide-be || fail "Failed to restart backend"

log "Restarting frontend (PM2: get-my-guide-fe)..."
pm2 restart get-my-guide-fe || fail "Failed to restart frontend"

log "Saving PM2 process list..."
pm2 save

log "Checking process health..."
require_pm2_online get-my-guide-be
require_pm2_online get-my-guide-fe
require_http "https://getmyguide.in"
require_http "https://api.getmyguide.in"

log "Redeployment complete!"
pm2 list
