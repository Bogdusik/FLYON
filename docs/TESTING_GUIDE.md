# FLYON - Testing Guide

## 🎯 How FLYON Works

FLYON is a drone flight analytics platform. It helps:
- 📊 Analyze flights after completion
- ⚠️ Receive danger zone warnings in real-time
- 📈 View telemetry graphs (altitude, speed, battery)
- 🗺️ Track flight trajectories on a map
- 📤 Export data to KML/GPX formats

### Main Components:

1. **Backend API** (port 3001) - processes data, stores in database
2. **Frontend** (port 3000) - web interface for users
3. **WebSocket** (port 3002) - real-time updates
4. **PostgreSQL + PostGIS** - database with geospatial data

---

## 🚀 How to Start the Project for Testing

### Step 1: Start Docker (Database)

```bash
# Make sure Docker Desktop is running
docker-compose up -d

# Check that containers are running
docker ps
```

Should be running:
- `flyon-postgres` - database
- `flyon-redis` - cache (optional)

### Step 2: Setup Backend

```bash
cd backend

# Install dependencies (if not already installed)
npm install

# Create .env file (if not already created)
cat > .env << 'EOF'
DATABASE_URL=postgresql://flyon:flyon_dev_password@localhost:5432/flyon
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=7d
JWT_DEVICE_TOKEN_EXPIRES_IN=365d
PORT=3001
WS_PORT=3002
API_PREFIX=/api/v1
CORS_ORIGIN=http://localhost:3000
NODE_ENV=development
EOF

# Run migrations
npm run migrate

# Start backend server
npm run dev
```

Backend should start on `http://localhost:3001`

### Step 3: Setup Frontend

```bash
cd frontend

# Install dependencies (if not already installed)
npm install

# Create .env.local file (if not already created)
cat > .env.local << 'EOF'
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3002
EOF

# Start frontend server
npm run dev
```

Frontend should start on `http://localhost:3000`

---

## 🧪 How to Test the Project

### Test 1: Registration and Login

1. Open `http://localhost:3000`
2. Click **"Register"**
3. Fill in the form:
   - Email: `test@example.com`
   - Password: `Test1234` (minimum 8 characters)
   - Name: `Test User` (optional)
4. Click **"Register"**
5. You should automatically be redirected to Dashboard

**Expected result:** ✅ You see Dashboard with welcome message

---

### Test 2: Create a Drone

1. Go to **"Drones"** section
2. Click **"Add Drone"**
3. Fill in the form:
   - Name: `My Test Drone`
   - Model: `FPV 5 inch` (optional)
   - Manufacturer: `Custom` (optional)
4. Click **"Add"**
5. **IMPORTANT:** Copy the **Device Token** - you'll need it to send telemetry!

**Expected result:** ✅ Drone created, Device Token displayed

---

### Test 3: Send Test Telemetry (via API)

Open a new terminal and run:

```bash
# Replace YOUR_DEVICE_TOKEN with token from step 2
DEVICE_TOKEN="your_device_token_here"

# Send test telemetry
curl -X POST http://localhost:3001/api/v1/telemetry \
  -H "Authorization: Bearer $DEVICE_TOKEN" \
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

**Expected result:** ✅ Response `{"success": true}`

---

### Test 4: View Flight

1. Go to **"Flights"** section
2. You should see a new flight
3. Click on the flight to open details

**Expected result:** ✅ 
- See map with drone position
- See statistics (altitude, speed, battery)
- See telemetry graphs (if multiple points sent)

---

### Test 5: Send Multiple Telemetry Points

Create a file `test_telemetry.sh`:

```bash
#!/bin/bash

DEVICE_TOKEN="your_device_token_here"
API_URL="http://localhost:3001/api/v1/telemetry"

# Send multiple points to create trajectory
for i in {1..10}; do
  lat=$(echo "51.505 + $i * 0.001" | bc)
  lon=$(echo "-0.09 + $i * 0.001" | bc)
  alt=$(echo "100 + $i * 5" | bc)
  
  curl -X POST $API_URL \
    -H "Authorization: Bearer $DEVICE_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"latitude\": $lat,
      \"longitude\": $lon,
      \"altitude\": $alt,
      \"speed\": 15.2,
      \"battery\": $(echo "85 - $i" | bc),
      \"heading\": $(echo "$i * 36" | bc),
      \"flightMode\": \"MANUAL\",
      \"armed\": true
    }"
  
  echo "Sent point $i"
  sleep 0.5
done
```

Or use Python:

```python
import requests
import time

DEVICE_TOKEN = "your_device_token_here"
API_URL = "http://localhost:3001/api/v1/telemetry"

# Send multiple points
for i in range(1, 11):
    lat = 51.505 + i * 0.001
    lon = -0.09 + i * 0.001
    alt = 100 + i * 5
    
    response = requests.post(
        API_URL,
        headers={
            "Authorization": f"Bearer {DEVICE_TOKEN}",
            "Content-Type": "application/json"
        },
        json={
            "latitude": lat,
            "longitude": lon,
            "altitude": alt,
            "speed": 15.2,
            "battery": 85 - i,
            "heading": i * 36,
            "flightMode": "MANUAL",
            "armed": True
        }
    )
    
    print(f"Sent point {i}: {response.status_code}")
    time.sleep(0.5)
```

**Expected result:** ✅ 
- In Flights section see flight with trajectory
- On map see flight path
- Graphs show altitude, speed, battery changes

---

### Test 6: Upload Flight Log

1. Create a test CSV file `test_flight.csv`:

```csv
timestamp,latitude,longitude,altitude,speed,battery,heading
2024-01-11T12:00:00Z,51.505,-0.09,100.0,15.2,85.5,45.0
2024-01-11T12:00:05Z,51.506,-0.091,105.0,15.5,85.0,50.0
2024-01-11T12:00:10Z,51.507,-0.092,110.0,16.0,84.5,55.0
2024-01-11T12:00:15Z,51.508,-0.093,115.0,16.5,84.0,60.0
```

2. Go to **"Flights"** → **"Upload Log"**
3. Select drone
4. Drag and drop `test_flight.csv` file or click "browse"
5. Click **"Upload Log"**

**Expected result:** ✅ 
- Success message about upload
- New flight appears in list
- All telemetry points loaded

---

### Test 7: View Graphs

1. Open any flight with telemetry
2. Scroll down to graphs section
3. You should see:
   - Altitude graph
   - Speed graph
   - Battery graph

**Expected result:** ✅ Graphs display correctly

---

### Test 8: Export Flight

1. Open flight details
2. Click **"Export KML"** or **"Export GPX"**
3. File should automatically download

**Expected result:** ✅ File downloads, can open in Google Earth (KML) or GPS device (GPX)

---

### Test 9: Create Danger Zone

1. Go to **"Danger Zones"** section (if available in navigation)
2. Click **"Add Danger Zone"**
3. Fill in the form:
   - Name: `Test Zone`
   - Coordinates: `[{"lat": 51.505, "lon": -0.09}, {"lat": 51.506, "lon": -0.09}, {"lat": 51.506, "lon": -0.091}, {"lat": 51.505, "lon": -0.091}]`
4. Save

**Expected result:** ✅ Danger zone created

---

### Test 10: Real-Time Updates (WebSocket)

1. Open details of an active flight
2. In another terminal, send telemetry (as in Test 3)
3. Watch updates on the page in real-time

**Expected result:** ✅ 
- Map updates automatically
- Graphs update
- Drone position moves on map

---

## 🔍 Health Checks

### Check Backend

```bash
# Health check
curl http://localhost:3001/health

# Should return: {"status":"ok","timestamp":"..."}
```

### Check Frontend

Open `http://localhost:3000` - main page should load

### Check Database

```bash
docker exec -it flyon-postgres psql -U flyon -d flyon -c "SELECT COUNT(*) FROM users;"
```

---

## 📝 Test Data Examples

### Test Telemetry (JSON)

```json
{
  "latitude": 51.505,
  "longitude": -0.09,
  "altitude": 100.5,
  "speed": 15.2,
  "battery": 85.5,
  "heading": 45.0,
  "flightMode": "MANUAL",
  "armed": true
}
```

### Test CSV Log

```csv
timestamp,latitude,longitude,altitude,speed,battery
2024-01-11T12:00:00Z,51.505,-0.09,100.0,15.2,85.5
2024-01-11T12:00:05Z,51.506,-0.091,105.0,15.5,85.0
```

---

## 🐛 Troubleshooting

### Backend won't start
- Check that port 3001 is free: `lsof -ti:3001`
- Check logs: `cd backend && npm run dev`

### Frontend won't start
- Check that port 3000 is free: `lsof -ti:3000`
- Check `.env.local` file

### Database not working
- Check Docker: `docker ps`
- Check logs: `docker-compose logs postgres`

### Telemetry not sending
- Check Device Token
- Check data format (must have latitude, longitude, altitude, battery)
- Check backend logs

---

## ✅ Testing Checklist

- [ ] User registration
- [ ] Login
- [ ] Create drone
- [ ] Send telemetry via API
- [ ] View flights
- [ ] View flight details
- [ ] View graphs
- [ ] Upload log (CSV/JSON)
- [ ] Export to KML
- [ ] Export to GPX
- [ ] Create danger zone
- [ ] Real-time updates (WebSocket)

---

## 🎯 Quick Test (5 minutes)

1. Start all services (Docker, backend, frontend)
2. Register
3. Create drone
4. Send 1 telemetry point via curl
5. Check that flight appears in list
6. Open flight and check map

**If everything works - project is ready to use!** ✅

---

**For more detailed information see [DRONE_CONNECTION_GUIDE.md](./DRONE_CONNECTION_GUIDE.md)**
