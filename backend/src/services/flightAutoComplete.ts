import { query } from '../config/database';
import { updateFlightStats } from './telemetryService';
import logger from '../utils/logger';

/**
 * Auto-complete old active flights
 * Marks flights as completed if they haven't received telemetry for a specified time
 */

const INACTIVE_THRESHOLD_MINUTES = 30; // Complete flights after 30 minutes of inactivity

/**
 * Complete flights that haven't received telemetry for the threshold time
 */
export async function autoCompleteInactiveFlights(): Promise<number> {
  const thresholdTime = new Date();
  thresholdTime.setMinutes(thresholdTime.getMinutes() - INACTIVE_THRESHOLD_MINUTES);

  const result = await query(
    `UPDATE flights 
     SET 
       status = 'completed',
       ended_at = COALESCE(
         (SELECT MAX(timestamp) FROM telemetry WHERE telemetry.flight_id = flights.id),
         started_at + INTERVAL '1 minute'
       )
     WHERE 
       status = 'active' 
       AND id NOT IN (
         SELECT DISTINCT flight_id 
         FROM telemetry 
         WHERE timestamp > $1
       )
     RETURNING id`,
    [thresholdTime]
  );

  // Calculate statistics for completed flights
  if (result.rows.length > 0) {
    const flightIds = result.rows.map(row => row.id);
    for (const flightId of flightIds) {
      updateFlightStats(flightId).catch((error) => {
        logger.error('Failed to update stats for auto-completed flight', { flightId, error: error.message });
      });
    }
  }

  return result.rowCount || 0;
}

/**
 * Complete a specific flight
 */
export async function completeFlight(flightId: string, userId: string): Promise<void> {
  // Get the last telemetry timestamp
  const lastTelemetry = await query(
    `SELECT MAX(timestamp) as last_time FROM telemetry WHERE flight_id = $1`,
    [flightId]
  );

  const endedAt = lastTelemetry.rows[0]?.last_time || new Date();

  await query(
    `UPDATE flights 
     SET status = 'completed', ended_at = $1 
     WHERE id = $2 AND user_id = $3`,
    [endedAt, flightId, userId]
  );

  // Calculate statistics after completing flight
  updateFlightStats(flightId).catch((error) => {
    logger.error('Failed to update stats for completed flight', { flightId, error: error.message });
  });
}
