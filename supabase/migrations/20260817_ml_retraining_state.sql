-- Persist ML retraining state (model versions + training data snapshots)
-- Previously held in process memory, which resets on every serverless cold start.

CREATE TABLE IF NOT EXISTS ml_model_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    version VARCHAR(100) NOT NULL UNIQUE,
    training_date TIMESTAMPTZ NOT NULL,
    dataset_version VARCHAR(100),
    feature_schema_version VARCHAR(50),
    training_example_count INTEGER DEFAULT 0,
    evaluation_metrics JSONB,
    model_artifacts JSONB,
    status VARCHAR(20) NOT NULL CHECK (status IN ('training', 'evaluating', 'deployed', 'archived')),
    deployed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ml_model_versions_status ON ml_model_versions(status);
CREATE INDEX IF NOT EXISTS idx_ml_model_versions_training_date ON ml_model_versions(training_date DESC);

CREATE TABLE IF NOT EXISTS ml_data_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    snapshot_id VARCHAR(100) NOT NULL UNIQUE,
    example_count INTEGER NOT NULL DEFAULT 0,
    date_range JSONB NOT NULL,
    feature_schema_version VARCHAR(50),
    data_quality JSONB,
    export_path TEXT,
    format VARCHAR(10) DEFAULT 'jsonl',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ml_data_snapshots_created_at ON ml_data_snapshots(created_at DESC);

ALTER TABLE ml_model_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml_data_snapshots ENABLE ROW LEVEL SECURITY;

-- Admins can read retraining state
CREATE POLICY "Admins can view model versions"
    ON ml_model_versions FOR SELECT
    USING (auth.role() = 'service_role' OR auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Service can manage model versions"
    ON ml_model_versions FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Admins can view data snapshots"
    ON ml_data_snapshots FOR SELECT
    USING (auth.role() = 'service_role' OR auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Service can manage data snapshots"
    ON ml_data_snapshots FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
