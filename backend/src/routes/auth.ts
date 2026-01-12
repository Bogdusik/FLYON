import express from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticateUser } from '../middleware/auth';
import { registerUser, loginUser, getUserById, updateUser, deleteUser } from '../services/userService';

const router = express.Router();

/**
 * POST /api/v1/auth/register
 * Register a new user
 */
router.post('/register', asyncHandler(async (req, res) => {
  const { email, password, name } = req.body;
  const result = await registerUser({ email, password, name });
  res.status(201).json(result);
}));

/**
 * POST /api/v1/auth/login
 * Authenticate user and get token
 */
router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await loginUser({ email, password });
  res.json(result);
}));

/**
 * GET /api/v1/auth/me
 * Get current user profile
 */
router.get('/me', authenticateUser, asyncHandler(async (req, res) => {
  const userId = (req as any).user.id;
  const user = await getUserById(userId);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    created_at: user.created_at,
    last_login: user.last_login,
  });
}));

/**
 * PATCH /api/v1/auth/me
 * Update current user profile
 */
router.patch('/me', authenticateUser, asyncHandler(async (req, res) => {
  const userId = (req as any).user.id;
  const { name } = req.body;
  const user = await updateUser(userId, { name });
  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    created_at: user.created_at,
    updated_at: user.updated_at,
  });
}));

/**
 * DELETE /api/v1/auth/me
 * Delete user account (GDPR compliance)
 */
router.delete('/me', authenticateUser, asyncHandler(async (req, res) => {
  const userId = (req as any).user.id;
  await deleteUser(userId);
  res.status(204).send();
}));

export default router;
