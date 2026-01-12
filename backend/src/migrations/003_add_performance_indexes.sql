-- Performance optimization indexes
-- Improves query performance for common operations

-- Index for flights by user_id and status (most common query)
CREATE INDEX IF NOT EXISTS idx_flights_user_status 
ON flights(user_id, status) 
WHERE status IN ('active', 'completed');

-- Index for flights by started_at (for sorting)
CREATE INDEX IF NOT EXISTS idx_flights_started_at 
ON flights(started_at DESC);

-- Index for telemetry by flight_id and timestamp (for flight details)
CREATE INDEX IF NOT EXISTS idx_telemetry_flight_timestamp 
ON telemetry(flight_id, timestamp ASC);

-- Index for telemetry by drone_id and timestamp (for drone analytics)
CREATE INDEX IF NOT EXISTS idx_telemetry_drone_timestamp 
ON telemetry(drone_id, timestamp DESC);

-- Spatial index for danger zones geometry (for fast spatial queries)
CREATE INDEX IF NOT EXISTS idx_danger_zones_geometry 
ON danger_zones USING GIST(geometry);

-- Index for danger zones by is_active and is_public (for filtering)
CREATE INDEX IF NOT EXISTS idx_danger_zones_active_public 
ON danger_zones(is_active, is_public) 
WHERE is_active = true;

-- Index for zone_violations by flight_id (for violation queries)
CREATE INDEX IF NOT EXISTS idx_zone_violations_flight 
ON zone_violations(flight_id, entered_at DESC);

-- Index for users by email (for login queries)
CREATE INDEX IF NOT EXISTS idx_users_email 
ON users(email);

-- Index for drones by user_id and is_active (for user's drones)
CREATE INDEX IF NOT EXISTS idx_drones_user_active 
ON drones(user_id, is_active) 
WHERE is_active = true;

-- Composite index for telemetry position queries (if needed)
-- Note: PostGIS automatically creates spatial indexes, but we can optimize further
CREATE INDEX IF NOT EXISTS idx_telemetry_position 
ON telemetry USING GIST(position);

-- Index for flights by session_id (for session lookup)
CREATE INDEX IF NOT EXISTS idx_flights_session_id 
ON flights(session_id);

-- Index for telemetry by timestamp (for time-based queries)
CREATE INDEX IF NOT EXISTS idx_telemetry_timestamp 
ON telemetry(timestamp DESC);
