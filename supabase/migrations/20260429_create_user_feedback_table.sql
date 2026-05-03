-- Create user_feedback table for tracking user interactions with travel recommendations
-- This enables future personalization, analytics, and recommendation tuning

CREATE TABLE IF NOT EXISTS user_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN (
    'thumbs-up',
    'thumbs-down',
    'save-trip',
    'select-destination',
    'dismiss-recommendation',
    'view-details'
  )),
  analysis_id TEXT,
  destination_id TEXT,
  destination_name TEXT,
  recommendation_rank INTEGER,
  total_score NUMERIC,
  category_scores JSONB,
  query_context JSONB,
  feedback_metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_user_feedback_user_id ON user_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_user_feedback_destination_id ON user_feedback(destination_id);
CREATE INDEX IF NOT EXISTS idx_user_feedback_feedback_type ON user_feedback(feedback_type);
CREATE INDEX IF NOT EXISTS idx_user_feedback_created_at ON user_feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_feedback_session_id ON user_feedback(session_id);

-- Enable Row Level Security
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert their own feedback
CREATE POLICY user_feedback_insert_policy ON user_feedback
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can view their own feedback
CREATE POLICY user_feedback_select_policy ON user_feedback
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Service role can access all feedback (for analytics)
CREATE POLICY user_feedback_service_role_policy ON user_feedback
  FOR ALL
  USING (auth.role() = 'service_role');

-- Comment on table
COMMENT ON TABLE user_feedback IS 'Tracks user interactions with travel recommendations for personalization and analytics';
COMMENT ON COLUMN user_feedback.feedback_type IS 'Type of user interaction: thumbs-up, thumbs-down, save-trip, select-destination, dismiss-recommendation, view-details';
COMMENT ON COLUMN user_feedback.category_scores IS 'JSON object containing category scores for the destination at time of feedback';
COMMENT ON COLUMN user_feedback.query_context IS 'JSON object containing the original query context (query, budget, travel_months, interests)';
COMMENT ON COLUMN user_feedback.feedback_metadata IS 'Additional metadata about the feedback event';
