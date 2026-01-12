#!/bin/bash

# Quick script to delete all flights via SQL
# This is faster than using the API

echo "🗑️  Удаление всех полетов через SQL..."
echo ""

# Connect to database and delete all flights
docker exec -it flyon-postgres psql -U flyon -d flyon -c "DELETE FROM flights;"

echo ""
echo "✅ Все полеты удалены!"
echo "📊 Телеметрия также удалена автоматически (CASCADE)"
