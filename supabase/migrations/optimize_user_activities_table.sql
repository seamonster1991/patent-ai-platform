-- Optimize user_activities table for better performance
-- Add additional indexes for common query patterns

-- Composite index for user_id and activity_type queries
CREATE INDEX IF NOT EXISTS idx_user_activities_user_type ON user_activities(user_id, activity_type);

-- Index for activity_data JSONB queries
CREATE INDEX IF NOT EXISTS idx_user_activities_data_gin ON user_activities USING GIN (activity_data);

-- Index for specific JSONB fields that are commonly queried
CREATE INDEX IF NOT EXISTS idx_user_activities_keyword ON user_activities USING GIN ((activity_data->>'keyword'));
CREATE INDEX IF NOT EXISTS idx_user_activities_application_number ON user_activities USING GIN ((activity_data->>'application_number'));
CREATE INDEX IF NOT EXISTS idx_user_activities_patent_title ON user_activities USING GIN ((activity_data->>'patent_title'));

-- Partial indexes for specific activity types (more efficient for common queries)
CREATE INDEX IF NOT EXISTS idx_user_activities_search ON user_activities(user_id, created_at) 
WHERE activity_type = 'search';

CREATE INDEX IF NOT EXISTS idx_user_activities_patent_view ON user_activities(user_id, created_at) 
WHERE activity_type = 'patent_view';

CREATE INDEX IF NOT EXISTS idx_user_activities_ai_analysis ON user_activities(user_id, created_at) 
WHERE activity_type = 'ai_analysis';

-- Index for time-based queries (hourly, daily analysis)
CREATE INDEX IF NOT EXISTS idx_user_activities_hour ON user_activities(user_id, date_trunc('hour', created_at));
CREATE INDEX IF NOT EXISTS idx_user_activities_day ON user_activities(user_id, date_trunc('day', created_at));

-- Add user_agent and ip_address columns if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_activities' AND column_name = 'user_agent') THEN
        ALTER TABLE user_activities ADD COLUMN user_agent TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_activities' AND column_name = 'ip_address') THEN
        ALTER TABLE user_activities ADD COLUMN ip_address INET;
    END IF;
END $$;

-- Create function for activity statistics aggregation
CREATE OR REPLACE FUNCTION get_user_activity_stats(
    p_user_id UUID,
    p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
    activity_type VARCHAR(50),
    activity_count BIGINT,
    first_activity TIMESTAMP WITH TIME ZONE,
    last_activity TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ua.activity_type,
        COUNT(*) as activity_count,
        MIN(ua.created_at) as first_activity,
        MAX(ua.created_at) as last_activity
    FROM user_activities ua
    WHERE ua.user_id = p_user_id
        AND ua.created_at >= NOW() - INTERVAL '1 day' * p_days
    GROUP BY ua.activity_type
    ORDER BY activity_count DESC;
END;
$$;

-- Create function for hourly activity analysis
CREATE OR REPLACE FUNCTION get_user_hourly_activity(
    p_user_id UUID,
    p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
    hour_of_day INTEGER,
    activity_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        EXTRACT(HOUR FROM ua.created_at)::INTEGER as hour_of_day,
        COUNT(*) as activity_count
    FROM user_activities ua
    WHERE ua.user_id = p_user_id
        AND ua.created_at >= NOW() - INTERVAL '1 day' * p_days
    GROUP BY EXTRACT(HOUR FROM ua.created_at)
    ORDER BY hour_of_day;
END;
$$;

-- Create function for daily activity trend
CREATE OR REPLACE FUNCTION get_user_daily_trend(
    p_user_id UUID,
    p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
    activity_date DATE,
    activity_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ua.created_at::DATE as activity_date,
        COUNT(*) as activity_count
    FROM user_activities ua
    WHERE ua.user_id = p_user_id
        AND ua.created_at >= NOW() - INTERVAL '1 day' * p_days
    GROUP BY ua.created_at::DATE
    ORDER BY activity_date;
END;
$$;

-- Create materialized view for activity summary (for better performance on large datasets)
CREATE MATERIALIZED VIEW IF NOT EXISTS user_activity_summary AS
SELECT 
    user_id,
    activity_type,
    DATE(created_at) as activity_date,
    COUNT(*) as daily_count,
    MIN(created_at) as first_activity_time,
    MAX(created_at) as last_activity_time
FROM user_activities
GROUP BY user_id, activity_type, DATE(created_at);

-- Create index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_activity_summary_unique 
ON user_activity_summary(user_id, activity_type, activity_date);

-- Create function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_user_activity_summary()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY user_activity_summary;
END;
$$;

-- Set up automatic refresh of materialized view (daily at 2 AM)
-- Note: This requires pg_cron extension to be enabled
-- SELECT cron.schedule('refresh-activity-summary', '0 2 * * *', 'SELECT refresh_user_activity_summary();');

-- Create function for batch activity insertion (for better performance)
CREATE OR REPLACE FUNCTION insert_user_activities(
    activities JSONB
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    activity JSONB;
BEGIN
    FOR activity IN SELECT jsonb_array_elements(activities)
    LOOP
        INSERT INTO user_activities (
            user_id,
            activity_type,
            activity_data,
            ip_address,
            user_agent,
            created_at
        ) VALUES (
            (activity->>'user_id')::UUID,
            activity->>'activity_type',
            activity->'activity_data',
            (activity->>'ip_address')::INET,
            activity->>'user_agent',
            COALESCE((activity->>'created_at')::TIMESTAMP WITH TIME ZONE, NOW())
        );
    END LOOP;
END;
$$;

-- Add RLS policy for the new columns
CREATE POLICY "Users can update own activity metadata" ON user_activities
    FOR UPDATE USING (auth.uid() = user_id);

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_user_activity_stats(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_hourly_activity(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_daily_trend(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION insert_user_activities(JSONB) TO authenticated;
GRANT SELECT ON user_activity_summary TO authenticated;