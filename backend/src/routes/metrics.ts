import express from 'express';
import { getMetrics } from '../middleware/monitoring';
import { getDatabaseStats } from '../utils/databaseOptimizer';
import { pool } from '../config/database';
import { getRedisClient } from '../config/redis';
import { authenticateUser } from '../middleware/auth';

const router = express.Router();

/**
 * GET /metrics
 * Get detailed performance metrics (requires authentication)
 */
router.get('/', authenticateUser, async (req, res) => {
  const apiMetrics = getMetrics();
  const dbStats = await getDatabaseStats();
  const redis = getRedisClient();

  const metrics = {
    ...apiMetrics,
    database: {
      pool: {
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount,
      },
      tables: dbStats,
    },
    ...(redis ? {
      redis: {
        status: redis.status,
      },
    } : {}),
    system: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
    },
  };

  res.json(metrics);
});

export default router;
