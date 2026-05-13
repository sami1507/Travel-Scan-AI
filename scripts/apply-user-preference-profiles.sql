-- User Preference Profiles Table (Learning Layer)
CREATE TABLE IF NOT EXISTS user_preference_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  preferred_trip_structures JSONB DEFAULT '{}'::jsonb,
  preferred_interests JSONB DEFAULT '{}'::jsonb,
  preferred_budget_level TEXT,
  fatigue_tolerance TEXT DEFAULT 'unknown',
  route_complexity_preference TEXT DEFAULT 'unknown',
  learned_weights JSONB DEFAULT '{}'::jsonb,
  confidence_score NUMERIC DEFAULT 0,
  signal_count INTEGER DEFAULT 0
);

-- Enable RLS
ALTER TABLE user_preference_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own preference profile" ON user_preference_profiles;
DROP POLICY IF EXISTS "Users can update their own preference profile" ON user_preference_profiles;
DROP POLICY IF EXISTS "Service role can insert preference profiles" ON user_preference_profiles;
DROP POLICY IF EXISTS "Service role can update preference profiles" ON user_preference_profiles;

-- Create RLS policies
CREATE POLICY "Users can view their own preference profile"
  ON user_preference_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own preference profile"
  ON user_preference_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert preference profiles"
  ON user_preference_profiles FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update preference profiles"
  ON user_preference_profiles FOR UPDATE
  USING (true);

-- Grant permissions
GRANT ALL ON user_preference_profiles TO service_role;
GRANT SELECT, UPDATE ON user_preference_profiles TO authenticated;
