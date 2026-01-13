import { query } from '../config/database';
import { createPoint, createLineString } from '../utils/postgis';
import { Flight } from '../types/database';
import { v4 as uuidv4 } from 'uuid';

/**
 * Flight service
 * Handles flight session management
 */

export interface CreateFlightInput {
  drone_id: string;
  session_id?: string;
  started_at?: Date;
  start_position?: string; // PostGIS POINT WKT format
}

export interface UpdateFlightInput {
  ended_at?: Date;
  status?: 'active' | 'completed' | 'cancelled';
}

/**
 * Create a new flight session
 */
export async function createFlight(userId: string, input: CreateFlightInput): Promise<Flight> {
  const sessionId = input.session_id || `session_${Date.now()}_${uuidv4()}`;
  const startedAt = input.started_at || new Date();

  let queryText: string;
  let queryParams: any[];

  if (input.start_position) {
    queryText = `INSERT INTO flights (drone_id, user_id, session_id, started_at, status, start_position)
                 VALUES ($1, $2, $3, $4, 'active', ST_GeomFromText($5, 4326))
                 RETURNING *`;
    queryParams = [input.drone_id, userId, sessionId, startedAt, input.start_position];
  } else {
    queryText = `INSERT INTO flights (drone_id, user_id, session_id, started_at, status)
                 VALUES ($1, $2, $3, $4, 'active')
                 RETURNING *`;
    queryParams = [input.drone_id, userId, sessionId, startedAt];
  }

  const result = await query(queryText, queryParams);

  return result.rows[0] as Flight;
}

/**
 * Get flight by ID
 */
export async function getFlightById(flightId: string, userId: string): Promise<Flight | null> {
  const result = await query(
    `SELECT 
      id, drone_id, user_id, session_id, started_at, ended_at, status,
      duration_seconds, total_distance_meters, max_altitude_meters,
      max_speed_mps, min_battery_percent,
      ST_AsText(flight_path) as flight_path,
      ST_AsText(start_position) as start_position,
      ST_AsText(end_position) as end_position,
      health_score, risk_events, metadata, created_at, updated_at
     FROM flights
     WHERE id = $1 AND user_id = $2`,
    [flightId, userId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0] as Flight;
}

/**
 * Get flight by session ID
 */
export async function getFlightBySessionId(sessionId: string, userId: string): Promise<Flight | null> {
  const result = await query(
    `SELECT 
      id, drone_id, user_id, session_id, started_at, ended_at, status,
      duration_seconds, total_distance_meters, max_altitude_meters,
      max_speed_mps, min_battery_percent,
      ST_AsText(flight_path) as flight_path,
      ST_AsText(start_position) as start_position,
      ST_AsText(end_position) as end_position,
      health_score, risk_events, metadata, created_at, updated_at
     FROM flights
     WHERE session_id = $1 AND user_id = $2`,
    [sessionId, userId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0] as Flight;
}

/**
 * Get all flights for a user
 */
export async function getUserFlights(
  userId: string,
  options: {
    droneId?: string;
    status?: string;
    limit?: number;
    offset?: number;
  } = {}
): Promise<Flight[]> {
  let sql = `
    SELECT 
      id, drone_id, user_id, session_id, started_at, ended_at, status,
      duration_seconds, total_distance_meters, max_altitude_meters,
      max_speed_mps, min_battery_percent,
      ST_AsText(flight_path) as flight_path,
      ST_AsText(start_position) as start_position,
      ST_AsText(end_position) as end_position,
      health_score, risk_events, metadata, created_at, updated_at
    FROM flights
    WHERE user_id = $1
  `;
  const params: any[] = [userId];
  let paramIndex = 2;

  if (options.droneId) {
    sql += ` AND drone_id = $${paramIndex++}`;
    params.push(options.droneId);
  }

  if (options.status) {
    sql += ` AND status = $${paramIndex++}`;
    params.push(options.status);
  }

  sql += ' ORDER BY started_at DESC';

  if (options.limit) {
    sql += ` LIMIT $${paramIndex++}`;
    params.push(options.limit);
  }

  if (options.offset) {
    sql += ` OFFSET $${paramIndex++}`;
    params.push(options.offset);
  }

  const result = await query(sql, params);
  return result.rows as Flight[];
}

/**
 * Update flight
 */
export async function updateFlight(
  flightId: string,
  userId: string,
  input: UpdateFlightInput
): Promise<Flight> {
  const fields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (input.ended_at !== undefined) {
    fields.push(`ended_at = $${paramIndex++}`);
    values.push(input.ended_at);
  }

  if (input.status !== undefined) {
    fields.push(`status = $${paramIndex++}`);
    values.push(input.status);
  }

  if (fields.length === 0) {
    throw new Error('No fields to update');
  }

  values.push(flightId, userId);

  const result = await query(
    `UPDATE flights SET ${fields.join(', ')} WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
     RETURNING 
      id, drone_id, user_id, session_id, started_at, ended_at, status,
      duration_seconds, total_distance_meters, max_altitude_meters,
      max_speed_mps, min_battery_percent,
      ST_AsText(flight_path) as flight_path,
      ST_AsText(start_position) as start_position,
      ST_AsText(end_position) as end_position,
      health_score, risk_events, metadata, created_at, updated_at`,
    values
  );

  if (result.rows.length === 0) {
    throw new Error('Flight not found');
  }

  return result.rows[0] as Flight;
}

/**
 * Delete flight (and all associated telemetry via CASCADE)
 */
export async function deleteFlight(flightId: string, userId: string): Promise<void> {
  const result = await query(
    'DELETE FROM flights WHERE id = $1 AND user_id = $2',
    [flightId, userId]
  );

  if (result.rowCount === 0) {
    throw new Error('Flight not found');
  }
}

/**
 * Delete all flights for a user
 */
export async function deleteAllFlights(userId: string): Promise<number> {
  const result = await query(
    'DELETE FROM flights WHERE user_id = $1',
    [userId]
  );

  return result.rowCount || 0;
}

/**
 * Get telemetry points for a flight
 */
export async function getFlightTelemetry(
  flightId: string,
  userId: string,
  options: {
    limit?: number;
    offset?: number;
    startTime?: Date;
    endTime?: Date;
  } = {}
): Promise<Telemetry[]> {
  let sql = `
    SELECT 
      id, flight_id, drone_id, timestamp,
      ST_AsText(position) as position,
      altitude_meters, speed_mps, heading_degrees,
      battery_percent, flight_mode, is_armed, raw_data, created_at
    FROM telemetry
    WHERE flight_id = $1
  `;
  const params: any[] = [flightId];
  let paramIndex = 2;

  // Verify flight belongs to user
  const flight = await getFlightById(flightId, userId);
  if (!flight) {
    throw new Error('Flight not found');
  }

  if (options.startTime) {
    sql += ` AND timestamp >= $${paramIndex++}`;
    params.push(options.startTime);
  }

  if (options.endTime) {
    sql += ` AND timestamp <= $${paramIndex++}`;
    params.push(options.endTime);
  }

  sql += ' ORDER BY timestamp ASC';

  if (options.limit) {
    sql += ` LIMIT $${paramIndex++}`;
    params.push(options.limit);
  }

  if (options.offset) {
    sql += ` OFFSET $${paramIndex++}`;
    params.push(options.offset);
  }

  const result = await query(sql, params);
  return result.rows as Telemetry[];
}
