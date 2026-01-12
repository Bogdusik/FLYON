import express from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticateDevice } from '../middleware/auth';
import { ingestTelemetry, batchIngestTelemetry } from '../services/telemetryService';
import { TelemetryInput } from '../types/database';

const router = express.Router();

/**
 * POST /api/v1/telemetry
 * Ingest single telemetry point (live telemetry)
 * Requires device token authentication
 */
router.post('/', authenticateDevice, asyncHandler(async (req, res) => {
  const { droneId, userId } = (req as any).device;
  const input: TelemetryInput = req.body;

  await ingestTelemetry(droneId, userId, input);
  res.status(201).json({ success: true });
}));

/**
 * POST /api/v1/telemetry/batch
 * Batch ingest telemetry points (for log uploads)
 * Requires device token authentication
 */
router.post('/batch', authenticateDevice, asyncHandler(async (req, res) => {
  const { droneId, userId } = (req as any).device;
  const { session_id, points } = req.body;

  if (!session_id || !Array.isArray(points) || points.length === 0) {
    res.status(400).json({ error: 'session_id and points array required' });
    return;
  }

  await batchIngestTelemetry(droneId, userId, session_id, points);
  res.status(201).json({ success: true, ingested: points.length });
}));

export default router;
