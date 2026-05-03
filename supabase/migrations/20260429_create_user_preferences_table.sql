-- Create user_preferences table for personalization
-- Stores both explicit (user-set) and inferred (from feedback) preferences

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Explicit preferences (user-configured)
  explicit_preferences JSONB,
  
  -- Inferred preferences (learned from feedback)
  inferred_preferences JSONB,
  
  -- Metadata
  feedback_count INTEGER DEFAULT 0,
  confidence NUMERIC DEFAULT 0 CHECK (confidence >= 0 AND confidence <= 1),
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_preferences_last_updated ON user_preferences(last_updated DESC);
CREATE INDEX IF NOT EXISTS idx_user_preferences_confidence ON user_preferences(confidence DESC);

-- Enable Row Level Security
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own preferences
CREATE POLICY user_preferences_select_policy ON user_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can update their own preferences
CREATE POLICY user_preferences_update_policy ON user_preferences
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own preferences
CREATE POLICY user_preferences_insert_policy ON user_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Service role can access all preferences
CREATE POLICY user_preferences_service_role_policy ON user_preferences
  FOR ALL
  USING (auth.role() = 'service_role');

-- Comments
COMMENT ON TABLE user_preferences IS 'User preference profiles for personalized recommendations';
COMMENT ON COLUMN user_preferences.explicit_preferences IS 'User-configured preferences (budget_sensitivity, nightlife_preference, etc.)';
COMMENT ON COLUMN user_preferences.inferred_preferences IS 'Preferences learned from user feedback (liked_categories, preferred_months, etc.)';
COMMENT ON COLUMN user_preferences.confidence IS 'Confidence in inferred preferences (0-1), based on feedback count and consistency';
COMMENT ON COLUMN user_preferences.feedback_count IS 'Number of feedback events used to infer preferences';
