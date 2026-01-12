#!/bin/bash

# Ваш Device Token (уже вставлен)
DEVICE_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkcm9uZUlkIjoiYThhZDliZmItOThiOC00NTBiLTljZGEtZjEzNGEzOGVjOGZhIiwidXNlcklkIjoiYWU5NDZjZmMtZTNjZC00MWRlLWJlOTgtZWE3NWEyOTE2ZWFiIiwidHlwZSI6ImRldmljZSIsImlhdCI6MTc2ODE2ODg4OCwiZXhwIjoxNzk5NzA0ODg4fQ.yzwGam5Oe8yiKvtuAfygAwJ63PsuRAzF2EDzpQ1qrc0"

API_URL="http://localhost:3001/api/v1/telemetry"

echo "🚁 Отправка телеметрии в FLYON..."
echo ""

# Отправка одной точки
curl -X POST $API_URL \
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

echo ""
echo ""
echo "✅ Телеметрия отправлена! Проверьте страницу полета."
