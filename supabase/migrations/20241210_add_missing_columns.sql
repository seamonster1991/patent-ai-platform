-- Add missing columns to user_login_logs table
-- This migration adds the missing columns that were not included in the previous migration

-- Add missing columns to user_login_logs
DO $$ 
BEGIN
    -- Add session_id column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'user_login_logs' AND column_name = 'session_id') THEN
        ALTER TABLE user_login_logs ADD COLUMN session_id TEXT;
    END IF;
    
    -- Add metadata column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'user_login_logs' AND column_name = 'metadata') THEN
        ALTER TABLE user_login_logs ADD COLUMN metadata JSONB DEFAULT '{}';
    END IF;
    
    -- Add login_time column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'user_login_logs' AND column_name = 'login_time') THEN
        ALTER TABLE user_login_logs ADD COLUMN login_time TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    
    -- Add failure_reason column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'user_login_logs' AND column_name = 'failure_reason') THEN
        ALTER TABLE user_login_logs ADD COLUMN failure_reason TEXT;
    END IF;
    
    -- Add updated_at column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'user_login_logs' AND column_name = 'updated_at') THEN
        ALTER TABLE user_login_logs ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Add missing columns to user_activities
DO $$ 
BEGIN
    -- Add session_id column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'user_activities' AND column_name = 'session_id') THEN
        ALTER TABLE user_activities ADD COLUMN session_id TEXT;
    END IF;
    
    -- Add metadata column (rename activity_data to metadata for consistency)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'user_activities' AND column_name = 'metadata') THEN
        ALTER TABLE user_activities ADD COLUMN metadata JSONB DEFAULT '{}';
    END IF;
    
    -- Add description column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'user_activities' AND column_name = 'description') THEN
        ALTER TABLE user_activities ADD COLUMN description TEXT;
    END IF;
END $$;

-- Create or replace the record_user_login RPC function
CREATE OR REPLACE FUNCTION record_user_login(
    p_user_id UUID,
    p_ip_address TEXT DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_session_id TEXT DEFAULT NULL,
    p_login_method TEXT DEFAULT 'email',
    p_login_success BOOLEAN DEFAULT true,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    login_record_id UUID;
    activity_record_id UUID;
    v_total_logins INTEGER;
BEGIN
    -- Insert login log
    INSERT INTO user_login_logs (
        user_id, 
        ip_address, 
        user_agent, 
        session_id, 
        login_method,
        login_success,
        metadata,
        login_time
    ) VALUES (
        p_user_id,
        CASE WHEN p_ip_address IS NOT NULL THEN p_ip_address::INET ELSE NULL END,
        p_user_agent,
        p_session_id,
        p_login_method,
        p_login_success,
        COALESCE(p_metadata, '{}'),
        NOW()
    ) RETURNING id INTO login_record_id;

    -- Insert corresponding activity record
    INSERT INTO user_activities (
        user_id,
        activity_type,
        description,
        session_id,
        ip_address,
        user_agent,
        metadata
    ) VALUES (
        p_user_id,
        'login',
        CASE 
            WHEN p_login_success THEN 'Successful login'
            ELSE 'Failed login attempt'
        END,
        p_session_id,
        CASE WHEN p_ip_address IS NOT NULL THEN p_ip_address::INET ELSE NULL END,
        p_user_agent,
        COALESCE(p_metadata, '{}')
    ) RETURNING id INTO activity_record_id;

    -- Update total logins count only for successful logins
    IF p_login_success THEN
        UPDATE users 
        SET 
            total_logins = COALESCE(total_logins, 0) + 1,
            last_login_at = NOW(),
            updated_at = NOW()
        WHERE id = p_user_id
        RETURNING total_logins INTO v_total_logins;
    ELSE
        SELECT total_logins INTO v_total_logins FROM users WHERE id = p_user_id;
    END IF;

    RETURN json_build_object(
        'success', true,
        'login_record_id', login_record_id,
        'activity_record_id', activity_record_id,
        'total_logins', COALESCE(v_total_logins, 0),
        'message', CASE 
            WHEN p_login_success THEN 'Login recorded successfully'
            ELSE 'Failed login recorded'
        END
    );

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM,
        'message', 'Failed to record login'
    );
END;
$$;

-- Create or replace the record_user_activity RPC function
CREATE OR REPLACE FUNCTION record_user_activity(
    p_user_id UUID,
    p_activity_type TEXT,
    p_description TEXT DEFAULT NULL,
    p_session_id TEXT DEFAULT NULL,
    p_ip_address TEXT DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    activity_record_id UUID;
BEGIN
    -- Insert activity record
    INSERT INTO user_activities (
        user_id,
        activity_type,
        description,
        session_id,
        ip_address,
        user_agent,
        metadata
    ) VALUES (
        p_user_id,
        p_activity_type,
        p_description,
        p_session_id,
        CASE WHEN p_ip_address IS NOT NULL THEN p_ip_address::INET ELSE NULL END,
        p_user_agent,
        COALESCE(p_metadata, '{}')
    ) RETURNING id INTO activity_record_id;

    RETURN json_build_object(
        'success', true,
        'activity_record_id', activity_record_id,
        'message', 'Activity recorded successfully'
    );

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM,
        'message', 'Failed to record activity'
    );
END;
$$;

-- Create or replace the get_user_login_stats RPC function
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
    v_logins_this_month INTEGER;
    v_avg_session_duration NUMERIC;
    v_result JSON;
BEGIN
    -- Get total logins from users table
    SELECT COALESCE(total_logins, 0), last_login_at
    INTO v_total_logins, v_last_login
    FROM users 
    WHERE id = p_user_id;
    
    -- Get logins today
    SELECT COUNT(*)
    INTO v_logins_today
    FROM user_login_logs
    WHERE user_id = p_user_id 
    AND login_success = true
    AND DATE(COALESCE(login_time, created_at)) = CURRENT_DATE;
    
    -- Get logins this week
    SELECT COUNT(*)
    INTO v_logins_this_week
    FROM user_login_logs
    WHERE user_id = p_user_id 
    AND login_success = true
    AND COALESCE(login_time, created_at) >= DATE_TRUNC('week', CURRENT_DATE);
    
    -- Get logins this month
    SELECT COUNT(*)
    INTO v_logins_this_month
    FROM user_login_logs
    WHERE user_id = p_user_id 
    AND login_success = true
    AND COALESCE(login_time, created_at) >= DATE_TRUNC('month', CURRENT_DATE);
    
    -- Calculate average session duration
    SELECT AVG(session_duration_ms)
    INTO v_avg_session_duration
    FROM user_login_logs
    WHERE user_id = p_user_id 
    AND login_success = true
    AND session_duration_ms IS NOT NULL;
    
    v_result := json_build_object(
        'total_logins', v_total_logins,
        'last_login', v_last_login,
        'logins_today', v_logins_today,
        'logins_this_week', v_logins_this_week,
        'logins_this_month', v_logins_this_month,
        'avg_session_duration_ms', COALESCE(v_avg_session_duration, 0)
    );
    
    RETURN v_result;
END;
$$;

-- Grant necessary permissions
GRANT SELECT, INSERT ON user_login_logs TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON user_activities TO anon, authenticated;
GRANT EXECUTE ON FUNCTION record_user_login(UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN, JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION record_user_activity(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_user_login_stats(UUID) TO anon, authenticated;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_login_logs_user_id_time ON user_login_logs(user_id, COALESCE(login_time, created_at) DESC);
CREATE INDEX IF NOT EXISTS idx_user_login_logs_session_id ON user_login_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_session_id ON user_activities(session_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_user_type_time ON user_activities(user_id, activity_type, created_at DESC);

COMMENT ON FUNCTION record_user_login IS 'Records user login activity with detailed information';
COMMENT ON FUNCTION record_user_activity IS 'Records user activity with session and client information';
COMMENT ON FUNCTION get_user_login_stats IS 'Retrieves comprehensive login statistics for a user';