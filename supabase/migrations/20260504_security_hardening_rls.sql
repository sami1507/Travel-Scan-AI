-- Security Hardening: RLS Policy Improvements
-- Adds missing RLS policies for initial schema tables

-- Add missing RLS policies for source_configs
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

-- Add missing RLS policies for ingestion_runs (via source_configs)
CREATE POLICY "Users can view ingestion runs for their sources"
    ON ingestion_runs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM source_configs
            WHERE source_configs.id = ingestion_runs.source_config_id
            AND source_configs.user_id = auth.uid()
        )
    );

-- Add missing RLS policies for raw_payloads (via source_configs)
CREATE POLICY "Users can view raw payloads for their sources"
    ON raw_payloads FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM source_configs
            WHERE source_configs.id = raw_payloads.source_config_id
            AND source_configs.user_id = auth.uid()
        )
    );

-- Add missing RLS policies for normalized_records (via source_configs)
CREATE POLICY "Users can view normalized records for their sources"
    ON normalized_records FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM source_configs
            WHERE source_configs.id = normalized_records.source_config_id
            AND source_configs.user_id = auth.uid()
        )
    );

-- Add missing RLS policies for record_snapshots (via normalized_records)
CREATE POLICY "Users can view record snapshots for their records"
    ON record_snapshots FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM normalized_records nr
            JOIN source_configs sc ON sc.id = nr.source_config_id
            WHERE nr.id = record_snapshots.normalized_record_id
            AND sc.user_id = auth.uid()
        )
    );

-- Add missing RLS policies for change_events (via normalized_records)
CREATE POLICY "Users can view change events for their records"
    ON change_events FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM normalized_records nr
            JOIN source_configs sc ON sc.id = nr.source_config_id
            WHERE nr.id = change_events.normalized_record_id
            AND sc.user_id = auth.uid()
        )
    );

-- Add missing RLS policies for scan_results (via source_configs)
CREATE POLICY "Users can view scan results for their sources"
    ON scan_results FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM source_configs
            WHERE source_configs.id = scan_results.source_config_id
            AND source_configs.user_id = auth.uid()
        )
    );

-- Add missing RLS policies for alerts
CREATE POLICY "Users can view their own alerts"
    ON alerts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own alerts"
    ON alerts FOR UPDATE
    USING (auth.uid() = user_id);

-- Add missing RLS policies for notification_events
CREATE POLICY "Users can view their own notification events"
    ON notification_events FOR SELECT
    USING (auth.uid() = user_id);

-- Add missing RLS policies for audit_logs (read-only for users, service can write)
CREATE POLICY "Users can view their own audit logs"
    ON audit_logs FOR SELECT
    USING (auth.uid() = user_id);

-- Service role policies for system operations
CREATE POLICY "Service can manage all source configs"
    ON source_configs FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service can manage all ingestion runs"
    ON ingestion_runs FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service can manage all raw payloads"
    ON raw_payloads FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service can manage all normalized records"
    ON normalized_records FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service can manage all record snapshots"
    ON record_snapshots FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service can manage all change events"
    ON change_events FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service can manage all scan results"
    ON scan_results FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service can manage all alerts"
    ON alerts FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service can manage all notification events"
    ON notification_events FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service can manage all audit logs"
    ON audit_logs FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Add missing SELECT policy for user_feedback
CREATE POLICY "Users can view their own feedback"
    ON user_feedback FOR SELECT
    USING (auth.uid() = user_id);

-- Add service role policy for user_feedback
CREATE POLICY "Service can manage all user feedback"
    ON user_feedback FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
