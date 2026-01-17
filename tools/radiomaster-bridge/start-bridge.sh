#!/bin/bash

# RadioMaster Bridge Quick Start Script
# This script helps you start the RadioMaster bridge application

echo "🚁 RadioMaster Bridge - Quick Start"
echo ""

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.7+ first."
    exit 1
fi

# Check if dependencies are installed
if ! python3 -c "import serial" 2>/dev/null; then
    echo "📦 Installing dependencies..."
    pip3 install -r requirements.txt
fi

# Get API URL
read -p "Enter FLYON API URL [http://localhost:3001]: " API_URL
API_URL=${API_URL:-http://localhost:3001}
export FLYON_API_URL="$API_URL"

# Get JWT Token
echo ""
echo "📝 To get your JWT token:"
echo "   1. Open FLYON in browser (http://localhost:3000)"
echo "   2. Press F12 → Application → Local Storage"
echo "   3. Find 'token' key and copy its value"
echo ""
read -p "Enter your JWT token: " JWT_TOKEN
if [ -z "$JWT_TOKEN" ]; then
    echo "❌ JWT token is required!"
    exit 1
fi
export FLYON_JWT_TOKEN="$JWT_TOKEN"

# Get Remote ID
echo ""
echo "📝 To get your Remote ID:"
echo "   1. Go to Remotes page in FLYON"
echo "   2. Click 'Details' on your remote"
echo "   3. Copy the Remote ID (or use the copy button)"
echo ""
read -p "Enter your Remote ID: " REMOTE_ID
if [ -z "$REMOTE_ID" ]; then
    echo "❌ Remote ID is required!"
    exit 1
fi
export RADIOMASTER_REMOTE_ID="$REMOTE_ID"

# Optional: Serial port
echo ""
read -p "Enter serial port (leave empty for auto-detect): " SERIAL_PORT
if [ ! -z "$SERIAL_PORT" ]; then
    export RADIOMASTER_SERIAL_PORT="$SERIAL_PORT"
fi

# Start bridge
echo ""
echo "✅ Starting RadioMaster Bridge..."
echo "   API URL: $API_URL"
echo "   Remote ID: $REMOTE_ID"
echo "   Serial Port: ${SERIAL_PORT:-auto-detect}"
echo ""
echo "📌 Make sure:"
echo "   1. RadioMaster Pocket is connected via USB"
echo "   2. Transmitter is in USB Serial (VCP) mode"
echo "   3. Press Ctrl+C to stop the bridge"
echo ""

python3 radiomaster_bridge.py
