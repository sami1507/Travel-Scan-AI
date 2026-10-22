-- Persistent storage for operational metrics that were previously held in
-- process memory (lost on every serverless cold start / inconsistent across
-- instances): error events, AI cost events, ML shadow comparisons, and
-- improvement signals.

CREATE TABLE IF NOT EXISTS ops_errors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message TEXT NOT NULL,
    stack TEXT,
    context JSONB,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ops_errors_created_at ON ops_errors(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ops_errors_severity ON ops_errors(severity);

CREATE TABLE IF NOT EXISTS ai_usage_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider VARCHAR(50) NOT NULL,
    operation VARCHAR(100) NOT NULL,
    count INTEGER NOT NULL DEFAULT 1,
    estimated_cost NUMERIC(12, 6) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_metrics_created_at ON ai_usage_metrics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_metrics_provider ON ai_usage_metrics(provider);

CREATE TABLE IF NOT EXISTS ml_shadow_comparisons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    comparison_id VARCHAR(100) NOT NULL UNIQUE,
    user_id UUID,
    query TEXT,
    comparison JSONB NOT NULL,
    served_system VARCHAR(20),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ml_shadow_comparisons_created_at ON ml_shadow_comparisons(created_at DESC);

CREATE TABLE IF NOT EXISTS ml_improvement_signals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scope VARCHAR(10) NOT NULL CHECK (scope IN ('user', 'global')),
    signal JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ml_improvement_signals_created_at ON ml_improvement_signals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ml_improvement_signals_scope ON ml_improvement_signals(scope);

ALTER TABLE ops_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml_shadow_comparisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml_improvement_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view ops errors"
    ON ops_errors FOR SELECT
    USING (auth.role() = 'service_role' OR auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Service can manage ops errors"
    ON ops_errors FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Admins can view usage metrics"
    ON ai_usage_metrics FOR SELECT
    USING (auth.role() = 'service_role' OR auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Service can manage usage metrics"
    ON ai_usage_metrics FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Admins can view shadow comparisons"
    ON ml_shadow_comparisons FOR SELECT
    USING (auth.role() = 'service_role' OR auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Service can manage shadow comparisons"
    ON ml_shadow_comparisons FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Admins can view improvement signals"
    ON ml_improvement_signals FOR SELECT
    USING (auth.role() = 'service_role' OR auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Service can manage improvement signals"
    ON ml_improvement_signals FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
