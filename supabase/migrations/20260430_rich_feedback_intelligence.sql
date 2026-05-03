-- Rich Feedback Intelligence System
-- Migration for structured feedback storage

-- Rich Feedback Table
CREATE TABLE IF NOT EXISTS rich_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Feedback Type
    feedback_type VARCHAR(20) NOT NULL CHECK (feedback_type IN ('positive', 'negative')),
    
    -- Selected Reasons
    selected_reasons TEXT[] DEFAULT '{}',
    
    -- Free-text Comment
    comment TEXT,
    
    -- Recommendation Context
    destination_id VARCHAR(255) NOT NULL,
    destination_name VARCHAR(255) NOT NULL,
    destination_rank INTEGER,
    total_match_score DECIMAL(5, 2),
    
    -- Score Context
    score_breakdown JSONB,
    
    -- Explanation Context
    why_recommended TEXT[],
    
    -- Route Context (if applicable)
    route_id UUID,
    route_data JSONB,
    
    -- Personalization Context
    user_constraints JSONB,
    personalization_applied BOOLEAN DEFAULT FALSE,
    
    -- Preference Corrections
    preference_corrections JSONB,
    
    -- User/Session Metadata
    query_text TEXT,
    session_id VARCHAR(100),
    
    -- AI Analysis (populated after analysis)
    ai_analysis JSONB,
    analyzed_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rich_feedback_user_id ON rich_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_rich_feedback_destination ON rich_feedback(destination_id);
CREATE INDEX IF NOT EXISTS idx_rich_feedback_type ON rich_feedback(feedback_type);
CREATE INDEX IF NOT EXISTS idx_rich_feedback_created_at ON rich_feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rich_feedback_analyzed ON rich_feedback(analyzed_at) WHERE analyzed_at IS NOT NULL;

-- Feedback Insights Aggregation Table
CREATE TABLE IF NOT EXISTS feedback_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Insight Type
    insight_type VARCHAR(50) NOT NULL CHECK (insight_type IN (
        'common_negative_theme',
        'common_positive_theme',
        'route_complaint',
        'budget_mismatch',
        'explanation_quality',
        'user_intent_correction',
        'product_issue_cluster'
    )),
    
    -- Insight Data
    theme VARCHAR(255) NOT NULL,
    description TEXT,
    frequency INTEGER DEFAULT 1,
    severity VARCHAR(20) CHECK (severity IN ('low', 'medium', 'high')),
    
    -- Affected Dimensions
    affected_dimensions TEXT[],
    
    -- Sample Feedback IDs
    sample_feedback_ids UUID[],
    
    -- Aggregation Period
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    
    -- Status
    status VARCHAR(20) CHECK (status IN ('new', 'reviewed', 'addressed', 'dismissed')) DEFAULT 'new',
    
    -- Metadata
    metadata JSONB,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_insights_type ON feedback_insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_feedback_insights_status ON feedback_insights(status);
CREATE INDEX IF NOT EXISTS idx_feedback_insights_period ON feedback_insights(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_feedback_insights_created_at ON feedback_insights(created_at DESC);

-- Score Weight Adjustment Suggestions Table
CREATE TABLE IF NOT EXISTS score_weight_suggestions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Category
    score_category VARCHAR(50) NOT NULL,
    
    -- Suggested Adjustment
    current_weight DECIMAL(5, 2),
    suggested_weight DECIMAL(5, 2),
    adjustment_reason TEXT,
    
    -- Supporting Evidence
    feedback_count INTEGER NOT NULL,
    confidence DECIMAL(3, 2) CHECK (confidence >= 0 AND confidence <= 1),
    
    -- Sample Feedback
    sample_feedback_ids UUID[],
    
    -- Status
    status VARCHAR(20) CHECK (status IN ('pending', 'approved', 'rejected', 'applied')) DEFAULT 'pending',
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_score_weight_suggestions_category ON score_weight_suggestions(score_category);
CREATE INDEX IF NOT EXISTS idx_score_weight_suggestions_status ON score_weight_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_score_weight_suggestions_created_at ON score_weight_suggestions(created_at DESC);

-- RLS Policies
ALTER TABLE rich_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE score_weight_suggestions ENABLE ROW LEVEL SECURITY;

-- Rich Feedback Policies
CREATE POLICY "Users can view their own feedback"
    ON rich_feedback FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own feedback"
    ON rich_feedback FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service can manage feedback"
    ON rich_feedback FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Feedback Insights Policies (Admin only)
CREATE POLICY "Admins can view feedback insights"
    ON feedback_insights FOR SELECT
    USING (auth.role() = 'service_role' OR auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Service can manage insights"
    ON feedback_insights FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Score Weight Suggestions Policies (Admin only)
CREATE POLICY "Admins can view score suggestions"
    ON score_weight_suggestions FOR SELECT
    USING (auth.role() = 'service_role' OR auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can update score suggestions"
    ON score_weight_suggestions FOR UPDATE
    USING (auth.role() = 'service_role' OR auth.jwt() ->> 'role' = 'admin')
    WITH CHECK (auth.role() = 'service_role' OR auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Service can manage score suggestions"
    ON score_weight_suggestions FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
