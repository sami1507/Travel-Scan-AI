-- Phase 5: Admin Quality Analytics
-- Migration for tracking product quality metrics

-- Quality Metrics Table
CREATE TABLE IF NOT EXISTS quality_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Metric Type
    metric_type VARCHAR(50) NOT NULL CHECK (metric_type IN (
        'recommendation_quality',
        'save_rate',
        'dismiss_rate',
        'route_engagement',
        'alert_usefulness',
        'personalization_performance',
        'feature_usage'
    )),
    
    -- Metric Data
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(10, 2) NOT NULL,
    metric_unit VARCHAR(50), -- percentage, count, score, etc.
    
    -- Context
    destination_id VARCHAR(255),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    analysis_id UUID,
    
    -- Aggregation Period
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ,
    
    -- Additional Data
    metadata JSONB,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quality_metrics_type ON quality_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_quality_metrics_created_at ON quality_metrics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quality_metrics_period ON quality_metrics(period_start, period_end);

-- Feature Usage Tracking
CREATE TABLE IF NOT EXISTS feature_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Feature Info
    feature_name VARCHAR(100) NOT NULL,
    feature_category VARCHAR(50) NOT NULL CHECK (feature_category IN (
        'analysis',
        'saved_items',
        'comparison',
        'profile',
        'notifications',
        'sharing',
        'external_actions'
    )),
    
    -- Usage Data
    action VARCHAR(50) NOT NULL, -- viewed, clicked, completed, dismissed
    session_id VARCHAR(100),
    
    -- Context
    metadata JSONB,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feature_usage_user_id ON feature_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_feature_usage_feature ON feature_usage(feature_name);
CREATE INDEX IF NOT EXISTS idx_feature_usage_created_at ON feature_usage(created_at DESC);

-- Recommendation Feedback Table
CREATE TABLE IF NOT EXISTS recommendation_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Recommendation Info
    destination_id VARCHAR(255) NOT NULL,
    destination_name VARCHAR(255) NOT NULL,
    analysis_id UUID,
    rank_position INTEGER,
    
    -- Feedback Type
    feedback_type VARCHAR(50) NOT NULL CHECK (feedback_type IN (
        'saved',
        'dismissed',
        'viewed_details',
        'shared',
        'booked',
        'helpful',
        'not_helpful'
    )),
    
    -- Feedback Data
    feedback_score INTEGER CHECK (feedback_score >= 1 AND feedback_score <= 5),
    feedback_text TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recommendation_feedback_user_id ON recommendation_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_feedback_destination ON recommendation_feedback(destination_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_feedback_type ON recommendation_feedback(feedback_type);
CREATE INDEX IF NOT EXISTS idx_recommendation_feedback_created_at ON recommendation_feedback(created_at DESC);

-- RLS Policies
ALTER TABLE quality_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_feedback ENABLE ROW LEVEL SECURITY;

-- Quality Metrics - Admin only
CREATE POLICY "Admins can view quality metrics"
    ON quality_metrics FOR SELECT
    USING (auth.role() = 'service_role' OR auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Service can manage quality metrics"
    ON quality_metrics FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Feature Usage - Users can view their own
CREATE POLICY "Users can view their own feature usage"
    ON feature_usage FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service can manage feature usage"
    ON feature_usage FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Recommendation Feedback - Users can manage their own
CREATE POLICY "Users can view their own feedback"
    ON recommendation_feedback FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own feedback"
    ON recommendation_feedback FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service can manage feedback"
    ON recommendation_feedback FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
