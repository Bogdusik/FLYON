import express from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticateUser } from '../middleware/auth';
import {
  createFlightShare,
  getFlightByShareToken,
  getUserSharedFlights,
  deleteFlightShare,
  checkAchievements,
  getUserAchievements,
  updatePublicProfile,
} from '../services/sharingService';
import { query } from '../config/database';

const router = express.Router();

/**
 * POST /api/v1/flights/:id/share
 * Create shareable link for flight
 */
router.post('/:id/share', authenticateUser, asyncHandler(async (req, res) => {
  const userId = (req as any).user.id;
  const flightId = req.params.id;
  const { is_public = true, expires_in_days } = req.body;

  const share = await createFlightShare(flightId, userId, is_public, expires_in_days);
  res.json(share);
}));

/**
 * GET /api/v1/shared/flights/:token
 * Get flight by share token (public, no auth required)
 */
router.get('/shared/flights/:token', asyncHandler(async (req, res) => {
  const shareToken = req.params.token;
  const flight = await getFlightByShareToken(shareToken);

  if (!flight) {
    res.status(404).json({ error: 'Shared flight not found or expired' });
    return;
  }

  res.json(flight);
}));

/**
 * GET /api/v1/sharing/flights
 * Get user's shared flights
 */
router.get('/flights', authenticateUser, asyncHandler(async (req, res) => {
  const userId = (req as any).user.id;
  const shared = await getUserSharedFlights(userId);
  res.json(shared);
}));

/**
 * DELETE /api/v1/sharing/flights/:token
 * Delete flight share
 */
router.delete('/flights/:token', authenticateUser, asyncHandler(async (req, res) => {
  const userId = (req as any).user.id;
  const shareToken = req.params.token;
  await deleteFlightShare(shareToken, userId);
  res.status(204).send();
}));

/**
 * GET /api/v1/achievements
 * Get user achievements
 */
router.get('/achievements', authenticateUser, asyncHandler(async (req, res) => {
  const userId = (req as any).user.id;
  const achievements = await getUserAchievements(userId);
  res.json(achievements);
}));

/**
 * POST /api/v1/achievements/check
 * Check and unlock new achievements
 */
router.post('/achievements/check', authenticateUser, asyncHandler(async (req, res) => {
  const userId = (req as any).user.id;
  const newAchievements = await checkAchievements(userId);
  res.json({ new_achievements: newAchievements });
}));

/**
 * PATCH /api/v1/profile/public
 * Update public profile settings
 */
router.patch('/profile/public', authenticateUser, asyncHandler(async (req, res) => {
  const userId = (req as any).user.id;
  const { is_public, profile_bio, profile_avatar_url } = req.body;

  await updatePublicProfile(userId, {
    is_public,
    profile_bio,
    profile_avatar_url,
  });

  res.json({ message: 'Profile updated' });
}));

/**
 * GET /api/v1/users/:id/public
 * Get public user profile
 */
router.get('/users/:id/public', asyncHandler(async (req, res) => {
  const userId = req.params.id;

  const result = await query(
    `SELECT id, name, profile_bio, profile_avatar_url, 
            total_flights_public, total_hours_public, created_at
     FROM users
     WHERE id = $1 AND is_public_profile = true`,
    [userId]
  );

  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Public profile not found' });
    return;
  }

  res.json(result.rows[0]);
}));

export default router;
