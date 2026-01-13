import express from 'express';
import multer from 'multer';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticateUser } from '../middleware/auth';
import {
  parseBetaflightConfig,
  analyzeBlackboxLog,
  compareConfigs,
  getPIDRecommendations,
  saveBetaflightConfig,
  getBetaflightConfigHistory,
} from '../services/betaflightService';
import { query } from '../config/database';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

/**
 * POST /api/v1/drones/:id/betaflight/config
 * Upload Betaflight configuration file
 */
router.post('/:id/betaflight/config', authenticateUser, upload.single('config'), asyncHandler(async (req, res) => {
  const userId = (req as any).user.id;
  const droneId = req.params.id;

  // Verify drone belongs to user
  const droneCheck = await query('SELECT id FROM drones WHERE id = $1 AND user_id = $2', [droneId, userId]);
  if (droneCheck.rows.length === 0) {
    res.status(404).json({ error: 'Drone not found' });
    return;
  }

  if (!req.file) {
    res.status(400).json({ error: 'No config file provided' });
    return;
  }

  const configText = req.file.buffer.toString('utf-8');
  const config = parseBetaflightConfig(configText);
  const configId = await saveBetaflightConfig(droneId, userId, config, configText);

  res.status(201).json({
    id: configId,
    config,
    message: 'Configuration saved successfully',
  });
}));

/**
 * GET /api/v1/drones/:id/betaflight/config
 * Get current/latest Betaflight configuration
 */
router.get('/:id/betaflight/config', authenticateUser, asyncHandler(async (req, res) => {
  const userId = (req as any).user.id;
  const droneId = req.params.id;

  const history = await getBetaflightConfigHistory(droneId, userId);
  if (history.length === 0) {
    res.status(404).json({ error: 'No configuration found' });
    return;
  }

  res.json(history[0]);
}));

/**
 * GET /api/v1/drones/:id/betaflight/config/history
 * Get configuration history
 */
router.get('/:id/betaflight/config/history', authenticateUser, asyncHandler(async (req, res) => {
  const userId = (req as any).user.id;
  const droneId = req.params.id;

  const history = await getBetaflightConfigHistory(droneId, userId);
  res.json(history);
}));

/**
 * POST /api/v1/drones/:id/betaflight/config/compare
 * Compare two configurations
 */
router.post('/:id/betaflight/config/compare', authenticateUser, asyncHandler(async (req, res) => {
  const { config1_id, config2_id } = req.body;

  const config1Result = await query(
    'SELECT config_data FROM betaflight_configs WHERE id = $1',
    [config1_id]
  );
  const config2Result = await query(
    'SELECT config_data FROM betaflight_configs WHERE id = $2',
    [config2_id]
  );

  if (config1Result.rows.length === 0 || config2Result.rows.length === 0) {
    res.status(404).json({ error: 'Configuration not found' });
    return;
  }

  const comparison = compareConfigs(
    config1Result.rows[0].config_data,
    config2Result.rows[0].config_data
  );

  res.json(comparison);
}));

/**
 * POST /api/v1/flights/:id/blackbox
 * Upload blackbox log
 */
router.post('/:id/blackbox', authenticateUser, upload.single('blackbox'), asyncHandler(async (req, res) => {
  const userId = (req as any).user.id;
  const flightId = req.params.id;

  // Verify flight belongs to user
  const flightCheck = await query('SELECT id, drone_id FROM flights WHERE id = $1 AND user_id = $2', [flightId, userId]);
  if (flightCheck.rows.length === 0) {
    res.status(404).json({ error: 'Flight not found' });
    return;
  }

  if (!req.file) {
    res.status(400).json({ error: 'No blackbox file provided' });
    return;
  }

  const droneId = flightCheck.rows[0].drone_id;
  
  // For now, store file info - full blackbox decoder would be needed for actual parsing
  const analysis = analyzeBlackboxLog({}); // Placeholder

  const result = await query(
    `INSERT INTO blackbox_logs (flight_id, drone_id, user_id, file_name, file_size, analysis_data)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [flightId, droneId, userId, req.file.originalname, req.file.size, JSON.stringify(analysis)]
  );

  res.status(201).json({
    id: result.rows[0].id,
    analysis,
    message: 'Blackbox log uploaded successfully',
  });
}));

/**
 * GET /api/v1/flights/:id/blackbox/analysis
 * Get blackbox analysis
 */
router.get('/:id/blackbox/analysis', authenticateUser, asyncHandler(async (req, res) => {
  const userId = (req as any).user.id;
  const flightId = req.params.id;

  const result = await query(
    `SELECT analysis_data, file_name, created_at
     FROM blackbox_logs
     WHERE flight_id = $1 AND user_id = $2
     ORDER BY created_at DESC
     LIMIT 1`,
    [flightId, userId]
  );

  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Blackbox log not found' });
    return;
  }

  res.json(result.rows[0].analysis_data);
}));

/**
 * GET /api/v1/drones/:id/betaflight/recommendations
 * Get PID tuning recommendations
 */
router.get('/:id/betaflight/recommendations', authenticateUser, asyncHandler(async (req, res) => {
  const userId = (req as any).user.id;
  const droneId = req.params.id;

  const configHistory = await getBetaflightConfigHistory(droneId, userId);
  if (configHistory.length === 0) {
    res.status(404).json({ error: 'No configuration found' });
    return;
  }

  const latestConfig = configHistory[0].config;
  
  // Try to get blackbox analysis for latest flight
  const flightResult = await query(
    `SELECT f.id FROM flights f
     JOIN blackbox_logs bl ON bl.flight_id = f.id
     WHERE f.drone_id = $1 AND f.user_id = $2
     ORDER BY f.started_at DESC
     LIMIT 1`,
    [droneId, userId]
  );

  let blackboxAnalysis = null;
  if (flightResult.rows.length > 0) {
    const blackboxResult = await query(
      'SELECT analysis_data FROM blackbox_logs WHERE flight_id = $1',
      [flightResult.rows[0].id]
    );
    if (blackboxResult.rows.length > 0) {
      blackboxAnalysis = blackboxResult.rows[0].analysis_data;
    }
  }

  const recommendations = getPIDRecommendations(latestConfig, blackboxAnalysis);

  res.json({
    recommendations,
    has_blackbox: blackboxAnalysis !== null,
  });
}));

export default router;
