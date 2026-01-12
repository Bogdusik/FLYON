#!/usr/bin/env python3
"""
Send multiple telemetry points to create a visible flight path
"""
import requests
import time
import json

DEVICE_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkcm9uZUlkIjoiYThhZDliZmItOThiOC00NTBiLTljZGEtZjEzNGEzOGVjOGZhIiwidXNlcklkIjoiYWU5NDZjZmMtZTNjZC00MWRlLWJlOTgtZWE3NWEyOTE2ZWFiIiwidHlwZSI6ImRldmljZSIsImlhdCI6MTc2ODE2ODg4OCwiZXhwIjoxNzk5NzA0ODg4fQ.yzwGam5Oe8yiKvtuAfygAwJ63PsuRAzF2EDzpQ1qrc0"

API_URL = "http://localhost:3001/api/v1/telemetry"

# Use ONE session_id for all points (this keeps them in the same flight)
SESSION_ID = "flight_session_001"

# Starting position (London)
lat = 51.505
lon = -0.09
alt = 100.0
speed = 15.0
battery = 85.0

print("🚁 Отправка точек телеметрии для создания траектории полета...")
print(f"📌 Используется одна сессия: {SESSION_ID}")
print("")

# Send 15 points in a pattern
for i in range(1, 16):
    # Move in a pattern (north-east direction)
    current_lat = lat + i * 0.001
    current_lon = lon + i * 0.001
    current_alt = alt + i * 2
    current_speed = speed + i * 0.3
    current_battery = battery - i * 0.3
    heading = i * 24
    
    print(f"Отправка точки {i}/15: Lat={current_lat:.6f}, Lon={current_lon:.6f}, Alt={current_alt:.1f}m")
    
    response = requests.post(
        API_URL,
        headers={
            "Authorization": f"Bearer {DEVICE_TOKEN}",
            "Content-Type": "application/json"
        },
        json={
            "latitude": current_lat,
            "longitude": current_lon,
            "altitude": current_alt,
            "speed": current_speed,
            "battery": current_battery,
            "heading": heading,
            "flightMode": "MANUAL",
            "armed": True,
            "session_id": SESSION_ID  # Use same session for all points
        }
    )
    
    if response.status_code in [200, 201]:
        print(f"  ✅ Успешно")
    else:
        print(f"  ❌ Ошибка: {response.status_code} - {response.text}")
    
    # Wait 0.3 seconds between points
    time.sleep(0.3)

print("")
print("✅ Отправлено 15 точек телеметрии!")
print("📊 Обновите страницу полета, чтобы увидеть траекторию на карте")
