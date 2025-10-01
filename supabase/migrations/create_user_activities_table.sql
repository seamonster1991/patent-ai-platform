-- Create user_activities table for tracking all user activities
CREATE TABLE IF NOT EXISTS user_activities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL,
    activity_data JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON user_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_created_at ON user_activities(created_at);
CREATE INDEX IF NOT EXISTS idx_user_activities_activity_type ON user_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_user_activities_user_created ON user_activities(user_id, created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only see their own activities
CREATE POLICY "Users can view own activities" ON user_activities
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own activities
CREATE POLICY "Users can insert own activities" ON user_activities
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admin users can view all activities
CREATE POLICY "Admins can view all activities" ON user_activities
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Create function to automatically delete activities older than 100 days
CREATE OR REPLACE FUNCTION delete_old_user_activities()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM user_activities 
    WHERE created_at < NOW() - INTERVAL '100 days';
END;
$$;

-- Create a trigger to automatically clean up old data daily
-- Note: This requires pg_cron extension which may not be available in all Supabase plans
-- Alternative: Use Supabase Edge Functions or manual cleanup
CREATE OR REPLACE FUNCTION schedule_cleanup_user_activities()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    -- This function can be called manually or via scheduled jobs
    PERFORM delete_old_user_activities();
END;
$$;

-- Insert some activity types as reference (optional)
COMMENT ON TABLE user_activities IS 'Stores all user activities for analytics and dashboard statistics';
COMMENT ON COLUMN user_activities.activity_type IS 'Types: login, logout, search, view_patent, profile_update, dashboard_access, report_generate';
COMMENT ON COLUMN user_activities.activity_data IS 'JSON data specific to the activity type (search terms, patent IDs, etc.)';