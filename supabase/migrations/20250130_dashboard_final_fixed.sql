-- Final fixed get_dashboard_stats function with correct column names and data structure
CREATE OR REPLACE FUNCTION get_dashboard_stats(
    p_user_id uuid DEFAULT NULL,
    p_period text DEFAULT '100d'
)
RETURNS jsonb AS $$
DECLARE
    result jsonb;
    period_interval interval;
    user_search_count integer;
    user_report_count integer;
    market_search_avg numeric;
    market_report_avg numeric;
    search_conversion_rate numeric;
    report_conversion_rate numeric;
    efficiency_score numeric;
    search_tech_fields jsonb;
    report_tech_fields jsonb;
    market_search_tech_fields jsonb;
    market_report_tech_fields jsonb;
    recent_searches jsonb;
    recent_reports jsonb;
    daily_searches jsonb;
    daily_reports jsonb;
    market_daily_searches jsonb;
    market_daily_reports jsonb;
BEGIN
    -- Parse period to interval
    period_interval := CASE 
        WHEN p_period = '7d' THEN INTERVAL '7 days'
        WHEN p_period = '30d' THEN INTERVAL '30 days'
        WHEN p_period = '100d' THEN INTERVAL '100 days'
        WHEN p_period = '1y' THEN INTERVAL '1 year'
        ELSE INTERVAL '100 days'
    END;

    -- Get user search count
    SELECT COUNT(*)
    INTO user_search_count
    FROM search_history
    WHERE (p_user_id IS NULL OR user_id = p_user_id)
        AND created_at >= NOW() - period_interval;

    -- Get user report count
    SELECT COUNT(*)
    INTO user_report_count
    FROM ai_analysis_reports
    WHERE (p_user_id IS NULL OR user_id = p_user_id)
        AND created_at >= NOW() - period_interval;

    -- Calculate market averages (all users)
    SELECT AVG(daily_searches)::numeric
    INTO market_search_avg
    FROM (
        SELECT COUNT(*) as daily_searches
        FROM search_history
        WHERE created_at >= NOW() - period_interval
        GROUP BY DATE(created_at)
    ) daily_stats;

    SELECT AVG(daily_reports)::numeric
    INTO market_report_avg
    FROM (
        SELECT COUNT(*) as daily_reports
        FROM ai_analysis_reports
        WHERE created_at >= NOW() - period_interval
        GROUP BY DATE(created_at)
    ) daily_stats;

    -- Calculate conversion rates
    search_conversion_rate := CASE 
        WHEN user_search_count > 0 THEN (user_search_count::numeric / GREATEST(market_search_avg * EXTRACT(days FROM period_interval), 1)) * 100
        ELSE 0
    END;

    report_conversion_rate := CASE 
        WHEN user_report_count > 0 THEN (user_report_count::numeric / GREATEST(market_report_avg * EXTRACT(days FROM period_interval), 1)) * 100
        ELSE 0
    END;

    -- Calculate efficiency score
    efficiency_score := (search_conversion_rate + report_conversion_rate) / 2;

    -- Get user search technology field distribution (fixed column names)
    SELECT jsonb_agg(
        jsonb_build_object(
            'field', technology_field,
            'ipc_code', ipc_code,
            'search_count', count,
            'percentage', percentage
        )
    )
    INTO search_tech_fields
    FROM (
        SELECT 
            COALESCE(technology_field, '기타') as technology_field,
            COALESCE(ipc_codes[1], 'G') as ipc_code,  -- Use first IPC code from array
            COUNT(*) as count,
            ROUND((COUNT(*) * 100.0 / SUM(COUNT(*)) OVER())::numeric, 1) as percentage
        FROM search_history
        WHERE (p_user_id IS NULL OR user_id = p_user_id)
            AND created_at >= NOW() - period_interval
        GROUP BY technology_field, ipc_codes[1]
        ORDER BY count DESC
        LIMIT 10
    ) tech_stats;

    -- Get user report technology field distribution
    SELECT jsonb_agg(
        jsonb_build_object(
            'field', technology_field,
            'ipc_code', 'G',  -- Default IPC code for reports
            'report_count', count,
            'percentage', percentage
        )
    )
    INTO report_tech_fields
    FROM (
        SELECT 
            COALESCE(technology_field, '기타') as technology_field,
            COUNT(*) as count,
            ROUND((COUNT(*) * 100.0 / SUM(COUNT(*)) OVER())::numeric, 1) as percentage
        FROM ai_analysis_reports
        WHERE (p_user_id IS NULL OR user_id = p_user_id)
            AND created_at >= NOW() - period_interval
        GROUP BY technology_field
        ORDER BY count DESC
        LIMIT 10
    ) tech_stats;

    -- Get market search technology field distribution (fixed to use 'count' consistently)
    SELECT jsonb_agg(
        jsonb_build_object(
            'field', technology_field,
            'ipc_code', ipc_code,
            'count', count,
            'percentage', percentage
        )
    )
    INTO market_search_tech_fields
    FROM (
        SELECT 
            COALESCE(technology_field, '기타') as technology_field,
            COALESCE(ipc_codes[1], 'G') as ipc_code,
            COUNT(*) as count,
            ROUND((COUNT(*) * 100.0 / SUM(COUNT(*)) OVER())::numeric, 1) as percentage
        FROM search_history
        WHERE created_at >= NOW() - period_interval
        GROUP BY technology_field, ipc_codes[1]
        ORDER BY count DESC
        LIMIT 10
    ) tech_stats;

    -- Get market report technology field distribution
    SELECT jsonb_agg(
        jsonb_build_object(
            'field', technology_field,
            'ipc_code', 'G',
            'count', count,
            'percentage', percentage
        )
    )
    INTO market_report_tech_fields
    FROM (
        SELECT 
            COALESCE(technology_field, '기타') as technology_field,
            COUNT(*) as count,
            ROUND((COUNT(*) * 100.0 / SUM(COUNT(*)) OVER())::numeric, 1) as percentage
        FROM ai_analysis_reports
        WHERE created_at >= NOW() - period_interval
        GROUP BY technology_field
        ORDER BY count DESC
        LIMIT 10
    ) tech_stats;

    -- Get recent searches (fixed column names) - 더 넓은 기간으로 검색
    SELECT jsonb_agg(
        jsonb_build_object(
            'keyword', keyword,
            'created_at', created_at,
            'technology_field', COALESCE(technology_field, '기타'),
            'results_count', 1
        )
    )
    INTO recent_searches
    FROM (
        SELECT 
            keyword,
            created_at,
            technology_field
        FROM search_history
        WHERE (p_user_id IS NULL OR user_id = p_user_id)
            AND created_at >= NOW() - INTERVAL '1 year'  -- 더 넓은 기간으로 검색
        ORDER BY created_at DESC
        LIMIT 10
    ) recent_search_data;

    -- Get recent reports (fixed column names) - 더 넓은 기간으로 검색
    SELECT jsonb_agg(
        jsonb_build_object(
            'title', invention_title,
            'invention_title', invention_title,
            'created_at', created_at,
            'technology_field', COALESCE(technology_field, '기타'),
            'application_number', COALESCE(application_number, '')
        )
    )
    INTO recent_reports
    FROM (
        SELECT 
            invention_title,
            created_at,
            technology_field,
            application_number
        FROM ai_analysis_reports
        WHERE (p_user_id IS NULL OR user_id = p_user_id)
            AND created_at >= NOW() - INTERVAL '1 year'  -- 더 넓은 기간으로 검색
        ORDER BY created_at DESC
        LIMIT 10
    ) recent_report_data;

    -- Get daily search trends for user
    SELECT jsonb_agg(
        jsonb_build_object(
            'date', search_date,
            'count', search_count
        ) ORDER BY search_date
    )
    INTO daily_searches
    FROM (
        SELECT 
            DATE(created_at) as search_date,
            COUNT(*) as search_count
        FROM search_history
        WHERE (p_user_id IS NULL OR user_id = p_user_id)
            AND created_at >= NOW() - period_interval
        GROUP BY DATE(created_at)
        ORDER BY search_date
    ) daily_search_stats;

    -- Get daily report trends for user
    SELECT jsonb_agg(
        jsonb_build_object(
            'date', report_date,
            'count', report_count
        ) ORDER BY report_date
    )
    INTO daily_reports
    FROM (
        SELECT 
            DATE(created_at) as report_date,
            COUNT(*) as report_count
        FROM ai_analysis_reports
        WHERE (p_user_id IS NULL OR user_id = p_user_id)
            AND created_at >= NOW() - period_interval
        GROUP BY DATE(created_at)
        ORDER BY report_date
    ) daily_report_stats;

    -- Get market daily search trends
    SELECT jsonb_agg(
        jsonb_build_object(
            'date', search_date,
            'count', avg_search_count
        ) ORDER BY search_date
    )
    INTO market_daily_searches
    FROM (
        SELECT 
            DATE(created_at) as search_date,
            AVG(daily_count)::numeric as avg_search_count
        FROM (
            SELECT 
                DATE(created_at) as search_date,
                user_id,
                COUNT(*) as daily_count
            FROM search_history
            WHERE created_at >= NOW() - period_interval
            GROUP BY DATE(created_at), user_id
        ) user_daily_searches
        GROUP BY search_date
        ORDER BY search_date
    ) market_search_stats;

    -- Get market daily report trends
    SELECT jsonb_agg(
        jsonb_build_object(
            'date', report_date,
            'count', avg_report_count
        ) ORDER BY report_date
    )
    INTO market_daily_reports
    FROM (
        SELECT 
            DATE(created_at) as report_date,
            AVG(daily_count)::numeric as avg_report_count
        FROM (
            SELECT 
                DATE(created_at) as report_date,
                user_id,
                COUNT(*) as daily_count
            FROM ai_analysis_reports
            WHERE created_at >= NOW() - period_interval
            GROUP BY DATE(created_at), user_id
        ) user_daily_reports
        GROUP BY report_date
        ORDER BY report_date
    ) market_report_stats;

    -- Build final result with improved quota and efficiency calculations
    result := jsonb_build_object(
        'quota_status', jsonb_build_object(
            'current_usage', user_search_count + user_report_count,
            'max_quota', 1000,
            'usage_percentage', ROUND(((user_search_count + user_report_count) * 100.0 / 1000)::numeric, 1),
            'remaining_quota', 1000 - (user_search_count + user_report_count),
            'subscription_plan', '정기 구독'
        ),
        'efficiency_metrics', jsonb_build_object(
            'total_logins', 10,  -- Mock data for now
            'total_searches', user_search_count,
            'total_reports', user_report_count,
            'period_reports', user_report_count,
            'login_to_report_rate', CASE WHEN user_report_count > 0 THEN (user_report_count::numeric / 10) * 100 ELSE 0 END,
            'search_to_report_rate', CASE WHEN user_search_count > 0 THEN (user_report_count::numeric / user_search_count) * 100 ELSE 0 END
        ),
        'recent_activities', jsonb_build_object(
            'reports', COALESCE(recent_reports, '[]'::jsonb),
            'searches', COALESCE(recent_searches, '[]'::jsonb)
        ),
        'search_fields_top10', COALESCE(search_tech_fields, '[]'::jsonb),
        'report_fields_top10', COALESCE(report_tech_fields, '[]'::jsonb),
        'market_search_fields_top10', COALESCE(market_search_tech_fields, '[]'::jsonb),
        'market_report_fields_top10', COALESCE(market_report_tech_fields, '[]'::jsonb),
        'recent_searches', COALESCE(recent_searches, '[]'::jsonb),
        'recent_reports', COALESCE(recent_reports, '[]'::jsonb),
        'daily_searches', COALESCE(daily_searches, '[]'::jsonb),
        'daily_reports', COALESCE(daily_reports, '[]'::jsonb),
        'market_daily_searches', COALESCE(market_daily_searches, '[]'::jsonb),
        'market_daily_reports', COALESCE(market_daily_reports, '[]'::jsonb),
        'period', p_period,
        'generated_at', NOW()
    );

    RETURN result;
END;
$$ LANGUAGE plpgsql;