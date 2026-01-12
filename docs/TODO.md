# FLYON - TODO List

## 🎯 Priority Tasks

### 1. Flight Log Parsing ⚠️ HIGH PRIORITY

#### Blackbox (Betaflight/iNav)
- [ ] Create `backend/src/parsers/blackboxParser.ts`
- [ ] Integrate library for reading `.bbl` files
- [ ] Convert to FLYON format
- [ ] API endpoint: `POST /api/v1/flights/upload-log`
- [ ] UI for file upload (drag & drop)

#### ArduPilot
- [ ] Create `backend/src/parsers/ardupilotParser.ts`
- [ ] Parse ArduPilot `.bin` files
- [ ] Convert to FLYON format
- [ ] Integrate with upload endpoint

#### DJI
- [ ] Create `backend/src/parsers/djiParser.ts`
- [ ] Parse DJI `.txt` or `.csv` logs
- [ ] Convert to FLYON format

### 2. Ground Bridge Application ⚠️ MEDIUM PRIORITY

- [ ] Create `tools/ground-bridge/` directory
- [ ] Python script for MAVLink → FLYON
- [ ] Node.js alternative
- [ ] Installation and setup documentation
- [ ] USB/UART connection support
- [ ] Automatic reconnection

### 3. UI/UX Improvements ⚠️ MEDIUM PRIORITY

#### Map and Visualization
- [ ] Improve `LiveMap` component
- [ ] Real-time drone position updates
- [ ] Display danger zones on map
- [ ] Flight animation on replay

#### Telemetry Graphs
- [ ] Component for graphs (altitude, speed, battery)
- [ ] Use Recharts or Chart.js
- [ ] Timeline for flight navigation
- [ ] Zoom and pan functionality

#### Notifications
- [ ] Notification system for danger zone violations
- [ ] Browser notifications API
- [ ] Audio warnings (optional)

#### Data Export
- [ ] Export flights to KML format
- [ ] Export to GPX format
- [ ] Export graphs as images

### 4. Backend Improvements ⚠️ MEDIUM PRIORITY

- [ ] Telemetry validation (Zod schemas)
- [ ] Rate limiting for API endpoints
- [ ] Logging (Winston or Pino)
- [ ] Monitoring and metrics
- [ ] Error handling (error boundaries)

### 5. Testing ⚠️ MEDIUM PRIORITY

- [ ] Unit tests for services
- [ ] Integration tests for API
- [ ] E2E tests for critical paths
- [ ] Tests for log parsers

### 6. Documentation ⚠️ LOW PRIORITY

- [ ] API documentation (Swagger/OpenAPI)
- [ ] Deployment guide
- [ ] Integration examples
- [ ] Video tutorials

### 7. Companion Computer SDK ⚠️ LOW PRIORITY (Future)

- [ ] Python SDK for Raspberry Pi
- [ ] Automatic telemetry transmission
- [ ] Offline buffering
- [ ] Retry logic
- [ ] Examples for different platforms

### 8. Mobile Application ⚠️ LOW PRIORITY (Optional)

- [ ] React Native application
- [ ] Push notifications
- [ ] Offline mode
- [ ] Simplified UI for mobile

---

## 🐛 Known Issues

- [ ] WebSocket reconnection on connection loss
- [ ] Database query optimization (batch inserts)
- [ ] Danger zone caching for fast checking

---

## 💡 Future Ideas

- [ ] Community danger zones (shared danger zones)
- [ ] Integration with aviation authorities (optional)
- [ ] ML models for problem prediction
- [ ] Social features (share flights)
- [ ] Weather API integration
- [ ] Automatic flight reports

---

## 📊 Project Status

**Current Progress: ~95%** 🎉

- ✅ Core Functionality: 100%
- ✅ UI/UX: 95%
- ✅ Log Parsing: 100% (CSV, JSON - ready for Blackbox/ArduPilot)
- ✅ Ground Bridge: 100%
- ✅ Export (KML/GPX): 100%
- ✅ Notifications: 100%
- ✅ Logging: 100%
- ✅ Validation: 100%
- ⚠️ Companion SDK: 0% (Optional - future enhancement)
- ⚠️ Mobile Application: 0% (Optional - future enhancement)

---

## 🚀 Quick Start for Developers

1. **Log Parsing** - Start with Blackbox, as it's the most popular format
2. **Ground Bridge** - Create a simple Python script for testing
3. **UI Improvements** - Add graphs and improve the map

---

**Last Updated:** 2024-01-11
