/**
 * Database type definitions
 * These types match the PostgreSQL schema
 */

export interface User {
  id: string;
  email: string;
  password_hash: string;
  name: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: Date;
  updated_at: Date;
  last_login: Date | null;
  is_active: boolean;
}

export interface Drone {
  id: string;
  user_id: string;
  name: string;
  model: string | null;
  manufacturer: string | null;
  firmware_version: string | null;
  device_token: string;
  created_at: Date;
  updated_at: Date;
  is_active: boolean;
  metadata: Record<string, any>;
}

export interface Flight {
  id: string;
  drone_id: string;
  user_id: string;
  session_id: string;
  started_at: Date;
  ended_at: Date | null;
  status: 'active' | 'completed' | 'cancelled';
  duration_seconds: number | null;
  total_distance_meters: number | null;
  max_altitude_meters: number | null;
  max_speed_mps: number | null;
  min_battery_percent: number | null;
  flight_path: string | null; // PostGIS geometry as WKT
  start_position: string | null; // PostGIS point as WKT
  end_position: string | null; // PostGIS point as WKT
  health_score: HealthScore | null;
  risk_events: RiskEvent[];
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface Telemetry {
  id: string;
  flight_id: string;
  drone_id: string;
  timestamp: Date;
  position: string; // PostGIS point as WKT
  altitude_meters: number;
  speed_mps: number;
  heading_degrees: number | null;
  battery_percent: number;
  flight_mode: string | null;
  is_armed: boolean;
  raw_data: Record<string, any>;
  created_at: Date;
}

export interface DangerZone {
  id: string;
  user_id: string | null;
  name: string;
  description: string | null;
  zone_type: 'user' | 'community' | 'airport' | 'restricted';
  geometry: string; // PostGIS polygon as WKT
  altitude_limit_meters: number | null;
  is_active: boolean;
  is_public: boolean;
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface ZoneViolation {
  id: string;
  flight_id: string;
  danger_zone_id: string;
  telemetry_id: string | null;
  entered_at: Date;
  exited_at: Date | null;
  duration_seconds: number | null;
  max_altitude_meters: number | null;
  severity: 'info' | 'warning' | 'critical';
  acknowledged: boolean;
  created_at: Date;
}

export interface FlightAnalytics {
  id: string;
  flight_id: string;
  user_id: string;
  computed_at: Date;
  metrics: Record<string, any>;
  created_at: Date;
}

// Health Score types
export interface HealthScore {
  safety: number; // 0-100
  smoothness: number; // 0-100
  battery_efficiency: number; // 0-100
  risk_exposure: number; // 0-100 (lower is better)
  overall: number; // 0-100
}

// Risk Event types
export interface RiskEvent {
  id: string;
  timestamp: Date;
  type: 'zone_violation' | 'low_battery' | 'high_speed' | 'high_altitude' | 'signal_loss' | 'other';
  severity: 'info' | 'warning' | 'critical';
  description: string;
  metadata: Record<string, any>;
}

// Telemetry input types
export interface TelemetryInput {
  droneId: string;
  timestamp: string | Date;
  latitude: number;
  longitude: number;
  altitude: number;
  speed: number;
  heading?: number;
  battery: number;
  flightMode?: string;
  armed?: boolean;
  [key: string]: any; // Additional fields
}
