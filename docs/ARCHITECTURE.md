# FLYON Architecture Documentation

## System Overview

FLYON is a decision-support and analytics system for drone owners. It **NEVER controls the drone directly** - it only provides warnings, insights, and analysis.

## Core Principles

1. **Safety Assistant, Not Autopilot**: FLYON provides warnings and insights only
2. **Privacy-First**: User owns all data, GDPR-compliant
3. **Drone-Agnostic**: Works with any drone via telemetry input
4. **Production-Ready**: Clean architecture, scalable design

## Architecture Layers

### Frontend (Next.js)
- **Framework**: Next.js 14+ with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Maps**: React Leaflet (OpenStreetMap)
- **Real-time**: WebSocket client for live updates
- **State**: React hooks and context

### Backend (Node.js/Express)
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with PostGIS extension
- **Real-time**: WebSocket server (ws library)
- **Authentication**: JWT (user tokens + device tokens)
- **Validation**: Zod schemas

### Database (PostgreSQL + PostGIS)
- **Users**: Authentication and profiles
- **Drones**: Device registration and management
- **Flights**: Flight sessions and metadata
- **Telemetry**: Individual telemetry points (geospatial)
- **Danger Zones**: User-defined and community no-fly zones (polygons)
- **Zone Violations**: Tracking of danger zone entries
- **Analytics**: Pre-computed flight analytics

## Data Flow

### Telemetry Ingestion

1. **Device Authentication**
   - Drone uses device token (JWT) for authentication
   - Token is generated when drone is registered

2. **Telemetry Input**
   - Single point: `POST /api/v1/telemetry` (live)
   - Batch upload: `POST /api/v1/telemetry/batch` (logs)

3. **Processing Pipeline**
   - Validate telemetry data
   - Create/update flight session
   - Insert telemetry point with PostGIS geometry
   - Update flight statistics (async)
   - Check danger zones (async)
   - Broadcast via WebSocket (if subscribers)

### Real-time Updates

1. **WebSocket Connection**
   - Client connects with user JWT token
   - Subscribe to specific flight sessions
   - Receive telemetry updates in real-time

2. **Broadcasting**
   - Telemetry ingestion triggers broadcast
   - Danger zone violations trigger warnings
   - Flight status changes trigger updates

### Analytics Engine

1. **Flight Health Score**
   - Calculated post-flight or on-demand
   - Components: Safety, Smoothness, Battery Efficiency, Risk Exposure
   - Weighted average for overall score

2. **Risk Analysis**
   - Zone violations tracked in real-time
   - Low battery warnings
   - High altitude/speed detection
   - Timeline of risk events

## Security

- **JWT Authentication**: User tokens (7 days) and device tokens (365 days)
- **Password Hashing**: bcrypt with salt rounds
- **CORS**: Configured for frontend origin
- **Input Validation**: Zod schemas and express-validator
- **SQL Injection**: Parameterized queries only

## Scalability Considerations

- **Database Indexing**: Spatial indexes on PostGIS geometries
- **Connection Pooling**: PostgreSQL connection pool
- **Async Processing**: Non-blocking telemetry processing
- **WebSocket Scaling**: Can be horizontally scaled with Redis pub/sub

## Telemetry Format

Minimum required fields:
```json
{
  "droneId": "uuid",
  "timestamp": "ISO 8601",
  "latitude": 51.505,
  "longitude": -0.09,
  "altitude": 100.5,
  "speed": 15.2,
  "heading": 45.0,
  "battery": 85.5,
  "flightMode": "MANUAL",
  "armed": true
}
```

## API Design

- RESTful API with consistent error handling
- Versioned endpoints (`/api/v1/`)
- JSON request/response format
- Standard HTTP status codes
- Error messages in consistent format

## Database Schema Highlights

- **PostGIS Geometry Types**:
  - `POINT` for telemetry positions
  - `LINESTRING` for flight paths
  - `POLYGON` for danger zones

- **Spatial Indexes**: GIST indexes on all geometry columns
- **Cascade Deletes**: User deletion cascades to all related data
- **Timestamps**: Automatic `updated_at` triggers

## Future Enhancements

- Log file parsing (Blackbox, iNav, ArduPilot)
- Companion computer SDK
- Mobile app (React Native)
- Community danger zone sharing
- Advanced analytics and ML insights
- Integration with aviation authorities (optional)
