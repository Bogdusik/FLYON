-- Betaflight configuration storage
CREATE TABLE betaflight_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  drone_id UUID NOT NULL REFERENCES drones(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  config_data JSONB NOT NULL, -- Parsed config structure
  config_text TEXT NOT NULL, -- Original diff/dump text
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_betaflight_configs_drone_id ON betaflight_configs(drone_id);
CREATE INDEX idx_betaflight_configs_user_id ON betaflight_configs(user_id);
CREATE INDEX idx_betaflight_configs_created_at ON betaflight_configs(created_at);

-- Blackbox logs storage
CREATE TABLE blackbox_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  flight_id UUID REFERENCES flights(id) ON DELETE CASCADE,
  drone_id UUID NOT NULL REFERENCES drones(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_size BIGINT,
  analysis_data JSONB, -- Analyzed blackbox data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_blackbox_logs_flight_id ON blackbox_logs(flight_id);
CREATE INDEX idx_blackbox_logs_drone_id ON blackbox_logs(drone_id);
CREATE INDEX idx_blackbox_logs_user_id ON blackbox_logs(user_id);

-- Flight sharing (public links)
CREATE TABLE flight_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  flight_id UUID NOT NULL REFERENCES flights(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  share_token VARCHAR(255) UNIQUE NOT NULL,
  is_public BOOLEAN DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_flight_shares_flight_id ON flight_shares(flight_id);
CREATE INDEX idx_flight_shares_share_token ON flight_shares(share_token);
CREATE INDEX idx_flight_shares_user_id ON flight_shares(user_id);

-- User achievements/badges
CREATE TABLE user_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_type VARCHAR(50) NOT NULL, -- 'first_flight', '100_flights', 'speed_demon', etc.
  achievement_data JSONB,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX idx_user_achievements_type ON user_achievements(achievement_type);

-- Public user profiles
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_public_profile BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS profile_bio TEXT,
ADD COLUMN IF NOT EXISTS profile_avatar_url TEXT,
ADD COLUMN IF NOT EXISTS total_flights_public INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_hours_public NUMERIC(10, 2) DEFAULT 0;
