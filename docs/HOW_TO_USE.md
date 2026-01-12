# How to Use FLYON

## ⚠️ Important: API Endpoints Don't Open in Browser!

The error "Cannot GET /api/v1/auth/register" appears because:
- These URLs only work with **POST requests**
- Browser makes a **GET request** when opening URL
- API doesn't support GET for these endpoints

## ✅ Correct Usage:

### 1. Open Frontend (Web Interface):
```
http://localhost:3000
```

### 2. Use Web Interface:
- Click "Register" to register
- Click "Login" to login
- Everything works through forms on the website!

### 3. Or Use API via curl/Postman:

**Registration:**
```bash
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"YourPass123","name":"Your Name"}'
```

**Login:**
```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"YourPass123"}'
```

## 📋 Correct Links:

### ✅ Work in Browser (Frontend):
- http://localhost:3000
- http://localhost:3000/login
- http://localhost:3000/register
- http://localhost:3000/dashboard
- http://localhost:3000/flights
- http://localhost:3000/drones

### ❌ DON'T Work in Browser (POST requests only):
- http://localhost:3001/api/v1/auth/register
- http://localhost:3001/api/v1/auth/login

### ✅ Work for Checking (GET requests):
- http://localhost:3001/health
- http://localhost:3001/api/v1/danger-zones (if authenticated)

## 🚀 Quick Start Guide

1. **Start Services:**
   ```bash
   # Terminal 1: Start database
   docker-compose up -d
   
   # Terminal 2: Start backend
   cd backend && npm run dev
   
   # Terminal 3: Start frontend
   cd frontend && npm run dev
   ```

2. **Register Account:**
   - Open http://localhost:3000
   - Click "Register"
   - Fill in email, password, name
   - Click "Register"

3. **Create Drone:**
   - Go to "Drones" section
   - Click "Add Drone"
   - Fill in drone details
   - **Save the Device Token!** You'll need it to send telemetry

4. **Send Telemetry:**
   ```bash
   curl -X POST http://localhost:3001/api/v1/telemetry \
     -H "Authorization: Bearer YOUR_DEVICE_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "latitude": 51.505,
       "longitude": -0.09,
       "altitude": 100.5,
       "speed": 15.2,
       "battery": 85.5
     }'
   ```

5. **View Flight:**
   - Go to "Flights" section
   - Click on the flight to see details
   - View map, graphs, and statistics

## 📖 More Information

- **Setup Guide**: See [SETUP.md](./SETUP.md)
- **Testing Guide**: See [TESTING_GUIDE.md](./TESTING_GUIDE.md)
- **Real-Time Tracking**: See [REAL_TIME_TRACKING.md](./REAL_TIME_TRACKING.md)
- **Device Token Usage**: See [USING_DEVICE_TOKEN.md](./USING_DEVICE_TOKEN.md)
