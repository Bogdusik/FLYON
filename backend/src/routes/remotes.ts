import express from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticateUser } from '../middleware/auth';
import {
  getRemotesByUserId,
  getRemoteById,
  createRemote,
  updateRemoteStatus,
  updateRemoteMetadata,
  deleteRemote,
} from '../services/remoteService';

const router = express.Router();

/**
 * GET /api/v1/remotes
 * Get all remotes for current user
 */
router.get('/', authenticateUser, asyncHandler(async (req, res) => {
  const userId = (req as any).user.id;
  const remotes = await getRemotesByUserId(userId);
  res.json(remotes);
}));

/**
 * GET /api/v1/remotes/:id
 * Get remote by ID
 */
router.get('/:id', authenticateUser, asyncHandler(async (req, res) => {
  const userId = (req as any).user.id;
  const remoteId = req.params.id;
  const remote = await getRemoteById(remoteId, userId);
  if (!remote) {
    res.status(404).json({ error: 'Remote not found' });
    return;
  }
  res.json(remote);
}));

/**
 * POST /api/v1/remotes/radiomaster/connect
 * Connect RadioMaster Pocket transmitter
 */
router.post('/radiomaster/connect', authenticateUser, asyncHandler(async (req, res) => {
  const userId = (req as any).user.id;
  const { name, model } = req.body;

  const remote = await createRemote(userId, {
    type: 'radiomaster',
    name: name || 'RadioMaster Pocket',
    model: model || 'Pocket',
    metadata: {},
  });

  // Update status to connecting (bridge app will update to connected)
  await updateRemoteStatus(remote.id, userId, 'connecting');

  res.status(201).json(remote);
}));

/**
 * POST /api/v1/remotes/:id/disconnect
 * Disconnect remote
 */
router.post('/:id/disconnect', authenticateUser, asyncHandler(async (req, res) => {
  const userId = (req as any).user.id;
  const remoteId = req.params.id;
  await updateRemoteStatus(remoteId, userId, 'disconnected');
  res.json({ message: 'Remote disconnected' });
}));

/**
 * PATCH /api/v1/remotes/:id/status
 * Update remote status (used by bridge apps)
 */
router.patch('/:id/status', authenticateUser, asyncHandler(async (req, res) => {
  const userId = (req as any).user.id;
  const remoteId = req.params.id;
  const { status } = req.body;

  if (!['connected', 'disconnected', 'connecting'].includes(status)) {
    res.status(400).json({ error: 'Invalid status' });
    return;
  }

  const remote = await updateRemoteStatus(remoteId, userId, status);
  res.json(remote);
}));

/**
 * PATCH /api/v1/remotes/:id/metadata
 * Update remote metadata (used by bridge apps to send remote data)
 */
router.patch('/:id/metadata', authenticateUser, asyncHandler(async (req, res) => {
  const userId = (req as any).user.id;
  const remoteId = req.params.id;
  const { metadata } = req.body;

  const remote = await updateRemoteMetadata(remoteId, userId, metadata);
  res.json(remote);
}));

/**
 * DELETE /api/v1/remotes/:id
 * Delete remote
 */
router.delete('/:id', authenticateUser, asyncHandler(async (req, res) => {
  const userId = (req as any).user.id;
  const remoteId = req.params.id;
  await deleteRemote(remoteId, userId);
  res.status(204).send();
}));

export default router;
