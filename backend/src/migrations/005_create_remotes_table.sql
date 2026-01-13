-- Remote controllers table (RadioMaster Pocket only)
CREATE TABLE remotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL DEFAULT 'radiomaster', -- Only 'radiomaster' supported
  name VARCHAR(255) NOT NULL,
  model VARCHAR(255),
  status VARCHAR(50) DEFAULT 'disconnected', -- 'connected', 'disconnected', 'connecting'
  last_connected TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb, -- Store remote-specific data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_remotes_user_id ON remotes(user_id);
CREATE INDEX idx_remotes_type ON remotes(type);
CREATE INDEX idx_remotes_status ON remotes(status);
CREATE INDEX idx_remotes_created_at ON remotes(created_at);

-- Apply updated_at trigger
CREATE TRIGGER update_remotes_updated_at BEFORE UPDATE ON remotes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
