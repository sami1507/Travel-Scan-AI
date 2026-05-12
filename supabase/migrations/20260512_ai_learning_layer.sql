-- AI Learning Layer Migration
-- Phase 1: Recommendation events, feedback signals, and user preference profiles

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- AI Recommendation Events Table
CREATE TABLE IF NOT EXISTS ai_recommendation_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  input_hash TEXT NOT NULL,
  departure TEXT,
  passport_country TEXT,
  budget_level TEXT,
  currency TEXT,
  trip_length INTEGER,
  season TEXT,
  travel_months JSONB DEFAULT '[]'::jsonb,
  interests JSONB DEFAULT '[]'::jsonb,
  accommodation_preference TEXT,
  trip_structure TEXT,
  provider_used TEXT,
  claude_verifier_used BOOLEAN DEFAULT false,
  fallback_used BOOLEAN DEFAULT false,
  recommendation_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- AI Recommendation Items Table
CREATE TABLE IF NOT EXISTS ai_recommendation_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES ai_recommendation_events(id) ON DELETE CASCADE,
  rank INTEGER NOT NULL,
  destination_title TEXT,
  trip_type TEXT,
  suggested_route JSONB DEFAULT '[]'::jsonb,
  recommended_nights JSONB DEFAULT '{}'::jsonb,
  total_score NUMERIC,
  route_realism_score NUMERIC,
  travel_fatigue_level TEXT,
  transport_logic TEXT,
  warnings JSONB DEFAULT '[]'::jsonb,
  alternatives JSONB DEFAULT '[]'::jsonb,
  provider_source TEXT,
  claude_verified BOOLEAN DEFAULT false,
  claude_accuracy_notes JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Feedback Signals Table
CREATE TABLE IF NOT EXISTS ai_feedback_signals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_id UUID NOT NULL REFERENCES ai_recommendation_events(id) ON DELETE CASCADE,
  recommendation_item_id UUID REFERENCES ai_recommendation_items(id) ON DELETE SET NULL,
  signal_type TEXT NOT NULL,
  signal_value JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Preference Profiles Table
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_recommendation_events_user_id ON ai_recommendation_events(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_recommendation_events_created_at ON ai_recommendation_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_recommendation_events_input_hash ON ai_recommendation_events(input_hash);
CREATE INDEX IF NOT EXISTS idx_ai_recommendation_items_event_id ON ai_recommendation_items(event_id);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_signals_user_id ON ai_feedback_signals(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_signals_event_id ON ai_feedback_signals(event_id);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_signals_created_at ON ai_feedback_signals(created_at DESC);

-- Row Level Security Policies

-- ai_recommendation_events RLS
ALTER TABLE ai_recommendation_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own recommendation events"
  ON ai_recommendation_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert recommendation events"
  ON ai_recommendation_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update recommendation events"
  ON ai_recommendation_events FOR UPDATE
  USING (true);

-- ai_recommendation_items RLS
ALTER TABLE ai_recommendation_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own recommendation items"
  ON ai_recommendation_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ai_recommendation_events
      WHERE ai_recommendation_events.id = ai_recommendation_items.event_id
      AND ai_recommendation_events.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can insert recommendation items"
  ON ai_recommendation_items FOR INSERT
  WITH CHECK (true);

-- ai_feedback_signals RLS
ALTER TABLE ai_feedback_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own feedback signals"
  ON ai_feedback_signals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own feedback signals"
  ON ai_feedback_signals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can insert feedback signals"
  ON ai_feedback_signals FOR INSERT
  WITH CHECK (true);

-- user_preference_profiles RLS
ALTER TABLE user_preference_profiles ENABLE ROW LEVEL SECURITY;

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

-- Grant permissions to service role
GRANT ALL ON ai_recommendation_events TO service_role;
GRANT ALL ON ai_recommendation_items TO service_role;
GRANT ALL ON ai_feedback_signals TO service_role;
GRANT ALL ON user_preference_profiles TO service_role;

-- Grant select to authenticated users (limited by RLS)
GRANT SELECT ON ai_recommendation_events TO authenticated;
GRANT SELECT ON ai_recommendation_items TO authenticated;
GRANT SELECT, INSERT ON ai_feedback_signals TO authenticated;
GRANT SELECT, UPDATE ON user_preference_profiles TO authenticated;
