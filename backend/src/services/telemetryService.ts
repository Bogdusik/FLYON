import { query } from '../config/database';
import { createPoint } from '../utils/postgis';
import { TelemetryInput } from '../types/database';
import { getFlightBySessionId } from './flightService';
import { broadcastTelemetry, broadcastWarning } from '../websocket';
import { validateTelemetryInput } from '../validators/telemetry';
import { calculateRTH, triggerRTH } from './rthService';
import { recomputeFlightStats, recordPoint } from './flightStats';
import logger from '../utils/logger';

/**
 * Telemetry service
 * Handles telemetry ingestion and processing
 */

/** Telemetry for a flight that is no longer active (completed or cancelled); answered with 409. */
export class FlightNotActiveError extends Error {
  constructor(flightId: string) {
    super(`Flight ${flightId} is not active`);
    this.name = 'FlightNotActiveError';
  }
}

/**
 * Ingest telemetry point
 * Creates or updates flight session and adds telemetry point
 */
export async function ingestTelemetry(
  droneId: string,
  userId: string,
  input: TelemetryInput
): Promise<void> {
  // Validate telemetry input with Zod
  const validated = validateTelemetryInput(input);

  const timestamp = validated.timestamp ? new Date(validated.timestamp) : new Date();
  const position = createPoint(validated.latitude, validated.longitude);

  // Find or create active flight session
  // Use session_id from input or generate one
  const sessionId = validated.session_id || `session_${droneId}_${Date.now()}`;

  const existing = await getFlightBySessionId(sessionId, userId);
  if (existing && existing.status !== 'active') {
    throw new FlightNotActiveError(existing.id);
  }

  let flightId: string;
  if (existing) {
    flightId = existing.id;
  } else {
    // Create new flight session with start position
    const startPosition = createPoint(validated.latitude, validated.longitude);
    const flightResult = await query(
      `INSERT INTO flights (drone_id, user_id, session_id, started_at, status, start_position)
       VALUES ($1, $2, $3, $4, 'active', ST_GeomFromText($5, 4326))
       RETURNING id`,
      [droneId, userId, sessionId, timestamp, startPosition]
    );
    flightId = flightResult.rows[0].id;
  }
  const flight = { id: flightId };

  // Insert telemetry point
  const telemetryResult = await query(
    `INSERT INTO telemetry (
      flight_id, drone_id, timestamp, position, altitude_meters,
      speed_mps, heading_degrees, battery_percent, flight_mode,
      is_armed, raw_data
    ) VALUES ($1, $2, $3, ST_GeomFromText($4, 4326), $5, $6, $7, $8, $9, $10, $11)
    RETURNING id`,
    [
      flight.id,
      droneId,
      timestamp,
      position,
      validated.altitude,
      validated.speed || 0,
      validated.heading || null,
      validated.battery,
      validated.flightMode || null,
      validated.armed || false,
      JSON.stringify(validated.raw_data || {}),
    ]
  );

  const telemetryId = telemetryResult.rows[0].id;

  // Broadcast telemetry update via WebSocket
  broadcastTelemetry(flight.id, {
    id: telemetryId,
    timestamp,
    latitude: validated.latitude,
    longitude: validated.longitude,
    altitude: validated.altitude,
    speed: validated.speed || 0,
    heading: validated.heading || null,
    battery: validated.battery,
    flight_mode: validated.flightMode || null,
    is_armed: validated.armed || false,
  });

  // Update flight statistics incrementally: one UPDATE per point, queued per flight (async, non-blocking)
  recordPoint(flight.id, {
    id: telemetryId,
    timestamp,
    latitude: validated.latitude,
    longitude: validated.longitude,
    altitude: validated.altitude,
    speed: validated.speed || 0,
    battery: validated.battery,
  }).catch((error) => {
    logger.error('Failed to update flight stats', { flightId: flight.id, error: error.message });
  });

  // Check for danger zone violations (async, non-blocking)
  checkDangerZones(flight.id, validated.latitude, validated.longitude, validated.altitude, userId).catch((error) => {
    logger.error('Failed to check danger zones', { flightId: flight.id, error: error.message });
  });

  // Check battery level and trigger RTH if needed (async, non-blocking)
  checkBatteryAndRTH(
    flight.id,
    droneId,
    userId,
    validated.latitude,
    validated.longitude,
    validated.battery,
    validated.speed || 0,
    validated.heading || null,
    validated.altitude
  ).catch((error) => {
    logger.error('Failed to check battery and RTH', { flightId: flight.id, error: error.message });
  });
}

/**
 * Check battery level and trigger RTH if needed
 */
async function checkBatteryAndRTH(
  flightId: string,
  droneId: string,
  userId: string,
  latitude: number,
  longitude: number,
  battery: number,
  speed: number,
  heading: number | null,
  altitude: number
): Promise<void> {
  try {
    // Only check if battery is below 30% (to avoid constant checks)
    if (battery > 30) {
      return;
    }

    const rthCalculation = await calculateRTH(
      flightId,
      latitude,
      longitude,
      battery,
      speed,
      heading,
      altitude
    );

    // Broadcast warning if battery is getting low
    if (rthCalculation.urgency === 'medium' || rthCalculation.urgency === 'high' || rthCalculation.urgency === 'critical') {
      broadcastWarning(userId, {
        type: 'battery_warning',
        flight_id: flightId,
        message: rthCalculation.message,
        urgency: rthCalculation.urgency,
        battery: battery,
        battery_margin: rthCalculation.batteryMargin,
        distance_to_home: rthCalculation.distanceToHome,
        estimated_time_to_home: rthCalculation.estimatedTimeToHome,
      });
    }

    // Trigger automatic RTH if critical or high urgency
    if (rthCalculation.shouldReturn && (rthCalculation.urgency === 'critical' || rthCalculation.urgency === 'high')) {
      await triggerRTH(
        flightId,
        droneId,
        rthCalculation.message
      );
    }
  } catch (error: any) {
    // Don't throw - this is a safety feature, shouldn't break telemetry ingestion
    logger.error('Error in battery/RTH check', { flightId, error: error.message });
  }
}

/**
 * Check if telemetry point is in any danger zones
 */
async function checkDangerZones(
  flightId: string,
  latitude: number,
  longitude: number,
  altitude: number,
  userId: string
): Promise<void> {
  const point = createPoint(latitude, longitude);

  // Find active danger zones that contain this point
  const zonesResult = await query(
    `SELECT id, name, altitude_limit_meters, zone_type
    FROM danger_zones
    WHERE is_active = true
      AND ST_Contains(geometry, ST_GeomFromText($1, 4326))
      AND (altitude_limit_meters IS NULL OR altitude_limit_meters >= $2)`,
    [point, altitude]
  );

  for (const zone of zonesResult.rows) {
    // Check if we're already tracking a violation for this zone
    const existingViolation = await query(
      `SELECT id, exited_at FROM zone_violations
      WHERE flight_id = $1 AND danger_zone_id = $2 AND exited_at IS NULL
      ORDER BY entered_at DESC
      LIMIT 1`,
      [flightId, zone.id]
    );

    const severity = zone.zone_type === 'restricted' || zone.zone_type === 'airport' ? 'critical' : 'warning';

    if (existingViolation.rows.length === 0) {
      // New violation - create entry
      await query(
        `INSERT INTO zone_violations (
          flight_id, danger_zone_id, entered_at, severity, max_altitude_meters
        ) VALUES ($1, $2, NOW(), $3, $4)`,
        [flightId, zone.id, severity, altitude]
      );

      // Broadcast warning via WebSocket
      broadcastWarning(userId, {
        type: 'zone_violation',
        severity,
        message: `Entered danger zone: ${zone.name}`,
        zone_id: zone.id,
        zone_name: zone.name,
        zone_type: zone.zone_type,
        latitude,
        longitude,
        altitude,
        flight_id: flightId,
      });
    } else {
      // Update existing violation
      await query(
        `UPDATE zone_violations
        SET max_altitude_meters = GREATEST(max_altitude_meters, $1)
        WHERE id = $2`,
        [altitude, existingViolation.rows[0].id]
      );
    }
  }

  // Check for zones we've exited
  const activeViolations = await query(
    `SELECT zv.id, zv.danger_zone_id
    FROM zone_violations zv
    JOIN danger_zones dz ON zv.danger_zone_id = dz.id
    WHERE zv.flight_id = $1
      AND zv.exited_at IS NULL
      AND dz.is_active = true
      AND NOT ST_Contains(dz.geometry, ST_GeomFromText($2, 4326))`,
    [flightId, point]
  );

  for (const violation of activeViolations.rows) {
    await query(
      `UPDATE zone_violations
      SET exited_at = NOW(),
          duration_seconds = EXTRACT(EPOCH FROM (NOW() - entered_at))::INTEGER
      WHERE id = $1`,
      [violation.id]
    );
  }
}

/**
 * Batch ingest telemetry points (for log uploads)
 */
export async function batchIngestTelemetry(
  droneId: string,
  userId: string,
  sessionId: string,
  points: TelemetryInput[]
): Promise<void> {
  if (points.length === 0) {
    throw new Error('No telemetry points provided');
  }

  // Find or create flight
  const existing = await getFlightBySessionId(sessionId, userId);
  if (existing && existing.status !== 'active') {
    throw new FlightNotActiveError(existing.id);
  }

  let flightId: string;
  if (existing) {
    flightId = existing.id;
  } else {
    const firstPoint = points[0];
    const timestamp = firstPoint.timestamp ? new Date(firstPoint.timestamp) : new Date();
    const startPosition = createPoint(firstPoint.latitude, firstPoint.longitude);
    const flightResult = await query(
      `INSERT INTO flights (drone_id, user_id, session_id, started_at, status, start_position)
       VALUES ($1, $2, $3, $4, 'active', ST_GeomFromText($5, 4326))
       RETURNING id`,
      [droneId, userId, sessionId, timestamp, startPosition]
    );
    flightId = flightResult.rows[0].id;
  }
  const flight = { id: flightId };

  // Batch insert telemetry points
  const values: any[] = [];
  const placeholders: string[] = [];
  let paramIndex = 1;

  for (const point of points) {
    const timestamp = point.timestamp ? new Date(point.timestamp) : new Date();
    const position = createPoint(point.latitude, point.longitude);
    
    placeholders.push(
      `($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, ST_GeomFromText($${paramIndex++}, 4326), $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`
    );
    
    values.push(
      flight.id,
      droneId,
      timestamp,
      position,
      point.altitude,
      point.speed || 0,
      point.heading || null,
      point.battery,
      point.flightMode || null,
      point.armed || false,
      JSON.stringify(point.raw_data || {})
    );
  }

  await query(
    `INSERT INTO telemetry (
      flight_id, drone_id, timestamp, position, altitude_meters,
      speed_mps, heading_degrees, battery_percent, flight_mode,
      is_armed, raw_data
    ) VALUES ${placeholders.join(', ')}`,
    values
  );

  // Recompute the flight's stats once for the whole batch (queued behind any live points), then check zones
  await recomputeFlightStats(flight.id);
  
  // Check zones for all points (simplified - check first, middle, last)
  const checkPoints = [
    points[0],
    points[Math.floor(points.length / 2)],
    points[points.length - 1],
  ];

  for (const point of checkPoints) {
    await checkDangerZones(flight.id, point.latitude, point.longitude, point.altitude, userId);
  }
}
