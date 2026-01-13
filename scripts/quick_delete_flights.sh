#!/bin/bash

# Quick script to delete all flights via SQL
# NOTE: This script is deprecated. Use cleanup-database.sh instead for complete cleanup.
# This script only deletes flights, not drones or other related data.

echo "⚠️  DEPRECATED: This script is deprecated."
echo "   Use './scripts/cleanup-database.sh' instead for complete database cleanup."
echo ""
echo "🗑️  Удаление всех полетов через SQL..."
echo ""

# Connect to database and delete all flights
docker exec -it flyon-postgres psql -U flyon -d flyon -c "DELETE FROM flights;"

echo ""
echo "✅ Все полеты удалены!"
echo "📊 Телеметрия также удалена автоматически (CASCADE)"
echo ""
echo "💡 Tip: Use './scripts/cleanup-database.sh' to delete flights, drones, and all related data."
