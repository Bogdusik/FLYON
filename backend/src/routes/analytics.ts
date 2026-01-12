import express from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticateUser } from '../middleware/auth';
import { calculateHealthScore, generateRiskEvents } from '../services/analyticsService';
import { getUserAnalytics, getDroneAnalytics } from '../services/analyticsService';

const router = express.Router();

// All routes require authentication
router.use(authenticateUser);

/**
 * GET /api/v1/analytics/user
 * Get comprehensive analytics for current user
 */
router.get('/user', asyncHandler(async (req, res) => {
  const userId = (req as any).user.id;
  const analytics = await getUserAnalytics(userId);
  res.json(analytics);
}));

/**
 * GET /api/v1/analytics/drones/:id
 * Get analytics for specific drone
 */
router.get('/drones/:id', asyncHandler(async (req, res) => {
  const userId = (req as any).user.id;
  const droneId = req.params.id;
  const analytics = await getDroneAnalytics(droneId, userId);
  
  if (!analytics) {
    res.status(404).json({ error: 'Drone not found' });
    return;
  }
  
  res.json(analytics);
}));

/**
 * POST /api/v1/analytics/flights/:id/health-score
 * Calculate and return Flight Health Score
 */
router.post('/flights/:id/health-score', asyncHandler(async (req, res) => {
  const userId = (req as any).user.id;
  const healthScore = await calculateHealthScore(req.params.id, userId);
  res.json(healthScore);
}));

/**
 * POST /api/v1/analytics/flights/:id/risk-events
 * Generate risk events timeline for a flight
 */
router.post('/flights/:id/risk-events', asyncHandler(async (req, res) => {
  const userId = (req as any).user.id;
  const events = await generateRiskEvents(req.params.id, userId);
  res.json(events);
}));

export default router;
