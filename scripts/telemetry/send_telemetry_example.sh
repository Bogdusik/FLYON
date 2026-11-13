#!/bin/bash

# Device token is read from FLYON_DEVICE_TOKEN
DEVICE_TOKEN="${FLYON_DEVICE_TOKEN:?FLYON_DEVICE_TOKEN is not set. Copy a device token from the Drones page in the FLYON app (or POST /api/v1/drones/<id>/regenerate-token), then run: export FLYON_DEVICE_TOKEN=<token>. See docs/USING_DEVICE_TOKEN.md}"

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
