#!/usr/bin/env bash
# =============================================================================
# stop.sh -- Stop the systemd service on the VPS
#
# Usage:
#   ./scripts/linux/stop.sh
# =============================================================================

set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/../.."

SERVICE_NAME="suportum"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()  { echo -e "${GREEN}[suportum:stop]${NC} $1"; }
warn()  { echo -e "${YELLOW}[suportum:stop]${NC} $1"; }
error() { echo -e "${RED}[suportum:stop] $1${NC}"; exit 1; }

if ! systemctl is-active --quiet "$SERVICE_NAME"; then
    warn "Service '$SERVICE_NAME' is not running."
    exit 0
fi

info "Stopping service '$SERVICE_NAME'..."
sudo systemctl stop "$SERVICE_NAME"
sleep 1

if ! systemctl is-active --quiet "$SERVICE_NAME"; then
    info "Service '$SERVICE_NAME' stopped."
else
    error "Could not stop '$SERVICE_NAME'. Check logs: journalctl -u $SERVICE_NAME -n 50"
fi
