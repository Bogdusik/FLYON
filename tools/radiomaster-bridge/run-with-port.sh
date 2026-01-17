#!/bin/bash
# Quick run script with detected port

export FLYON_API_URL="http://localhost:3001"
export FLYON_JWT_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJhZTk0NmNmYy1lM2NkLTQxZGUtYmU5OC1lYTc1YTI5MTZlYWIiLCJlbWFpbCI6ImJvZ2R5bjEzQGdtYWlsLmNvbSIsInR5cGUiOiJ1c2VyIiwiaWF0IjoxNzY4MzkxNjYzLCJleHAiOjE3Njg5OTY0NjN9.jIS6T13tN-F9urt0vDD5RQGgBcUUxD-r4U1uCKS04SQ"
export RADIOMASTER_REMOTE_ID="0bbf5579-f177-4218-856d-169beb9fbd76"
export RADIOMASTER_SERIAL_PORT="/dev/tty.usbmodem00000000001B1"

echo "🚁 Starting RadioMaster Bridge..."
echo "   Port: $RADIOMASTER_SERIAL_PORT"
echo "   Remote ID: $RADIOMASTER_REMOTE_ID"
echo ""
echo "Press Ctrl+C to stop"
echo ""

python3 radiomaster_bridge.py
