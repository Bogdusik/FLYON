# FLYON Ground Bridge

Ground bridge application for connecting MAVLink-compatible flight controllers to FLYON.

## Installation

```bash
pip install pymavlink requests
```

## Usage

### Basic Usage

```bash
python ground_bridge.py --token YOUR_DEVICE_TOKEN
```

### With Custom Connection

```bash
# UDP connection (default)
python ground_bridge.py --token YOUR_DEVICE_TOKEN --connection udp:127.0.0.1:14550

# Serial connection
python ground_bridge.py --token YOUR_DEVICE_TOKEN --connection serial:/dev/ttyUSB0:57600

# TCP connection
python ground_bridge.py --token YOUR_DEVICE_TOKEN --connection tcp:192.168.1.100:5760
```

### With Custom API URL

```bash
python ground_bridge.py --token YOUR_DEVICE_TOKEN --api-url http://your-flyon-server.com:3001
```

## Getting Device Token

1. Log in to FLYON web interface
2. Go to "Drones" section
3. Create or select your drone
4. Copy the Device Token from the drone details

## Connection Strings

- **UDP**: `udp:127.0.0.1:14550` (for simulators like QGroundControl)
- **Serial**: `serial:/dev/ttyUSB0:57600` (Linux) or `serial:COM3:57600` (Windows)
- **TCP**: `tcp:192.168.1.100:5760`

## Features

- Real-time telemetry transmission
- Automatic session management
- Battery status monitoring
- Flight mode detection
- Armed status detection
- Error handling and reconnection

## Troubleshooting

### Connection Issues

- Make sure your flight controller is powered on
- Check connection string format
- Verify MAVLink is enabled on your flight controller
- For serial connections, check permissions: `sudo chmod 666 /dev/ttyUSB0`

### API Issues

- Verify Device Token is correct
- Check API URL is accessible
- Ensure backend server is running

## Example Output

```
Connecting to udp:127.0.0.1:14550...
Waiting for heartbeat...
✓ Connected to flight controller!
Session ID: session_1704988800
Starting telemetry transmission...
Press Ctrl+C to stop

✓ 51.505000, -0.090000 | Alt: 100.5m | Speed: 15.2m/s | Battery: 85.5%
✓ 51.505100, -0.090100 | Alt: 100.8m | Speed: 15.3m/s | Battery: 85.4%
```
