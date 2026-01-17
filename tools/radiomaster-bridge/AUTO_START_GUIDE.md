# Auto-Start Guide - RadioMaster Bridge

## ✅ Setup Complete!

Your RadioMaster bridge is now configured to:
- ✅ Auto-connect on system boot
- ✅ Auto-reconnect if connection is lost
- ✅ Use saved JWT token and Remote ID
- ✅ Auto-detect USB port

## Current Status

**Bridge is running:** Check with `./auto-connect.sh status`

**Auto-start enabled:** The bridge will start automatically when you:
- Boot your Mac
- Connect the RadioMaster Pocket USB cable
- Restart your computer

## Quick Commands

```bash
cd tools/radiomaster-bridge

# Check status
./auto-connect.sh status

# View logs
./auto-connect.sh logs

# Stop bridge
./auto-connect.sh stop

# Start bridge manually
./auto-connect.sh start

# Restart bridge
./auto-connect.sh restart
```

## Auto-Start Management

### Check if auto-start is enabled
```bash
launchctl list | grep flyon
```

### Disable auto-start
```bash
launchctl unload ~/Library/LaunchAgents/com.flyon.radiomaster-bridge.plist
```

### Enable auto-start again
```bash
launchctl load ~/Library/LaunchAgents/com.flyon.radiomaster-bridge.plist
```

### View auto-start logs
```bash
tail -f ~/Library/LaunchAgents/../radiomaster-bridge/launchd.log
```

## Configuration

Your configuration is saved in:
- **File:** `tools/radiomaster-bridge/.bridge-config`
- **Contains:** API URL, JWT Token, Remote ID

To update configuration:
```bash
cd tools/radiomaster-bridge
./setup-auto.sh
```

## Troubleshooting

### Bridge not starting on boot
1. Check if service is loaded: `launchctl list | grep flyon`
2. Check logs: `tail -f tools/radiomaster-bridge/launchd.log`
3. Reload service: `launchctl unload ~/Library/LaunchAgents/com.flyon.radiomaster-bridge.plist && launchctl load ~/Library/LaunchAgents/com.flyon.radiomaster-bridge.plist`

### USB port not found
- Make sure RadioMaster Pocket is connected
- Ensure it's in USB Serial (VCP) mode
- Try reconnecting USB cable

### Connection issues
- Check bridge logs: `./auto-connect.sh logs`
- Verify API is running: `curl http://localhost:3001/api/v1/health`
- Check Remote ID is correct in `.bridge-config`

## What Happens on Boot

1. macOS launches the bridge service
2. Bridge waits for USB port to be available
3. When RadioMaster Pocket is connected, bridge auto-connects
4. Bridge sends data to FLYON backend
5. If connection is lost, bridge auto-reconnects

## Notes

- The bridge will only start when USB port is available
- If you disconnect the USB cable, bridge will wait and reconnect when plugged back in
- All logs are saved to `bridge.log` and `launchd.log`
