# FLYON Setup Instructions

## Quick Start

### 1. Start Database Services

```bash
docker-compose up -d
```

Verify containers are running:
```bash
docker ps
```

### 2. Install Dependencies and Setup Backend

```bash
cd backend
npm install
```

Create `.env` file in `backend/` directory with the following content:

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

Run database migrations:
```bash
npm run migrate
```

### 3. Install Dependencies and Setup Frontend

```bash
cd frontend
npm install
```

Create `.env.local` file in `frontend/` directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3002
```

### 4. Start the Application

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### 5. Open in Browser

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Health Check: http://localhost:3001/health

## Using Scripts

### Automatic Setup (First Time)

```bash
./start.sh
```

This script will:
- Start Docker containers
- Install dependencies (if needed)
- Run database migrations

### Start Backend

```bash
./start-backend.sh
```

or

```bash
cd backend && npm run dev
```

### Start Frontend

```bash
./start-frontend.sh
```

or

```bash
cd frontend && npm run dev
```

## Verification

### 1. Check Database

```bash
docker exec -it flyon-postgres psql -U flyon -d flyon -c "SELECT PostGIS_version();"
```

### 2. Check Backend API

```bash
curl http://localhost:3001/health
```

Should return: `{"status":"ok","timestamp":"..."}`

### 3. Check Frontend

Open http://localhost:3000 in your browser

## Troubleshooting

### Database Connection Error

1. Check if Docker is running: `docker ps`
2. Check logs: `docker-compose logs postgres`
3. Make sure port 5432 is available

### Migration Errors

If migrations are already applied, this is normal. The script will skip existing tables.

### Port Already in Use

Change ports in `.env` files:
- Backend: `PORT=3001` → different port
- Frontend: update `NEXT_PUBLIC_API_URL` accordingly

### CORS Errors

Make sure `CORS_ORIGIN` in backend `.env` points to `http://localhost:3000`

## Stopping the Application

```bash
# Stop Docker containers
docker-compose down

# Or stop and remove data volumes
docker-compose down -v
```
