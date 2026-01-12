/**
 * Frontend type definitions
 */

export interface User {
  id: string;
  email: string;
  name: string | null;
  created_at: string;
  last_login: string | null;
}

export interface Drone {
  id: string;
  user_id: string;
  name: string;
  model: string | null;
  manufacturer: string | null;
  firmware_version: string | null;
  device_token: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  metadata: Record<string, any>;
}

export interface Flight {
  id: string;
  drone_id: string;
  user_id: string;
  session_id: string;
  started_at: string;
  ended_at: string | null;
  status: 'active' | 'completed' | 'cancelled';
  duration_seconds: number | null;
  total_distance_meters: number | null;
  max_altitude_meters: number | null;
  max_speed_mps: number | null;
  min_battery_percent: number | null;
  flight_path: string | null;
  start_position: string | null;
  end_position: string | null;
  health_score: HealthScore | null;
  risk_events: RiskEvent[];
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Telemetry {
  id: string;
  flight_id: string;
  drone_id: string;
  timestamp: string;
  position: string; // WKT format
  altitude_meters: number;
  speed_mps: number;
  heading_degrees: number | null;
  battery_percent: number;
  flight_mode: string | null;
  is_armed: boolean;
  raw_data: Record<string, any>;
  created_at: string;
}

export interface DangerZone {
  id: string;
  user_id: string | null;
  name: string;
  description: string | null;
  zone_type: 'user' | 'community' | 'airport' | 'restricted';
  geometry: string; // WKT format
  altitude_limit_meters: number | null;
  is_active: boolean;
  is_public: boolean;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface HealthScore {
  safety: number;
  smoothness: number;
  battery_efficiency: number;
  risk_exposure: number;
  overall: number;
}

export interface RiskEvent {
  id: string;
  timestamp: string;
  type: 'zone_violation' | 'low_battery' | 'high_speed' | 'high_altitude' | 'signal_loss' | 'other';
  severity: 'info' | 'warning' | 'critical';
  description: string;
  metadata: Record<string, any>;
}
