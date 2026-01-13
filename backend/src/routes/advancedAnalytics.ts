import express from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticateUser } from '../middleware/auth';
import {
  compareFlights,
  calculateAdvancedMetrics,
  getFlightTrends,
} from '../services/advancedAnalyticsService';

const router = express.Router();

/**
 * POST /api/v1/analytics/flights/compare
 * Compare two flights
 */
router.post('/flights/compare', authenticateUser, asyncHandler(async (req, res) => {
  const userId = (req as any).user.id;
  const { flight1_id, flight2_id } = req.body;

  if (!flight1_id || !flight2_id) {
    res.status(400).json({ error: 'Both flight IDs are required' });
    return;
  }

  const comparison = await compareFlights(flight1_id, flight2_id, userId);
  res.json(comparison);
}));

/**
 * GET /api/v1/analytics/flights/:id/advanced
 * Get advanced metrics for a flight
 */
router.get('/flights/:id/advanced', authenticateUser, asyncHandler(async (req, res) => {
  const userId = (req as any).user.id;
  const flightId = req.params.id;

  const metrics = await calculateAdvancedMetrics(flightId, userId);
  res.json(metrics);
}));

/**
 * GET /api/v1/analytics/trends
 * Get flight trends over time
 */
router.get('/trends', authenticateUser, asyncHandler(async (req, res) => {
  const userId = (req as any).user.id;
  const months = parseInt(req.query.months as string) || 6;

  const trends = await getFlightTrends(userId, months);
  res.json(trends);
}));

export default router;
