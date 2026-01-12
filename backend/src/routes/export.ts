import express from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticateUser } from '../middleware/auth';
import { query } from '../config/database';
import { exportFlightToKML, exportFlightToGPX } from '../services/exportService';

const router = express.Router();

// All routes require authentication
router.use(authenticateUser);

/**
 * GET /api/v1/export/data
 * Export all user data (GDPR compliance)
 */
router.get('/data', asyncHandler(async (req, res) => {
  const userId = (req as any).user.id;

  // Get all user data
  const [user, drones, flights, dangerZones] = await Promise.all([
    query('SELECT id, email, name, created_at, updated_at, last_login FROM users WHERE id = $1', [userId]),
    query('SELECT * FROM drones WHERE user_id = $1', [userId]),
    query(`
      SELECT 
        id, drone_id, session_id, started_at, ended_at, status,
        duration_seconds, total_distance_meters, max_altitude_meters,
        max_speed_mps, min_battery_percent,
        ST_AsText(start_position) as start_position,
        ST_AsText(end_position) as end_position,
        health_score, risk_events, metadata, created_at, updated_at
      FROM flights
      WHERE user_id = $1
    `, [userId]),
    query(`
      SELECT 
        id, name, description, zone_type,
        ST_AsText(geometry) as geometry,
        altitude_limit_meters, is_active, is_public, metadata,
        created_at, updated_at
      FROM danger_zones
      WHERE user_id = $1
    `, [userId]),
  ]);

  // Get telemetry for all flights
  const flightIds = flights.rows.map((f: any) => f.id);
  let telemetry: any[] = [];
  if (flightIds.length > 0) {
    const telemetryResult = await query(
      `SELECT 
        id, flight_id, drone_id, timestamp,
        ST_AsText(position) as position,
        altitude_meters, speed_mps, heading_degrees,
        battery_percent, flight_mode, is_armed, raw_data, created_at
      FROM telemetry
      WHERE flight_id = ANY($1::uuid[])
      ORDER BY flight_id, timestamp`,
      [flightIds]
    );
    telemetry = telemetryResult.rows;
  }

  const exportData = {
    export_date: new Date().toISOString(),
    user: user.rows[0],
    drones: drones.rows,
    flights: flights.rows,
    telemetry: telemetry,
    danger_zones: dangerZones.rows,
  };

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="flyon-export-${Date.now()}.json"`);
  res.json(exportData);
}));

/**
 * GET /api/v1/export/flights/:id/kml
 * Export flight to KML format
 */
router.get('/flights/:id/kml', asyncHandler(async (req, res) => {
  const userId = (req as any).user.id;
  const flightId = req.params.id;
  
  const kml = await exportFlightToKML(flightId, userId);
  
  res.setHeader('Content-Type', 'application/vnd.google-earth.kml+xml');
  res.setHeader('Content-Disposition', `attachment; filename="flight-${flightId}.kml"`);
  res.send(kml);
}));

/**
 * GET /api/v1/export/flights/:id/gpx
 * Export flight to GPX format
 */
router.get('/flights/:id/gpx', asyncHandler(async (req, res) => {
  const userId = (req as any).user.id;
  const flightId = req.params.id;
  
  const gpx = await exportFlightToGPX(flightId, userId);
  
  res.setHeader('Content-Type', 'application/gpx+xml');
  res.setHeader('Content-Disposition', `attachment; filename="flight-${flightId}.gpx"`);
  res.send(gpx);
}));

export default router;
