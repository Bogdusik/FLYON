import express from 'express';
import cors from 'cors';
import compression from 'compression';
import dotenv from 'dotenv';
import { testConnection } from './config/database';
import { errorHandler } from './middleware/errorHandler';
import { wsServer } from './websocket';
import logger from './utils/logger';
import authRoutes from './routes/auth';
import droneRoutes from './routes/drones';
import flightRoutes from './routes/flights';
import telemetryRoutes from './routes/telemetry';
import dangerZoneRoutes from './routes/dangerZones';
import analyticsRoutes from './routes/analytics';
import exportRoutes from './routes/export';
import { autoCompleteInactiveFlights } from './services/flightAutoComplete';
import { apiLimiter, authLimiter, uploadLimiter, telemetryLimiter } from './middleware/rateLimit';
import { securityHeaders, sanitizeInput, securityMiddleware } from './middleware/security';
import { setupSwagger } from './config/swagger';
import { monitoringMiddleware, getMetrics } from './middleware/monitoring';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const API_PREFIX = process.env.API_PREFIX || '/api/v1';

// Security middleware (must be first)
app.use(securityHeaders);
app.use(securityMiddleware);
app.use(sanitizeInput);

// Compression middleware (reduce response size)
app.use(compression());

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Monitoring middleware (track performance)
app.use(monitoringMiddleware);

// Rate limiting (apply to all API routes)
app.use(`${API_PREFIX}`, apiLimiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

// Metrics endpoint (for monitoring)
app.get('/metrics', (req, res) => {
  const metrics = getMetrics();
  res.json({
    ...metrics,
    system: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
    },
  });
});

// Swagger API documentation
setupSwagger(app);

// API routes with rate limiting
app.use(`${API_PREFIX}/auth`, authLimiter, authRoutes);
app.use(`${API_PREFIX}/drones`, droneRoutes);
app.use(`${API_PREFIX}/flights`, flightRoutes);
app.use(`${API_PREFIX}/telemetry`, telemetryLimiter, telemetryRoutes);
app.use(`${API_PREFIX}/danger-zones`, dangerZoneRoutes);
app.use(`${API_PREFIX}/analytics`, analyticsRoutes);
app.use(`${API_PREFIX}/export`, uploadLimiter, exportRoutes);

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
      logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      
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
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
