#!/usr/bin/env python3
"""
Send continuous telemetry to keep a flight active for testing
Usage: python scripts/send_continuous_telemetry.py [session_id]
"""
import requests
import time
import sys
from datetime import datetime
import math

# Device token
DEVICE_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkcm9uZUlkIjoiODgyYTNlZTUtZThmZS00NGFjLThlYTMtOTQxOWUyZGMzOGRlIiwidXNlcklkIjoiYWU5NDZjZmMtZTNjZC00MWRlLWJlOTgtZWE3NWEyOTE2ZWFiIiwidHlwZSI6ImRldmljZSIsImlhdCI6MTc2ODMxNjM2OCwiZXhwIjoxNzk5ODUyMzY4fQ.R8V9A3bSAtGa-h2Qr8mvxJSjnjpQliIuMeV8mjwnl4U"

API_URL = "http://localhost:3001/api/v1/telemetry"

# Get session_id from command line or use default
SESSION_ID = sys.argv[1] if len(sys.argv) > 1 else f"test_live_flight_{int(time.time())}"

# Starting position
start_lat = 51.505
start_lon = -0.09
start_alt = 50.0

# Circle parameters
radius = 0.001  # ~100 meters
center_lat = start_lat
center_lon = start_lon
angle = 0.0

battery = 95.0
speed = 12.0

print("🚁 Sending continuous telemetry...")
print(f"📌 Session ID: {SESSION_ID}")
print("Press Ctrl+C to stop")
print("")

try:
    point_count = 0
    while True:
        # Calculate position in a circle
        lat = center_lat + radius * math.cos(math.radians(angle))
        lon = center_lon + radius * math.sin(math.radians(angle))
        alt = start_alt + 10 * math.sin(math.radians(angle * 2))  # Vary altitude
        heading = (angle + 90) % 360  # Point in direction of travel
        
        telemetry = {
            "session_id": SESSION_ID,
            "latitude": lat,
            "longitude": lon,
            "altitude": alt,
            "speed": speed + 2 * math.sin(math.radians(angle)),
            "battery": max(20.0, battery - (point_count * 0.01)),  # Gradually decrease
            "heading": heading,
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
                timeout=2
            )
            
            if response.status_code == 201:
                print(f"✓ Point {point_count + 1}: {lat:.4f}, {lon:.4f}, alt: {alt:.1f}m, heading: {heading:.0f}°", end='\r')
            else:
                print(f"\n✗ Failed: {response.status_code} - {response.text}")
        except Exception as e:
            print(f"\n✗ Error: {e}")
        
        point_count += 1
        angle = (angle + 5) % 360  # Move 5 degrees per point
        
        time.sleep(1)  # Send every second

except KeyboardInterrupt:
    print(f"\n\n✅ Stopped. Sent {point_count} telemetry points.")
    print(f"💡 Session ID: {SESSION_ID}")
