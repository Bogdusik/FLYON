#!/bin/bash

# Quick setup script with provided JWT token
# This will configure auto-connect and optionally set up auto-start

BRIDGE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="$BRIDGE_DIR/.bridge-config"
JWT_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJhZTk0NmNmYy1lM2NkLTQxZGUtYmU5OC1lYTc1YTI5MTZlYWIiLCJlbWFpbCI6ImJvZ2R5bjEzQGdtYWlsLmNvbSIsInR5cGUiOiJ1c2VyIiwiaWF0IjoxNzY4MzkyOTMxLCJleHAiOjE3Njg5OTc3MzF9.o1DP4DajaxaraA6xDmQnFNRPQpA7Qc2MNHxyUcyPbQU"
API_URL="http://localhost:3001"

echo "🚁 Setting up RadioMaster Bridge Auto-Connect"
echo ""

# Try to get Remote ID from API
echo "🔍 Fetching Remote ID from API..."
REMOTE_ID=$(curl -s -H "Authorization: Bearer $JWT_TOKEN" "$API_URL/api/v1/remotes" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data[0]['id'] if data and len(data) > 0 else '')" 2>/dev/null)

if [ -z "$REMOTE_ID" ]; then
    echo "⚠️  Could not fetch Remote ID automatically"
    echo ""
    echo "Please provide your Remote ID:"
    echo "  1. Go to http://localhost:3000/remotes"
    echo "  2. Click 'Details' on your remote"
    echo "  3. Copy the Remote ID"
    echo ""
    read -p "Enter Remote ID: " REMOTE_ID
    
    if [ -z "$REMOTE_ID" ]; then
        echo "❌ Remote ID is required!"
        exit 1
    fi
else
    echo "✅ Found Remote ID: $REMOTE_ID"
fi

# Save configuration
cat > "$CONFIG_FILE" << EOF
FLYON_API_URL="$API_URL"
FLYON_JWT_TOKEN="$JWT_TOKEN"
RADIOMASTER_REMOTE_ID="$REMOTE_ID"
EOF

chmod 600 "$CONFIG_FILE"
echo ""
echo "✅ Configuration saved!"
echo ""
echo "📋 Configuration:"
echo "   API URL: $API_URL"
echo "   Remote ID: $REMOTE_ID"
echo "   JWT Token: ${JWT_TOKEN:0:20}..."
echo ""

# Ask about auto-start
echo "🤖 Would you like to enable auto-start on system boot?"
read -p "Enable auto-start? (y/n) [n]: " ENABLE_AUTO
ENABLE_AUTO=${ENABLE_AUTO:-n}

if [ "$ENABLE_AUTO" = "y" ] || [ "$ENABLE_AUTO" = "Y" ]; then
    echo ""
    echo "📝 Setting up auto-start..."
    
    # Create launchd plist for macOS
    PLIST_DIR="$HOME/Library/LaunchAgents"
    PLIST_FILE="$PLIST_DIR/com.flyon.radiomaster-bridge.plist"
    
    mkdir -p "$PLIST_DIR"
    
    # Read config for environment variables
    source "$CONFIG_FILE"
    
    cat > "$PLIST_FILE" << PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.flyon.radiomaster-bridge</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>$BRIDGE_DIR/auto-connect.sh</string>
        <string>start</string>
    </array>
    <key>WorkingDirectory</key>
    <string>$BRIDGE_DIR</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <dict>
        <key>SuccessfulExit</key>
        <false/>
        <key>PathState</key>
        <dict>
            <key>/dev/cu.usbmodem*</key>
            <true/>
        </dict>
    </dict>
    <key>StandardOutPath</key>
    <string>$BRIDGE_DIR/launchd.log</string>
    <key>StandardErrorPath</key>
    <string>$BRIDGE_DIR/launchd.error.log</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
        <key>FLYON_API_URL</key>
        <string>$FLYON_API_URL</string>
        <key>FLYON_JWT_TOKEN</key>
        <string>$FLYON_JWT_TOKEN</string>
        <key>RADIOMASTER_REMOTE_ID</key>
        <string>$RADIOMASTER_REMOTE_ID</string>
    </dict>
    <key>ThrottleInterval</key>
    <integer>10</integer>
</dict>
</plist>
PLIST
    
    # Load the service
    launchctl unload "$PLIST_FILE" 2>/dev/null
    launchctl load "$PLIST_FILE" 2>/dev/null
    
    if [ $? -eq 0 ]; then
        echo "✅ Auto-start enabled!"
        echo "   The bridge will start automatically on system boot"
        echo "   To disable: launchctl unload $PLIST_FILE"
    else
        echo "⚠️  Could not enable auto-start automatically"
        echo "   You can manually load it with:"
        echo "   launchctl load $PLIST_FILE"
    fi
else
    echo "⏭️  Auto-start skipped"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📋 Next steps:"
echo "   Start bridge:     ./auto-connect.sh start"
echo "   Check status:    ./auto-connect.sh status"
echo "   View logs:       ./auto-connect.sh logs"
echo "   Stop bridge:     ./auto-connect.sh stop"
echo ""
