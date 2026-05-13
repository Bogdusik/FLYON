import express from 'express';
import cors from 'cors';
import compression from 'compression';
import { testConnection } from './config/database';
import { errorHandler } from './middleware/errorHandler';
import { wsServer } from './websocket';
import logger from './utils/logger';
import env from './config/env';
import authRoutes from './routes/auth';
import droneRoutes from './routes/drones';
import flightRoutes from './routes/flights';
import telemetryRoutes from './routes/telemetry';
import dangerZoneRoutes from './routes/dangerZones';
import analyticsRoutes from './routes/analytics';
import exportRoutes from './routes/export';
import remoteRoutes from './routes/remotes';
import betaflightRoutes from './routes/betaflight';
import sharingRoutes from './routes/sharing';
import achievementsRoutes from './routes/achievements';
import advancedAnalyticsRoutes from './routes/advancedAnalytics';
import weatherRoutes from './routes/weather';
import healthRoutes from './routes/health';
import metricsRoutes from './routes/metrics';
import { autoCompleteInactiveFlights } from './services/flightAutoComplete';
import { apiLimiter, authLimiter, uploadLimiter, telemetryLimiter } from './middleware/rateLimit';
import { securityHeaders, sanitizeInput, securityMiddleware } from './middleware/security';
import { setupSwagger } from './config/swagger';
import { monitoringMiddleware, getMetrics } from './middleware/monitoring';
import { correlationIdMiddleware } from './middleware/correlationId';
import { getRedisClient } from './config/redis';

const app = express();
app.disable('x-powered-by');
const PORT = env.port;
const API_PREFIX = env.apiPrefix;

// Initialize Redis connection (optional)
if (env.redis) {
  getRedisClient()?.connect().catch((error) => {
    logger.warn('Redis connection failed, continuing without cache', { error: error.message });
  });
}

// Correlation ID middleware (must be first for tracing)
app.use(correlationIdMiddleware);

// Security middleware (must be first)
app.use(securityHeaders);
app.use(securityMiddleware);
app.use(sanitizeInput);

// Compression middleware (reduce response size)
app.use(compression());

// CORS
app.use(cors({
  origin: env.corsOrigin,
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Monitoring middleware (track performance)
app.use(monitoringMiddleware);

// Rate limiting (apply to all API routes)
app.use(`${API_PREFIX}`, apiLimiter);

// Health check routes
app.use('/health', healthRoutes);

// Metrics endpoint (for monitoring) - requires authentication
app.use('/metrics', metricsRoutes);

// Swagger API documentation
setupSwagger(app);

// API routes with rate limiting
// Note: More specific routes should be registered first
app.use(`${API_PREFIX}/auth`, authLimiter, authRoutes);
app.use(`${API_PREFIX}/drones`, betaflightRoutes); // Betaflight routes (more specific, before general drones)
app.use(`${API_PREFIX}/drones`, droneRoutes);
app.use(`${API_PREFIX}/flights`, sharingRoutes); // POST /flights/:id/share (must be before flightRoutes)
app.use(`${API_PREFIX}/flights`, betaflightRoutes); // Betaflight routes (more specific, before general flights)
app.use(`${API_PREFIX}/flights`, flightRoutes);
app.use(`${API_PREFIX}/telemetry`, telemetryLimiter, telemetryRoutes);
app.use(`${API_PREFIX}/danger-zones`, dangerZoneRoutes);
app.use(`${API_PREFIX}/analytics`, analyticsRoutes, advancedAnalyticsRoutes);
app.use(`${API_PREFIX}/export`, uploadLimiter, exportRoutes);
app.use(`${API_PREFIX}/remotes`, remoteRoutes);
app.use(`${API_PREFIX}/sharing`, sharingRoutes);
app.use(`${API_PREFIX}/achievements`, achievementsRoutes);
app.use(`${API_PREFIX}/weather`, weatherRoutes);
// Public sharing routes: GET /shared/flights/:token, GET /users/:id/public, PATCH /profile/public
// Must come after specific route mounts to avoid conflicts
app.use(API_PREFIX, sharingRoutes);

// LLM-friendly API documentation
app.get('/llms.txt', (req, res) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.send(`# FLYON API Documentation

Base URL: ${API_PREFIX}

## Authentication
- POST /auth/register — Register a new user. Body: { email, password, name? }
- POST /auth/login — Login. Body: { email, password }. Returns JWT token.
- GET /auth/me — Get current user profile. Requires Bearer token.
- PATCH /auth/me — Update profile. Body: { name?, phone?, avatar_url? }. Requires Bearer token.
- DELETE /auth/me — Delete account (GDPR). Requires Bearer token.

## Drones
- GET /drones — List user's drones.
- POST /drones — Create drone. Body: { name, model?, manufacturer?, firmware_version?, metadata? }
- GET /drones/:id — Get drone by ID.
- PATCH /drones/:id — Update drone.
- POST /drones/:id/regenerate-token — Regenerate device token.
- DELETE /drones/:id — Delete drone (cascades flights/telemetry).

## Flights
- GET /flights — List flights. Query: drone_id?, status?, limit?, offset?
- POST /flights — Create flight. Body: { drone_id, session_id?, started_at? }
- GET /flights/:id — Get flight by ID.
- PATCH /flights/:id — Update flight. Body: { ended_at?, status? }
- DELETE /flights/:id — Delete flight.
- DELETE /flights — Delete all user flights.
- GET /flights/:id/telemetry — Get telemetry points. Query: limit?, offset?, start_time?, end_time?
- GET /flights/:id/replay — Get replay data. Query: speed? (1x/2x/4x/8x)
- POST /flights/:id/recalculate-stats — Recalculate flight statistics.
- POST /flights/upload-log — Upload log file (CSV/JSON). Multipart: file, drone_id, session_id?
- POST /flights/:id/share — Create shareable link. Body: { is_public?, expires_in_days? }
- POST /flights/:id/blackbox — Upload blackbox log.
- GET /flights/:id/blackbox/analysis — Get blackbox analysis.

## Telemetry (Device Auth)
- POST /telemetry — Ingest single telemetry point. Requires device Bearer token.
- POST /telemetry/batch — Batch ingest. Body: { session_id, points[] }

## Danger Zones
- GET /danger-zones — List danger zones (user + public).
- POST /danger-zones — Create zone. Body: { name, zone_type, coordinates[], description?, altitude_limit_meters?, is_public? }
- GET /danger-zones/:id — Get zone by ID.
- PATCH /danger-zones/:id — Update zone.
- DELETE /danger-zones/:id — Soft-delete zone.

## Analytics
- POST /analytics/flights/:id/health-score — Calculate flight health score.
- POST /analytics/flights/:id/risk-events — Generate risk events.
- POST /analytics/flights/compare — Compare two flights. Body: { flight1_id, flight2_id }
- GET /analytics/flights/:id/advanced — Get advanced metrics.
- GET /analytics/trends — Get trends. Query: months?

## Export (GDPR)
- GET /export/data — Export all user data as JSON.
- GET /export/flights/:id/kml — Export flight as KML.
- GET /export/flights/:id/gpx — Export flight as GPX.

## Sharing (Public)
- GET /shared/flights/:token — Get shared flight by token (no auth).
- GET /users/:id/public — Get public user profile (no auth).

## Sharing (Authenticated)
- GET /sharing/flights — List user's shared flights.
- DELETE /sharing/flights/:token — Delete share link.
- PATCH /profile/public — Update public profile settings.

## Achievements
- GET /achievements — List user achievements.
- POST /achievements/check — Check and unlock new achievements.

## Betaflight
- POST /drones/:id/betaflight/config — Upload config file.
- GET /drones/:id/betaflight/config — Get latest config.
- GET /drones/:id/betaflight/config/history — Config history.
- POST /drones/:id/betaflight/config/compare — Compare configs. Body: { config1_id, config2_id }
- GET /drones/:id/betaflight/recommendations — PID recommendations.

## Remotes
- GET /remotes — List user's remotes.
- POST /remotes/radiomaster/connect — Connect RadioMaster.
- GET /remotes/:id — Get remote by ID.
- POST /remotes/:id/disconnect — Disconnect remote.
- PATCH /remotes/:id/status — Update status. Body: { status }
- PATCH /remotes/:id/metadata — Update metadata.
- DELETE /remotes/:id — Delete remote.

## Weather
- GET /weather — Get weather. Query: lat, lon, timestamp?

## Health
- GET /health — Health check (DB + Redis).
- GET /health/ready — Readiness probe.
- GET /health/live — Liveness probe.

## Notes
- All endpoints except /auth/register, /auth/login, /shared/*, /users/*/public require Authorization: Bearer <token>
- Telemetry endpoints require a device token (generated per-drone)
- Rate limits: 100 req/15min general, 5 req/15min auth, 10 uploads/hour, 1000 telemetry/min
`);
});

// Error handler
app.use(errorHandler);

// Start server
async function start() {
  try {
    // Test database connection
    await testConnection();

    app.listen(PORT, () => {
      logger.info(`🚀 FLYON API server running on port ${PORT}`);
      logger.info(`📡 API prefix: ${API_PREFIX}`);
      logger.info(`🌍 Environment: ${env.nodeEnv}`);
      
      // Auto-complete inactive flights every 5 minutes
      setInterval(async () => {
        try {
          const completed = await autoCompleteInactiveFlights();
          if (completed > 0) {
            logger.info(`✅ Auto-completed ${completed} inactive flight(s)`);
          }
        } catch (error) {
          logger.error('Error auto-completing flights:', error);
        }
      }, 5 * 60 * 1000); // Every 5 minutes
      
      // Run once on startup
      autoCompleteInactiveFlights()
        .then(count => {
          if (count > 0) {
            logger.info(`✅ Auto-completed ${count} inactive flight(s) on startup`);
          }
        })
        .catch(error => logger.error('Error auto-completing flights on startup:', error));
    });
  } catch (error) {
    logger.error('Failed to start server', { error: error.message, stack: error.stack });
    process.exit(1);
  }
}

start();
