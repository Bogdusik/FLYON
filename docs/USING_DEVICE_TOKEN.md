# Using Device Token - Quick Guide

## What is a Device Token?

A Device Token is a JWT (JSON Web Token) that authenticates your drone when sending telemetry data to FLYON. Each drone has a unique token that you get when creating the drone.

## How to Use Your Device Token

### Option 1: Send Test Telemetry via cURL

Replace `YOUR_DEVICE_TOKEN` with your actual token:

```bash
curl -X POST http://localhost:3001/api/v1/telemetry \
  -H "Authorization: Bearer YOUR_DEVICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 51.505,
    "longitude": -0.09,
    "altitude": 100.5,
    "speed": 15.2,
    "battery": 85.5,
    "heading": 45.0,
    "flightMode": "MANUAL",
    "armed": true
  }'
```

### Option 2: Use the Test Script

A test script is available in the project root: `test_telemetry.sh`

1. Edit the script and replace the `DEVICE_TOKEN` value with your token
2. Make it executable: `chmod +x test_telemetry.sh`
3. Run it: `./test_telemetry.sh`

### Option 3: Send Multiple Telemetry Points (Create a Flight Path)

Create a file `send_telemetry.py`:

```python
import requests
import time

DEVICE_TOKEN = "YOUR_DEVICE_TOKEN_HERE"
API_URL = "http://localhost:3001/api/v1/telemetry"

# Starting position (London, UK)
lat = 51.505
lon = -0.09

# Send 10 telemetry points to create a flight path
for i in range(1, 11):
    # Move slightly each time
    current_lat = lat + i * 0.001
    current_lon = lon + i * 0.001
    altitude = 100 + i * 5  # Gradually increase altitude
    
    response = requests.post(
        API_URL,
        headers={
            "Authorization": f"Bearer {DEVICE_TOKEN}",
            "Content-Type": "application/json"
        },
        json={
            "latitude": current_lat,
            "longitude": current_lon,
            "altitude": altitude,
            "speed": 15.2,
            "battery": 85 - i,  # Battery decreases over time
            "heading": i * 36,  # Rotate heading
            "flightMode": "MANUAL",
            "armed": True
        }
    )
    
    if response.status_code == 200:
        print(f"✅ Point {i} sent: {current_lat}, {current_lon}, Alt: {altitude}m")
    else:
        print(f"❌ Error sending point {i}: {response.status_code}")
    
    time.sleep(0.5)  # Wait 0.5 seconds between points

print("\n🎉 Flight path created! Check your Flights page.")
```

Run it:
```bash
pip install requests
python send_telemetry.py
```

## Required Telemetry Fields

When sending telemetry, you must include:

- **latitude** (number): GPS latitude (-90 to 90)
- **longitude** (number): GPS longitude (-180 to 180)
- **altitude** (number): Altitude in meters
- **battery** (number): Battery percentage (0-100)
- **speed** (number): Speed in m/s (optional but recommended)
- **heading** (number): Heading in degrees 0-360 (optional)
- **flightMode** (string): Flight mode like "MANUAL", "GPS", "ALT_HOLD" (optional)
- **armed** (boolean): Whether the drone is armed (optional)

## What Happens After Sending Telemetry?

1. **First telemetry point** → Creates a new flight session
2. **Subsequent points** → Updates the existing flight
3. **Check Flights page** → You'll see your flight with:
   - Map showing the flight path
   - Telemetry graphs (altitude, speed, battery)
   - Flight statistics

## Using with Ground Bridge (Real-time Telemetry)

For real-time telemetry from a MAVLink-compatible flight controller, use the ground bridge:

```bash
cd tools/ground-bridge
python ground_bridge.py --token YOUR_DEVICE_TOKEN
```

See [DRONE_CONNECTION_GUIDE.md](./DRONE_CONNECTION_GUIDE.md) for more details.

## Troubleshooting

### "Unauthorized" or "Invalid token" error
- Make sure you're using the correct Device Token
- Check that the token is copied completely (no spaces, no line breaks)
- Verify the backend server is running on port 3001

### "Flight not found" error
- This is normal for the first telemetry point - it will create a new flight
- Subsequent points will update the existing flight

### No flight appears in Flights page
- Make sure you sent at least one telemetry point
- Refresh the Flights page
- Check browser console for errors

## Security Note

⚠️ **Keep your Device Token secure!** 
- Don't share it publicly
- Don't commit it to version control
- If compromised, you can regenerate it (feature coming soon)

---

**Next Steps:**
1. Send your first telemetry point using one of the methods above
2. Go to the Flights page to see your flight
3. Click on the flight to see details, map, and graphs
