#!/bin/bash
# Quick run script with detected port

export FLYON_API_URL="${FLYON_API_URL:-http://localhost:3001}"
export FLYON_JWT_TOKEN="${FLYON_USER_TOKEN:?FLYON_USER_TOKEN is not set. Log in via POST /api/v1/auth/login and use the returned token, then run: export FLYON_USER_TOKEN=<token>. See docs/USING_DEVICE_TOKEN.md}"
export RADIOMASTER_REMOTE_ID="${RADIOMASTER_REMOTE_ID:-0bbf5579-f177-4218-856d-169beb9fbd76}"
export RADIOMASTER_SERIAL_PORT="${RADIOMASTER_SERIAL_PORT:-/dev/tty.usbmodem00000000001B1}"

echo "🚁 Starting RadioMaster Bridge..."
echo "   Port: $RADIOMASTER_SERIAL_PORT"
echo "   Remote ID: $RADIOMASTER_REMOTE_ID"
echo ""
echo "Press Ctrl+C to stop"
echo ""

python3 radiomaster_bridge.py
