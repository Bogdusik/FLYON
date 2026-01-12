# Project Organization

## 📁 File Organization Summary

The FLYON project has been organized for better maintainability and clarity.

### Before Organization
- ❌ 20+ documentation files in root directory
- ❌ 5+ scripts scattered in root
- ❌ Difficult to navigate
- ❌ Cluttered appearance

### After Organization
- ✅ Clean root directory (only essential files)
- ✅ All documentation in `docs/` folder
- ✅ All scripts in `scripts/` folder
- ✅ Clear structure following industry standards
- ✅ Easy navigation

## 📂 Directory Structure

### Root Directory
Only essential files:
- `README.md` - Main project overview
- `docker-compose.yml` - Docker services
- `.gitignore` - Git ignore rules

### `/docs` - Documentation (18 files)
All project documentation:
- Setup guides (QUICKSTART, SETUP, START_HERE)
- Architecture documentation
- User guides
- Connection guides
- Status and completion summaries

### `/scripts` - Helper Scripts (5 files)
Development and deployment scripts:
- `start-all.sh` - Start all services
- `start-backend.sh` - Start backend only
- `start-frontend.sh` - Start frontend only
- `check-setup.sh` - Verify setup
- `start.sh` - Quick start

### `/backend` - Backend API
Node.js/Express server with organized structure:
- `src/routes/` - API endpoints
- `src/services/` - Business logic
- `src/parsers/` - Log parsers
- `src/validators/` - Validation schemas
- `src/utils/` - Utilities

### `/frontend` - Frontend Application
Next.js application:
- `src/app/` - Pages (App Router)
- `src/components/` - React components
- `src/lib/` - API client, WebSocket
- `src/utils/` - Utilities

### `/tools` - External Tools
- `ground-bridge/` - MAVLink bridge script

## 🎯 Benefits

1. **Professional Appearance** - Clean, organized structure
2. **Easy Navigation** - Logical file grouping
3. **Better Maintainability** - Clear separation of concerns
4. **Industry Standard** - Follows Node.js/Next.js best practices
5. **Scalability** - Easy to add new features

## 📖 Finding Documentation

- **Main README**: `README.md` (root)
- **All Documentation**: `docs/README.md` (index)
- **Project Structure**: `docs/PROJECT_STRUCTURE.md`
- **Quick Start**: `docs/QUICKSTART.md`
- **Connection Guide**: `docs/DRONE_CONNECTION_GUIDE.md`

## 🔧 Using Scripts

All scripts are in `scripts/` directory:
```bash
# Make executable (if needed)
chmod +x scripts/*.sh

# Run scripts
./scripts/start-all.sh
./scripts/check-setup.sh
```

## ✅ Organization Complete!

The project is now well-organized and ready for:
- ✅ Development
- ✅ Collaboration
- ✅ Production deployment
- ✅ Future enhancements

---

**Last Updated**: 2024-01-11
