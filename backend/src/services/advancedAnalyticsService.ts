/**
 * Advanced analytics service
 * Extended metrics, comparisons, and insights
 */

import { query } from '../config/database';

export interface FlightComparison {
  flight1_id: string;
  flight2_id: string;
  differences: {
    duration: number; // seconds difference
    distance: number; // meters difference
    max_altitude: number; // meters difference
    max_speed: number; // m/s difference
    battery_efficiency: number; // percent difference
  };
  improvements: string[];
}

export interface ManeuverAnalysis {
  type: 'flip' | 'roll' | 'split_s' | 'power_loop' | 'other';
  timestamp: number;
  duration: number;
  max_gforce: number;
  altitude_change: number;
  quality_score: number; // 0-100
}

export interface AdvancedFlightMetrics {
  flight_id: string;
  gforce: {
    max: number;
    min: number;
    average: number;
    peaks: Array<{ timestamp: number; value: number }>;
  };
  angles: {
    max_pitch: number;
    max_roll: number;
    max_yaw_rate: number;
  };
  maneuvers: ManeuverAnalysis[];
  battery_efficiency: {
    mah_per_minute: number;
    mah_per_km: number;
    efficiency_score: number; // 0-100
  };
  heatmap_data: Array<{
    lat: number;
    lon: number;
    altitude: number;
    time_spent: number;
  }>;
}

/**
 * Compare two flights
 */
export async function compareFlights(
  flight1Id: string,
  flight2Id: string,
  userId: string
): Promise<FlightComparison> {
  const flights = await query(
    `SELECT id, duration_seconds, total_distance_meters, max_altitude_meters, 
            max_speed_mps, min_battery_percent, health_score
     FROM flights
     WHERE id IN ($1, $2) AND user_id = $3`,
    [flight1Id, flight2Id, userId]
  );

  if (flights.rows.length !== 2) {
    throw new Error('One or both flights not found');
  }

  const f1 = flights.rows.find(f => f.id === flight1Id);
  const f2 = flights.rows.find(f => f.id === flight2Id);

  const differences = {
    duration: (f2.duration_seconds || 0) - (f1.duration_seconds || 0),
    distance: (f2.total_distance_meters || 0) - (f1.total_distance_meters || 0),
    max_altitude: (f2.max_altitude_meters || 0) - (f1.max_altitude_meters || 0),
    max_speed: (f2.max_speed_mps || 0) - (f1.max_speed_mps || 0),
    battery_efficiency: 0, // Would need battery data
  };

  const improvements: string[] = [];
  if (differences.duration > 0) improvements.push(`Flight duration increased by ${Math.round(differences.duration)}s`);
  if (differences.distance > 0) improvements.push(`Distance increased by ${(differences.distance / 1000).toFixed(2)}km`);
  if (differences.max_speed > 0) improvements.push(`Max speed increased by ${differences.max_speed.toFixed(1)}m/s`);

  return {
    flight1_id: flight1Id,
    flight2_id: flight2Id,
    differences,
    improvements,
  };
}

/**
 * Calculate advanced metrics for a flight
 */
export async function calculateAdvancedMetrics(flightId: string, userId: string): Promise<AdvancedFlightMetrics> {
  // Get telemetry data
  const telemetry = await query(
    `SELECT timestamp, altitude_meters, speed_mps, heading_degrees, battery_percent, raw_data
     FROM telemetry
     WHERE flight_id = $1
     ORDER BY timestamp ASC`,
    [flightId]
  );

  if (telemetry.rows.length === 0) {
    throw new Error('No telemetry data found');
  }

  const points = telemetry.rows;
  let maxGforce = 0;
  let minGforce = 0;
  let totalGforce = 0;
  let maxPitch = 0;
  let maxRoll = 0;
  let maxYawRate = 0;
  const gforcePeaks: Array<{ timestamp: number; value: number }> = [];
  const maneuvers: ManeuverAnalysis[] = [];

  // Analyze telemetry points
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const timeDelta = (new Date(curr.timestamp).getTime() - new Date(prev.timestamp).getTime()) / 1000;

    if (timeDelta > 0) {
      // Calculate approximate G-force from acceleration
      const speedDelta = curr.speed_mps - prev.speed_mps;
      const accel = speedDelta / timeDelta;
      const gforce = accel / 9.81; // Convert to G

      if (gforce > maxGforce) maxGforce = gforce;
      if (gforce < minGforce) minGforce = gforce;
      totalGforce += Math.abs(gforce);

      if (Math.abs(gforce) > 2) {
        gforcePeaks.push({
          timestamp: new Date(curr.timestamp).getTime(),
          value: gforce,
        });
      }

      // Detect maneuvers (simplified)
      if (Math.abs(gforce) > 3 && timeDelta < 2) {
        const altitudeChange = curr.altitude_meters - prev.altitude_meters;
        maneuvers.push({
          type: altitudeChange > 0 ? 'power_loop' : 'split_s',
          timestamp: new Date(curr.timestamp).getTime(),
          duration: timeDelta,
          max_gforce: gforce,
          altitude_change: altitudeChange,
          quality_score: Math.min(100, 50 + Math.abs(gforce) * 10),
        });
      }
    }
  }

  // Calculate battery efficiency
  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];
  const batteryUsed = (firstPoint.battery_percent || 100) - (lastPoint.battery_percent || 0);
  const flightDuration = (new Date(lastPoint.timestamp).getTime() - new Date(firstPoint.timestamp).getTime()) / 60000; // minutes
  const distance = await query(
    'SELECT total_distance_meters FROM flights WHERE id = $1',
    [flightId]
  );
  const totalDistance = distance.rows[0]?.total_distance_meters || 0;

  const metrics: AdvancedFlightMetrics = {
    flight_id: flightId,
    gforce: {
      max: maxGforce,
      min: minGforce,
      average: totalGforce / points.length,
      peaks: gforcePeaks.slice(0, 10), // Top 10 peaks
    },
    angles: {
      max_pitch: maxPitch,
      max_roll: maxRoll,
      max_yaw_rate: maxYawRate,
    },
    maneuvers,
    battery_efficiency: {
      mah_per_minute: batteryUsed / flightDuration,
      mah_per_km: batteryUsed / (totalDistance / 1000),
      efficiency_score: Math.max(0, 100 - (batteryUsed / flightDuration) * 10),
    },
    heatmap_data: points.slice(0, 100).map(p => ({
      lat: 0, // Would need to parse position
      lon: 0,
      altitude: p.altitude_meters || 0,
      time_spent: 1,
    })),
  };

  return metrics;
}

/**
 * Get flight trends over time
 */
export async function getFlightTrends(userId: string, months: number = 6): Promise<{
  period: string;
  avg_duration: number;
  avg_distance: number;
  avg_speed: number;
  flight_count: number;
}[]> {
  const result = await query(
    `SELECT 
      TO_CHAR(started_at, 'YYYY-MM') as period,
      AVG(duration_seconds) as avg_duration,
      AVG(total_distance_meters) as avg_distance,
      AVG(max_speed_mps) as avg_speed,
      COUNT(*) as flight_count
     FROM flights
     WHERE user_id = $1
       AND started_at >= NOW() - INTERVAL '${months} months'
     GROUP BY TO_CHAR(started_at, 'YYYY-MM')
     ORDER BY period ASC`,
    [userId]
  );

  return result.rows.map(row => ({
    period: row.period,
    avg_duration: parseFloat(row.avg_duration) || 0,
    avg_distance: parseFloat(row.avg_distance) || 0,
    avg_speed: parseFloat(row.avg_speed) || 0,
    flight_count: parseInt(row.flight_count) || 0,
  }));
}
