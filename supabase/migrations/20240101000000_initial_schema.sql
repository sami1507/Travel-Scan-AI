-- Travel Scan AI Database Schema
-- This migration creates all tables for the monitoring platform

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Source Configurations Table
CREATE TABLE source_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    source_type VARCHAR(50) NOT NULL CHECK (source_type IN ('flights', 'hotels', 'weather', 'exchange_rates', 'events')),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'error', 'disabled')),
    polling_interval_minutes INTEGER NOT NULL DEFAULT 60 CHECK (polling_interval_minutes >= 5 AND polling_interval_minutes <= 1440),
    parser_settings JSONB DEFAULT '{}'::jsonb,
    last_run_at TIMESTAMPTZ,
    last_success_at TIMESTAMPTZ,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_source_configs_user_id ON source_configs(user_id);
CREATE INDEX idx_source_configs_status ON source_configs(status);
CREATE INDEX idx_source_configs_source_type ON source_configs(source_type);

-- Ingestion Runs Table
CREATE TABLE ingestion_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_config_id UUID NOT NULL REFERENCES source_configs(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'success', 'failed')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    records_fetched INTEGER NOT NULL DEFAULT 0,
    records_new INTEGER NOT NULL DEFAULT 0,
    records_changed INTEGER NOT NULL DEFAULT 0,
    records_removed INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_ingestion_runs_source_config_id ON ingestion_runs(source_config_id);
CREATE INDEX idx_ingestion_runs_status ON ingestion_runs(status);
CREATE INDEX idx_ingestion_runs_started_at ON ingestion_runs(started_at DESC);

-- Raw Payloads Table (stores original API responses)
CREATE TABLE raw_payloads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ingestion_run_id UUID NOT NULL REFERENCES ingestion_runs(id) ON DELETE CASCADE,
    source_config_id UUID NOT NULL REFERENCES source_configs(id) ON DELETE CASCADE,
    payload JSONB NOT NULL,
    payload_hash VARCHAR(64) NOT NULL,
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_raw_payloads_ingestion_run_id ON raw_payloads(ingestion_run_id);
CREATE INDEX idx_raw_payloads_source_config_id ON raw_payloads(source_config_id);
CREATE INDEX idx_raw_payloads_payload_hash ON raw_payloads(payload_hash);

-- Normalized Records Table (domain-agnostic structure)
CREATE TABLE normalized_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_config_id UUID NOT NULL REFERENCES source_configs(id) ON DELETE CASCADE,
    ingestion_run_id UUID NOT NULL REFERENCES ingestion_runs(id) ON DELETE CASCADE,
    external_id VARCHAR(255) NOT NULL,
    record_type VARCHAR(100) NOT NULL,
    content JSONB NOT NULL,
    content_hash VARCHAR(64) NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(source_config_id, external_id)
);

CREATE INDEX idx_normalized_records_source_config_id ON normalized_records(source_config_id);
CREATE INDEX idx_normalized_records_external_id ON normalized_records(external_id);
CREATE INDEX idx_normalized_records_content_hash ON normalized_records(content_hash);
CREATE INDEX idx_normalized_records_record_type ON normalized_records(record_type);

-- Record Snapshots Table (point-in-time states)
CREATE TABLE record_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    normalized_record_id UUID NOT NULL REFERENCES normalized_records(id) ON DELETE CASCADE,
    content JSONB NOT NULL,
    content_hash VARCHAR(64) NOT NULL,
    snapshot_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_record_snapshots_normalized_record_id ON record_snapshots(normalized_record_id);
CREATE INDEX idx_record_snapshots_snapshot_at ON record_snapshots(snapshot_at DESC);

-- Change Events Table
CREATE TABLE change_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    normalized_record_id UUID NOT NULL REFERENCES normalized_records(id) ON DELETE CASCADE,
    ingestion_run_id UUID NOT NULL REFERENCES ingestion_runs(id) ON DELETE CASCADE,
    change_type VARCHAR(20) NOT NULL CHECK (change_type IN ('new', 'modified', 'removed', 'unchanged')),
    previous_content JSONB,
    new_content JSONB NOT NULL,
    diff JSONB DEFAULT '{}'::jsonb,
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_change_events_normalized_record_id ON change_events(normalized_record_id);
CREATE INDEX idx_change_events_ingestion_run_id ON change_events(ingestion_run_id);
CREATE INDEX idx_change_events_change_type ON change_events(change_type);
CREATE INDEX idx_change_events_detected_at ON change_events(detected_at DESC);

-- Scan Results Table
CREATE TABLE scan_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ingestion_run_id UUID NOT NULL REFERENCES ingestion_runs(id) ON DELETE CASCADE,
    source_config_id UUID NOT NULL REFERENCES source_configs(id) ON DELETE CASCADE,
    total_changes INTEGER NOT NULL DEFAULT 0,
    new_records INTEGER NOT NULL DEFAULT 0,
    modified_records INTEGER NOT NULL DEFAULT 0,
    removed_records INTEGER NOT NULL DEFAULT 0,
    ai_summary TEXT,
    insights TEXT[] DEFAULT ARRAY[]::TEXT[],
    scan_completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_scan_results_ingestion_run_id ON scan_results(ingestion_run_id);
CREATE INDEX idx_scan_results_source_config_id ON scan_results(source_config_id);
CREATE INDEX idx_scan_results_scan_completed_at ON scan_results(scan_completed_at DESC);

-- Alerts Table
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scan_result_id UUID NOT NULL REFERENCES scan_results(id) ON DELETE CASCADE,
    source_config_id UUID NOT NULL REFERENCES source_configs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('info', 'low', 'medium', 'high', 'critical')),
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    change_event_ids UUID[] DEFAULT ARRAY[]::UUID[],
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    is_dismissed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    read_at TIMESTAMPTZ
);

CREATE INDEX idx_alerts_user_id ON alerts(user_id);
CREATE INDEX idx_alerts_scan_result_id ON alerts(scan_result_id);
CREATE INDEX idx_alerts_severity ON alerts(severity);
CREATE INDEX idx_alerts_is_read ON alerts(is_read);
CREATE INDEX idx_alerts_created_at ON alerts(created_at DESC);

-- Notification Events Table
CREATE TABLE notification_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    alert_id UUID REFERENCES alerts(id) ON DELETE CASCADE,
    channel VARCHAR(20) NOT NULL CHECK (channel IN ('in_app', 'email', 'sms')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    sent_at TIMESTAMPTZ,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notification_events_user_id ON notification_events(user_id);
CREATE INDEX idx_notification_events_alert_id ON notification_events(alert_id);
CREATE INDEX idx_notification_events_status ON notification_events(status);

-- Audit Logs Table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    changes JSONB DEFAULT '{}'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX idx_audit_logs_entity_id ON audit_logs(entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_source_configs_updated_at BEFORE UPDATE ON source_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_normalized_records_updated_at BEFORE UPDATE ON normalized_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies
ALTER TABLE source_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingestion_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_payloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE normalized_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE record_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE change_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for source_configs
CREATE POLICY "Users can view their own source configs"
    ON source_configs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own source configs"
    ON source_configs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own source configs"
    ON source_configs FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own source configs"
    ON source_configs FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for alerts
CREATE POLICY "Users can view their own alerts"
    ON alerts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own alerts"
    ON alerts FOR UPDATE
    USING (auth.uid() = user_id);

-- Service role can access all tables (for background jobs)
-- This is handled by using the service role key in server-side code
