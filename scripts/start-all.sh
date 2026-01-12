#!/bin/bash

echo "🚀 FLYON Launch Script"
echo "====================="
echo ""

# Check Docker
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running!"
    echo ""
    echo "Please:"
    echo "  1. Open Docker Desktop from Applications"
    echo "  2. Wait for it to start"
    echo "  3. Run this script again"
    exit 1
fi

echo "✅ Docker is running"
echo ""

# Start database
echo "📦 Starting database containers..."
docker-compose up -d

echo "⏳ Waiting for database to be ready..."
sleep 15

# Check if containers are running
if ! docker ps --filter "name=flyon-postgres" --format "{{.Names}}" | grep -q "flyon-postgres"; then
    echo "❌ Database containers failed to start"
    echo "Check logs: docker-compose logs"
    exit 1
fi

echo "✅ Database containers are running"
echo ""

# Run migrations
echo "🗄️  Running database migrations..."
cd backend
npm run migrate
cd ..

echo ""
echo "✅ Setup complete!"
echo ""
echo "Now start the servers:"
echo ""
echo "  Terminal 1 - Backend:"
echo "    cd backend && npm run dev"
echo ""
echo "  Terminal 2 - Frontend:"
echo "    cd frontend && npm run dev"
echo ""
echo "Then open: http://localhost:3000"
echo ""
