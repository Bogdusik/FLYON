import express from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticateUser } from '../middleware/auth';
import {
  checkAchievements,
  getUserAchievements,
} from '../services/sharingService';

const router = express.Router();

/**
 * GET /api/v1/achievements
 * Get user achievements
 */
router.get('/', authenticateUser, asyncHandler(async (req, res) => {
  const userId = (req as any).user.id;
  const achievements = await getUserAchievements(userId);
  res.json(achievements);
}));

/**
 * POST /api/v1/achievements/check
 * Check and unlock new achievements
 */
router.post('/check', authenticateUser, asyncHandler(async (req, res) => {
  const userId = (req as any).user.id;
  const newAchievements = await checkAchievements(userId);
  res.json({ new_achievements: newAchievements });
}));

export default router;
