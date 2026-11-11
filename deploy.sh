#!/bin/bash
# deploy.sh — Tekkipro production deploy
# Usage: ./deploy.sh [branch]
set -e

BRANCH=${1:-main}
if [[ "$BRANCH" != main ]]; then
    echo 'Le VPS TekkiPro utilise uniquement la branche main.' >&2
    exit 1
fi
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

log "Rebuilding containers and checking production..."
bash "$APP_DIR/deploy/production/Apply-Vps.sh"
log "=== Deploy complete ==="
