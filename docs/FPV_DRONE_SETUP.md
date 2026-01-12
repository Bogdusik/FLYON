# 🚁 Connecting Your FPV Drone to FLYON

## ✅ The application is ready! Here's how to connect your FPV drone:

---

## 📋 Quick Start (3 Steps)

### Step 1: Register Your Drone in the System

1. Open the web interface: `http://localhost:3000`
2. Log in (or register if you're new)
3. Go to the **"Drones"** section
4. Click **"Add Drone"** and fill in:
   - **Name**: Your drone's name (e.g., "My FPV 5 inch")
   - **Model**: Model (optional, e.g., "5 inch FPV")
   - **Manufacturer**: Manufacturer (optional, e.g., "Custom Build")
5. Click **"Save"**

**Important:** After creating the drone, the system will automatically generate a **Device Token**. Copy it - you'll need it to send telemetry!

---

### Step 2: Choose Your Connection Method

FLYON supports **3 methods** for connecting FPV drones:

#### 🎯 Method 1: Upload Flight Logs After Flight (SIMPLEST)

**For:** If you have Blackbox logs (Betaflight/iNav) or ArduPilot logs

**What you need:**
- Flight log file (.bbl for Betaflight, .bin for ArduPilot)
- Python script for conversion (see below)

**Instructions:**
1. After flight, extract the Blackbox log from your drone
2. Use the web interface: `http://localhost:3000/flights/upload`
3. Select your drone and upload the file
4. Done! The flight will appear in the system

#### 🎯 Method 2: Real-Time via Ground Bridge (FOR ADVANCED USERS)

**For:** If you have a MAVLink-compatible controller (ArduPilot, PX4)

**What you need:**
- Python 3
- `pymavlink` library
- Connection to controller (USB/UART/UDP)

**Instructions:**

1. **Install dependencies:**
```bash
pip install pymavlink requests
```

2. **Get Device Token** from the web interface (Drones section)

3. **Run Ground Bridge:**
```bash
cd tools/ground-bridge
python ground_bridge.py --token YOUR_DEVICE_TOKEN
```

4. **For USB/UART connection:**
```bash
# Linux
python ground_bridge.py --token YOUR_TOKEN --connection serial:/dev/ttyUSB0:57600

# Windows
python ground_bridge.py --token YOUR_TOKEN --connection serial:COM3:57600
```

5. **For UDP (if using simulator or QGroundControl):**
```bash
python ground_bridge.py --token YOUR_TOKEN --connection udp:127.0.0.1:14550
```

#### 🎯 Method 3: Manual Telemetry Sending (FOR TESTING)

**For:** For testing or if you have a custom controller

**What you need:**
- Device Token
- Script to send data

**Example Python script:**
```python
import requests
import time

DEVICE_TOKEN = "your_device_token_here"
API_URL = "http://localhost:3001/api/v1/telemetry"
SESSION_ID = f"session_{int(time.time())}"

# Send a single telemetry point
telemetry = {
    "session_id": SESSION_ID,
    "latitude": 51.505,      # Your latitude
    "longitude": -0.09,      # Your longitude
    "altitude": 100.5,       # Altitude in meters
    "speed": 15.2,           # Speed in m/s
    "heading": 45.0,         # Heading (0-360)
    "battery": 85.5,         # Battery (0-100%)
    "flightMode": "MANUAL",  # Flight mode
    "armed": True            # Drone is armed
}

response = requests.post(
    API_URL,
    headers={
        "Authorization": f"Bearer {DEVICE_TOKEN}",
        "Content-Type": "application/json"
    },
    json=telemetry
)

print(f"Status: {response.status_code}")
```

---

### Step 3: View Your Flights

1. Open `http://localhost:3000/flights`
2. You'll see all your flights
3. Click on a flight to view:
   - Map with flight trajectory
   - Graphs (altitude, speed, battery)
   - Statistics
   - Health Score
   - Risk Events

---

## 🔧 Detailed Instructions by Drone Type

### Betaflight/iNav Drones

**Option 1: Upload Blackbox Logs**

1. Enable Blackbox in Betaflight Configurator
2. Make a flight
3. Extract the .bbl file from the SD card
4. Upload via web interface: `http://localhost:3000/flights/upload`

**Option 2: Real-Time (requires additional setup)**

Betaflight doesn't support MAVLink directly, but you can:
- Use OSD data via UART
- Or use a GPS module with MAVLink protocol

### ArduPilot Drones

**Option 1: Upload Logs**

1. After flight, extract the .bin file
2. Upload via web interface

**Option 2: Real-Time via MAVLink**

1. Connect controller to computer (USB/UART)
2. Make sure MAVLink is enabled in parameters
3. Run Ground Bridge:
```bash
python tools/ground-bridge/ground_bridge.py \
  --token YOUR_DEVICE_TOKEN \
  --connection serial:/dev/ttyUSB0:57600
```

### DJI Drones

1. Extract flight log from DJI Fly app
2. Convert to CSV format (if needed)
3. Upload via web interface

---

## 📡 FLYON Telemetry Format

### Required Fields:
```json
{
  "latitude": 51.505,      // Latitude (degrees)
  "longitude": -0.09,     // Longitude (degrees)
  "altitude": 100.5,      // Altitude (meters)
  "battery": 85.5         // Battery (0-100%)
}
```

### Optional Fields:
```json
{
  "session_id": "session_123",           // Flight session ID
  "timestamp": "2024-01-11T12:00:00Z",   // Time (ISO 8601)
  "speed": 15.2,                         // Speed (m/s)
  "heading": 45.0,                       // Heading (0-360)
  "flightMode": "MANUAL",                // Flight mode
  "armed": true,                         // Drone is armed
  "raw_data": {                          // Additional data
    "gps_satellites": 12,
    "signal_strength": 95
  }
}
```

---

## 🛠️ Troubleshooting

### Problem: "Invalid device token"

**Solution:**
1. Check that you copied the full token (it's long)
2. Make sure you're using Device Token, not User Token
3. Check if the token has expired (create a new one in the web interface)

### Problem: Ground Bridge won't connect

**Solution:**
1. Check the connection to the controller
2. Make sure MAVLink is enabled
3. Check port permissions: `sudo chmod 666 /dev/ttyUSB0`
4. Try a different port or baud rate

### Problem: Telemetry not displaying

**Solution:**
1. Check that backend is running: `cd backend && npm run dev`
2. Check backend logs for errors
3. Make sure data is being sent (check API response status)
4. Check data format (must have latitude, longitude, altitude, battery)

---

## 📝 Usage Examples

### Example 1: Test Send via curl

```bash
curl -X POST http://localhost:3001/api/v1/telemetry \
  -H "Authorization: Bearer YOUR_DEVICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 51.505,
    "longitude": -0.09,
    "altitude": 100.5,
    "battery": 85.5,
    "speed": 15.2,
    "heading": 45.0
  }'
```

### Example 2: Python Script to Send Multiple Points

```python
import requests
import time

DEVICE_TOKEN = "your_token"
API_URL = "http://localhost:3001/api/v1/telemetry"
SESSION_ID = f"session_{int(time.time())}"

# Simulate a flight
points = [
    {"lat": 51.505, "lon": -0.09, "alt": 100, "bat": 85},
    {"lat": 51.506, "lon": -0.091, "alt": 105, "bat": 84},
    {"lat": 51.507, "lon": -0.092, "alt": 110, "bat": 83},
]

for point in points:
    telemetry = {
        "session_id": SESSION_ID,
        "latitude": point["lat"],
        "longitude": point["lon"],
        "altitude": point["alt"],
        "battery": point["bat"]
    }
    
    response = requests.post(
        API_URL,
        headers={
            "Authorization": f"Bearer {DEVICE_TOKEN}",
            "Content-Type": "application/json"
        },
        json=telemetry
    )
    
    print(f"Sent: {point['lat']}, {point['lon']} - Status: {response.status_code}")
    time.sleep(1)
```

---

## ✅ Pre-Flight Checklist

- [ ] Backend is running (`cd backend && npm run dev`)
- [ ] Frontend is running (`cd frontend && npm run dev`)
- [ ] Drone created in the system
- [ ] Device Token copied
- [ ] Test connection successful
- [ ] Data displaying in web interface

---

## 🎉 You're Ready!

Your FPV drone is now connected to FLYON! You can:
- Track flights in real-time
- Analyze data after flight
- Receive danger zone warnings
- Export data to KML/GPX
- View detailed analytics

**Happy flying! 🚁**
