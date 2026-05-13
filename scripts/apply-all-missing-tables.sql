-- Apply all missing TravelScan AI tables
-- Uses gen_random_uuid() which is available by default in Supabase

-- Enable pgcrypto extension (available by default in Supabase)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- CORE APPLICATION TABLES
-- ============================================================================

-- User Profiles Table
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  preferences JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);

-- Saved Analyses Table
CREATE TABLE IF NOT EXISTS saved_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  query_text TEXT,
  analysis_result JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_analyses_user_id ON saved_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_analyses_created_at ON saved_analyses(created_at DESC);

-- Saved Destinations Table
CREATE TABLE IF NOT EXISTS saved_destinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  destination_name TEXT NOT NULL,
  destination_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_destinations_user_id ON saved_destinations(user_id);

-- Saved Routes Table
CREATE TABLE IF NOT EXISTS saved_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  route_name TEXT,
  route_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_routes_user_id ON saved_routes(user_id);

-- User Feedback Table
CREATE TABLE IF NOT EXISTS user_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  feedback_type TEXT,
  feedback_text TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_feedback_user_id ON user_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_user_feedback_created_at ON user_feedback(created_at DESC);

-- User Alerts Table
CREATE TABLE IF NOT EXISTS user_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alert_type TEXT,
  alert_data JSONB,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_alerts_user_id ON user_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_alerts_is_read ON user_alerts(is_read);

-- User Notifications Table
CREATE TABLE IF NOT EXISTS user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT,
  notification_data JSONB,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_is_read ON user_notifications(is_read);

-- Alerts Table
CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT,
  alert_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at DESC);

-- Notification Events Table
CREATE TABLE IF NOT EXISTS notification_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT,
  event_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_events_created_at ON notification_events(created_at DESC);

-- Source Configs Table
CREATE TABLE IF NOT EXISTS source_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  source_type TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  polling_interval_minutes INTEGER DEFAULT 60,
  parser_settings JSONB DEFAULT '{}'::jsonb,
  last_run_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_source_configs_user_id ON source_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_source_configs_status ON source_configs(status);

-- Ingestion Runs Table
CREATE TABLE IF NOT EXISTS ingestion_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_config_id UUID NOT NULL REFERENCES source_configs(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'running',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  records_processed INTEGER DEFAULT 0,
  records_created INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_ingestion_runs_source_config_id ON ingestion_runs(source_config_id);
CREATE INDEX IF NOT EXISTS idx_ingestion_runs_status ON ingestion_runs(status);

-- Raw Payloads Table
CREATE TABLE IF NOT EXISTS raw_payloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingestion_run_id UUID NOT NULL REFERENCES ingestion_runs(id) ON DELETE CASCADE,
  source_config_id UUID NOT NULL REFERENCES source_configs(id) ON DELETE CASCADE,
  payload JSONB NOT NULL,
  received_at TIMESTAMPTZ DEFAULT NOW(),
  processed BOOLEAN DEFAULT false,
  processing_error TEXT
);

CREATE INDEX IF NOT EXISTS idx_raw_payloads_ingestion_run_id ON raw_payloads(ingestion_run_id);
CREATE INDEX IF NOT EXISTS idx_raw_payloads_processed ON raw_payloads(processed);

-- Normalized Records Table
CREATE TABLE IF NOT EXISTS normalized_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_payload_id UUID NOT NULL REFERENCES raw_payloads(id) ON DELETE CASCADE,
  source_config_id UUID NOT NULL REFERENCES source_configs(id) ON DELETE CASCADE,
  record_type TEXT NOT NULL,
  normalized_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_normalized_records_source_config_id ON normalized_records(source_config_id);
CREATE INDEX IF NOT EXISTS idx_normalized_records_record_type ON normalized_records(record_type);

-- Record Snapshots Table
CREATE TABLE IF NOT EXISTS record_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  normalized_record_id UUID NOT NULL REFERENCES normalized_records(id) ON DELETE CASCADE,
  snapshot_data JSONB NOT NULL,
  snapshot_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_record_snapshots_normalized_record_id ON record_snapshots(normalized_record_id);

-- Change Events Table
CREATE TABLE IF NOT EXISTS change_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  normalized_record_id UUID NOT NULL REFERENCES normalized_records(id) ON DELETE CASCADE,
  change_type TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  detected_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_change_events_normalized_record_id ON change_events(normalized_record_id);
CREATE INDEX IF NOT EXISTS idx_change_events_detected_at ON change_events(detected_at DESC);

-- Scan Results Table
CREATE TABLE IF NOT EXISTS scan_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  scan_type TEXT,
  scan_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scan_results_user_id ON scan_results(user_id);
CREATE INDEX IF NOT EXISTS idx_scan_results_created_at ON scan_results(created_at DESC);

-- Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- ============================================================================
-- LEARNING LAYER TABLE (MISSING)
-- ============================================================================

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

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- User Profiles RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
CREATE POLICY "Users can view their own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
CREATE POLICY "Users can insert their own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Saved Analyses RLS
ALTER TABLE saved_analyses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own analyses" ON saved_analyses;
CREATE POLICY "Users can view their own analyses"
  ON saved_analyses FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own analyses" ON saved_analyses;
CREATE POLICY "Users can insert their own analyses"
  ON saved_analyses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own analyses" ON saved_analyses;
CREATE POLICY "Users can update their own analyses"
  ON saved_analyses FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own analyses" ON saved_analyses;
CREATE POLICY "Users can delete their own analyses"
  ON saved_analyses FOR DELETE
  USING (auth.uid() = user_id);

-- Saved Destinations RLS
ALTER TABLE saved_destinations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own destinations" ON saved_destinations;
CREATE POLICY "Users can view their own destinations"
  ON saved_destinations FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own destinations" ON saved_destinations;
CREATE POLICY "Users can insert their own destinations"
  ON saved_destinations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own destinations" ON saved_destinations;
CREATE POLICY "Users can delete their own destinations"
  ON saved_destinations FOR DELETE
  USING (auth.uid() = user_id);

-- Saved Routes RLS
ALTER TABLE saved_routes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own routes" ON saved_routes;
CREATE POLICY "Users can view their own routes"
  ON saved_routes FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own routes" ON saved_routes;
CREATE POLICY "Users can insert their own routes"
  ON saved_routes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own routes" ON saved_routes;
CREATE POLICY "Users can delete their own routes"
  ON saved_routes FOR DELETE
  USING (auth.uid() = user_id);

-- User Feedback RLS
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own feedback" ON user_feedback;
CREATE POLICY "Users can view their own feedback"
  ON user_feedback FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own feedback" ON user_feedback;
CREATE POLICY "Users can insert their own feedback"
  ON user_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- User Alerts RLS
ALTER TABLE user_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own alerts" ON user_alerts;
CREATE POLICY "Users can view their own alerts"
  ON user_alerts FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own alerts" ON user_alerts;
CREATE POLICY "Users can update their own alerts"
  ON user_alerts FOR UPDATE
  USING (auth.uid() = user_id);

-- User Notifications RLS
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own notifications" ON user_notifications;
CREATE POLICY "Users can view their own notifications"
  ON user_notifications FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notifications" ON user_notifications;
CREATE POLICY "Users can update their own notifications"
  ON user_notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Source Configs RLS
ALTER TABLE source_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own source configs" ON source_configs;
CREATE POLICY "Users can view their own source configs"
  ON source_configs FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own source configs" ON source_configs;
CREATE POLICY "Users can manage their own source configs"
  ON source_configs FOR ALL
  USING (auth.uid() = user_id);

-- Ingestion Runs RLS
ALTER TABLE ingestion_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own ingestion runs" ON ingestion_runs;
CREATE POLICY "Users can view their own ingestion runs"
  ON ingestion_runs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM source_configs
      WHERE source_configs.id = ingestion_runs.source_config_id
      AND source_configs.user_id = auth.uid()
    )
  );

-- Raw Payloads RLS
ALTER TABLE raw_payloads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own raw payloads" ON raw_payloads;
CREATE POLICY "Users can view their own raw payloads"
  ON raw_payloads FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM source_configs
      WHERE source_configs.id = raw_payloads.source_config_id
      AND source_configs.user_id = auth.uid()
    )
  );

-- Normalized Records RLS
ALTER TABLE normalized_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own normalized records" ON normalized_records;
CREATE POLICY "Users can view their own normalized records"
  ON normalized_records FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM source_configs
      WHERE source_configs.id = normalized_records.source_config_id
      AND source_configs.user_id = auth.uid()
    )
  );

-- Scan Results RLS
ALTER TABLE scan_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own scan results" ON scan_results;
CREATE POLICY "Users can view their own scan results"
  ON scan_results FOR SELECT
  USING (auth.uid() = user_id);

-- User Preference Profiles RLS
ALTER TABLE user_preference_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own preference profile" ON user_preference_profiles;
CREATE POLICY "Users can view their own preference profile"
  ON user_preference_profiles FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own preference profile" ON user_preference_profiles;
CREATE POLICY "Users can update their own preference profile"
  ON user_preference_profiles FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can insert preference profiles" ON user_preference_profiles;
CREATE POLICY "Service role can insert preference profiles"
  ON user_preference_profiles FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can update preference profiles" ON user_preference_profiles;
CREATE POLICY "Service role can update preference profiles"
  ON user_preference_profiles FOR UPDATE
  USING (true);

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant to service_role
GRANT ALL ON user_profiles TO service_role;
GRANT ALL ON saved_analyses TO service_role;
GRANT ALL ON saved_destinations TO service_role;
GRANT ALL ON saved_routes TO service_role;
GRANT ALL ON user_feedback TO service_role;
GRANT ALL ON user_alerts TO service_role;
GRANT ALL ON user_notifications TO service_role;
GRANT ALL ON alerts TO service_role;
GRANT ALL ON notification_events TO service_role;
GRANT ALL ON source_configs TO service_role;
GRANT ALL ON ingestion_runs TO service_role;
GRANT ALL ON raw_payloads TO service_role;
GRANT ALL ON normalized_records TO service_role;
GRANT ALL ON record_snapshots TO service_role;
GRANT ALL ON change_events TO service_role;
GRANT ALL ON scan_results TO service_role;
GRANT ALL ON audit_logs TO service_role;
GRANT ALL ON user_preference_profiles TO service_role;

-- Grant to authenticated users (limited by RLS)
GRANT SELECT, INSERT, UPDATE, DELETE ON user_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON saved_analyses TO authenticated;
GRANT SELECT, INSERT, DELETE ON saved_destinations TO authenticated;
GRANT SELECT, INSERT, DELETE ON saved_routes TO authenticated;
GRANT SELECT, INSERT ON user_feedback TO authenticated;
GRANT SELECT, UPDATE ON user_alerts TO authenticated;
GRANT SELECT, UPDATE ON user_notifications TO authenticated;
GRANT SELECT ON scan_results TO authenticated;
GRANT SELECT, UPDATE ON user_preference_profiles TO authenticated;
