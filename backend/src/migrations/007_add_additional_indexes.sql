-- Additional performance indexes
-- Further optimizations for common query patterns

-- Index for flights by user_id and started_at (for user flight history)
CREATE INDEX IF NOT EXISTS idx_flights_user_started_at 
ON flights(user_id, started_at DESC);

-- Index for telemetry by flight_id, timestamp, and position (for flight replay)
CREATE INDEX IF NOT EXISTS idx_telemetry_flight_timestamp_position 
ON telemetry(flight_id, timestamp ASC) 
INCLUDE (position, altitude_meters, speed_mps, battery_percent);

-- Partial index for active flights only (smaller, faster)
CREATE INDEX IF NOT EXISTS idx_flights_active_only 
ON flights(user_id, started_at DESC) 
WHERE status = 'active';

-- Index for danger zones by user_id and is_active (for user's zones)
CREATE INDEX IF NOT EXISTS idx_danger_zones_user_active 
ON danger_zones(user_id, is_active) 
WHERE user_id IS NOT NULL AND is_active = true;

-- Index for analytics by user_id and computed_at (for dashboard)
CREATE INDEX IF NOT EXISTS idx_flight_analytics_user_computed 
ON flight_analytics(user_id, computed_at DESC);

-- Index for zone violations by entered_at (for time-based queries)
CREATE INDEX IF NOT EXISTS idx_zone_violations_entered_at 
ON zone_violations(entered_at DESC) 
WHERE exited_at IS NULL;
