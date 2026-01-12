# FLYON Quick Start Guide

## Prerequisites

Before starting, ensure you have:
- **Node.js 18+** installed
- **Docker Desktop** installed and running
- **npm** or **yarn** package manager

## Step-by-Step Setup

### Step 1: Start Docker Services

Make sure Docker Desktop is running, then:

```bash
docker-compose up -d
```

Wait a few seconds for containers to start, then verify:
```bash
docker ps
```

You should see `flyon-postgres` and `flyon-redis` containers running.

### Step 2: Configure Backend

1. **Create backend/.env file:**

```bash
cd backend
```

Create a file named `.env` with this content:

```env
NODE_ENV=development
PORT=3001
API_PREFIX=/api/v1

DATABASE_URL=postgresql://flyon:flyon_dev_password@localhost:5432/flyon
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=flyon
POSTGRES_PASSWORD=flyon_dev_password
POSTGRES_DB=flyon

REDIS_URL=redis://localhost:6379

JWT_SECRET=flyon-super-secret-jwt-key-change-in-production-2024
JWT_EXPIRES_IN=7d
JWT_DEVICE_TOKEN_EXPIRES_IN=365d

CORS_ORIGIN=http://localhost:3000

WS_PORT=3002
```

2. **Install dependencies (if not already done):**

```bash
npm install
```

3. **Run database migrations:**

```bash
npm run migrate
```

You should see:
```
✅ Migration 001_initial_schema.sql completed
✅ All migrations completed
```

### Step 3: Configure Frontend

1. **Create frontend/.env.local file:**

```bash
cd ../frontend
```

Create a file named `.env.local` with this content:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3002
```

2. **Install dependencies (if not already done):**

```bash
npm install
```

### Step 4: Start the Application

**Open two terminal windows:**

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

You should see:
```
🚀 FLYON API server running on port 3001
📡 API prefix: /api/v1
🌍 Environment: development
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

You should see:
```
- ready started server on 0.0.0.0:3000
```

### Step 5: Access the Application

Open your browser and navigate to:
- **Frontend**: http://localhost:3000
- **Backend Health Check**: http://localhost:3001/health

## First Steps

1. **Register a new account** at http://localhost:3000/register
2. **Login** with your credentials
3. **Add a drone** from the Drones page
4. **Create a flight** and start sending telemetry

## Testing the API

### Test Health Endpoint

```bash
curl http://localhost:3001/health
```

Should return:
```json
{"status":"ok","timestamp":"2024-01-11T..."}
```

### Test Registration

```bash
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test1234",
    "name": "Test User"
  }'
```

### Test Login

```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test1234"
  }'
```

Save the `token` from the response for authenticated requests.

## Troubleshooting

### Docker Not Running

If you see "Cannot connect to the Docker daemon":
1. Open Docker Desktop
2. Wait for it to fully start
3. Try `docker-compose up -d` again

### Port Already in Use

If port 3000, 3001, or 5432 is already in use:
- Change `PORT` in `backend/.env`
- Update `NEXT_PUBLIC_API_URL` in `frontend/.env.local` accordingly

### Database Connection Error

1. Check if PostgreSQL container is running: `docker ps`
2. Check logs: `docker-compose logs postgres`
3. Verify `.env` file has correct database credentials

### Migration Errors

If you see "relation already exists" errors, this is normal if migrations were already run. The script will skip existing tables.

## Stopping the Application

**Stop servers:** Press `Ctrl+C` in both terminal windows

**Stop Docker containers:**
```bash
docker-compose down
```

**Stop and remove all data:**
```bash
docker-compose down -v
```

## Next Steps

- Read [SETUP.md](./SETUP.md) for detailed setup instructions
- Read [ARCHITECTURE.md](./ARCHITECTURE.md) for system architecture
- Check [README.md](./README.md) for feature overview
