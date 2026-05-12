-- Additional RLS Policies for User-Owned Data
-- Ensures all user data is properly protected

-- Enable RLS on all user tables if not already enabled
ALTER TABLE IF EXISTS user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS saved_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS saved_destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS saved_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_notifications ENABLE ROW LEVEL SECURITY;

-- User Profiles: Users can only access their own profile
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_profiles' 
        AND policyname = 'Users can view their own profile'
    ) THEN
        CREATE POLICY "Users can view their own profile"
            ON user_profiles FOR SELECT
            USING (auth.uid() = user_id);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_profiles' 
        AND policyname = 'Users can update their own profile'
    ) THEN
        CREATE POLICY "Users can update their own profile"
            ON user_profiles FOR UPDATE
            USING (auth.uid() = user_id);
    END IF;
END $$;

-- Saved Analyses: Users can only access their own saved analyses
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'saved_analyses' 
        AND policyname = 'Users can view their own analyses'
    ) THEN
        CREATE POLICY "Users can view their own analyses"
            ON saved_analyses FOR SELECT
            USING (auth.uid() = user_id);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'saved_analyses' 
        AND policyname = 'Users can create their own analyses'
    ) THEN
        CREATE POLICY "Users can create their own analyses"
            ON saved_analyses FOR INSERT
            WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'saved_analyses' 
        AND policyname = 'Users can update their own analyses'
    ) THEN
        CREATE POLICY "Users can update their own analyses"
            ON saved_analyses FOR UPDATE
            USING (auth.uid() = user_id);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'saved_analyses' 
        AND policyname = 'Users can delete their own analyses'
    ) THEN
        CREATE POLICY "Users can delete their own analyses"
            ON saved_analyses FOR DELETE
            USING (auth.uid() = user_id);
    END IF;
END $$;

-- Saved Destinations: Users can only access their own saved destinations
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'saved_destinations' 
        AND policyname = 'Users can view their own destinations'
    ) THEN
        CREATE POLICY "Users can view their own destinations"
            ON saved_destinations FOR SELECT
            USING (auth.uid() = user_id);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'saved_destinations' 
        AND policyname = 'Users can create their own destinations'
    ) THEN
        CREATE POLICY "Users can create their own destinations"
            ON saved_destinations FOR INSERT
            WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'saved_destinations' 
        AND policyname = 'Users can update their own destinations'
    ) THEN
        CREATE POLICY "Users can update their own destinations"
            ON saved_destinations FOR UPDATE
            USING (auth.uid() = user_id);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'saved_destinations' 
        AND policyname = 'Users can delete their own destinations'
    ) THEN
        CREATE POLICY "Users can delete their own destinations"
            ON saved_destinations FOR DELETE
            USING (auth.uid() = user_id);
    END IF;
END $$;

-- Saved Routes: Users can only access their own saved routes
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'saved_routes' 
        AND policyname = 'Users can view their own routes'
    ) THEN
        CREATE POLICY "Users can view their own routes"
            ON saved_routes FOR SELECT
            USING (auth.uid() = user_id);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'saved_routes' 
        AND policyname = 'Users can create their own routes'
    ) THEN
        CREATE POLICY "Users can create their own routes"
            ON saved_routes FOR INSERT
            WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'saved_routes' 
        AND policyname = 'Users can update their own routes'
    ) THEN
        CREATE POLICY "Users can update their own routes"
            ON saved_routes FOR UPDATE
            USING (auth.uid() = user_id);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'saved_routes' 
        AND policyname = 'Users can delete their own routes'
    ) THEN
        CREATE POLICY "Users can delete their own routes"
            ON saved_routes FOR DELETE
            USING (auth.uid() = user_id);
    END IF;
END $$;

-- User Alerts: Users can only access their own alerts
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_alerts' 
        AND policyname = 'Users can view their own user alerts'
    ) THEN
        CREATE POLICY "Users can view their own user alerts"
            ON user_alerts FOR SELECT
            USING (auth.uid() = user_id);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_alerts' 
        AND policyname = 'Users can update their own user alerts'
    ) THEN
        CREATE POLICY "Users can update their own user alerts"
            ON user_alerts FOR UPDATE
            USING (auth.uid() = user_id);
    END IF;
END $$;

-- User Notifications: Users can only access their own notifications
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_notifications' 
        AND policyname = 'Users can view their own notifications'
    ) THEN
        CREATE POLICY "Users can view their own notifications"
            ON user_notifications FOR SELECT
            USING (auth.uid() = user_id);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_notifications' 
        AND policyname = 'Users can update their own notifications'
    ) THEN
        CREATE POLICY "Users can update their own notifications"
            ON user_notifications FOR UPDATE
            USING (auth.uid() = user_id);
    END IF;
END $$;

-- Service role can manage all user data for system operations
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_profiles' 
        AND policyname = 'Service can manage all profiles'
    ) THEN
        CREATE POLICY "Service can manage all profiles"
            ON user_profiles FOR ALL
            USING (auth.role() = 'service_role')
            WITH CHECK (auth.role() = 'service_role');
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'saved_analyses' 
        AND policyname = 'Service can manage all analyses'
    ) THEN
        CREATE POLICY "Service can manage all analyses"
            ON saved_analyses FOR ALL
            USING (auth.role() = 'service_role')
            WITH CHECK (auth.role() = 'service_role');
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'saved_destinations' 
        AND policyname = 'Service can manage all destinations'
    ) THEN
        CREATE POLICY "Service can manage all destinations"
            ON saved_destinations FOR ALL
            USING (auth.role() = 'service_role')
            WITH CHECK (auth.role() = 'service_role');
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'saved_routes' 
        AND policyname = 'Service can manage all routes'
    ) THEN
        CREATE POLICY "Service can manage all routes"
            ON saved_routes FOR ALL
            USING (auth.role() = 'service_role')
            WITH CHECK (auth.role() = 'service_role');
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_alerts' 
        AND policyname = 'Service can manage all user alerts'
    ) THEN
        CREATE POLICY "Service can manage all user alerts"
            ON user_alerts FOR ALL
            USING (auth.role() = 'service_role')
            WITH CHECK (auth.role() = 'service_role');
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_notifications' 
        AND policyname = 'Service can manage all user notifications'
    ) THEN
        CREATE POLICY "Service can manage all user notifications"
            ON user_notifications FOR ALL
            USING (auth.role() = 'service_role')
            WITH CHECK (auth.role() = 'service_role');
    END IF;
END $$;
