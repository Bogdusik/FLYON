import express from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticateUser } from '../middleware/auth';
import {
  createDrone,
  getUserDrones,
  getDroneById,
  updateDrone,
  regenerateDeviceToken,
  deleteDrone,
} from '../services/droneService';

const router = express.Router();

// All routes require authentication
router.use(authenticateUser);

/**
 * GET /api/v1/drones
 * Get all drones for current user
 */
router.get('/', asyncHandler(async (req, res) => {
  const userId = (req as any).user.id;
  const drones = await getUserDrones(userId);
  res.json(drones);
}));

/**
 * POST /api/v1/drones
 * Create a new drone
 */
router.post('/', asyncHandler(async (req, res) => {
  const userId = (req as any).user.id;
  const { name, model, manufacturer, firmware_version, metadata } = req.body;
  const drone = await createDrone(userId, {
    name,
    model,
    manufacturer,
    firmware_version,
    metadata,
  });
  res.status(201).json(drone);
}));

/**
 * GET /api/v1/drones/:id
 * Get drone by ID
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const userId = (req as any).user.id;
  const drone = await getDroneById(req.params.id, userId);
  if (!drone) {
    res.status(404).json({ error: 'Drone not found' });
    return;
  }
  res.json(drone);
}));

/**
 * PATCH /api/v1/drones/:id
 * Update drone
 */
router.patch('/:id', asyncHandler(async (req, res) => {
  const userId = (req as any).user.id;
  const { name, model, manufacturer, firmware_version, metadata } = req.body;
  const drone = await updateDrone(req.params.id, userId, {
    name,
    model,
    manufacturer,
    firmware_version,
    metadata,
  });
  res.json(drone);
}));

/**
 * POST /api/v1/drones/:id/regenerate-token
 * Regenerate device token for drone
 */
router.post('/:id/regenerate-token', asyncHandler(async (req, res) => {
  const userId = (req as any).user.id;
  const token = await regenerateDeviceToken(req.params.id, userId);
  res.json({ device_token: token });
}));

/**
 * DELETE /api/v1/drones/:id
 * Delete (deactivate) drone
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  const userId = (req as any).user.id;
  await deleteDrone(req.params.id, userId);
  res.status(204).send();
}));

export default router;
