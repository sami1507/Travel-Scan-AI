-- Phase 1: Saved Analyses, History, and Comparison
-- Migration for travel analysis persistence and comparison features

-- Saved Analyses Table
CREATE TABLE saved_analyses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    query TEXT NOT NULL,
    analysis_result JSONB NOT NULL,
    user_constraints JSONB NOT NULL,
    is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_saved_analyses_user_id ON saved_analyses(user_id);
CREATE INDEX idx_saved_analyses_created_at ON saved_analyses(created_at DESC);
CREATE INDEX idx_saved_analyses_is_favorite ON saved_analyses(is_favorite);

-- Saved Destinations Table
CREATE TABLE saved_destinations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    destination_id VARCHAR(255) NOT NULL,
    destination_name VARCHAR(255) NOT NULL,
    destination_type VARCHAR(50) NOT NULL,
    destination_data JSONB NOT NULL,
    source_analysis_id UUID REFERENCES saved_analyses(id) ON DELETE SET NULL,
    is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, destination_id)
);

CREATE INDEX idx_saved_destinations_user_id ON saved_destinations(user_id);
CREATE INDEX idx_saved_destinations_destination_id ON saved_destinations(destination_id);
CREATE INDEX idx_saved_destinations_is_favorite ON saved_destinations(is_favorite);
CREATE INDEX idx_saved_destinations_created_at ON saved_destinations(created_at DESC);

-- Saved Routes Table
CREATE TABLE saved_routes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    route_name VARCHAR(255) NOT NULL,
    route_data JSONB NOT NULL,
    source_analysis_id UUID REFERENCES saved_analyses(id) ON DELETE SET NULL,
    is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_saved_routes_user_id ON saved_routes(user_id);
CREATE INDEX idx_saved_routes_is_favorite ON saved_routes(is_favorite);
CREATE INDEX idx_saved_routes_created_at ON saved_routes(created_at DESC);

-- Analysis History Table (lightweight tracking)
CREATE TABLE analysis_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    query TEXT NOT NULL,
    user_constraints JSONB NOT NULL,
    top_recommendations TEXT[] NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_analysis_history_user_id ON analysis_history(user_id);
CREATE INDEX idx_analysis_history_created_at ON analysis_history(created_at DESC);

-- Comparison Sessions Table
CREATE TABLE comparison_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    comparison_type VARCHAR(50) NOT NULL CHECK (comparison_type IN ('destinations', 'routes')),
    item_a_id UUID NOT NULL,
    item_b_id UUID NOT NULL,
    item_a_data JSONB NOT NULL,
    item_b_data JSONB NOT NULL,
    comparison_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_comparison_sessions_user_id ON comparison_sessions(user_id);
CREATE INDEX idx_comparison_sessions_created_at ON comparison_sessions(created_at DESC);

-- Triggers for updated_at
CREATE TRIGGER update_saved_analyses_updated_at BEFORE UPDATE ON saved_analyses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_saved_destinations_updated_at BEFORE UPDATE ON saved_destinations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_saved_routes_updated_at BEFORE UPDATE ON saved_routes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE saved_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE comparison_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for saved_analyses
CREATE POLICY "Users can view their own saved analyses"
    ON saved_analyses FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own saved analyses"
    ON saved_analyses FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved analyses"
    ON saved_analyses FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved analyses"
    ON saved_analyses FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for saved_destinations
CREATE POLICY "Users can view their own saved destinations"
    ON saved_destinations FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own saved destinations"
    ON saved_destinations FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved destinations"
    ON saved_destinations FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved destinations"
    ON saved_destinations FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for saved_routes
CREATE POLICY "Users can view their own saved routes"
    ON saved_routes FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own saved routes"
    ON saved_routes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved routes"
    ON saved_routes FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved routes"
    ON saved_routes FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for analysis_history
CREATE POLICY "Users can view their own analysis history"
    ON analysis_history FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own analysis history"
    ON analysis_history FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- RLS Policies for comparison_sessions
CREATE POLICY "Users can view their own comparison sessions"
    ON comparison_sessions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own comparison sessions"
    ON comparison_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comparison sessions"
    ON comparison_sessions FOR DELETE
    USING (auth.uid() = user_id);
