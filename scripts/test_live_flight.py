#!/usr/bin/env python3
"""
Test script to create an active flight with telemetry for testing live view
"""
import requests
import time
import json
from datetime import datetime

# Device token from user
DEVICE_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkcm9uZUlkIjoiODgyYTNlZTUtZThmZS00NGFjLThlYTMtOTQxOWUyZGMzOGRlIiwidXNlcklkIjoiYWU5NDZjZmMtZTNjZC00MWRlLWJlOTgtZWE3NWEyOTE2ZWFiIiwidHlwZSI6ImRldmljZSIsImlhdCI6MTc2ODMxNjM2OCwiZXhwIjoxNzk5ODUyMzY4fQ.R8V9A3bSAtGa-h2Qr8mvxJSjnjpQliIuMeV8mjwnl4U"

API_URL = "http://localhost:3001/api/v1/telemetry"

# Use ONE session_id for all points (this keeps them in the same flight)
SESSION_ID = f"test_live_flight_{int(time.time())}"

# Starting position (London area - good for testing)
start_lat = 51.505
start_lon = -0.09
start_alt = 50.0

print("🚁 Creating test flight for live view...")
print(f"📌 Session ID: {SESSION_ID}")
print(f"🌍 Starting position: {start_lat}, {start_lon}")
print("")

# Flight path - create a square pattern
flight_path = [
    # Start point
    {"lat": start_lat, "lon": start_lon, "alt": start_alt, "heading": 0},
    # Move north
    {"lat": start_lat + 0.001, "lon": start_lon, "alt": start_alt + 10, "heading": 0},
    {"lat": start_lat + 0.002, "lon": start_lon, "alt": start_alt + 20, "heading": 0},
    # Turn east
    {"lat": start_lat + 0.002, "lon": start_lon + 0.001, "alt": start_alt + 25, "heading": 90},
    {"lat": start_lat + 0.002, "lon": start_lon + 0.002, "alt": start_alt + 30, "heading": 90},
    # Turn south
    {"lat": start_lat + 0.001, "lon": start_lon + 0.002, "alt": start_alt + 25, "heading": 180},
    {"lat": start_lat, "lon": start_lon + 0.002, "alt": start_alt + 20, "heading": 180},
    # Turn west
    {"lat": start_lat, "lon": start_lon + 0.001, "alt": start_alt + 15, "heading": 270},
    {"lat": start_lat, "lon": start_lon, "alt": start_alt + 10, "heading": 270},
    # Continue pattern
    {"lat": start_lat - 0.001, "lon": start_lon, "alt": start_alt + 15, "heading": 180},
    {"lat": start_lat - 0.002, "lon": start_lon, "alt": start_alt + 20, "heading": 180},
    {"lat": start_lat - 0.002, "lon": start_lon - 0.001, "alt": start_alt + 25, "heading": 270},
    {"lat": start_lat - 0.002, "lon": start_lon - 0.002, "alt": start_alt + 30, "heading": 270},
    {"lat": start_lat - 0.001, "lon": start_lon - 0.002, "alt": start_alt + 25, "heading": 0},
    {"lat": start_lat, "lon": start_lon - 0.002, "alt": start_alt + 20, "heading": 0},
    # Return to start
    {"lat": start_lat, "lon": start_lon - 0.001, "alt": start_alt + 15, "heading": 90},
    {"lat": start_lat, "lon": start_lon, "alt": start_alt + 10, "heading": 0},
]

battery = 95.0
speed = 12.0

print(f"📊 Sending {len(flight_path)} telemetry points...")
print("")

for i, point in enumerate(flight_path):
    telemetry = {
        "session_id": SESSION_ID,
        "latitude": point["lat"],
        "longitude": point["lon"],
        "altitude": point["alt"],
        "speed": speed + (i % 3) * 2,  # Vary speed slightly
        "battery": battery - (i * 0.2),  # Gradually decrease battery
        "heading": point["heading"],
        "flightMode": "MANUAL",
        "armed": True,
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }
    
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
            print(f"✓ Point {i+1}/{len(flight_path)}: {point['lat']:.4f}, {point['lon']:.4f}, alt: {point['alt']:.1f}m")
        else:
            print(f"✗ Point {i+1} failed: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"✗ Point {i+1} error: {e}")
    
    # Small delay between points to simulate real-time
    time.sleep(0.5)

print("")
print("✅ Test flight created!")
print("")
print("📝 Next steps:")
print("1. Go to http://localhost:3000/flights")
print("2. Find the active flight (status: active)")
print("3. Click on it to view details")
print("4. Click '🚁 Live View' button to see the live interface")
print("")
print(f"💡 Session ID: {SESSION_ID}")
print("   (You can use this to send more telemetry points)")
