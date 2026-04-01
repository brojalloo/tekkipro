#!/bin/bash
# deploy.sh — Tekkipro production deploy
# Usage: ./deploy.sh [branch]
set -e

BRANCH=${1:-main}
APP_DIR=/opt/tekkipro
log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

git config --global --add safe.directory "$APP_DIR" 2>/dev/null || true

log "=== Deploy started (branch: $BRANCH) ==="

cd "$APP_DIR"

# Pull latest code
log "Pulling latest code..."
git fetch origin
git checkout "$BRANCH"
git pull origin "$BRANCH"

# Rebuild and restart containers
log "Rebuilding containers..."
cd infra
docker compose pull --quiet 2>/dev/null || true
docker compose up -d --build --remove-orphans

log "Waiting for services to be healthy..."
sleep 5

# Health check
if docker compose ps | grep -q "Up"; then
    log "Deploy SUCCESS — containers running"
    docker compose ps
else
    log "ERROR — containers not running after deploy"
    docker compose logs --tail=50
    exit 1
fi

log "=== Deploy complete ==="