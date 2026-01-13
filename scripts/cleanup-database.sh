#!/bin/bash

# Database Cleanup Script
# This script will delete all flights, drones, and related data from the database

echo "🧹 Starting database cleanup..."
echo ""
echo "⚠️  WARNING: This will permanently delete ALL flights and drones!"
echo ""
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Cleanup cancelled."
    exit 0
fi

echo ""
echo "📊 Checking current data..."

# Check if using Docker
if docker ps | grep -q flyon-postgres; then
    echo "🐳 Using Docker database..."
    
    # Count current data
    FLIGHTS_COUNT=$(docker exec flyon-postgres psql -U flyon -d flyon -t -c "SELECT COUNT(*) FROM flights;" | xargs)
    DRONES_COUNT=$(docker exec flyon-postgres psql -U flyon -d flyon -t -c "SELECT COUNT(*) FROM drones;" | xargs)
    TELEMETRY_COUNT=$(docker exec flyon-postgres psql -U flyon -d flyon -t -c "SELECT COUNT(*) FROM telemetry;" | xargs)
    
    echo "   Flights: $FLIGHTS_COUNT"
    echo "   Drones: $DRONES_COUNT"
    echo "   Telemetry points: $TELEMETRY_COUNT"
    echo ""
    
    if [ "$FLIGHTS_COUNT" -eq 0 ] && [ "$DRONES_COUNT" -eq 0 ]; then
        echo "✅ Database is already clean!"
        exit 0
    fi
    
    echo "🗑️  Deleting data..."
    echo ""
    
    # Delete in correct order
    echo "   Deleting telemetry..."
    docker exec flyon-postgres psql -U flyon -d flyon -c "DELETE FROM telemetry;" > /dev/null 2>&1
    echo "   ✅ Telemetry deleted"
    
    echo "   Deleting blackbox logs..."
    docker exec flyon-postgres psql -U flyon -d flyon -c "DELETE FROM blackbox_logs;" > /dev/null 2>&1 || echo "   ⚠️  Blackbox logs table does not exist (skipping)"
    
    echo "   Deleting betaflight configs..."
    docker exec flyon-postgres psql -U flyon -d flyon -c "DELETE FROM betaflight_configs;" > /dev/null 2>&1 || echo "   ⚠️  Betaflight configs table does not exist (skipping)"
    
    echo "   Deleting betaflight config history..."
    docker exec flyon-postgres psql -U flyon -d flyon -c "DELETE FROM betaflight_config_history;" > /dev/null 2>&1 || echo "   ⚠️  Betaflight config history table does not exist (skipping)"
    
    echo "   Deleting flights..."
    docker exec flyon-postgres psql -U flyon -d flyon -c "DELETE FROM flights;" > /dev/null 2>&1
    echo "   ✅ Flights deleted"
    
    echo "   Deleting drones..."
    docker exec flyon-postgres psql -U flyon -d flyon -c "DELETE FROM drones;" > /dev/null 2>&1
    echo "   ✅ Drones deleted"
    
    echo "   Deleting remotes..."
    docker exec flyon-postgres psql -U flyon -d flyon -c "DELETE FROM remotes;" > /dev/null 2>&1 || echo "   ⚠️  Remotes table does not exist (skipping)"
    
    echo "   Deleting shared flights..."
    docker exec flyon-postgres psql -U flyon -d flyon -c "DELETE FROM shared_flights;" > /dev/null 2>&1 || echo "   ⚠️  Shared flights table does not exist (skipping)"
    
    echo ""
    echo "✅ Database cleanup completed!"
    echo ""
    
    # Verify cleanup
    echo "📊 Verifying cleanup..."
    FINAL_FLIGHTS=$(docker exec flyon-postgres psql -U flyon -d flyon -t -c "SELECT COUNT(*) FROM flights;" | xargs)
    FINAL_DRONES=$(docker exec flyon-postgres psql -U flyon -d flyon -t -c "SELECT COUNT(*) FROM drones;" | xargs)
    FINAL_TELEMETRY=$(docker exec flyon-postgres psql -U flyon -d flyon -t -c "SELECT COUNT(*) FROM telemetry;" | xargs)
    
    echo "   Flights: $FINAL_FLIGHTS"
    echo "   Drones: $FINAL_DRONES"
    echo "   Telemetry points: $FINAL_TELEMETRY"
    echo ""
    
    if [ "$FINAL_FLIGHTS" -eq 0 ] && [ "$FINAL_DRONES" -eq 0 ] && [ "$FINAL_TELEMETRY" -eq 0 ]; then
        echo "✅ Database is now clean!"
    else
        echo "⚠️  Some data may still remain. Please check manually."
    fi
    
else
    echo "❌ Docker container 'flyon-postgres' not found."
    echo "   Please make sure Docker is running and the database container is started."
    echo "   Or use the TypeScript version: npx ts-node scripts/cleanup-database.ts"
    exit 1
fi
