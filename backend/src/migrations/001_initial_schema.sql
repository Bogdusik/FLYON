-- FLYON Database Schema
-- PostgreSQL with PostGIS extension

-- Enable PostGIS extension for geospatial data
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);

-- Drones table
CREATE TABLE drones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  model VARCHAR(255),
  manufacturer VARCHAR(255),
  firmware_version VARCHAR(100),
  device_token VARCHAR(255) UNIQUE NOT NULL, -- For telemetry authentication
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb -- Store additional drone-specific data
);

CREATE INDEX idx_drones_user_id ON drones(user_id);
CREATE INDEX idx_drones_device_token ON drones(device_token);
CREATE INDEX idx_drones_created_at ON drones(created_at);

-- Flight sessions table
CREATE TABLE flights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  drone_id UUID NOT NULL REFERENCES drones(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id VARCHAR(255) UNIQUE NOT NULL, -- External session identifier
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ended_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(50) DEFAULT 'active', -- active, completed, cancelled
  duration_seconds INTEGER,
  total_distance_meters NUMERIC(12, 2),
  max_altitude_meters NUMERIC(8, 2),
  max_speed_mps NUMERIC(8, 2),
  min_battery_percent NUMERIC(5, 2),
  flight_path GEOMETRY(LINESTRING, 4326), -- PostGIS geometry for flight path
  start_position GEOMETRY(POINT, 4326),
  end_position GEOMETRY(POINT, 4326),
  health_score JSONB, -- { safety, smoothness, battery_efficiency, risk_exposure, overall }
  risk_events JSONB DEFAULT '[]'::jsonb, -- Array of risk event objects
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_flights_drone_id ON flights(drone_id);
CREATE INDEX idx_flights_user_id ON flights(user_id);
CREATE INDEX idx_flights_session_id ON flights(session_id);
CREATE INDEX idx_flights_started_at ON flights(started_at);
CREATE INDEX idx_flights_status ON flights(status);
-- PostGIS spatial index for flight paths
CREATE INDEX idx_flights_flight_path ON flights USING GIST(flight_path);
CREATE INDEX idx_flights_start_position ON flights USING GIST(start_position);
CREATE INDEX idx_flights_end_position ON flights USING GIST(end_position);

-- Telemetry points table
-- Stores individual telemetry readings during flights
CREATE TABLE telemetry (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  flight_id UUID NOT NULL REFERENCES flights(id) ON DELETE CASCADE,
  drone_id UUID NOT NULL REFERENCES drones(id) ON DELETE CASCADE,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  position GEOMETRY(POINT, 4326) NOT NULL, -- PostGIS point (lat, lon)
  altitude_meters NUMERIC(8, 2) NOT NULL,
  speed_mps NUMERIC(8, 2) NOT NULL,
  heading_degrees NUMERIC(6, 2),
  battery_percent NUMERIC(5, 2) NOT NULL,
  flight_mode VARCHAR(50),
  is_armed BOOLEAN DEFAULT false,
  raw_data JSONB DEFAULT '{}'::jsonb, -- Store additional telemetry fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_telemetry_flight_id ON telemetry(flight_id);
CREATE INDEX idx_telemetry_drone_id ON telemetry(drone_id);
CREATE INDEX idx_telemetry_timestamp ON telemetry(timestamp);
-- PostGIS spatial index for position queries
CREATE INDEX idx_telemetry_position ON telemetry USING GIST(position);
-- Composite index for flight timeline queries
CREATE INDEX idx_telemetry_flight_timestamp ON telemetry(flight_id, timestamp);

-- Danger zones table
-- User-defined and community no-fly zones
CREATE TABLE danger_zones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- NULL for community zones
  name VARCHAR(255) NOT NULL,
  description TEXT,
  zone_type VARCHAR(50) NOT NULL, -- user, community, airport, restricted
  geometry GEOMETRY(POLYGON, 4326) NOT NULL, -- PostGIS polygon
  altitude_limit_meters NUMERIC(8, 2), -- Optional altitude restriction
  is_active BOOLEAN DEFAULT true,
  is_public BOOLEAN DEFAULT false, -- Community zones are public
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_danger_zones_user_id ON danger_zones(user_id);
CREATE INDEX idx_danger_zones_type ON danger_zones(zone_type);
CREATE INDEX idx_danger_zones_active ON danger_zones(is_active);
-- PostGIS spatial index for zone queries
CREATE INDEX idx_danger_zones_geometry ON danger_zones USING GIST(geometry);

-- Zone violations table
-- Tracks when flights enter danger zones
CREATE TABLE zone_violations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  flight_id UUID NOT NULL REFERENCES flights(id) ON DELETE CASCADE,
  danger_zone_id UUID NOT NULL REFERENCES danger_zones(id) ON DELETE CASCADE,
  telemetry_id UUID REFERENCES telemetry(id) ON DELETE SET NULL,
  entered_at TIMESTAMP WITH TIME ZONE NOT NULL,
  exited_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  max_altitude_meters NUMERIC(8, 2),
  severity VARCHAR(50) DEFAULT 'warning', -- info, warning, critical
  acknowledged BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_zone_violations_flight_id ON zone_violations(flight_id);
CREATE INDEX idx_zone_violations_danger_zone_id ON zone_violations(danger_zone_id);
CREATE INDEX idx_zone_violations_entered_at ON zone_violations(entered_at);

-- Flight analytics cache table
-- Pre-computed analytics for faster dashboard loading
CREATE TABLE flight_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  flight_id UUID UNIQUE NOT NULL REFERENCES flights(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  computed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metrics JSONB NOT NULL, -- Comprehensive flight metrics
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_flight_analytics_flight_id ON flight_analytics(flight_id);
CREATE INDEX idx_flight_analytics_user_id ON flight_analytics(user_id);

-- Update timestamps trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_drones_updated_at BEFORE UPDATE ON drones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_flights_updated_at BEFORE UPDATE ON flights
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_danger_zones_updated_at BEFORE UPDATE ON danger_zones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
