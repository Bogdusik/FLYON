#!/bin/bash

echo "🔍 FLYON Setup Checker"
echo "===================="
echo ""

# Check Docker
echo "1. Checking Docker..."
if docker info > /dev/null 2>&1; then
    echo "   ✅ Docker is running"
    
    # Check containers
    if docker ps --filter "name=flyon" --format "{{.Names}}" | grep -q "flyon"; then
        echo "   ✅ Docker containers are running"
        docker ps --filter "name=flyon" --format "   📦 {{.Names}}: {{.Status}}"
    else
        echo "   ⚠️  Docker containers not started"
        echo "   💡 Run: docker-compose up -d"
    fi
else
    echo "   ❌ Docker is NOT running"
    echo "   💡 Please start Docker Desktop and try again"
fi

echo ""

# Check backend
echo "2. Checking Backend..."
if [ -f "backend/.env" ]; then
    echo "   ✅ backend/.env exists"
else
    echo "   ❌ backend/.env missing"
fi

if [ -d "backend/node_modules" ]; then
    echo "   ✅ Backend dependencies installed"
else
    echo "   ⚠️  Backend dependencies not installed"
    echo "   💡 Run: cd backend && npm install"
fi

echo ""

# Check frontend
echo "3. Checking Frontend..."
if [ -f "frontend/.env.local" ]; then
    echo "   ✅ frontend/.env.local exists"
else
    echo "   ⚠️  frontend/.env.local missing (optional)"
fi

if [ -d "frontend/node_modules" ]; then
    echo "   ✅ Frontend dependencies installed"
else
    echo "   ⚠️  Frontend dependencies not installed"
    echo "   💡 Run: cd frontend && npm install"
fi

echo ""

# Summary
echo "📋 Summary:"
echo "==========="

if docker info > /dev/null 2>&1 && docker ps --filter "name=flyon" --format "{{.Names}}" | grep -q "flyon"; then
    if [ -d "backend/node_modules" ] && [ -d "frontend/node_modules" ]; then
        echo "✅ Everything is ready!"
        echo ""
        echo "To start the application:"
        echo "  Terminal 1: cd backend && npm run dev"
        echo "  Terminal 2: cd frontend && npm run dev"
    else
        echo "⚠️  Some dependencies are missing"
    fi
else
    echo "❌ Docker needs to be started first"
    echo ""
    echo "Steps:"
    echo "  1. Open Docker Desktop"
    echo "  2. Wait for it to start"
    echo "  3. Run: docker-compose up -d"
    echo "  4. Run this script again: ./check-setup.sh"
fi
