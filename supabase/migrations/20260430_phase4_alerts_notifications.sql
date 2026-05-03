-- Phase 4: Alerts, Notifications, and Opportunity Tracking
-- Migration for in-app alerts and notifications

-- User Alerts Table
CREATE TABLE IF NOT EXISTS user_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Alert Type
    alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN (
        'score_improvement',
        'route_improvement', 
        'timing_change',
        'weather_change',
        'budget_change',
        'value_opportunity',
        'recommendation_update'
    )),
    
    -- Alert Content
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    trigger_reason TEXT,
    
    -- Related Data
    destination_id VARCHAR(255),
    destination_name VARCHAR(255),
    route_id UUID,
    saved_analysis_id UUID,
    
    -- Alert Metadata
    severity VARCHAR(20) CHECK (severity IN ('low', 'medium', 'high')) DEFAULT 'medium',
    is_read BOOLEAN DEFAULT FALSE,
    is_dismissed BOOLEAN DEFAULT FALSE,
    
    -- Change Details (JSON)
    change_details JSONB, -- {oldValue, newValue, improvement, etc}
    
    -- Actions
    action_url TEXT,
    action_label VARCHAR(100),
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    read_at TIMESTAMPTZ,
    dismissed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_user_alerts_user_id ON user_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_alerts_type ON user_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_user_alerts_is_read ON user_alerts(is_read);
CREATE INDEX IF NOT EXISTS idx_user_alerts_created_at ON user_alerts(created_at DESC);

-- User Notifications Table (for notification center)
CREATE TABLE IF NOT EXISTS user_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Notification Type
    notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN (
        'alert',
        'recommendation_update',
        'route_change',
        'saved_item_update',
        'system_message'
    )),
    
    -- Content
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    
    -- Related Alert
    alert_id UUID REFERENCES user_alerts(id) ON DELETE CASCADE,
    
    -- Metadata
    is_read BOOLEAN DEFAULT FALSE,
    priority VARCHAR(20) CHECK (priority IN ('low', 'normal', 'high')) DEFAULT 'normal',
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    read_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_is_read ON user_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_user_notifications_created_at ON user_notifications(created_at DESC);

-- Shared Content Table (for sharing/export)
CREATE TABLE IF NOT EXISTS shared_content (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Content Type
    content_type VARCHAR(50) NOT NULL CHECK (content_type IN (
        'analysis',
        'route',
        'destination',
        'comparison'
    )),
    
    -- Content Data
    content_data JSONB NOT NULL,
    
    -- Share Settings
    share_token VARCHAR(100) UNIQUE NOT NULL,
    is_public BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMPTZ,
    
    -- Metadata
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_viewed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_shared_content_user_id ON shared_content(user_id);
CREATE INDEX IF NOT EXISTS idx_shared_content_share_token ON shared_content(share_token);
CREATE INDEX IF NOT EXISTS idx_shared_content_created_at ON shared_content(created_at DESC);

-- RLS Policies
ALTER TABLE user_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_content ENABLE ROW LEVEL SECURITY;

-- User Alerts Policies
CREATE POLICY "Users can view their own alerts"
    ON user_alerts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own alerts"
    ON user_alerts FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Service can manage alerts"
    ON user_alerts FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- User Notifications Policies
CREATE POLICY "Users can view their own notifications"
    ON user_notifications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
    ON user_notifications FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Service can manage notifications"
    ON user_notifications FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Shared Content Policies
CREATE POLICY "Users can view their own shared content"
    ON shared_content FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view public shared content"
    ON shared_content FOR SELECT
    USING (is_public = true AND (expires_at IS NULL OR expires_at > NOW()));

CREATE POLICY "Users can manage their own shared content"
    ON shared_content FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
