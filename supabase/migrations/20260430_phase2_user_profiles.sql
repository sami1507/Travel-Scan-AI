-- Phase 2: User Travel Profile and Enhanced Features
-- Migration for explicit user preferences, flexible dates, and budget breakdowns

-- User Travel Profiles Table
CREATE TABLE IF NOT EXISTS user_travel_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    
    -- Budget Preferences
    preferred_budget_level VARCHAR(50) CHECK (preferred_budget_level IN ('budget', 'moderate', 'comfortable', 'luxury')),
    budget_flexibility VARCHAR(50) CHECK (budget_flexibility IN ('strict', 'flexible', 'very-flexible')),
    
    -- Travel Style Preferences (1-10 scale)
    nightlife_importance INTEGER CHECK (nightlife_importance >= 1 AND nightlife_importance <= 10),
    nature_importance INTEGER CHECK (nature_importance >= 1 AND nature_importance <= 10),
    comfort_vs_adventure INTEGER CHECK (comfort_vs_adventure >= 1 AND comfort_vs_adventure <= 10), -- 1=comfort, 10=adventure
    transport_importance INTEGER CHECK (transport_importance >= 1 AND transport_importance <= 10),
    safety_importance INTEGER CHECK (safety_importance >= 1 AND safety_importance <= 10),
    hotel_quality_importance INTEGER CHECK (hotel_quality_importance >= 1 AND hotel_quality_importance <= 10),
    
    -- Trip Style
    preferred_trip_style VARCHAR(50) CHECK (preferred_trip_style IN ('solo', 'couple', 'family', 'friends', 'business')),
    preferred_pace VARCHAR(50) CHECK (preferred_pace IN ('relaxed', 'moderate', 'fast', 'very-fast')),
    
    -- Additional Preferences
    preferred_interests TEXT[], -- Array of interest tags
    avoid_destinations TEXT[], -- Destinations to exclude
    
    -- Metadata
    profile_completeness INTEGER DEFAULT 0 CHECK (profile_completeness >= 0 AND profile_completeness <= 100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_travel_profiles_user_id ON user_travel_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_travel_profiles_is_active ON user_travel_profiles(is_active);

-- Budget Breakdowns Table (cache structured budget data)
CREATE TABLE IF NOT EXISTS budget_breakdowns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    destination_id VARCHAR(255) NOT NULL,
    destination_name VARCHAR(255) NOT NULL,
    
    -- Flight Estimates
    flight_cost_min DECIMAL(10, 2),
    flight_cost_max DECIMAL(10, 2),
    flight_cost_currency VARCHAR(10) DEFAULT 'USD',
    flight_data_quality VARCHAR(50) CHECK (flight_data_quality IN ('real', 'estimated', 'demo')) DEFAULT 'estimated',
    
    -- Accommodation Estimates
    accommodation_cost_per_night_min DECIMAL(10, 2),
    accommodation_cost_per_night_max DECIMAL(10, 2),
    accommodation_currency VARCHAR(10) DEFAULT 'USD',
    accommodation_data_quality VARCHAR(50) CHECK (accommodation_data_quality IN ('real', 'estimated', 'demo')) DEFAULT 'estimated',
    
    -- Daily Costs
    daily_cost_min DECIMAL(10, 2),
    daily_cost_max DECIMAL(10, 2),
    daily_cost_currency VARCHAR(10) DEFAULT 'USD',
    daily_cost_breakdown JSONB, -- {food: {min, max}, transport: {min, max}, activities: {min, max}}
    daily_cost_data_quality VARCHAR(50) CHECK (daily_cost_data_quality IN ('real', 'estimated', 'demo')) DEFAULT 'estimated',
    
    -- Total Trip Estimate
    total_trip_cost_min DECIMAL(10, 2),
    total_trip_cost_max DECIMAL(10, 2),
    trip_duration_days INTEGER DEFAULT 7,
    total_cost_currency VARCHAR(10) DEFAULT 'USD',
    
    -- Metadata
    budget_level VARCHAR(50),
    notes TEXT,
    data_sources TEXT[] DEFAULT ARRAY['internal_estimates'],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_budget_breakdowns_destination_id ON budget_breakdowns(destination_id);
CREATE INDEX IF NOT EXISTS idx_budget_breakdowns_created_at ON budget_breakdowns(created_at DESC);

-- Triggers for updated_at
CREATE OR REPLACE TRIGGER update_user_travel_profiles_updated_at 
    BEFORE UPDATE ON user_travel_profiles
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE user_travel_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_breakdowns ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_travel_profiles
CREATE POLICY "Users can view their own travel profile"
    ON user_travel_profiles FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own travel profile"
    ON user_travel_profiles FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own travel profile"
    ON user_travel_profiles FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own travel profile"
    ON user_travel_profiles FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for budget_breakdowns (public read, service write)
CREATE POLICY "Anyone can view budget breakdowns"
    ON budget_breakdowns FOR SELECT
    USING (true);

CREATE POLICY "Service can manage budget breakdowns"
    ON budget_breakdowns FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
