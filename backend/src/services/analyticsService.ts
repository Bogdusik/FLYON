import { query } from '../config/database';

/**
 * Advanced analytics service
 * Provides unique insights and statistics
 */

export interface FlightAnalytics {
  totalFlights: number;
  totalFlightTime: number; // seconds
  totalDistance: number; // meters
  averageAltitude: number; // meters
  maxAltitude: number; // meters
  averageSpeed: number; // m/s
  maxSpeed: number; // m/s
  averageBatteryUsage: number; // percent
  dangerZoneViolations: number;
  healthScoreAverage: number;
  flightsByStatus: {
    active: number;
    completed: number;
    cancelled: number;
  };
  flightsByMonth: Array<{
    month: string;
    count: number;
    totalTime: number;
  }>;
  topDrones: Array<{
    drone_id: string;
    flight_count: number;
    total_time: number;
  }>;
}

export interface DroneAnalytics {
  droneId: string;
  totalFlights: number;
  totalFlightTime: number;
  totalDistance: number;
  averageFlightDuration: number;
  averageAltitude: number;
  maxAltitude: number;
  averageSpeed: number;
  maxSpeed: number;
  batteryEfficiency: number; // distance per battery percent
  reliabilityScore: number; // based on completed vs cancelled flights
  lastFlightDate: string | null;
  favoriteFlightMode: string | null;
}

/**
 * Get comprehensive analytics for user
 */
export async function getUserAnalytics(userId: string): Promise<FlightAnalytics> {
  // Get basic statistics
  const statsResult = await query(
    `SELECT 
      COUNT(*) as total_flights,
      COALESCE(SUM(duration_seconds), 0)::INTEGER as total_time,
      COALESCE(SUM(total_distance_meters), 0)::NUMERIC as total_distance,
      COALESCE(AVG(max_altitude_meters), 0)::NUMERIC as avg_altitude,
      COALESCE(MAX(max_altitude_meters), 0)::NUMERIC as max_altitude,
      COALESCE(AVG(max_speed_mps), 0)::NUMERIC as avg_speed,
      COALESCE(MAX(max_speed_mps), 0)::NUMERIC as max_speed,
      COALESCE(AVG(min_battery_percent), 0)::NUMERIC as avg_battery,
      COALESCE(AVG(health_score), 0)::NUMERIC as avg_health
    FROM flights
    WHERE user_id = $1`,
    [userId]
  );

  const stats = statsResult.rows[0];

  // Get flights by status
  const statusResult = await query(
    `SELECT status, COUNT(*)::INTEGER as count
    FROM flights
    WHERE user_id = $1
    GROUP BY status`,
    [userId]
  );

  const flightsByStatus = {
    active: 0,
    completed: 0,
    cancelled: 0,
  };

  statusResult.rows.forEach((row: any) => {
    flightsByStatus[row.status as keyof typeof flightsByStatus] = row.count;
  });

  // Get flights by month
  const monthlyResult = await query(
    `SELECT 
      TO_CHAR(started_at, 'YYYY-MM') as month,
      COUNT(*)::INTEGER as count,
      COALESCE(SUM(duration_seconds), 0)::INTEGER as total_time
    FROM flights
    WHERE user_id = $1
      AND started_at >= NOW() - INTERVAL '12 months'
    GROUP BY TO_CHAR(started_at, 'YYYY-MM')
    ORDER BY month DESC
    LIMIT 12`,
    [userId]
  );

  // Get top drones
  const topDronesResult = await query(
    `SELECT 
      drone_id,
      COUNT(*)::INTEGER as flight_count,
      COALESCE(SUM(duration_seconds), 0)::INTEGER as total_time
    FROM flights
    WHERE user_id = $1
    GROUP BY drone_id
    ORDER BY flight_count DESC
    LIMIT 10`,
    [userId]
  );

  // Get danger zone violations
  const violationsResult = await query(
    `SELECT COUNT(*)::INTEGER as count
    FROM zone_violations zv
    JOIN flights f ON zv.flight_id = f.id
    WHERE f.user_id = $1`,
    [userId]
  );

  return {
    totalFlights: parseInt(stats.total_flights) || 0,
    totalFlightTime: parseInt(stats.total_time) || 0,
    totalDistance: parseFloat(stats.total_distance) || 0,
    averageAltitude: parseFloat(stats.avg_altitude) || 0,
    maxAltitude: parseFloat(stats.max_altitude) || 0,
    averageSpeed: parseFloat(stats.avg_speed) || 0,
    maxSpeed: parseFloat(stats.max_speed) || 0,
    averageBatteryUsage: parseFloat(stats.avg_battery) || 0,
    dangerZoneViolations: parseInt(violationsResult.rows[0]?.count) || 0,
    healthScoreAverage: parseFloat(stats.avg_health) || 0,
    flightsByStatus,
    flightsByMonth: monthlyResult.rows.map((row: any) => ({
      month: row.month,
      count: parseInt(row.count),
      totalTime: parseInt(row.total_time),
    })),
    topDrones: topDronesResult.rows.map((row: any) => ({
      drone_id: row.drone_id,
      flight_count: parseInt(row.flight_count),
      total_time: parseInt(row.total_time),
    })),
  };
}

/**
 * Get analytics for specific drone
 */
export async function getDroneAnalytics(
  droneId: string,
  userId: string
): Promise<DroneAnalytics | null> {
  // Verify drone belongs to user
  const droneCheck = await query(
    'SELECT id FROM drones WHERE id = $1 AND user_id = $2',
    [droneId, userId]
  );

  if (droneCheck.rows.length === 0) {
    return null;
  }

  // Get drone statistics
  const statsResult = await query(
    `SELECT 
      COUNT(*)::INTEGER as total_flights,
      COALESCE(SUM(duration_seconds), 0)::INTEGER as total_time,
      COALESCE(SUM(total_distance_meters), 0)::NUMERIC as total_distance,
      COALESCE(AVG(duration_seconds), 0)::NUMERIC as avg_duration,
      COALESCE(AVG(max_altitude_meters), 0)::NUMERIC as avg_altitude,
      COALESCE(MAX(max_altitude_meters), 0)::NUMERIC as max_altitude,
      COALESCE(AVG(max_speed_mps), 0)::NUMERIC as avg_speed,
      COALESCE(MAX(max_speed_mps), 0)::NUMERIC as max_speed,
      MAX(started_at) as last_flight
    FROM flights
    WHERE drone_id = $1 AND user_id = $2`,
    [droneId, userId]
  );

  const stats = statsResult.rows[0];

  // Get battery efficiency
  const batteryResult = await query(
    `SELECT 
      COALESCE(
        SUM(total_distance_meters) / NULLIF(SUM(100 - min_battery_percent), 0),
        0
      )::NUMERIC as efficiency
    FROM flights
    WHERE drone_id = $1 AND user_id = $2 AND min_battery_percent IS NOT NULL`,
    [droneId, userId]
  );

  // Get reliability score
  const reliabilityResult = await query(
    `SELECT 
      CASE 
        WHEN COUNT(*) = 0 THEN 0
        ELSE (COUNT(*) FILTER (WHERE status = 'completed')::NUMERIC / COUNT(*)::NUMERIC * 100)
      END as reliability
    FROM flights
    WHERE drone_id = $1 AND user_id = $2`,
    [droneId, userId]
  );

  // Get favorite flight mode
  const modeResult = await query(
    `SELECT 
      flight_mode,
      COUNT(*)::INTEGER as count
    FROM telemetry t
    JOIN flights f ON t.flight_id = f.id
    WHERE f.drone_id = $1 AND f.user_id = $2 AND t.flight_mode IS NOT NULL
    GROUP BY flight_mode
    ORDER BY count DESC
    LIMIT 1`,
    [droneId, userId]
  );

  return {
    droneId,
    totalFlights: parseInt(stats.total_flights) || 0,
    totalFlightTime: parseInt(stats.total_time) || 0,
    totalDistance: parseFloat(stats.total_distance) || 0,
    averageFlightDuration: parseFloat(stats.avg_duration) || 0,
    averageAltitude: parseFloat(stats.avg_altitude) || 0,
    maxAltitude: parseFloat(stats.max_altitude) || 0,
    averageSpeed: parseFloat(stats.avg_speed) || 0,
    maxSpeed: parseFloat(stats.max_speed) || 0,
    batteryEfficiency: parseFloat(batteryResult.rows[0]?.efficiency) || 0,
    reliabilityScore: parseFloat(reliabilityResult.rows[0]?.reliability) || 0,
    lastFlightDate: stats.last_flight ? new Date(stats.last_flight).toISOString() : null,
    favoriteFlightMode: modeResult.rows[0]?.flight_mode || null,
  };
}

/**
 * Calculate health score for a flight
 */
export async function calculateHealthScore(
  flightId: string,
  userId: string
): Promise<{
  safety: number;
  smoothness: number;
  battery_efficiency: number;
  risk_exposure: number;
  overall: number;
}> {
  // Verify flight belongs to user
  const flightCheck = await query(
    'SELECT id FROM flights WHERE id = $1 AND user_id = $2',
    [flightId, userId]
  );

  if (flightCheck.rows.length === 0) {
    throw new Error('Flight not found');
  }

  // Get flight statistics
  const statsResult = await query(
    `SELECT 
      max_altitude_meters,
      max_speed_mps,
      min_battery_percent,
      total_distance_meters,
      duration_seconds,
      health_score
    FROM flights
    WHERE id = $1`,
    [flightId]
  );

  const stats = statsResult.rows[0];

  // Get telemetry data for analysis
  const telemetryResult = await query(
    `SELECT 
      altitude_meters,
      speed_mps,
      battery_percent,
      heading_degrees
    FROM telemetry
    WHERE flight_id = $1
    ORDER BY timestamp ASC`,
    [flightId]
  );

  const telemetry = telemetryResult.rows;

  // Calculate safety score (based on altitude, speed, battery)
  let safety = 100;
  if (stats.max_altitude_meters > 400) safety -= 20; // Too high
  if (stats.max_speed_mps > 30) safety -= 15; // Too fast
  if (stats.min_battery_percent < 20) safety -= 25; // Low battery
  if (stats.min_battery_percent < 10) safety -= 30; // Critical battery
  safety = Math.max(0, safety);

  // Calculate smoothness (based on altitude/speed variations)
  let smoothness = 100;
  if (telemetry.length > 1) {
    let altitudeVariance = 0;
    let speedVariance = 0;
    
    for (let i = 1; i < telemetry.length; i++) {
      const altDiff = Math.abs(telemetry[i].altitude_meters - telemetry[i - 1].altitude_meters);
      const speedDiff = Math.abs((telemetry[i].speed_mps || 0) - (telemetry[i - 1].speed_mps || 0));
      altitudeVariance += altDiff;
      speedVariance += speedDiff;
    }
    
    const avgAltVariance = altitudeVariance / (telemetry.length - 1);
    const avgSpeedVariance = speedVariance / (telemetry.length - 1);
    
    if (avgAltVariance > 5) smoothness -= 20; // Erratic altitude
    if (avgSpeedVariance > 3) smoothness -= 15; // Erratic speed
  }
  smoothness = Math.max(0, smoothness);

  // Calculate battery efficiency
  let batteryEfficiency = 100;
  if (stats.min_battery_percent && stats.total_distance_meters) {
    const batteryUsed = 100 - stats.min_battery_percent;
    const efficiency = stats.total_distance_meters / batteryUsed;
    if (efficiency < 10) batteryEfficiency = 50; // Poor efficiency
    else if (efficiency < 20) batteryEfficiency = 75; // Average efficiency
    // Good efficiency = 100
  }

  // Calculate risk exposure (based on danger zone violations)
  const violationsResult = await query(
    `SELECT COUNT(*)::INTEGER as count
    FROM zone_violations
    WHERE flight_id = $1`,
    [flightId]
  );

  let riskExposure = 100;
  const violations = parseInt(violationsResult.rows[0]?.count) || 0;
  riskExposure -= violations * 20; // Each violation reduces score
  riskExposure = Math.max(0, riskExposure);

  // Calculate overall score (weighted average)
  const overall = Math.round(
    (safety * 0.3) +
    (smoothness * 0.2) +
    (batteryEfficiency * 0.2) +
    (riskExposure * 0.3)
  );

  // Update flight health score
  await query(
    'UPDATE flights SET health_score = $1 WHERE id = $2',
    [overall, flightId]
  );

  return {
    safety: Math.round(safety),
    smoothness: Math.round(smoothness),
    battery_efficiency: Math.round(batteryEfficiency),
    risk_exposure: Math.round(riskExposure),
    overall,
  };
}

/**
 * Generate risk events timeline for a flight
 */
export async function generateRiskEvents(
  flightId: string,
  userId: string
): Promise<Array<{
  timestamp: string;
  type: string;
  severity: string;
  description: string;
  data?: any;
}>> {
  // Verify flight belongs to user
  const flightCheck = await query(
    'SELECT id FROM flights WHERE id = $1 AND user_id = $2',
    [flightId, userId]
  );

  if (flightCheck.rows.length === 0) {
    throw new Error('Flight not found');
  }

  const events: Array<{
    timestamp: string;
    type: string;
    severity: string;
    description: string;
    data?: any;
  }> = [];

  // Get danger zone violations
  const violationsResult = await query(
    `SELECT 
      zv.entered_at,
      zv.exited_at,
      dz.name as zone_name,
      dz.zone_type
    FROM zone_violations zv
    JOIN danger_zones dz ON zv.danger_zone_id = dz.id
    WHERE zv.flight_id = $1
    ORDER BY zv.entered_at ASC`,
    [flightId]
  );

  violationsResult.rows.forEach((violation: any) => {
    events.push({
      timestamp: new Date(violation.entered_at).toISOString(),
      type: 'danger_zone_violation',
      severity: violation.zone_type === 'restricted' || violation.zone_type === 'airport' ? 'critical' : 'warning',
      description: `Entered danger zone: ${violation.zone_name}`,
      data: {
        zone_type: violation.zone_type,
        exited_at: violation.exited_at ? new Date(violation.exited_at).toISOString() : null,
      },
    });
  });

  // Get low battery events
  const lowBatteryResult = await query(
    `SELECT timestamp, battery_percent
    FROM telemetry
    WHERE flight_id = $1
      AND battery_percent < 20
    ORDER BY timestamp ASC`,
    [flightId]
  );

  lowBatteryResult.rows.forEach((point: any) => {
    events.push({
      timestamp: new Date(point.timestamp).toISOString(),
      type: 'low_battery',
      severity: point.battery_percent < 10 ? 'critical' : 'warning',
      description: `Low battery: ${point.battery_percent}%`,
      data: {
        battery_percent: point.battery_percent,
      },
    });
  });

  // Get high altitude events
  const highAltitudeResult = await query(
    `SELECT timestamp, altitude_meters
    FROM telemetry
    WHERE flight_id = $1
      AND altitude_meters > 400
    ORDER BY timestamp ASC`,
    [flightId]
  );

  highAltitudeResult.rows.forEach((point: any) => {
    events.push({
      timestamp: new Date(point.timestamp).toISOString(),
      type: 'high_altitude',
      severity: point.altitude_meters > 500 ? 'critical' : 'warning',
      description: `High altitude: ${point.altitude_meters.toFixed(1)}m`,
      data: {
        altitude_meters: point.altitude_meters,
      },
    });
  });

  // Sort events by timestamp
  events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  return events;
}
