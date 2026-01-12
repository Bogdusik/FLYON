# FLYON - Drone Flight Analytics Platform

FLYON is a personal web platform for drone and FPV drone owners. It helps users understand, analyze, and improve their flights through telemetry, real-time tracking, safety warnings, and post-flight insights.

## Architecture

- **Frontend**: Next.js 14+ (React, TypeScript, Tailwind CSS)
- **Backend**: Node.js + Express (TypeScript)
- **Database**: PostgreSQL with PostGIS extension
- **Real-time**: WebSocket for live telemetry updates
- **Authentication**: JWT-based with device tokens

## Project Structure

```
FLYON/
├── backend/          # Node.js/Express API server
├── frontend/         # Next.js application
├── tools/            # Ground bridge and utilities
├── docs/             # Project documentation
├── scripts/          # Helper scripts
├── docker-compose.yml # Development environment
└── README.md
```

## Features

- User authentication and drone management
- Real-time flight tracking with live map
- Telemetry ingestion (log upload, live bridge, companion computer)
- Danger zone warnings and safety assistant
- Post-flight analysis and Flight Health Score
- Flight replay with timeline visualization
- Analytics dashboard and flight history
- GDPR-compliant data export and deletion

## Getting Started

### Prerequisites

- **Node.js 18+** installed
- **Docker Desktop** installed and running
- **npm** or **yarn** package manager

### Quick Start

For detailed setup instructions, see:
- **[docs/QUICKSTART.md](./docs/QUICKSTART.md)** - Step-by-step setup guide
- **[docs/SETUP.md](./docs/SETUP.md)** - Detailed setup and troubleshooting
- **[docs/README.md](./docs/README.md)** - Complete documentation index

**Quick commands:**

1. Start database: `docker-compose up -d`
2. Setup backend: `cd backend && npm install && npm run migrate`
3. Setup frontend: `cd frontend && npm install`
4. Start backend: `cd backend && npm run dev` (Terminal 1)
5. Start frontend: `cd frontend && npm run dev` (Terminal 2)
6. Open: http://localhost:3000

**Note:** Make sure to create `.env` file in `backend/` and `.env.local` in `frontend/` directories. See [docs/QUICKSTART.md](./docs/QUICKSTART.md) for configuration details.

**Quick scripts:** Use `./scripts/start-all.sh` to start everything automatically.

**Testing Guide:** See [docs/TESTING_GUIDE.md](./docs/TESTING_GUIDE.md) for detailed testing instructions.

### Database Migrations

Run migrations to set up the database schema:
```bash
cd backend
npm run migrate
```

### Telemetry Input Methods

FLYON supports three telemetry input methods:

1. **Log-based Upload (MVP-ready)**
   - Upload flight logs via API
   - Backend parses and creates flights + telemetry points

2. **Live Telemetry via Ground Bridge**
   - External application reads telemetry (MAVLink, etc.)
   - Converts to FLYON JSON format
   - Sends to backend via HTTPS or WebSocket

3. **Onboard Companion Computer (Future-ready)**
   - Companion computer reads from flight controller
   - Sends signed telemetry packets directly to backend
   - Supports offline buffering and retry

### API Endpoints

- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login and get JWT token
- `GET /api/v1/auth/me` - Get current user profile
- `GET /api/v1/drones` - List user's drones
- `POST /api/v1/drones` - Create new drone
- `GET /api/v1/flights` - List user's flights
- `POST /api/v1/flights` - Create new flight session
- `POST /api/v1/telemetry` - Ingest telemetry (requires device token)
- `POST /api/v1/flights/upload-log` - Upload flight log file (CSV, JSON)
- `GET /api/v1/danger-zones` - List danger zones
- `POST /api/v1/analytics/flights/:id/health-score` - Calculate health score
- `GET /api/v1/export/data` - Export all user data (GDPR)
- `GET /api/v1/export/flights/:id/kml` - Export flight to KML format
- `GET /api/v1/export/flights/:id/gpx` - Export flight to GPX format

### WebSocket Events

Connect to `ws://localhost:3002?token=<JWT_TOKEN>`

- `subscribe` - Subscribe to flight updates: `{ type: 'subscribe', flight_id: '...' }`
- `telemetry` - Receive telemetry updates: `{ type: 'telemetry', flight_id: '...', data: {...} }`
- `warning` - Receive danger zone warnings: `{ type: 'warning', data: {...} }`
- `flight_update` - Receive flight status updates: `{ type: 'flight_update', flight_id: '...', data: {...} }`

## Performance & Real-Time Updates

FLYON is optimized for smooth real-time updates with minimal system load:

- **Memory Management**: Automatic telemetry array limiting (max 10,000 points)
- **WebSocket Optimization**: Primary real-time channel with intelligent fallback
- **Component Memoization**: Reduced recalculations by 70-80%
- **Map Debouncing**: Smooth 60 FPS map updates with <100ms latency
- **Graph Optimization**: Efficient rendering even with 10,000+ telemetry points

For detailed performance optimizations, see [docs/PERFORMANCE_OPTIMIZATIONS.md](./docs/PERFORMANCE_OPTIMIZATIONS.md)

## System Principles

- **Safety Assistant, Not Autopilot**: FLYON provides warnings and insights only
- **Privacy-First**: User owns all data, GDPR-compliant
- **Drone-Agnostic**: Works with any drone via telemetry input
- **Production-Ready**: Clean architecture, scalable design
- **Performance-Optimized**: Smooth real-time updates with minimal resource usage

## License

MIT
