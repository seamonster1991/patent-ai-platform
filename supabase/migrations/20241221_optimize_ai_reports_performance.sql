-- AI Analysis Reports Performance Optimization and 100-day Retention Policy
-- Created: 2024-12-21
-- Purpose: Add database indexes for better performance and implement automatic cleanup

-- 1. Add performance indexes for ai_analysis_reports table
CREATE INDEX IF NOT EXISTS idx_ai_analysis_reports_user_id_created_at 
ON ai_analysis_reports(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_analysis_reports_created_at 
ON ai_analysis_reports(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_analysis_reports_application_number 
ON ai_analysis_reports(application_number);

CREATE INDEX IF NOT EXISTS idx_ai_analysis_reports_invention_title 
ON ai_analysis_reports USING gin(to_tsvector('english', invention_title));

-- 2. Add indexes for user_activities table (used in dashboard statistics)
CREATE INDEX IF NOT EXISTS idx_user_activities_user_id_created_at 
ON user_activities(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_activities_activity_type_created_at 
ON user_activities(activity_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_activities_created_at 
ON user_activities(created_at DESC);

-- 3. Create function for 100-day retention cleanup
CREATE OR REPLACE FUNCTION cleanup_old_ai_reports()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete reports older than 100 days
    DELETE FROM ai_analysis_reports 
    WHERE created_at < NOW() - INTERVAL '100 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log the cleanup operation
    INSERT INTO user_activities (
        user_id,
        activity_type,
        activity_data,
        created_at
    ) VALUES (
        NULL, -- System operation
        'system_cleanup',
        jsonb_build_object(
            'operation', 'ai_reports_cleanup',
            'deleted_count', deleted_count,
            'retention_days', 100
        ),
        NOW()
    );
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create function for user activity cleanup (keep 1 year of activity data)
CREATE OR REPLACE FUNCTION cleanup_old_user_activities()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete activities older than 1 year (except system operations)
    DELETE FROM user_activities 
    WHERE created_at < NOW() - INTERVAL '365 days'
    AND activity_type != 'system_cleanup';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log the cleanup operation
    INSERT INTO user_activities (
        user_id,
        activity_type,
        activity_data,
        created_at
    ) VALUES (
        NULL, -- System operation
        'system_cleanup',
        jsonb_build_object(
            'operation', 'user_activities_cleanup',
            'deleted_count', deleted_count,
            'retention_days', 365
        ),
        NOW()
    );
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create scheduled cleanup job using pg_cron (if available)
-- Note: This requires pg_cron extension to be enabled
-- Run cleanup daily at 2 AM UTC
DO $$
BEGIN
    -- Try to create cron job, ignore if pg_cron is not available
    BEGIN
        PERFORM cron.schedule('ai-reports-cleanup', '0 2 * * *', 'SELECT cleanup_old_ai_reports();');
        PERFORM cron.schedule('user-activities-cleanup', '0 3 * * *', 'SELECT cleanup_old_user_activities();');
    EXCEPTION WHEN OTHERS THEN
        -- pg_cron not available, skip scheduling
        NULL;
    END;
END $$;

-- 6. Create manual cleanup procedure for immediate use
CREATE OR REPLACE FUNCTION run_maintenance_cleanup()
RETURNS TABLE(
    operation TEXT,
    deleted_count INTEGER,
    execution_time TIMESTAMP
) AS $$
DECLARE
    reports_deleted INTEGER;
    activities_deleted INTEGER;
    start_time TIMESTAMP;
BEGIN
    start_time := NOW();
    
    -- Clean up old AI reports
    SELECT cleanup_old_ai_reports() INTO reports_deleted;
    
    -- Clean up old user activities
    SELECT cleanup_old_user_activities() INTO activities_deleted;
    
    -- Return results
    RETURN QUERY VALUES 
        ('ai_reports_cleanup', reports_deleted, start_time),
        ('user_activities_cleanup', activities_deleted, NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Add comments for documentation
COMMENT ON FUNCTION cleanup_old_ai_reports() IS 'Automatically deletes AI analysis reports older than 100 days';
COMMENT ON FUNCTION cleanup_old_user_activities() IS 'Automatically deletes user activities older than 1 year (except system operations)';
COMMENT ON FUNCTION run_maintenance_cleanup() IS 'Manual maintenance function to run all cleanup operations';

-- 8. Grant necessary permissions
GRANT EXECUTE ON FUNCTION cleanup_old_ai_reports() TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_old_user_activities() TO service_role;
GRANT EXECUTE ON FUNCTION run_maintenance_cleanup() TO service_role;

-- 9. Create view for monitoring report statistics
CREATE OR REPLACE VIEW ai_reports_statistics AS
SELECT 
    COUNT(*) as total_reports,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as reports_last_7_days,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as reports_last_30_days,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '100 days' THEN 1 END) as reports_last_100_days,
    COUNT(CASE WHEN created_at < NOW() - INTERVAL '100 days' THEN 1 END) as reports_older_than_100_days,
    MIN(created_at) as oldest_report,
    MAX(created_at) as newest_report,
    COUNT(DISTINCT user_id) as unique_users,
    AVG(EXTRACT(EPOCH FROM (NOW() - created_at))/86400)::INTEGER as avg_age_days
FROM ai_analysis_reports;

-- Grant access to the view
GRANT SELECT ON ai_reports_statistics TO authenticated, anon;

-- 10. Create trigger to automatically update report statistics
CREATE OR REPLACE FUNCTION update_report_stats_trigger()
RETURNS TRIGGER AS $$
BEGIN
    -- This could be used to maintain real-time statistics if needed
    -- For now, just return the record
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Add trigger for insert/update/delete on ai_analysis_reports
DROP TRIGGER IF EXISTS trigger_update_report_stats ON ai_analysis_reports;
CREATE TRIGGER trigger_update_report_stats
    AFTER INSERT OR UPDATE OR DELETE ON ai_analysis_reports
    FOR EACH ROW EXECUTE FUNCTION update_report_stats_trigger();