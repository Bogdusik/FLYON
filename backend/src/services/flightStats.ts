import { query } from '../config/database';
import logger from '../utils/logger';
import {
  accumulate,
  emptyAccumulator,
  FlightAccumulator,
  TelemetrySample,
  toFlightStats,
} from './flightStatsAccumulator';

/**
 * Flight statistics, two ways:
 *
 * - live: `recordPoint` keeps a running accumulator per flight and writes the flight row with one UPDATE per point;
 * - full: `updateFlightStats` recomputes everything from the stored telemetry. It runs once per flight (log upload,
 *   completion, manual recalculation) through `recomputeFlightStats`, never per live point.
 *
 * Both go through one queue per flight, so writes for a flight never overlap and the final recompute always lands
 * after the points that came before it.
 *
 * Assumes a single backend instance: the accumulators and queues live in this process's memory. A second instance
 * would keep its own accumulator for the same flight; move them to Redis or pin each drone to one instance first.
 */

const IDLE_EVICT_MS = 30 * 60 * 1000;
const SWEEP_EVERY_MS = 60 * 1000;

interface LiveFlight {
  acc: FlightAccumulator;
  /** Rows already folded in by the seed; their own recordPoint calls must not add them again. */
  seededIds: Set<string>;
  lastSeen: number;
}

const live = new Map<string, LiveFlight>();
const queues = new Map<string, Promise<void>>();
let lastSweep = 0;

function runExclusive(flightId: string, task: () => Promise<void>): Promise<void> {
  const previous = queues.get(flightId) ?? Promise.resolve();
  const next = previous.catch(() => undefined).then(task);
  queues.set(flightId, next);
  const release = () => {
    if (queues.get(flightId) === next) queues.delete(flightId);
  };
  next.then(release, release);
  return next;
}

function evictIdle(now: number): void {
  if (now - lastSweep < SWEEP_EVERY_MS) return;
  lastSweep = now;
  for (const [flightId, entry] of live) {
    if (now - entry.lastSeen > IDLE_EVICT_MS) live.delete(flightId);
  }
}

/** Builds the accumulator from the stored telemetry once: on a flight's first point or after a restart. */
async function seed(flightId: string): Promise<LiveFlight | null> {
  const flight = await query(`SELECT status FROM flights WHERE id = $1`, [flightId]);
  if (flight.rows[0]?.status !== 'active') return null;

  const rows = await query(
    `/* live-seed */
     SELECT id, timestamp, ST_Y(position) AS latitude, ST_X(position) AS longitude,
            altitude_meters, speed_mps, battery_percent
     FROM telemetry
     WHERE flight_id = $1
     ORDER BY timestamp ASC`,
    [flightId]
  );

  const entry: LiveFlight = { acc: emptyAccumulator(), seededIds: new Set(), lastSeen: Date.now() };
  for (const row of rows.rows) {
    accumulate(entry.acc, {
      id: row.id,
      timestamp: new Date(row.timestamp),
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
      altitude: Number(row.altitude_meters),
      speed: Number(row.speed_mps),
      battery: Number(row.battery_percent),
    });
    entry.seededIds.add(row.id);
  }
  live.set(flightId, entry);
  return entry;
}

async function writeLiveStats(flightId: string, acc: FlightAccumulator): Promise<void> {
  const stats = toFlightStats(acc);
  await query(
    `/* live-stats */
     UPDATE flights SET
       duration_seconds = $1,
       total_distance_meters = $2,
       max_altitude_meters = $3,
       max_speed_mps = $4,
       min_battery_percent = $5,
       start_position = COALESCE(ST_GeomFromText($6, 4326), start_position),
       end_position = COALESCE(ST_GeomFromText($7, 4326), end_position),
       updated_at = NOW()
     WHERE id = $8`,
    [
      stats.durationSeconds,
      stats.totalDistanceMeters,
      stats.maxAltitude,
      stats.maxSpeed,
      stats.minBattery,
      stats.startPosition,
      stats.endPosition,
      flightId,
    ]
  );
}

/**
 * Adds one stored telemetry point to its flight's live statistics. Points for a flight that is no longer active are
 * ignored and get no accumulator.
 */
export function recordPoint(flightId: string, sample: TelemetrySample): Promise<void> {
  return runExclusive(flightId, async () => {
    const now = Date.now();
    evictIdle(now);
    const entry = live.get(flightId) ?? (await seed(flightId));
    if (!entry) return;
    entry.lastSeen = now;
    if (!entry.seededIds.delete(sample.id)) accumulate(entry.acc, sample);
    await writeLiveStats(flightId, entry.acc);
  });
}

/**
 * Recomputes a flight's statistics from all of its telemetry, after any points already queued for it, and drops the
 * live accumulator (an active flight re-seeds on its next point; a finished one never does).
 */
export function recomputeFlightStats(flightId: string): Promise<void> {
  return runExclusive(flightId, async () => {
    live.delete(flightId);
    await updateFlightStats(flightId);
  });
}

export function liveFlightCount(): number {
  return live.size;
}

export function resetLiveFlightStatsForTests(): void {
  live.clear();
  queues.clear();
  lastSweep = 0;
}

/**
 * Full recomputation from the stored telemetry. O(points in the flight): call it through `recomputeFlightStats`,
 * once per flight, not per point.
 */
export async function updateFlightStats(flightId: string): Promise<void> {
  try {
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

    const maxAltitude = stats.max_altitude != null && !isNaN(Number(stats.max_altitude))
      ? Number(stats.max_altitude)
      : null;
    const maxSpeed = stats.max_speed != null && !isNaN(Number(stats.max_speed))
      ? Number(stats.max_speed)
      : null;
    const minBattery = stats.min_battery != null && !isNaN(Number(stats.min_battery))
      ? Number(stats.min_battery)
      : null;

    // Total distance: geodesic distance between consecutive points, in timestamp order
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

    const updateFields: string[] = [
      'duration_seconds = $1',
      'total_distance_meters = $2',
      'max_altitude_meters = $3',
      'max_speed_mps = $4',
      'min_battery_percent = $5',
    ];

    const updateValues: unknown[] = [duration, totalDistance || 0, maxAltitude, maxSpeed, minBattery];

    let paramIndex = 6;

    if (startPos) {
      updateFields.push(`start_position = ST_GeomFromText($${paramIndex}, 4326)`);
      updateValues.push(startPos);
      paramIndex++;
    }

    if (endPos) {
      updateFields.push(`end_position = ST_GeomFromText($${paramIndex}, 4326)`);
      updateValues.push(endPos);
      paramIndex++;
    }

    updateFields.push('updated_at = NOW()');
    updateValues.push(flightId);

    await query(`UPDATE flights SET
        ${updateFields.join(', ')}
      WHERE id = $${paramIndex}`, updateValues);

    logger.info('Flight statistics updated successfully', {
      flightId,
      distance: totalDistance,
      maxAltitude: stats.max_altitude,
      maxSpeed: stats.max_speed,
      minBattery: stats.min_battery,
    });
  } catch (error: any) {
    logger.error('Failed to update flight statistics', {
      flightId,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}
