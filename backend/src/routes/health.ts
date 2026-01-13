import express from 'express';
import { testConnection } from '../config/database';
import { getRedisClient } from '../config/redis';
import { pool } from '../config/database';
import logger from '../utils/logger';

const router = express.Router();

/**
 * GET /health
 * Health check endpoint
 */
router.get('/', async (req, res) => {
  const health: any = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {},
  };

  // Check database
  try {
    await testConnection();
    const poolStats = pool.totalCount > 0 ? {
      total: pool.totalCount,
      idle: pool.idleCount,
      waiting: pool.waitingCount,
    } : null;
    
    health.services.database = {
      status: 'healthy',
      ...(poolStats ? { pool: poolStats } : {}),
    };
  } catch (error: any) {
    health.status = 'degraded';
    health.services.database = {
      status: 'unhealthy',
      error: error.message,
    };
  }

  // Check Redis (optional)
  const redis = getRedisClient();
  if (redis) {
    try {
      await redis.ping();
      health.services.redis = {
        status: 'healthy',
      };
    } catch (error: any) {
      health.status = 'degraded';
      health.services.redis = {
        status: 'unhealthy',
        error: error.message,
      };
    }
  }

  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});

/**
 * GET /health/ready
 * Readiness check (for Kubernetes)
 */
router.get('/ready', async (req, res) => {
  try {
    await testConnection();
    res.status(200).json({ status: 'ready' });
  } catch (error: any) {
    logger.error('Readiness check failed', { error: error.message });
    res.status(503).json({ status: 'not ready', error: error.message });
  }
});

/**
 * GET /health/live
 * Liveness check (for Kubernetes)
 */
router.get('/live', (req, res) => {
  res.status(200).json({ status: 'alive' });
});

export default router;
