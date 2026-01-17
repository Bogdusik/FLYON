#!/bin/bash

# RadioMaster Bridge Auto-Connect Script
# Automatically finds port and connects with saved settings

BRIDGE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="$BRIDGE_DIR/.bridge-config"
PID_FILE="$BRIDGE_DIR/.bridge.pid"
LOG_FILE="$BRIDGE_DIR/bridge.log"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Load saved configuration
load_config() {
    if [ -f "$CONFIG_FILE" ]; then
        source "$CONFIG_FILE"
    fi
}

# Save configuration
save_config() {
    cat > "$CONFIG_FILE" << EOF
FLYON_API_URL="${FLYON_API_URL:-http://localhost:3001}"
FLYON_JWT_TOKEN="$FLYON_JWT_TOKEN"
RADIOMASTER_REMOTE_ID="$RADIOMASTER_REMOTE_ID"
EOF
    chmod 600 "$CONFIG_FILE"
    echo "✅ Configuration saved"
}

# Find USB serial port automatically
find_port() {
    echo "🔍 Searching for RadioMaster Pocket..."
    
    # Try Python method first
    PORT=$(python3 -m serial.tools.list_ports 2>/dev/null | grep -i "usbmodem\|usbserial" | head -1 | awk '{print $1}')
    
    if [ -z "$PORT" ]; then
        # Fallback to ls method
        PORT=$(ls /dev/tty.* 2>/dev/null | grep -i "usbmodem\|usbserial" | head -1)
    fi
    
    if [ -z "$PORT" ]; then
        PORT=$(ls /dev/cu.* 2>/dev/null | grep -i "usbmodem\|usbserial" | head -1)
    fi
    
    if [ -n "$PORT" ]; then
        echo "✅ Found port: $PORT"
        export RADIOMASTER_SERIAL_PORT="$PORT"
        return 0
    else
        echo "❌ No USB serial port found"
        echo "   Make sure RadioMaster Pocket is:"
        echo "   1. Connected via USB"
        echo "   2. In USB Serial (VCP) mode"
        return 1
    fi
}

# Setup configuration (first time)
setup() {
    echo "🔧 First-time setup"
    echo ""
    
    # API URL
    read -p "Enter FLYON API URL [http://localhost:3001]: " API_URL
    export FLYON_API_URL="${API_URL:-http://localhost:3001}"
    
    # JWT Token
    echo ""
    echo "📝 To get JWT token:"
    echo "   F12 → Application → Local Storage → 'token' key"
    echo ""
    read -p "Enter JWT token: " JWT_TOKEN
    if [ -z "$JWT_TOKEN" ]; then
        echo "❌ JWT token is required!"
        exit 1
    fi
    export FLYON_JWT_TOKEN="$JWT_TOKEN"
    
    # Remote ID
    echo ""
    echo "📝 To get Remote ID:"
    echo "   Go to Remotes page → Click Details → Copy Remote ID"
    echo ""
    read -p "Enter Remote ID: " REMOTE_ID
    if [ -z "$REMOTE_ID" ]; then
        echo "❌ Remote ID is required!"
        exit 1
    fi
    export RADIOMASTER_REMOTE_ID="$REMOTE_ID"
    
    save_config
    echo ""
}

# Start bridge
start() {
    load_config
    
    if [ -z "$FLYON_JWT_TOKEN" ] || [ -z "$RADIOMASTER_REMOTE_ID" ]; then
        echo "❌ Configuration not found. Running setup..."
        setup
        load_config
    fi
    
    # Check if already running
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p "$PID" > /dev/null 2>&1; then
            echo "⚠️  Bridge is already running (PID: $PID)"
            return 1
        else
            rm -f "$PID_FILE"
        fi
    fi
    
    # Find port
    if ! find_port; then
        return 1
    fi
    
    echo ""
    echo "🚁 Starting RadioMaster Bridge..."
    echo "   API: $FLYON_API_URL"
    echo "   Remote ID: $RADIOMASTER_REMOTE_ID"
    echo "   Port: $RADIOMASTER_SERIAL_PORT"
    echo ""
    
    # Start bridge in background with environment variables
    cd "$BRIDGE_DIR"
    nohup env FLYON_API_URL="$FLYON_API_URL" \
             FLYON_JWT_TOKEN="$FLYON_JWT_TOKEN" \
             RADIOMASTER_REMOTE_ID="$RADIOMASTER_REMOTE_ID" \
             RADIOMASTER_SERIAL_PORT="$RADIOMASTER_SERIAL_PORT" \
             python3 radiomaster_bridge.py >> "$LOG_FILE" 2>&1 &
    BRIDGE_PID=$!
    
    echo $BRIDGE_PID > "$PID_FILE"
    echo "✅ Bridge started (PID: $BRIDGE_PID)"
    echo "📋 Logs: $LOG_FILE"
    echo "   To stop: ./auto-connect.sh stop"
    echo ""
    
    # Wait a moment and check if it's still running
    sleep 2
    if ! ps -p $BRIDGE_PID > /dev/null 2>&1; then
        echo "❌ Bridge stopped unexpectedly. Check logs:"
        tail -20 "$LOG_FILE"
        rm -f "$PID_FILE"
        return 1
    fi
    
    echo "✅ Bridge is running successfully!"
}

# Stop bridge
stop() {
    if [ ! -f "$PID_FILE" ]; then
        echo "⚠️  Bridge is not running"
        return 1
    fi
    
    PID=$(cat "$PID_FILE")
    if ps -p "$PID" > /dev/null 2>&1; then
        echo "🛑 Stopping bridge (PID: $PID)..."
        kill "$PID"
        sleep 1
        
        # Force kill if still running
        if ps -p "$PID" > /dev/null 2>&1; then
            kill -9 "$PID"
        fi
        
        rm -f "$PID_FILE"
        echo "✅ Bridge stopped"
    else
        echo "⚠️  Bridge process not found"
        rm -f "$PID_FILE"
    fi
}

# Status
status() {
    if [ ! -f "$PID_FILE" ]; then
        echo "❌ Bridge is not running"
        return 1
    fi
    
    PID=$(cat "$PID_FILE")
    if ps -p "$PID" > /dev/null 2>&1; then
        echo "✅ Bridge is running (PID: $PID)"
        echo "📋 Logs: $LOG_FILE"
        echo ""
        echo "Last 5 log lines:"
        tail -5 "$LOG_FILE" 2>/dev/null || echo "No logs yet"
    else
        echo "❌ Bridge is not running (stale PID file)"
        rm -f "$PID_FILE"
    fi
}

# Show logs
logs() {
    if [ -f "$LOG_FILE" ]; then
        tail -f "$LOG_FILE"
    else
        echo "❌ Log file not found. Bridge may not have started yet."
    fi
}

# Main
case "${1:-start}" in
    start)
        start
        ;;
    stop)
        stop
        ;;
    restart)
        stop
        sleep 1
        start
        ;;
    status)
        status
        ;;
    logs)
        logs
        ;;
    setup)
        setup
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|logs|setup}"
        echo ""
        echo "Commands:"
        echo "  start   - Start bridge (default)"
        echo "  stop    - Stop bridge"
        echo "  restart - Restart bridge"
        echo "  status  - Check bridge status"
        echo "  logs    - Show live logs"
        echo "  setup   - Configure settings"
        exit 1
        ;;
esac
