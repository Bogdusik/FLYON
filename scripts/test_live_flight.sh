#!/bin/bash

# Device token is read from FLYON_DEVICE_TOKEN
DEVICE_TOKEN="${FLYON_DEVICE_TOKEN:?FLYON_DEVICE_TOKEN is not set. Copy a device token from the Drones page in the FLYON app (or POST /api/v1/drones/<id>/regenerate-token), then run: export FLYON_DEVICE_TOKEN=<token>. See docs/USING_DEVICE_TOKEN.md}"

API_URL="http://localhost:3001/api/v1/telemetry"

# Use ONE session_id for all points
SESSION_ID="test_live_flight_$(date +%s)"

# Starting position (London area)
START_LAT=51.505
START_LON=-0.09
START_ALT=50.0

echo "🚁 Creating test flight for live view..."
echo "📌 Session ID: $SESSION_ID"
echo "🌍 Starting position: $START_LAT, $START_LON"
echo ""

# Send initial point
echo "📊 Sending telemetry points..."
echo ""

# Send 10 points in a pattern
for i in {0..9}; do
  # Calculate position (square pattern)
  case $((i % 4)) in
    0) # North
      LAT=$(echo "$START_LAT + $i * 0.0005" | bc)
      LON=$START_LON
      HEADING=0
      ;;
    1) # East
      LAT=$(echo "$START_LAT + 0.002" | bc)
      LON=$(echo "$START_LON + ($i - 1) * 0.0005" | bc)
      HEADING=90
      ;;
    2) # South
      LAT=$(echo "$START_LAT + 0.002 - ($i - 2) * 0.0005" | bc)
      LON=$(echo "$START_LON + 0.002" | bc)
      HEADING=180
      ;;
    3) # West
      LAT=$START_LAT
      LON=$(echo "$START_LON + 0.002 - ($i - 3) * 0.0005" | bc)
      HEADING=270
      ;;
  esac
  
  ALT=$(echo "$START_ALT + $i * 2" | bc)
  BATTERY=$(echo "95.0 - $i * 0.5" | bc)
  SPEED=$(echo "12.0 + $i * 0.3" | bc)
  
  TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  
  curl -X POST "$API_URL" \
    -H "Authorization: Bearer $DEVICE_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"session_id\": \"$SESSION_ID\",
      \"latitude\": $LAT,
      \"longitude\": $LON,
      \"altitude\": $ALT,
      \"speed\": $SPEED,
      \"battery\": $BATTERY,
      \"heading\": $HEADING,
      \"flightMode\": \"MANUAL\",
      \"armed\": true,
      \"timestamp\": \"$TIMESTAMP\"
    }" \
    -s -o /dev/null -w "✓ Point $((i+1))/10 sent\n"
  
  sleep 0.5
done

echo ""
echo "✅ Test flight created!"
echo ""
echo "📝 Next steps:"
echo "1. Go to http://localhost:3000/flights"
echo "2. Find the active flight (status: active)"
echo "3. Click on it to view details"
echo "4. Click '🚁 Live View' button to see the live interface"
echo ""
echo "💡 Session ID: $SESSION_ID"
