# 📡 Real-Time Flight Tracking Setup Guide

## 🎯 What You Need for Real-Time Tracking

To track your FPV drone in real-time, you need to send telemetry data continuously from your drone to FLYON. Here's what you need:

---

## 📋 Requirements Checklist

### On Your Computer:
- ✅ FLYON backend running (`cd backend && npm run dev`)
- ✅ FLYON frontend running (`cd frontend && npm run dev`)
- ✅ Python 3 installed
- ✅ `pymavlink` library (for MAVLink drones)
- ✅ `requests` library

### On Your Drone:
- ✅ GPS module (for position data)
- ✅ Flight controller with telemetry output capability
- ✅ Connection method (USB/UART/Radio Telemetry)

---

## 🚁 Setup by Drone Type

### Option 1: ArduPilot/PX4 Drones (Easiest for Real-Time)

**Why:** These flight controllers natively support MAVLink protocol, which makes real-time tracking straightforward.

#### What You Need:
1. **ArduPilot or PX4 flight controller**
2. **GPS module** (most ArduPilot setups have this)
3. **Telemetry radio** (optional, for wireless) OR **USB cable** (for wired)

#### Setup Steps:

**Step 1: Enable MAVLink on Flight Controller**

1. Connect to your flight controller via Mission Planner, QGroundControl, or similar
2. Go to **Parameters** → Search for **SERIAL**
3. Find the serial port you want to use (usually SERIAL1 or SERIAL2)
4. Set it to **MAVLink** protocol (usually protocol 2)
5. Set baud rate to **57600** or **115200**
6. Save parameters

**Step 2: Connect to Your Computer**

**Option A: USB Connection (Wired)**
```bash
# Connect USB cable from flight controller to computer
# Find the port:
# Linux: /dev/ttyUSB0 or /dev/ttyACM0
# Windows: COM3, COM4, etc.
# macOS: /dev/tty.usbserial-* or /dev/cu.usbserial-*

# Test connection:
python tools/ground-bridge/ground_bridge.py \
  --token YOUR_DEVICE_TOKEN \
  --connection serial:/dev/ttyUSB0:57600
```

**Option B: Telemetry Radio (Wireless)**
```bash
# Connect telemetry radio to computer via USB
# Usually appears as /dev/ttyUSB0 or COM port

# Run Ground Bridge:
python tools/ground-bridge/ground_bridge.py \
  --token YOUR_DEVICE_TOKEN \
  --connection serial:/dev/ttyUSB0:57600
```

**Option C: UDP (via QGroundControl or Simulator)**
```bash
# If using QGroundControl, it can forward MAVLink via UDP
# Default port: 14550

python tools/ground-bridge/ground_bridge.py \
  --token YOUR_DEVICE_TOKEN \
  --connection udp:127.0.0.1:14550
```

**Step 3: Verify It's Working**

1. Power on your drone
2. Run Ground Bridge script
3. You should see:
   ```
   Connecting to serial:/dev/ttyUSB0:57600...
   Waiting for heartbeat...
   ✓ Connected to flight controller!
   Session ID: session_1234567890
   Starting telemetry transmission...
   
   ✓ 51.505000, -0.090000 | Alt: 100.5m | Speed: 15.2m/s | Battery: 85.5%
   ✓ 51.505100, -0.090100 | Alt: 100.8m | Speed: 15.3m/s | Battery: 85.4%
   ```

4. Open `http://localhost:3000/flights` in your browser
5. You should see a new active flight appearing in real-time!

---

### Option 2: Betaflight/iNav Drones (More Complex)

**Why:** Betaflight doesn't natively support MAVLink, but you can still get real-time tracking.

#### Method A: Using GPS Module with MAVLink Output

If your GPS module supports MAVLink (like some BN-880, BN-220 modules):

1. **Configure GPS for MAVLink:**
   - Some GPS modules can output MAVLink directly
   - Connect GPS TX pin to a separate UART on your flight controller
   - Configure that UART for MAVLink passthrough

2. **Use Ground Bridge:**
   ```bash
   python tools/ground-bridge/ground_bridge.py \
     --token YOUR_DEVICE_TOKEN \
     --connection serial:/dev/ttyUSB0:57600
   ```

#### Method B: Using OSD Data via UART

1. **Enable MSP on Betaflight:**
   - In Betaflight Configurator, go to **Ports** tab
   - Enable **MSP** on a UART (usually UART1 or UART2)
   - Set baud rate to **115200**

2. **Create Custom Script:**
   ```python
   # betaflight_realtime.py
   import serial
   import requests
   import time
   import struct
   
   DEVICE_TOKEN = "your_device_token"
   API_URL = "http://localhost:3001/api/v1/telemetry"
   SERIAL_PORT = "/dev/ttyUSB0"
   BAUD_RATE = 115200
   
   # Connect to Betaflight
   ser = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=1)
   
   # MSP commands to request GPS data
   def send_msp_command(cmd, data=[]):
       # MSP protocol implementation
       # This is simplified - full implementation needed
       pass
   
   session_id = f"session_{int(time.time())}"
   
   while True:
       # Request GPS data via MSP
       gps_data = send_msp_command(109)  # MSP_GPS
       
       if gps_data:
           telemetry = {
               "session_id": session_id,
               "latitude": gps_data['lat'] / 1e7,
               "longitude": gps_data['lon'] / 1e7,
               "altitude": gps_data['alt'] / 100.0,
               "speed": gps_data['speed'] / 100.0,
               "heading": gps_data['heading'] / 10.0,
               "battery": 0,  # Get from battery MSP command
           }
           
           requests.post(API_URL, 
               headers={"Authorization": f"Bearer {DEVICE_TOKEN}"},
               json=telemetry)
       
       time.sleep(0.1)
   ```

#### Method C: Using Companion Computer (Raspberry Pi)

**Best option for Betaflight drones!**

1. **Install Raspberry Pi on your drone**
2. **Connect to Betaflight via UART**
3. **Use MSP to read telemetry**
4. **Send to FLYON via WiFi/4G**

See `docs/COMPANION_COMPUTER_SETUP.md` (if we create it) for details.

---

### Option 3: DJI Drones

DJI drones have limited real-time telemetry options:

1. **DJI SDK** (requires DJI developer account)
2. **DJI Assistant 2** (limited telemetry)
3. **Third-party apps** that can extract telemetry

**Recommendation:** For DJI drones, post-flight log upload is usually easier than real-time tracking.

---

## 🔧 Ground Bridge Setup (Detailed)

### Installation

```bash
# Install Python dependencies
pip install pymavlink requests

# Or if using requirements.txt:
pip install -r tools/ground-bridge/requirements.txt
```

### Basic Usage

```bash
cd tools/ground-bridge

# Get your Device Token from web interface first!
python ground_bridge.py --token YOUR_DEVICE_TOKEN
```

### Advanced Usage

```bash
# Custom connection
python ground_bridge.py \
  --token YOUR_DEVICE_TOKEN \
  --connection serial:/dev/ttyUSB0:57600 \
  --api-url http://localhost:3001

# For remote server
python ground_bridge.py \
  --token YOUR_DEVICE_TOKEN \
  --api-url https://your-flyon-server.com:3001
```

### Connection String Formats

- **Serial (Linux):** `serial:/dev/ttyUSB0:57600`
- **Serial (Windows):** `serial:COM3:57600`
- **Serial (macOS):** `serial:/dev/cu.usbserial-1410:57600`
- **UDP:** `udp:127.0.0.1:14550`
- **TCP:** `tcp:192.168.1.100:5760`

---

## 📱 Viewing Real-Time Data

### In Web Interface

1. **Open Dashboard:** `http://localhost:3000/dashboard`
2. **Go to Flights:** You'll see active flights in real-time
3. **Click on Active Flight:** 
   - Map updates automatically
   - Telemetry graphs update live
   - Current position, altitude, speed, battery shown

### Via WebSocket (For Developers)

```javascript
// websocket-client.js
const WebSocket = require('ws');

const USER_TOKEN = 'your_user_jwt_token';
const WS_URL = `ws://localhost:3002?token=${USER_TOKEN}`;

const ws = new WebSocket(WS_URL);

ws.on('open', () => {
  console.log('Connected to FLYON WebSocket');
  
  // Subscribe to flight updates
  ws.send(JSON.stringify({
    type: 'subscribe',
    flight_id: 'your_flight_id'
  }));
});

ws.on('message', (data) => {
  const message = JSON.parse(data);
  
  if (message.type === 'telemetry') {
    console.log('New telemetry:', message.data);
    // Update your UI here
  }
  
  if (message.type === 'warning') {
    console.warn('⚠️ Warning:', message.data.message);
  }
});
```

---

## 🛠️ Troubleshooting Real-Time Tracking

### Problem: "Connection failed" or "No heartbeat"

**Solutions:**
1. **Check physical connection:**
   - USB cable properly connected?
   - Telemetry radio powered and connected?
   - Correct port selected?

2. **Check flight controller:**
   - Is MAVLink enabled on the serial port?
   - Is the baud rate correct? (usually 57600 or 115200)
   - Is the flight controller powered on?

3. **Check permissions (Linux/macOS):**
   ```bash
   # Add user to dialout group (Linux)
   sudo usermod -a -G dialout $USER
   # Log out and back in
   
   # Or change permissions temporarily
   sudo chmod 666 /dev/ttyUSB0
   ```

4. **Try different ports:**
   ```bash
   # List available ports
   ls /dev/tty* | grep USB
   # or
   ls /dev/cu.*
   ```

### Problem: "No GPS data" or "GPS not locked"

**Solutions:**
1. **Wait for GPS lock:**
   - GPS needs clear sky view
   - Can take 1-5 minutes for first lock
   - Check GPS status in Mission Planner/QGroundControl

2. **Check GPS connection:**
   - GPS module properly connected?
   - GPS antenna positioned correctly?
   - GPS module powered?

3. **Check GPS parameters:**
   - GPS protocol set correctly?
   - GPS baud rate matches flight controller?

### Problem: Telemetry not appearing in web interface

**Solutions:**
1. **Check Device Token:**
   - Is it correct? (copy full token)
   - Is it from the correct drone?

2. **Check backend logs:**
   ```bash
   cd backend
   npm run dev
   # Look for errors in console
   ```

3. **Test API directly:**
   ```bash
   curl -X POST http://localhost:3001/api/v1/telemetry \
     -H "Authorization: Bearer YOUR_DEVICE_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "latitude": 51.505,
       "longitude": -0.09,
       "altitude": 100.5,
       "battery": 85.5
     }'
   ```

4. **Check network:**
   - Is backend accessible?
   - Firewall blocking connections?
   - Correct API URL?

### Problem: Data updates slowly or inconsistently

**Solutions:**
1. **Check connection quality:**
   - USB: Use quality cable
   - Radio: Check signal strength, reduce distance
   - Network: Check internet connection if using remote server

2. **Reduce update frequency:**
   - Ground Bridge sends every 100ms by default
   - You can modify the script to send less frequently

3. **Check flight controller load:**
   - High CPU usage can slow telemetry
   - Disable unnecessary features

---

## 📊 Recommended Setup for Best Results

### For ArduPilot/PX4:
1. ✅ Use telemetry radio (3DR Radio, SiK Radio, etc.)
2. ✅ Set baud rate to 57600
3. ✅ Enable MAVLink on SERIAL1 or SERIAL2
4. ✅ Use Ground Bridge with serial connection

### For Betaflight:
1. ✅ Use Raspberry Pi companion computer
2. ✅ Read MSP data from Betaflight
3. ✅ Send to FLYON via WiFi/4G
4. ✅ Or use GPS module with MAVLink output

### For Testing:
1. ✅ Use USB connection (most reliable)
2. ✅ Test with simulator first (QGroundControl)
3. ✅ Verify data flow before actual flight

---

## 🎯 Quick Start Checklist

- [ ] Backend running (`cd backend && npm run dev`)
- [ ] Frontend running (`cd frontend && npm run dev`)
- [ ] Drone created in web interface
- [ ] Device Token copied
- [ ] Flight controller configured (MAVLink enabled)
- [ ] Ground Bridge installed (`pip install pymavlink requests`)
- [ ] Connection tested (USB/Radio/UDP)
- [ ] GPS locked and working
- [ ] Ground Bridge running and sending data
- [ ] Web interface showing active flight

---

## 🚀 You're Ready!

Once Ground Bridge is running and sending telemetry, you'll see:
- ✅ Real-time position on map
- ✅ Live altitude, speed, battery graphs
- ✅ Current telemetry values
- ✅ Flight path being drawn in real-time
- ✅ Danger zone warnings (if configured)

**Happy real-time tracking! 📡🚁**
