# 🚀 FLYON - Getting Started

## Prerequisites

- **Node.js 18+** installed
- **Docker Desktop** installed and running
- **npm** or **yarn** package manager

## Quick Setup

### 1. Start Database

```bash
docker-compose up -d
```

Wait a few seconds, then verify:
```bash
docker ps
```

You should see `flyon-postgres` container running.

### 2. Configure Backend

Create `backend/.env` file:

```env
NODE_ENV=development
PORT=3001
API_PREFIX=/api/v1

DATABASE_URL=postgresql://flyon:flyon_dev_password@localhost:5432/flyon
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:3000
WS_PORT=3002
```

### 3. Setup Backend

```bash
cd backend
npm install
npm run migrate
npm run dev
```

Backend will run on `http://localhost:3001`

### 4. Configure Frontend

Create `frontend/.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3002
```

### 5. Setup Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend will run on `http://localhost:3000`

## First Steps

1. Open `http://localhost:3000`
2. Register a new account
3. Create your first drone
4. Upload a flight log or start tracking

## Troubleshooting

### Database Connection Issues
- Make sure Docker Desktop is running
- Check if PostgreSQL container is running: `docker ps`
- Verify DATABASE_URL in `backend/.env`

### Port Already in Use
- Backend: Change `PORT` in `backend/.env`
- Frontend: Change port: `npm run dev -- -p 3001`

### Migration Errors
- Make sure database is running
- Check database connection string
- Run migrations again: `cd backend && npm run migrate`

## Next Steps

- See [FEATURES.md](./FEATURES.md) for all available features
- See [README.md](./README.md) for documentation index
