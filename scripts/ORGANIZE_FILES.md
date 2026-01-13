# File Organization Guide

This document describes the organization of files in the FLYON project.

## Project Structure

```
FLYON/
├── backend/          # Backend API server (Node.js + Express + TypeScript)
│   ├── src/
│   │   ├── config/      # Configuration files (database, swagger)
│   │   ├── middleware/  # Express middleware
│   │   ├── migrations/  # Database migration scripts
│   │   ├── parsers/     # Log file parsers
│   │   ├── routes/      # API route handlers
│   │   ├── services/    # Business logic services
│   │   ├── types/       # TypeScript type definitions
│   │   ├── utils/       # Utility functions
│   │   ├── validators/  # Input validation
│   │   └── websocket/   # WebSocket server
│   └── package.json
│
├── frontend/         # Frontend application (Next.js + React + TypeScript)
│   └── src/
│       ├── app/         # Next.js app router pages
│       ├── components/  # React components
│       ├── lib/         # API client and utilities
│       ├── types/       # TypeScript type definitions
│       └── utils/       # Utility functions
│
├── scripts/          # Development and utility scripts
│   ├── telemetry/    # Telemetry testing scripts
│   ├── cleanup-database.sh  # Database cleanup script
│   ├── simulate_15min_flight.py  # Flight simulation
│   └── README.md     # Scripts documentation
│
├── tools/            # External tools and bridges
│   ├── ground-bridge/     # Ground control bridge
│   └── radiomaster-bridge/ # RadioMaster controller bridge
│
├── docs/             # Project documentation
│   ├── FEATURES.md
│   ├── GETTING_STARTED.md
│   └── README.md
│
├── docker-compose.yml # Docker Compose configuration
└── README.md         # Main project README
```

## File Categories

### Backend Files
- **Routes** (`backend/src/routes/`): API endpoint handlers
- **Services** (`backend/src/services/`): Business logic and database operations
- **Migrations** (`backend/src/migrations/`): Database schema changes
- **Middleware** (`backend/src/middleware/`): Request processing middleware

### Frontend Files
- **Pages** (`frontend/src/app/`): Next.js pages and routes
- **Components** (`frontend/src/components/`): Reusable React components
- **API Client** (`frontend/src/lib/api.ts`): Backend API communication

### Scripts
- **Database** (`scripts/cleanup-database.*`): Database management
- **Simulation** (`scripts/simulate_15min_flight.py`): Flight simulation
- **Telemetry** (`scripts/telemetry/`): Telemetry testing tools

### Tools
- **Bridges** (`tools/*-bridge/`): External device integration tools

## Cleanup Status

✅ All files are organized and sorted
✅ No duplicate files found
✅ No temporary files (.log, .tmp, .bak) found
✅ All scripts are documented
✅ Database cleanup script created and tested

## Maintenance

- Run `./scripts/cleanup-database.sh` to clean the database
- Check `scripts/README.md` for script documentation
- See `docs/` for project documentation
