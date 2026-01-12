# FLYON Project Structure

## 📁 Organized Project Layout

```
FLYON/
├── backend/              # Backend API server
│   ├── src/
│   │   ├── config/      # Database configuration
│   │   ├── middleware/  # Auth, upload, error handling
│   │   ├── migrations/  # Database migrations
│   │   ├── parsers/     # Log parsers (CSV, JSON)
│   │   ├── routes/      # API endpoints
│   │   ├── services/    # Business logic
│   │   ├── types/       # TypeScript types
│   │   ├── utils/       # Utilities (logger, auth, postgis)
│   │   ├── validators/  # Zod validation schemas
│   │   └── websocket/   # WebSocket server
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/            # Next.js frontend application
│   ├── src/
│   │   ├── app/         # Next.js pages (App Router)
│   │   ├── components/  # React components
│   │   ├── lib/         # API client, WebSocket
│   │   ├── types/       # TypeScript types
│   │   └── utils/       # Utilities (notifications)
│   ├── package.json
│   └── tsconfig.json
│
├── tools/               # External tools and utilities
│   └── ground-bridge/   # MAVLink to FLYON bridge
│       ├── ground_bridge.py
│       └── README.md
│
├── docs/                # 📚 All documentation
│   ├── README.md        # Documentation index
│   ├── ARCHITECTURE.md
│   ├── DRONE_CONNECTION_GUIDE.md
│   ├── QUICKSTART.md
│   ├── SETUP.md
│   ├── TODO.md
│   └── ... (other docs)
│
├── scripts/             # 🔧 Helper scripts
│   ├── README.md        # Scripts documentation
│   ├── start-all.sh
│   ├── start-backend.sh
│   ├── start-frontend.sh
│   ├── check-setup.sh
│   └── start.sh
│
├── docker-compose.yml   # Docker services (PostgreSQL, Redis)
├── .gitignore          # Git ignore rules
└── README.md           # Main project README
```

## 📂 Directory Purposes

### `/backend`
Node.js/Express API server with TypeScript
- RESTful API endpoints
- WebSocket server
- Database services
- Log parsers
- Telemetry validation

### `/frontend`
Next.js 14+ application with React
- Modern UI with glassmorphism design
- Real-time flight tracking
- Telemetry visualization
- File upload interface

### `/tools`
External utilities and scripts
- Ground bridge for MAVLink integration
- Future: Companion computer SDKs

### `/docs`
All project documentation
- Setup guides
- Architecture documentation
- User guides
- API documentation
- Connection guides

### `/scripts`
Development and deployment scripts
- Quick start scripts
- Setup verification
- Service management

## 🎯 Key Files

### Root Level
- **README.md** - Main project overview
- **docker-compose.yml** - Docker services configuration
- **.gitignore** - Git ignore rules

### Documentation
- **docs/QUICKSTART.md** - Quick start guide
- **docs/DRONE_CONNECTION_GUIDE.md** - How to connect drones
- **docs/ARCHITECTURE.md** - System architecture
- **docs/TODO.md** - Task list and status

### Scripts
- **scripts/start-all.sh** - Start all services
- **scripts/check-setup.sh** - Verify setup

## 📝 File Organization Benefits

✅ **Clean root directory** - Only essential files
✅ **Easy navigation** - Logical grouping
✅ **Better maintainability** - Clear structure
✅ **Professional appearance** - Industry standard layout

## 🔍 Finding Files

- **Documentation**: Check `docs/README.md` for index
- **Scripts**: Check `scripts/README.md` for usage
- **API Code**: `backend/src/routes/`
- **UI Components**: `frontend/src/components/`
- **Tools**: `tools/ground-bridge/`

---

**This structure follows industry best practices for Node.js/Next.js projects.**
