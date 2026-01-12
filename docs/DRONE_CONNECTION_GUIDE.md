# FLYON - Drone Connection Guide

## 📋 What's Left to Complete Full Functionality

### ✅ Already Implemented:
- ✅ User authentication (registration/login)
- ✅ Drone management (create, view, delete)
- ✅ Device Token for drone authentication
- ✅ API for telemetry ingestion (single point and batch)
- ✅ WebSocket server for real-time updates
- ✅ Database with PostGIS for geospatial data
- ✅ Danger zones
- ✅ Flight Health Score (analytics)
- ✅ Frontend interface (dashboard, flights, drones)
- ✅ Beautiful modern design with glassmorphism

### 🔨 What Needs to be Done:

#### 1. **Flight Log Parsing** (High Priority)
- [ ] Parser for Blackbox logs (Betaflight/iNav)
- [ ] Parser for ArduPilot logs (.bin files)
- [ ] Parser for DJI logs
- [ ] UI for log upload via web interface

#### 2. **Ground Bridge Application** (Medium Priority)
- [ ] Python/Node.js script for reading MAVLink telemetry
- [ ] MAVLink → FLYON JSON format conversion
- [ ] Real-time telemetry transmission
- [ ] USB/UART connection support to flight controller

#### 3. **Companion Computer SDK** (Low Priority, Future)
- [ ] Python SDK for Raspberry Pi / Companion computers
- [ ] Automatic telemetry transmission from drone
- [ ] Offline buffering and retry logic

#### 4. **UI/UX Improvements**
- [ ] Map with real-time flight visualization
- [ ] Timeline for flight replay
- [ ] Telemetry graphs (altitude, speed, battery)
- [ ] Danger zone violation notifications
- [ ] Export flights to KML/GPX format

#### 5. **Mobile Application** (Optional)
- [ ] React Native application
- [ ] Push notifications
- [ ] Offline mode

---

## 🚁 How to Connect Your FPV Drone

### Step 1: Register Drone in System

1. **Log in** via web interface: `http://localhost:3000`
2. **Go to "Drones" section**
3. **Click "Add Drone"** and fill out the form:
   - Name: Drone name (e.g., "My FPV Drone")
   - Model: Model (optional)
   - Manufacturer: Manufacturer (optional)
4. **Save the drone** - the system will automatically create a **Device Token**

### Step 2: Get Device Token

After creating the drone, the **Device Token** is displayed on the drone page. This token is used to authenticate your drone when sending telemetry.

**Important:** Save this token in a secure place! You'll need it to send telemetry.

### Step 3: Choose Connection Method

FLYON supports **3 methods** for sending telemetry:

---

## 📡 Method 1: Upload Flight Logs (Simplest)

### For Betaflight/iNav Drones:

1. **Extract Blackbox log** from your drone after flight
2. **Use Python script** for conversion:

```python
# Example script for converting Blackbox log
import requests
import json
import time

# Your Device Token (get from web interface)
DEVICE_TOKEN = "your_device_token_here"
API_URL = "http://localhost:3001/api/v1/telemetry/batch"

# Read Blackbox log (need to use library for parsing)
# For example: pyblackbox or similar

def convert_blackbox_to_flyon(blackbox_file):
    # Parse Blackbox log
    # Convert to FLYON format
    points = []
    
    for entry in blackbox_data:
        points.append({
            "timestamp": entry.timestamp.isoformat(),
            "latitude": entry.gps_lat,
            "longitude": entry.gps_lon,
            "altitude": entry.altitude,
            "speed": entry.speed,
            "heading": entry.heading,
            "battery": entry.battery_percent,
            "flightMode": entry.flight_mode,
            "armed": entry.armed
        })
    
    return points

# Send batch telemetry
session_id = f"session_{int(time.time())}"
points = convert_blackbox_to_flyon("flight.bbl")

response = requests.post(
    API_URL,
    headers={
        "Authorization": f"Bearer {DEVICE_TOKEN}",
        "Content-Type": "application/json"
    },
    json={
        "session_id": session_id,
        "points": points
    }
)

print(f"Uploaded {len(points)} telemetry points")
```

### For ArduPilot Drones:

Similarly, but use a library for parsing ArduPilot `.bin` files.

---

## 📡 Method 2: Live Telemetry via Ground Bridge (Real-time)

### Option A: Python Script with MAVLink

```python
# ground_bridge.py
import time
import requests
from pymavlink import mavutil

# Settings
DEVICE_TOKEN = "your_device_token_here"
API_URL = "http://localhost:3001/api/v1/telemetry"
MAVLINK_CONNECTION = "udp:127.0.0.1:14550"  # or "serial:/dev/ttyUSB0:57600"

# Connect to flight controller
connection = mavutil.mavlink_connection(MAVLINK_CONNECTION)

print("Waiting for heartbeat...")
connection.wait_heartbeat()
print("Connected!")

session_id = f"session_{int(time.time())}"

while True:
    # Read GPS data
    msg = connection.recv_match(type='GLOBAL_POSITION_INT', blocking=True)
    
    if msg:
        # Convert MAVLink to FLYON format
        telemetry = {
            "session_id": session_id,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S.%fZ", time.gmtime()),
            "latitude": msg.lat / 1e7,  # MAVLink uses degrees * 1e7
            "longitude": msg.lon / 1e7,
            "altitude": msg.alt / 1000.0,  # Altitude in meters
            "speed": 0,  # Can get from other messages
            "heading": msg.hdg / 100.0 if msg.hdg != 65535 else None,
            "battery": 0,  # Get from BATTERY_STATUS
            "flightMode": None,
            "armed": False
        }
        
        # Send telemetry
        try:
            response = requests.post(
                API_URL,
                headers={
                    "Authorization": f"Bearer {DEVICE_TOKEN}",
                    "Content-Type": "application/json"
                },
                json=telemetry,
                timeout=1
            )
            
            if response.status_code == 201:
                print(f"✓ Sent telemetry: {telemetry['latitude']:.6f}, {telemetry['longitude']:.6f}")
            else:
                print(f"✗ Error: {response.status_code}")
        except Exception as e:
            print(f"✗ Connection error: {e}")
    
    time.sleep(0.1)  # Send every 100ms
```

### Option B: Node.js Script

```javascript
// ground-bridge.js
const axios = require('axios');
const { MavLinkPacket, MavLinkPacketSplitter, MavLinkParser } = require('node-mavlink');

const DEVICE_TOKEN = 'your_device_token_here';
const API_URL = 'http://localhost:3001/api/v1/telemetry';
const MAVLINK_PORT = 14550; // UDP port

const dgram = require('dgram');
const socket = dgram.createSocket('udp4');

socket.bind(MAVLINK_PORT);

const parser = new MavLinkParser();

socket.on('message', (msg) => {
  try {
    const packet = parser.parse(msg);
    
    if (packet.message.id === 'GLOBAL_POSITION_INT') {
      const gps = packet.message;
      
      const telemetry = {
        session_id: `session_${Date.now()}`,
        timestamp: new Date().toISOString(),
        latitude: gps.lat / 1e7,
        longitude: gps.lon / 1e7,
        altitude: gps.alt / 1000.0,
        speed: 0,
        heading: gps.hdg / 100.0,
        battery: 0,
        flightMode: null,
        armed: false
      };
      
      // Send to FLYON
      axios.post(API_URL, telemetry, {
        headers: {
          'Authorization': `Bearer ${DEVICE_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }).then(() => {
        console.log('✓ Telemetry sent');
      }).catch(err => {
        console.error('✗ Error:', err.message);
      });
    }
  } catch (err) {
    // Ignore parsing errors
  }
});

console.log(`Listening for MAVLink on UDP port ${MAVLINK_PORT}...`);
```

---

## 📡 Method 3: Companion Computer (Advanced)

For drones with Raspberry Pi or other companion computer:

```python
# companion_computer.py
import time
import requests
import json
from queue import Queue
import threading

DEVICE_TOKEN = "your_device_token_here"
API_URL = "http://localhost:3001/api/v1/telemetry"

# Queue for offline buffering
telemetry_queue = Queue()

def send_telemetry(telemetry):
    """Send telemetry with retry logic"""
    max_retries = 3
    for attempt in range(max_retries):
        try:
            response = requests.post(
                API_URL,
                headers={
                    "Authorization": f"Bearer {DEVICE_TOKEN}",
                    "Content-Type": "application/json"
                },
                json=telemetry,
                timeout=5
            )
            
            if response.status_code == 201:
                return True
        except Exception as e:
            print(f"Attempt {attempt + 1} failed: {e}")
            time.sleep(1)
    
    # If failed to send, save to queue
    telemetry_queue.put(telemetry)
    return False

def retry_queue():
    """Periodically try to send accumulated telemetry"""
    while True:
        if not telemetry_queue.empty():
            telemetry = telemetry_queue.get()
            if send_telemetry(telemetry):
                print("✓ Retried telemetry sent")
        time.sleep(5)

# Start retry thread
threading.Thread(target=retry_queue, daemon=True).start()

# Main telemetry reading loop
while True:
    # Read telemetry from flight controller
    # (depends on your specific controller)
    
    telemetry = {
        "session_id": f"session_{int(time.time())}",
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S.%fZ", time.gmtime()),
        "latitude": get_gps_lat(),
        "longitude": get_gps_lon(),
        "altitude": get_altitude(),
        "speed": get_speed(),
        "heading": get_heading(),
        "battery": get_battery(),
        "flightMode": get_flight_mode(),
        "armed": is_armed()
    }
    
    send_telemetry(telemetry)
    time.sleep(0.1)
```

---

## 📊 FLYON Telemetry Format

### Required Fields:
```json
{
  "latitude": 51.505,        // Latitude (degrees)
  "longitude": -0.09,        // Longitude (degrees)
  "altitude": 100.5,         // Altitude (meters)
  "battery": 85.5            // Battery (percentage 0-100)
}
```

### Optional Fields:
```json
{
  "session_id": "session_123",  // Flight session ID
  "timestamp": "2024-01-11T12:00:00.000Z",  // ISO 8601
  "speed": 15.2,               // Speed (m/s)
  "heading": 45.0,             // Heading (degrees 0-360)
  "flightMode": "MANUAL",      // Flight mode
  "armed": true,               // Drone armed
  "raw_data": {                // Additional data
    "gps_satellites": 12,
    "signal_strength": 95
  }
}
```

---

## 🔍 How to Track Flights in Real-Time

### 1. Via Web Interface:

1. **Open Dashboard**: `http://localhost:3000/dashboard`
2. **Go to "Flights"** - see all your flights
3. **Open specific flight** - see:
   - Map with flight trajectory
   - Statistics (distance, altitude, speed)
   - Health Score
   - Risk events

### 2. Via WebSocket (for real-time updates):

```javascript
// websocket-client.js
const WebSocket = require('ws');

const USER_TOKEN = 'your_user_jwt_token_here';
const WS_URL = `ws://localhost:3002?token=${USER_TOKEN}`;

const ws = new WebSocket(WS_URL);

ws.on('open', () => {
  console.log('Connected to FLYON WebSocket');
  
  // Subscribe to flight updates
  ws.send(JSON.stringify({
    type: 'subscribe',
    flight_id: 'your_flight_id_here'
  }));
});

ws.on('message', (data) => {
  const message = JSON.parse(data);
  
  switch (message.type) {
    case 'telemetry':
      console.log('New telemetry:', message.data);
      // Update map, graphs, etc.
      break;
      
    case 'warning':
      console.warn('⚠️ Warning:', message.data.message);
      // Show notification to user
      break;
      
    case 'flight_update':
      console.log('Flight status:', message.data);
      break;
  }
});

ws.on('error', (error) => {
  console.error('WebSocket error:', error);
});
```

---

## 🛠️ Quick Start for Testing

### 1. Create Test Drone:
```bash
curl -X POST http://localhost:3001/api/v1/drones \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Drone",
    "model": "FPV 5 inch"
  }'
```

### 2. Get Device Token from response

### 3. Send Test Telemetry:
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

### 4. Check in Web Interface:
- Open `http://localhost:3000/flights`
- You'll see a new flight with telemetry

---

## 📝 Next Steps

1. **Create parser for your log type** (Blackbox, ArduPilot, DJI)
2. **Set up Ground Bridge** for real-time telemetry
3. **Add danger zones** in your area
4. **Start tracking flights** and analyzing data

---

## 🔗 Useful Links

- **API Documentation**: See `ARCHITECTURE.md`
- **Telemetry Format**: See section above
- **WebSocket Events**: See `README.md`

---

## ❓ Questions and Support

If you have questions:
1. Check backend logs: `cd backend && npm run dev`
2. Check frontend logs in browser (F12)
3. Make sure Device Token is correct
4. Check the format of sent data

**Happy flying! 🚁**
