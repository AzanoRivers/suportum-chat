#!/usr/bin/env bash
# =============================================================================
# deploy.sh -- Pull latest changes and restart the service on the VPS
#
# Usage:
#   chmod +x scripts/linux/deploy.sh
#   ./scripts/linux/deploy.sh
#
# What it does:
#   1. Pulls latest changes from GitHub
#   2. Compares requirements.txt hash with the saved one
#   3. Reinstalls dependencies only if they changed
#   4. Syncs the systemd service file if it changed
#   5. Restarts the service (always -- gunicorn has no auto-reload)
#
# Requirements:
#   - setup.sh must have been run at least once
# =============================================================================

set -euo pipefail

# Always run from backend/ (2 levels up from this script)
cd "$(dirname "${BASH_SOURCE[0]}")/../.."

SERVICE_NAME="suportum"
GIT_BRANCH="main"
VENV_DIR=".venv"
REQUIREMENTS="requirements.txt"
HASH_FILE=".requirements.hash"

# -- Output colors ------------------------------------------------------------
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()  { echo -e "${GREEN}[suportum:deploy]${NC} $1"; }
warn()  { echo -e "${YELLOW}[suportum:deploy]${NC} $1"; }
error() { echo -e "${RED}[suportum:deploy] $1${NC}"; exit 1; }

# -- Ensure setup was run first -----------------------------------------------
if [ ! -d "$VENV_DIR" ]; then
    error "Virtualenv not found. Run first: ./scripts/linux/setup.sh"
fi

# -- Pull latest changes from GitHub ------------------------------------------
info "Fetching changes from GitHub (branch: $GIT_BRANCH)..."
git fetch origin

LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse "origin/$GIT_BRANCH")

if [ "$LOCAL" = "$REMOTE" ]; then
    info "No new changes in the repository. Nothing to update."
    exit 0
fi

git pull origin "$GIT_BRANCH"
info "Code updated."

# -- Activate virtualenv ------------------------------------------------------
# shellcheck disable=SC1091
source "$VENV_DIR/bin/activate"

# -- Compare requirements.txt hash --------------------------------------------
CURRENT_HASH=$(sha256sum "$REQUIREMENTS")
PACKAGES_CHANGED=false

if [ ! -f "$HASH_FILE" ]; then
    warn "Hash file not found. Forcing dependency install."
    PACKAGES_CHANGED=true
elif [ "$CURRENT_HASH" != "$(cat "$HASH_FILE")" ]; then
    warn "requirements.txt changed. Updating dependencies..."
    PACKAGES_CHANGED=true
else
    info "requirements.txt unchanged. Skipping package install."
fi

# -- Install packages only if they changed ------------------------------------
if [ "$PACKAGES_CHANGED" = true ]; then
    info "Installing dependencies..."
    pip install --upgrade pip --quiet
    pip install -r "$REQUIREMENTS"

    sha256sum "$REQUIREMENTS" > "$HASH_FILE"
    info "Dependencies updated and hash saved."
fi

# -- Sync systemd service file if changed -------------------------------------
SERVICE_SRC="suportum.service"
SERVICE_DEST="/etc/systemd/system/$SERVICE_NAME.service"

if [ -f "$SERVICE_SRC" ]; then
    if ! diff -q "$SERVICE_SRC" "$SERVICE_DEST" > /dev/null 2>&1; then
        info "Service file changed. Updating $SERVICE_DEST..."
        sudo cp "$SERVICE_SRC" "$SERVICE_DEST"
        sudo systemctl daemon-reload
        info "systemd daemon reloaded."
    else
        info "Service file unchanged. Skipping daemon-reload."
    fi
fi

# -- Restart service (always -- gunicorn has no auto-reload) ------------------
info "Restarting service '$SERVICE_NAME'..."

if systemctl is-active --quiet "$SERVICE_NAME"; then
    sudo systemctl restart "$SERVICE_NAME"
else
    sudo systemctl start "$SERVICE_NAME"
fi

sleep 2

if systemctl is-active --quiet "$SERVICE_NAME"; then
    info "Service '$SERVICE_NAME' is running."
    systemctl status "$SERVICE_NAME" --no-pager -l
else
    error "Service '$SERVICE_NAME' failed to start. Check logs: journalctl -u $SERVICE_NAME -n 50"
fi
