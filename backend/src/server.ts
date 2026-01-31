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
app.use(`${API_PREFIX}/shared`, sharingRoutes); // Public shared routes (before auth)
app.use(`${API_PREFIX}/users`, sharingRoutes); // Public user profiles
app.use(`${API_PREFIX}/drones`, betaflightRoutes); // Betaflight routes (more specific, before general drones)
app.use(`${API_PREFIX}/drones`, droneRoutes);
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
