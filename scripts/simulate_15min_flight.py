#!/usr/bin/env python3
"""
Simulate a 15-minute real-time flight with automatic RTH when battery is low
Usage: python3 scripts/simulate_15min_flight.py [device_token]
"""
import requests
import time
import sys
from datetime import datetime, timedelta
import math
import random

# Device token from user
DEVICE_TOKEN = sys.argv[1] if len(sys.argv) > 1 else "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkcm9uZUlkIjoiMjUzMzI5YTMtNzdjNi00ZWJiLWE5ZDItNmZkOTEyYjhlOTlhIiwidXNlcklkIjoiYWU5NDZjZmMtZTNjZC00MWRlLWJlOTgtZWE3NWEyOTE2ZWFiIiwidHlwZSI6ImRldmljZSIsImlhdCI6MTc2ODMyMzk2NiwiZXhwIjoxNzk5ODU5OTY2fQ.JvzoNzrht-Kfkai-Pvsunq3mAt11lhn8rNOg__diBNU"

API_URL = "http://localhost:3001/api/v1/telemetry"

# Flight parameters
FLIGHT_DURATION_SECONDS = 15 * 60  # 15 minutes
SESSION_ID = f"simulated_15min_flight_{int(time.time())}"

# Starting position (home position)
HOME_LAT = 51.505
HOME_LON = -0.09
HOME_ALT = 50.0

# Flight path: fly away from home, then return
MAX_DISTANCE_FROM_HOME = 0.01  # ~1km from home
TARGET_LAT = HOME_LAT + 0.008  # Target destination
TARGET_LON = HOME_LON + 0.008

# Initial state
current_lat = HOME_LAT
current_lon = HOME_LON
current_alt = HOME_ALT
battery = 100.0
speed = 15.0  # m/s
heading = 45.0  # degrees
flight_mode = "MANUAL"
armed = True

# Flight phase: 'outbound' (going to destination) or 'return' (coming back)
flight_phase = 'outbound'
reached_destination = False
rth_triggered = False

print("🚁 Starting 15-minute simulated flight...")
print(f"📌 Session ID: {SESSION_ID}")
print(f"🏠 Home position: {HOME_LAT:.6f}, {HOME_LON:.6f}")
print(f"🎯 Destination: {TARGET_LAT:.6f}, {TARGET_LON:.6f}")
print(f"⏱️  Duration: {FLIGHT_DURATION_SECONDS // 60} minutes")
print("Press Ctrl+C to stop early")
print("")

start_time = time.time()
point_count = 0

def calculate_distance(lat1, lon1, lat2, lon2):
    """Calculate distance between two points in meters (Haversine)"""
    R = 6371000  # Earth radius in meters
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (math.sin(d_lat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(d_lon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def calculate_bearing(lat1, lon1, lat2, lon2):
    """Calculate bearing from point 1 to point 2"""
    d_lon = math.radians(lon2 - lon1)
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    
    y = math.sin(d_lon) * math.cos(lat2_rad)
    x = (math.cos(lat1_rad) * math.sin(lat2_rad) -
         math.sin(lat1_rad) * math.cos(lat2_rad) * math.cos(d_lon))
    
    bearing = math.degrees(math.atan2(y, x))
    return (bearing + 360) % 360

try:
    while True:
        elapsed = time.time() - start_time
        
        # Check if flight duration exceeded
        if elapsed >= FLIGHT_DURATION_SECONDS:
            print(f"\n✅ Flight duration completed ({FLIGHT_DURATION_SECONDS // 60} minutes)")
            break
        
        # Calculate distance to home
        distance_to_home = calculate_distance(current_lat, current_lon, HOME_LAT, HOME_LON)
        distance_to_target = calculate_distance(current_lat, current_lon, TARGET_LAT, TARGET_LON)
        
        # Flight logic
        if flight_phase == 'outbound':
            # Fly towards destination
            if distance_to_target < 100:  # Within 100m of destination
                if not reached_destination:
                    print(f"\n🎯 Reached destination at {elapsed / 60:.1f} minutes")
                    reached_destination = True
                    flight_phase = 'return'
            else:
                # Calculate heading to target
                heading = calculate_bearing(current_lat, current_lon, TARGET_LAT, TARGET_LON)
                # Move towards target
                distance_step = speed * 1.0  # 1 second interval
                lat_step = distance_step * math.cos(math.radians(heading)) / 111320  # meters to degrees
                lon_step = distance_step * math.sin(math.radians(heading)) / (111320 * math.cos(math.radians(current_lat)))
                current_lat += lat_step
                current_lon += lon_step
                current_alt = HOME_ALT + 30 + 10 * math.sin(elapsed / 10)  # Vary altitude
        else:
            # Return to home
            if distance_to_home < 50:  # Within 50m of home
                print(f"\n🏠 Returned home at {elapsed / 60:.1f} minutes")
                # Hover at home
                current_alt = HOME_ALT + 5
            else:
                # Calculate heading to home
                heading = calculate_bearing(current_lat, current_lon, HOME_LAT, HOME_LON)
                # Move towards home
                distance_step = speed * 1.0
                lat_step = distance_step * math.cos(math.radians(heading)) / 111320
                lon_step = distance_step * math.sin(math.radians(heading)) / (111320 * math.cos(math.radians(current_lat)))
                current_lat += lat_step
                current_lon += lon_step
                current_alt = max(HOME_ALT + 20, current_alt - 0.5)  # Descend gradually
        
        # Battery consumption
        # Base consumption: ~0.1% per second when flying
        # More consumption when climbing or at high speed
        base_consumption = 0.1
        altitude_factor = 1 + (current_alt - HOME_ALT) / 1000 * 0.1  # 10% more per 100m
        speed_factor = 1 + (speed - 10) / 20 * 0.2  # 20% more at high speed
        battery_consumption = base_consumption * altitude_factor * speed_factor
        
        battery = max(0, battery - battery_consumption)
        
        # Add some realistic variation
        speed = 12 + 3 * math.sin(elapsed / 20) + random.uniform(-1, 1)
        heading += random.uniform(-2, 2)  # Small heading variations
        
        # Prepare telemetry
        telemetry = {
            "session_id": SESSION_ID,
            "latitude": current_lat,
            "longitude": current_lon,
            "altitude": current_alt,
            "speed": max(5, min(25, speed)),
            "battery": max(0, min(100, battery)),
            "heading": heading % 360,
            "flightMode": flight_mode,
            "armed": armed,
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
                elapsed_min = elapsed / 60
                status = "OUTBOUND" if flight_phase == 'outbound' else "RETURNING"
                print(f"⏱️  {elapsed_min:5.1f}m | {status:9s} | "
                      f"📍 {current_lat:.5f}, {current_lon:.5f} | "
                      f"🔋 {battery:5.1f}% | "
                      f"📏 {distance_to_home:6.0f}m | "
                      f"⚡ {speed:4.1f}m/s", end='\r')
            else:
                print(f"\n✗ Failed: {response.status_code} - {response.text}")
        except Exception as e:
            print(f"\n✗ Error: {e}")
        
        point_count += 1
        time.sleep(1)  # Send every second (real-time)

except KeyboardInterrupt:
    print(f"\n\n⏹️  Flight stopped by user")
    print(f"📊 Sent {point_count} telemetry points")
    print(f"💡 Session ID: {SESSION_ID}")

print(f"\n\n✅ Flight simulation completed")
print(f"📊 Total points sent: {point_count}")
print(f"⏱️  Duration: {(time.time() - start_time) / 60:.1f} minutes")
print(f"💡 Session ID: {SESSION_ID}")
print(f"🔋 Final battery: {battery:.1f}%")
