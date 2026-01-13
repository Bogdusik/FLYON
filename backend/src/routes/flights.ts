import express from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticateUser } from '../middleware/auth';
import { upload } from '../middleware/upload';
import logger from '../utils/logger';
import {
  createFlight,
  getFlightById,
  getUserFlights,
  updateFlight,
  getFlightTelemetry,
  deleteFlight,
  deleteAllFlights,
} from '../services/flightService';
import { updateFlightStats } from '../services/telemetryService';

const router = express.Router();

// All routes require authentication
router.use(authenticateUser);

/**
 * GET /api/v1/flights
 * Get all flights for current user
 */
router.get('/', asyncHandler(async (req, res) => {
  const userId = (req as any).user.id;
  const { drone_id, status, limit, offset } = req.query;
  const flights = await getUserFlights(userId, {
    droneId: drone_id as string,
    status: status as string,
    limit: limit ? parseInt(limit as string) : undefined,
    offset: offset ? parseInt(offset as string) : undefined,
  });
  res.json(flights);
}));

/**
 * POST /api/v1/flights
 * Create a new flight session
 */
router.post('/', asyncHandler(async (req, res) => {
  const userId = (req as any).user.id;
  const { drone_id, session_id, started_at } = req.body;
  const flight = await createFlight(userId, {
    drone_id,
    session_id,
    started_at: started_at ? new Date(started_at) : undefined,
  });
  res.status(201).json(flight);
}));

/**
 * GET /api/v1/flights/:id
 * Get flight by ID
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const userId = (req as any).user.id;
  const flight = await getFlightById(req.params.id, userId);
  if (!flight) {
    res.status(404).json({ error: 'Flight not found' });
    return;
  }
  
  // If flight is completed but statistics are missing, trigger calculation in background
  if (flight.status === 'completed' && 
      !flight.total_distance_meters && !flight.max_altitude_meters && 
      !flight.max_speed_mps && !flight.min_battery_percent) {
    // Trigger stats calculation asynchronously (don't wait)
    updateFlightStats(flight.id).catch((error) => {
      logger.error('Failed to calculate stats for completed flight', { error: error.message, flightId: flight.id });
    });
  }
  
  res.json(flight);
}));

/**
 * PATCH /api/v1/flights/:id
 * Update flight
 */
router.patch('/:id', asyncHandler(async (req, res) => {
  const userId = (req as any).user.id;
  const { ended_at, status } = req.body;
  const flight = await updateFlight(req.params.id, userId, {
    ended_at: ended_at ? new Date(ended_at) : undefined,
    status,
  });
  
  // If flight was just completed, calculate statistics
  if (status === 'completed' || (flight.status === 'completed' && status === undefined)) {
    updateFlightStats(flight.id).catch((error) => {
      // Log error but don't fail the request
      logger.error('Failed to update flight stats', { error: error.message, flightId: flight.id });
    });
  }
  
  res.json(flight);
}));

/**
 * GET /api/v1/flights/:id/telemetry
 * Get telemetry points for a flight
 */
router.get('/:id/telemetry', asyncHandler(async (req, res) => {
  const userId = (req as any).user.id;
  const { limit, offset, start_time, end_time } = req.query;
  const telemetry = await getFlightTelemetry(req.params.id, userId, {
    limit: limit ? parseInt(limit as string) : undefined,
    offset: offset ? parseInt(offset as string) : undefined,
    startTime: start_time ? new Date(start_time as string) : undefined,
    endTime: end_time ? new Date(end_time as string) : undefined,
  });
  res.json(telemetry);
}));

/**
 * GET /api/v1/flights/:id/replay
 * Get flight replay data (optimized for animation)
 */
router.get('/:id/replay', asyncHandler(async (req, res) => {
  const userId = (req as any).user.id;
  const flightId = req.params.id;
  const { speed = '1x' } = req.query; // 1x, 2x, 4x, 8x
  
  // Verify flight belongs to user
  const flight = await getFlightById(flightId, userId);
  if (!flight) {
    res.status(404).json({ error: 'Flight not found' });
    return;
  }
  
  // Get all telemetry points for replay
  const telemetry = await getFlightTelemetry(flightId, userId, {
    limit: 10000, // Max points for replay
  });
  
  // Calculate replay timing
  const speedMultiplier = parseFloat(speed as string) || 1;
  const startTime = new Date(flight.started_at).getTime();
  const endTime = flight.ended_at ? new Date(flight.ended_at).getTime() : Date.now();
  const duration = endTime - startTime;
  const replayDuration = duration / speedMultiplier;
  
  // Format telemetry for replay
  const replayData = telemetry.map((point: any, index: number) => {
    const pointTime = new Date(point.timestamp).getTime();
    const relativeTime = (pointTime - startTime) / speedMultiplier;
    
    return {
      index,
      timestamp: point.timestamp,
      relativeTime: Math.round(relativeTime), // milliseconds from start
      position: {
        lat: point.latitude,
        lon: point.longitude,
      },
      altitude: point.altitude,
      speed: point.speed,
      heading: point.heading,
      battery: point.battery,
      flight_mode: point.flight_mode,
      is_armed: point.is_armed,
    };
  });
  
  res.json({
    flight_id: flightId,
    started_at: flight.started_at,
    ended_at: flight.ended_at,
    duration_ms: duration,
    replay_duration_ms: replayDuration,
    speed_multiplier: speedMultiplier,
    total_points: replayData.length,
    points: replayData,
  });
}));

/**
 * DELETE /api/v1/flights/:id
 * Delete a flight
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  const userId = (req as any).user.id;
  await deleteFlight(req.params.id, userId);
  res.status(204).send();
}));

/**
 * POST /api/v1/flights/:id/recalculate-stats
 * Force recalculation of flight statistics
 */
router.post('/:id/recalculate-stats', asyncHandler(async (req, res) => {
  const userId = (req as any).user.id;
  const flightId = req.params.id;
  
  // Verify flight belongs to user
  const flight = await getFlightById(flightId, userId);
  if (!flight) {
    res.status(404).json({ error: 'Flight not found' });
    return;
  }
  
  // Recalculate statistics
  await updateFlightStats(flightId);
  
  // Return updated flight data
  const updatedFlight = await getFlightById(flightId, userId);
  res.json({ success: true, flight: updatedFlight });
}));

/**
 * DELETE /api/v1/flights
 * Delete all flights for current user
 */
router.delete('/', asyncHandler(async (req, res) => {
  const userId = (req as any).user.id;
  const deleted = await deleteAllFlights(userId);
  res.json({ deleted: deleted });
}));

/**
 * POST /api/v1/flights/upload-log
 * Upload flight log file (CSV, JSON)
 */
router.post('/upload-log', upload.single('file'), asyncHandler(async (req, res) => {
  const userId = (req as any).user.id;
  const { drone_id, session_id } = req.body;
  
  if (!drone_id) {
    res.status(400).json({ error: 'drone_id is required' });
    return;
  }
  
  // Check if file was uploaded
  if (!req.file && !req.body.file_data) {
    res.status(400).json({ error: 'No file uploaded. Use multipart/form-data with "file" field or send "file_data" as base64' });
    return;
  }
  
  let fileContent: Buffer | string;
  let filename: string;
  let mimeType: string | undefined;
  
  if (req.file) {
    // File uploaded via multipart/form-data
    fileContent = req.file.buffer;
    filename = req.file.originalname;
    mimeType = req.file.mimetype;
  } else {
    // File sent as base64
    const { file_data, file_name, file_type } = req.body;
    if (!file_data) {
      res.status(400).json({ error: 'file_data is required' });
      return;
    }
    fileContent = Buffer.from(file_data, 'base64');
    filename = file_name || 'upload.log';
    mimeType = file_type;
  }
  
  // Parse log file
  const { parseLogFile } = await import('../parsers');
  const points = await parseLogFile(filename, fileContent, mimeType);
  
  if (points.length === 0) {
    res.status(400).json({ error: 'No valid telemetry points found in file' });
    return;
  }
  
  // Ingest telemetry points
  const { batchIngestTelemetry } = await import('../services/telemetryService');
  const finalSessionId = session_id || `session_${drone_id}_${Date.now()}`;
  
  await batchIngestTelemetry(drone_id, userId, finalSessionId, points);
  
  res.status(201).json({
    success: true,
    session_id: finalSessionId,
    points_ingested: points.length,
  });
}));

export default router;
