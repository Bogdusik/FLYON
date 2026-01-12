import express from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticateUser } from '../middleware/auth';
import {
  createDangerZone,
  getDangerZones,
  getDangerZoneById,
  updateDangerZone,
  deleteDangerZone,
} from '../services/dangerZoneService';

const router = express.Router();

/**
 * GET /api/v1/danger-zones
 * Get all accessible danger zones (user's + public)
 */
router.get('/', authenticateUser, asyncHandler(async (req, res) => {
  const userId = (req as any).user.id;
  const zones = await getDangerZones(userId);
  res.json(zones);
}));

/**
 * POST /api/v1/danger-zones
 * Create a new danger zone
 */
router.post('/', authenticateUser, asyncHandler(async (req, res) => {
  const userId = (req as any).user.id;
  const { name, description, zone_type, coordinates, altitude_limit_meters, is_public, metadata } = req.body;
  
  const zone = await createDangerZone(userId, {
    name,
    description,
    zone_type: zone_type || 'user',
    coordinates,
    altitude_limit_meters,
    is_public,
    metadata,
  });
  
  res.status(201).json(zone);
}));

/**
 * GET /api/v1/danger-zones/:id
 * Get danger zone by ID
 */
router.get('/:id', authenticateUser, asyncHandler(async (req, res) => {
  const userId = (req as any).user.id;
  const zone = await getDangerZoneById(req.params.id, userId);
  if (!zone) {
    res.status(404).json({ error: 'Danger zone not found' });
    return;
  }
  res.json(zone);
}));

/**
 * PATCH /api/v1/danger-zones/:id
 * Update danger zone
 */
router.patch('/:id', authenticateUser, asyncHandler(async (req, res) => {
  const userId = (req as any).user.id;
  const { name, description, coordinates, altitude_limit_meters, is_active, metadata } = req.body;
  
  const zone = await updateDangerZone(req.params.id, userId, {
    name,
    description,
    coordinates,
    altitude_limit_meters,
    is_active,
    metadata,
  });
  
  res.json(zone);
}));

/**
 * DELETE /api/v1/danger-zones/:id
 * Delete danger zone
 */
router.delete('/:id', authenticateUser, asyncHandler(async (req, res) => {
  const userId = (req as any).user.id;
  await deleteDangerZone(req.params.id, userId);
  res.status(204).send();
}));

export default router;
