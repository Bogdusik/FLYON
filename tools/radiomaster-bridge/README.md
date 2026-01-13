# RadioMaster Pocket (ELRS) Bridge

Bridge application to connect RadioMaster Pocket transmitter (ELRS version) to FLYON platform via USB Serial.

## Requirements

- RadioMaster Pocket transmitter (ELRS version)
- USB cable
- Python 3.7+
- pyserial library

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Connect RadioMaster Pocket:
   - Connect transmitter to computer via USB
   - On transmitter, select "USB Serial (VCP)" mode
   - Note the COM port (Windows) or device path (Linux/Mac)

3. Set environment variables:
```bash
export FLYON_API_URL="http://localhost:3001"
export FLYON_JWT_TOKEN="your_jwt_token_here"
export RADIOMASTER_REMOTE_ID="remote_id_from_flyon"
export RADIOMASTER_SERIAL_PORT="/dev/ttyUSB0"  # Optional, auto-detects if not set
export RADIOMASTER_BAUD_RATE="115200"  # Optional, defaults to 115200
```

4. Run the bridge:
```bash
python radiomaster_bridge.py
```

## How It Works

1. Connects to RadioMaster Pocket via USB Serial
2. Reads telemetry data from transmitter (channels, switches, battery, RSSI)
3. Parses EdgeTX/OpenTX data format
4. Sends data to FLYON backend via REST API
5. Updates remote status and metadata in FLYON

## Data Format

The bridge sends the following data structure to FLYON:

```json
{
  "connected": true,
  "channels": [1500, 1500, 1500, 1500, ...],
  "switches": [0, 0, 1, 0, ...],
  "battery": 85,
  "rssi": 95,
  "timestamp": "2026-01-13T12:00:00Z"
}
```

## Troubleshooting

### Port Not Found
- Make sure transmitter is in USB Serial (VCP) mode
- Check USB cable connection
- Try specifying port manually: `export RADIOMASTER_SERIAL_PORT="/dev/ttyUSB0"`

### Permission Denied (Linux)
```bash
sudo usermod -a -G dialout $USER
# Then logout and login again
```

### No Data Received
- Check that EdgeTX/OpenTX is configured to send telemetry
- Verify baud rate matches transmitter settings
- Check serial port settings in transmitter configuration

## EdgeTX Configuration

To send data from EdgeTX to the bridge, you may need to:
1. Configure telemetry output in EdgeTX
2. Set up Lua script to format data as JSON
3. Or use EdgeTX's built-in telemetry export features
