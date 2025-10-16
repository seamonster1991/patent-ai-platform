-- Fix Login Recording Migration
-- This migration fixes login recording issues and updates database schema

-- 1. user_login_logs table already exists, no need to create
-- Table structure: id, user_id, login_method, ip_address, user_agent, login_success, session_duration_ms, created_at

-- 2. total_logins column already exists in users table, no need to add

-- 3. Enable RLS on user_login_logs
ALTER TABLE user_login_logs ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own login logs" ON user_login_logs;
DROP POLICY IF EXISTS "Users can insert their own login logs" ON user_login_logs;
DROP POLICY IF EXISTS "Service role can manage all login logs" ON user_login_logs;

-- 5. Create RLS policies for user_login_logs
CREATE POLICY "Users can view their own login logs" ON user_login_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own login logs" ON user_login_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all login logs" ON user_login_logs
    FOR ALL USING (auth.role() = 'service_role');

-- 6. Update RLS policies for user_activities table
DROP POLICY IF EXISTS "Users can view their own activities" ON user_activities;
DROP POLICY IF EXISTS "Users can insert their own activities" ON user_activities;
DROP POLICY IF EXISTS "Service role can manage all activities" ON user_activities;

CREATE POLICY "Users can view their own activities" ON user_activities
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own activities" ON user_activities
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all activities" ON user_activities
    FOR ALL USING (auth.role() = 'service_role');

-- 7. Create or replace the record_login_activity RPC function
CREATE OR REPLACE FUNCTION record_login_activity(
    p_user_id UUID,
    p_ip_address TEXT DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_login_log_id UUID;
    v_activity_id UUID;
    v_total_logins INTEGER;
    v_result JSON;
BEGIN
    -- Insert login log (using correct column names)
    INSERT INTO user_login_logs (user_id, login_method, ip_address, user_agent, login_success)
    VALUES (p_user_id, 'email', p_ip_address::INET, p_user_agent, true)
    RETURNING id INTO v_login_log_id;
    
    -- Insert activity record
    INSERT INTO user_activities (user_id, activity_type, activity_data)
    VALUES (p_user_id, 'login', jsonb_build_object(
        'login_log_id', v_login_log_id,
        'timestamp', NOW(),
        'ip_address', p_ip_address,
        'user_agent', p_user_agent
    ))
    RETURNING id INTO v_activity_id;
    
    -- Update total_logins and last_login_at in users table
    UPDATE users 
    SET total_logins = COALESCE(total_logins, 0) + 1,
        last_login_at = NOW(),
        updated_at = NOW()
    WHERE id = p_user_id
    RETURNING total_logins INTO v_total_logins;
    
    -- Return success result
    v_result := json_build_object(
        'success', true,
        'login_log_id', v_login_log_id,
        'activity_id', v_activity_id,
        'total_logins', v_total_logins,
        'message', 'Login activity recorded successfully'
    );
    
    RETURN v_result;
    
EXCEPTION WHEN OTHERS THEN
    -- Return error result
    v_result := json_build_object(
        'success', false,
        'error', SQLERRM,
        'message', 'Failed to record login activity'
    );
    
    RETURN v_result;
END;
$$;

-- 8. Create function to get user login statistics
CREATE OR REPLACE FUNCTION get_user_login_stats(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_logins INTEGER;
    v_last_login TIMESTAMP WITH TIME ZONE;
    v_logins_today INTEGER;
    v_logins_this_week INTEGER;
    v_result JSON;
BEGIN
    -- Get total logins from users table
    SELECT total_logins, last_login_at INTO v_total_logins, v_last_login
    FROM users
    WHERE id = p_user_id;
    
    -- Get logins today (using created_at column)
    SELECT COUNT(*) INTO v_logins_today
    FROM user_login_logs
    WHERE user_id = p_user_id 
    AND login_success = true
    AND created_at >= CURRENT_DATE;
    
    -- Get logins this week (using created_at column)
    SELECT COUNT(*) INTO v_logins_this_week
    FROM user_login_logs
    WHERE user_id = p_user_id 
    AND login_success = true
    AND created_at >= DATE_TRUNC('week', CURRENT_DATE);
    
    v_result := json_build_object(
        'total_logins', COALESCE(v_total_logins, 0),
        'last_login', v_last_login,
        'logins_today', v_logins_today,
        'logins_this_week', v_logins_this_week
    );
    
    RETURN v_result;
END;
$$;

-- 9. Grant necessary permissions
GRANT SELECT, INSERT ON user_login_logs TO anon, authenticated;
GRANT EXECUTE ON FUNCTION record_login_activity(UUID, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_user_login_stats(UUID) TO anon, authenticated;

-- 10. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_login_logs_user_id ON user_login_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_login_logs_created_at ON user_login_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_user_activities_user_id_type ON user_activities(user_id, activity_type);

-- 11. Update existing users to have total_logins = 0 if NULL
UPDATE users SET total_logins = 0 WHERE total_logins IS NULL;

COMMENT ON TABLE user_login_logs IS 'Stores user login events with detailed information';
COMMENT ON FUNCTION record_login_activity IS 'Records user login activity and updates total login count';
COMMENT ON FUNCTION get_user_login_stats IS 'Retrieves comprehensive login statistics for a user';