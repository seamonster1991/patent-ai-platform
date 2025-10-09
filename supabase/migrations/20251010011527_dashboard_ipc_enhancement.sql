-- Enhanced get_dashboard_stats function with IPC/CPC analysis and recent activities
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

    -- Get user search technology field distribution
    SELECT jsonb_agg(
        jsonb_build_object(
            'field', technology_field,
            'count', count,
            'percentage', percentage
        )
    )
    INTO search_tech_fields
    FROM (
        SELECT 
            COALESCE(technology_field, '기타') as technology_field,
            COUNT(*) as count,
            ROUND((COUNT(*) * 100.0 / SUM(COUNT(*)) OVER())::numeric, 1) as percentage
        FROM search_history
        WHERE (p_user_id IS NULL OR user_id = p_user_id)
            AND created_at >= NOW() - period_interval
        GROUP BY technology_field
        ORDER BY count DESC
        LIMIT 10
    ) tech_stats;

    -- Get user report technology field distribution
    SELECT jsonb_agg(
        jsonb_build_object(
            'field', technology_field,
            'count', count,
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

    -- Get market search technology field distribution (all users)
    SELECT jsonb_agg(
        jsonb_build_object(
            'field', technology_field,
            'count', count,
            'percentage', percentage
        )
    )
    INTO market_search_tech_fields
    FROM (
        SELECT 
            COALESCE(technology_field, '기타') as technology_field,
            COUNT(*) as count,
            ROUND((COUNT(*) * 100.0 / SUM(COUNT(*)) OVER())::numeric, 1) as percentage
        FROM search_history
        WHERE created_at >= NOW() - period_interval
        GROUP BY technology_field
        ORDER BY count DESC
        LIMIT 10
    ) tech_stats;

    -- Get market report technology field distribution (all users)
    SELECT jsonb_agg(
        jsonb_build_object(
            'field', technology_field,
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

    -- Get recent search terms (top 10)
    SELECT jsonb_agg(
        jsonb_build_object(
            'keyword', keyword,
            'created_at', created_at,
            'technology_field', COALESCE(technology_field, '기타'),
            'results_count', COALESCE(results_count, 0)
        )
    )
    INTO recent_searches
    FROM (
        SELECT keyword, created_at, technology_field, results_count
        FROM search_history
        WHERE (p_user_id IS NULL OR user_id = p_user_id)
            AND created_at >= NOW() - period_interval
        ORDER BY created_at DESC
        LIMIT 10
    ) recent_search_data;

    -- Get recent report titles (top 10)
    SELECT jsonb_agg(
        jsonb_build_object(
            'title', COALESCE(report_name, invention_title),
            'invention_title', invention_title,
            'created_at', created_at,
            'technology_field', COALESCE(technology_field, '기타'),
            'application_number', application_number
        )
    )
    INTO recent_reports
    FROM (
        SELECT 
            report_name,
            invention_title,
            created_at,
            technology_field,
            application_number
        FROM ai_analysis_reports
        WHERE (p_user_id IS NULL OR user_id = p_user_id)
            AND created_at >= NOW() - period_interval
        ORDER BY created_at DESC
        LIMIT 10
    ) recent_report_data;

    -- Build final result
    result := jsonb_build_object(
        'quota_status', jsonb_build_object(
            'used', user_search_count + user_report_count,
            'total', 1000,
            'percentage', LEAST(((user_search_count + user_report_count) * 100.0 / 1000), 100)
        ),
        'efficiency_metrics', jsonb_build_object(
            'search_conversion_rate', ROUND(search_conversion_rate::numeric, 1),
            'report_conversion_rate', ROUND(report_conversion_rate::numeric, 1),
            'efficiency_score', ROUND(efficiency_score::numeric, 1)
        ),
        'search_trends', jsonb_build_object(
            'individual', jsonb_build_object(
                'total_searches', user_search_count,
                'conversion_rate', ROUND(search_conversion_rate::numeric, 1)
            ),
            'market', jsonb_build_object(
                'avg_daily_searches', ROUND(COALESCE(market_search_avg, 0)::numeric, 1),
                'total_period_searches', ROUND((COALESCE(market_search_avg, 0) * EXTRACT(days FROM period_interval))::numeric, 0)
            )
        ),
        'report_trends', jsonb_build_object(
            'individual', jsonb_build_object(
                'total_reports', user_report_count,
                'conversion_rate', ROUND(report_conversion_rate::numeric, 1)
            ),
            'market', jsonb_build_object(
                'avg_daily_reports', ROUND(COALESCE(market_report_avg, 0)::numeric, 1),
                'total_period_reports', ROUND((COALESCE(market_report_avg, 0) * EXTRACT(days FROM period_interval))::numeric, 0)
            )
        ),
        'technology_fields', jsonb_build_object(
            'search_individual', COALESCE(search_tech_fields, '[]'::jsonb),
            'search_market', COALESCE(market_search_tech_fields, '[]'::jsonb),
            'report_individual', COALESCE(report_tech_fields, '[]'::jsonb),
            'report_market', COALESCE(market_report_tech_fields, '[]'::jsonb)
        ),
        'recent_activities', jsonb_build_object(
            'recent_searches', COALESCE(recent_searches, '[]'::jsonb),
            'recent_reports', COALESCE(recent_reports, '[]'::jsonb)
        ),
        'period', p_period,
        'generated_at', NOW()
    );

    RETURN result;
END;
$$ LANGUAGE plpgsql