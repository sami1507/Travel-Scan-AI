-- AI Verification Log
-- Stores async Claude verification results for monitoring and quality analysis

CREATE TABLE IF NOT EXISTS ai_verification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  destination TEXT NOT NULL,
  valid BOOLEAN NOT NULL DEFAULT true,
  issues JSONB NOT NULL DEFAULT '[]'::jsonb,
  confidence NUMERIC(4, 3) NOT NULL DEFAULT 0.8,
  accuracy_notes JSONB NOT NULL DEFAULT '[]'::jsonb,
  corrected_warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
  suggested_score_adjustment INTEGER,
  model TEXT NOT NULL,
  trip_length INTEGER,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for querying by destination and recency
CREATE INDEX IF NOT EXISTS idx_ai_verification_log_destination ON ai_verification_log (destination);
CREATE INDEX IF NOT EXISTS idx_ai_verification_log_verified_at ON ai_verification_log (verified_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_verification_log_valid ON ai_verification_log (valid);

-- RLS: only service role can insert/read (server-side only)
ALTER TABLE ai_verification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only" ON ai_verification_log
  FOR ALL
  USING (auth.role() = 'service_role');
