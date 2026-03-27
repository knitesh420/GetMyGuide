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

log "Starting redeployment..."

# Pull latest code
log "Pulling latest code from origin/main..."
cd "$PROJECT_DIR"
git pull origin main || fail "Git pull failed"

# Backend
log "Installing backend dependencies..."
cd "$BACKEND_DIR"
pnpm install || fail "Backend pnpm install failed"

log "Building backend..."
pnpm run build || fail "Backend build failed"

log "Restarting backend (PM2: get-my-guide-be)..."
pm2 restart get-my-guide-be || fail "Failed to restart backend"

# Frontend
log "Installing frontend dependencies..."
cd "$FRONTEND_DIR"
pnpm install || fail "Frontend pnpm install failed"

log "Building frontend..."
pnpm run build || fail "Frontend build failed"

log "Restarting frontend (PM2: get-my-guide-fe)..."
pm2 restart get-my-guide-fe || fail "Failed to restart frontend"

log "Saving PM2 process list..."
pm2 save

log "Redeployment complete!"
pm2 list
