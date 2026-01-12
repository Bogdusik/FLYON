#!/bin/bash

# FLYON Startup Script
echo "🚀 Starting FLYON Platform..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker and try again.${NC}"
    exit 1
fi

# Start database services
echo -e "${YELLOW}📦 Starting database services...${NC}"
docker-compose up -d

# Wait for PostgreSQL to be ready
echo -e "${YELLOW}⏳ Waiting for PostgreSQL to be ready...${NC}"
sleep 5

# Check if PostgreSQL is ready
until docker exec flyon-postgres pg_isready -U flyon > /dev/null 2>&1; do
    echo -e "${YELLOW}⏳ Waiting for PostgreSQL...${NC}"
    sleep 2
done

echo -e "${GREEN}✅ PostgreSQL is ready!${NC}"

# Setup backend
echo -e "${YELLOW}🔧 Setting up backend...${NC}"
cd backend

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing backend dependencies...${NC}"
    npm install
fi

# Run migrations
echo -e "${YELLOW}🗄️  Running database migrations...${NC}"
npm run migrate

echo -e "${GREEN}✅ Backend setup complete!${NC}"
cd ..

# Setup frontend
echo -e "${YELLOW}🔧 Setting up frontend...${NC}"
cd frontend

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing frontend dependencies...${NC}"
    npm install
fi

echo -e "${GREEN}✅ Frontend setup complete!${NC}"
cd ..

echo -e "${GREEN}"
echo "════════════════════════════════════════════════════════"
echo "✅ FLYON is ready to start!"
echo "════════════════════════════════════════════════════════"
echo ""
echo "To start the application:"
echo ""
echo "  Terminal 1 - Backend:"
echo "    cd backend && npm run dev"
echo ""
echo "  Terminal 2 - Frontend:"
echo "    cd frontend && npm run dev"
echo ""
echo "Then open: http://localhost:3000"
echo ""
echo "════════════════════════════════════════════════════════"
echo -e "${NC}"
