import { query } from '../config/database';
import { createPoint } from '../utils/postgis';
import { TelemetryInput } from '../types/database';
import { getFlightBySessionId } from './flightService';
import { broadcastTelemetry, broadcastWarning } from '../websocket';
import { validateTelemetryInput } from '../validators/telemetry';
import logger from '../utils/logger';

/**
 * Telemetry service
 * Handles telemetry ingestion and processing
 */

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
  
  let flight = await getFlightBySessionId(sessionId, userId);
  
  if (!flight) {
    // Create new flight session
    const flightResult = await query(
      `INSERT INTO flights (drone_id, user_id, session_id, started_at, status)
       VALUES ($1, $2, $3, $4, 'active')
       RETURNING id`,
      [droneId, userId, sessionId, timestamp]
    );
    flight = { id: flightResult.rows[0].id } as any;
  }

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

  // Update flight statistics (async, non-blocking)
  updateFlightStats(flight.id).catch((error) => {
    logger.error('Failed to update flight stats', { flightId: flight.id, error: error.message });
  });

  // Check for danger zone violations (async, non-blocking)
  checkDangerZones(flight.id, validated.latitude, validated.longitude, validated.altitude, userId).catch((error) => {
    logger.error('Failed to check danger zones', { flightId: flight.id, error: error.message });
  });
}

/**
 * Update flight statistics based on telemetry
 * Exported for use in other services
 */
export async function updateFlightStats(flightId: string): Promise<void> {
  try {
    // Get aggregated stats from telemetry
    const statsResult = await query(
      `SELECT 
        COUNT(*) as point_count,
        MIN(timestamp) as first_timestamp,
        MAX(timestamp) as last_timestamp,
        MIN(altitude_meters) as min_altitude,
        MAX(altitude_meters) as max_altitude,
        MAX(speed_mps) as max_speed,
        MIN(battery_percent) as min_battery,
        ST_AsText(ST_MakePoint(AVG(ST_X(position)), AVG(ST_Y(position)))) as avg_position
      FROM telemetry
      WHERE flight_id = $1`,
      [flightId]
    );

    if (statsResult.rows.length === 0 || !statsResult.rows[0].point_count || parseInt(statsResult.rows[0].point_count) === 0) {
      logger.warn('No telemetry points found for flight', { flightId });
      return;
    }

    const stats = statsResult.rows[0];
    const duration = stats.last_timestamp && stats.first_timestamp
      ? Math.floor((new Date(stats.last_timestamp).getTime() - new Date(stats.first_timestamp).getTime()) / 1000)
      : null;

    // Validate and convert stats values (handle null/undefined/NaN)
    const maxAltitude = stats.max_altitude != null && !isNaN(Number(stats.max_altitude)) 
      ? Number(stats.max_altitude) 
      : null;
    const maxSpeed = stats.max_speed != null && !isNaN(Number(stats.max_speed)) 
      ? Number(stats.max_speed) 
      : null;
    const minBattery = stats.min_battery != null && !isNaN(Number(stats.min_battery)) 
      ? Number(stats.min_battery) 
      : null;

  // Calculate total distance (sum of distances between consecutive points)
  // Use a more reliable method with self-join to avoid LAG issues
  const distanceResult = await query(
    `WITH ordered_telemetry AS (
      SELECT position, timestamp,
             LAG(position) OVER (ORDER BY timestamp) as prev_position
      FROM telemetry
      WHERE flight_id = $1
      ORDER BY timestamp
    )
    SELECT COALESCE(SUM(
      CASE 
        WHEN prev_position IS NOT NULL THEN 
          ST_Distance(position::geography, prev_position::geography)
        ELSE 0
      END
    ), 0) as total_distance
    FROM ordered_telemetry`,
    [flightId]
  );

  const totalDistance = distanceResult.rows[0]?.total_distance || 0;

  // Get start and end positions
  const positionResult = await query(
    `SELECT 
      ST_AsText(position) as position,
      timestamp
    FROM telemetry
    WHERE flight_id = $1
    ORDER BY timestamp ASC
    LIMIT 1`,
    [flightId]
  );

  const endPositionResult = await query(
    `SELECT 
      ST_AsText(position) as position,
      timestamp
    FROM telemetry
    WHERE flight_id = $1
    ORDER BY timestamp DESC
    LIMIT 1`,
    [flightId]
  );

    const startPos = positionResult.rows[0]?.position || null;
    const endPos = endPositionResult.rows[0]?.position || null;

    // Build UPDATE query dynamically to handle NULL positions correctly
    const updateFields: string[] = [
      'duration_seconds = $1',
      'total_distance_meters = $2',
      'max_altitude_meters = $3',
      'max_speed_mps = $4',
      'min_battery_percent = $5',
    ];
    
    const updateValues: any[] = [
      duration,
      totalDistance || 0,
      maxAltitude,
      maxSpeed,
      minBattery,
    ];
    
    let paramIndex = 6;
    
    // Add start_position update only if we have a value
    if (startPos) {
      updateFields.push(`start_position = ST_GeomFromText($${paramIndex}, 4326)`);
      updateValues.push(startPos);
      paramIndex++;
    }
    
    // Add end_position update only if we have a value
    if (endPos) {
      updateFields.push(`end_position = ST_GeomFromText($${paramIndex}, 4326)`);
      updateValues.push(endPos);
      paramIndex++;
    }
    
    // Always update updated_at
    updateFields.push('updated_at = NOW()');
    
    // Add flightId as the last parameter
    updateValues.push(flightId);
    
    // Update flight record with calculated statistics
    const updateQuery = `UPDATE flights SET
        ${updateFields.join(', ')}
      WHERE id = $${paramIndex}`;
    
    await query(updateQuery, updateValues);
    
    logger.info('Flight statistics updated successfully', { 
      flightId, 
      distance: totalDistance,
      maxAltitude: stats.max_altitude,
      maxSpeed: stats.max_speed,
      minBattery: stats.min_battery
    });
  } catch (error: any) {
    logger.error('Failed to update flight statistics', { 
      flightId, 
      error: error.message,
      stack: error.stack 
    });
    throw error;
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
  let flight = await getFlightBySessionId(sessionId, userId);
  
  if (!flight) {
    const firstPoint = points[0];
    const timestamp = firstPoint.timestamp ? new Date(firstPoint.timestamp) : new Date();
    const flightResult = await query(
      `INSERT INTO flights (drone_id, user_id, session_id, started_at, status)
       VALUES ($1, $2, $3, $4, 'active')
       RETURNING id`,
      [droneId, userId, sessionId, timestamp]
    );
    flight = { id: flightResult.rows[0].id } as any;
  }

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

  // Update flight stats and check zones after batch insert
  await updateFlightStats(flight.id);
  
  // Check zones for all points (simplified - check first, middle, last)
  const checkPoints = [
    points[0],
    points[Math.floor(points.length / 2)],
    points[points.length - 1],
  ];

  for (const point of checkPoints) {
    await checkDangerZones(flight.id, point.latitude, point.longitude, point.altitude);
  }
}
