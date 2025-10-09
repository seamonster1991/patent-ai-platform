-- Update get_dashboard_stats to support 100-day period ('100d') for trends
-- This adds a new case to v_period_days so the API can request 100 days

CREATE OR REPLACE FUNCTION get_dashboard_stats(p_user_id UUID, p_period TEXT DEFAULT '30d')
RETURNS JSON AS $$
DECLARE
    v_result JSON;
    v_quota_status JSON;
    v_efficiency_metrics JSON;
    v_recent_activities JSON;
    v_search_fields_top10 JSON;
    v_report_fields_top10 JSON;
    v_market_search_fields_top10 JSON;
    v_market_report_fields_top10 JSON;
    v_daily_searches JSON;
    v_daily_reports JSON;
    v_market_daily_searches JSON;
    v_market_daily_reports JSON;
    v_period_days INTEGER;
BEGIN
    -- Parse period parameter (extended to support '100d')
    v_period_days := CASE 
        WHEN p_period = '7d' THEN 7
        WHEN p_period = '30d' THEN 30
        WHEN p_period = '90d' THEN 90
        WHEN p_period = '100d' THEN 100
        ELSE 30
    END;

    -- 1. Quota Status
    SELECT json_build_object(
        'current_usage', COALESCE(u.usage_count, 0),
        'max_quota', CASE 
            WHEN u.subscription_plan = 'premium' THEN 1000 
            ELSE 100 
        END,
        'usage_percentage', ROUND(
            (COALESCE(u.usage_count, 0)::DECIMAL / 
            CASE WHEN u.subscription_plan = 'premium' THEN 1000 ELSE 100 END) * 100, 2
        ),
        'remaining_quota', CASE 
            WHEN u.subscription_plan = 'premium' THEN 1000 - COALESCE(u.usage_count, 0)
            ELSE 100 - COALESCE(u.usage_count, 0)
        END,
        'subscription_plan', COALESCE(u.subscription_plan, 'free')
    ) INTO v_quota_status
    FROM users u WHERE u.id = p_user_id;

    -- 2. Efficiency Metrics
    SELECT json_build_object(
        'total_logins', COALESCE(u.total_logins, 0),
        'total_searches', COALESCE(u.total_searches, 0),
        'total_reports', COALESCE(u.total_reports, 0),
        'period_reports', COALESCE(period_reports.count, 0),
        'login_to_report_rate', CASE 
            WHEN COALESCE(u.total_logins, 0) > 0 
            THEN ROUND((COALESCE(u.total_reports, 0)::DECIMAL / u.total_logins) * 100, 1)
            ELSE 0 
        END,
        'search_to_report_rate', CASE 
            WHEN COALESCE(u.total_searches, 0) > 0 
            THEN ROUND((COALESCE(u.total_reports, 0)::DECIMAL / u.total_searches) * 100, 1)
            ELSE 0 
        END
    ) INTO v_efficiency_metrics
    FROM users u
    LEFT JOIN (
        SELECT COUNT(*) as count
        FROM ai_analysis_reports 
        WHERE user_id = p_user_id 
        AND created_at >= NOW() - INTERVAL '1 day' * v_period_days
    ) period_reports ON true
    WHERE u.id = p_user_id;

    -- 3. Recent Activities (Reports and Searches)
    SELECT json_build_object(
        'reports', COALESCE(reports_data.reports, '[]'::json),
        'searches', COALESCE(searches_data.searches, '[]'::json)
    ) INTO v_recent_activities
    FROM (
        SELECT json_agg(
            json_build_object(
                'id', r.id,
                'title', COALESCE(r.invention_title, 'AI 분석 리포트'),
                'description', r.invention_title,
                'timestamp', r.created_at,
                'analysis_type', COALESCE(r.analysis_type, 'market')
            ) ORDER BY r.created_at DESC
        ) as reports
        FROM (
            SELECT * FROM ai_analysis_reports 
            WHERE user_id = p_user_id 
            ORDER BY created_at DESC 
            LIMIT 10
        ) r
    ) reports_data
    CROSS JOIN (
        SELECT json_agg(
            json_build_object(
                'id', s.id,
                'query', s.keyword,
                'keyword', s.keyword,
                'timestamp', s.created_at
            ) ORDER BY s.created_at DESC
        ) as searches
        FROM (
            SELECT * FROM search_history 
            WHERE user_id = p_user_id 
            ORDER BY created_at DESC 
            LIMIT 10
        ) s
    ) searches_data;

    -- 4. Search Fields Top 10 (User)
    SELECT COALESCE(json_agg(
        json_build_object(
            'field', COALESCE(technology_field, 'General'),
            'ipc_code', COALESCE(SUBSTRING(ipc_codes[1] FROM 1 FOR 4), 'G'),
            'search_count', search_count,
            'percentage', ROUND((search_count::DECIMAL / total_searches.total) * 100, 1)
        ) ORDER BY search_count DESC
    ), '[]'::json) INTO v_search_fields_top10
    FROM (
        SELECT 
            COALESCE(technology_field, 'General') as technology_field,
            ipc_codes,
            COUNT(*) as search_count
        FROM search_history 
        WHERE user_id = p_user_id 
        AND created_at >= NOW() - INTERVAL '1 day' * v_period_days
        GROUP BY technology_field, ipc_codes
        ORDER BY search_count DESC
        LIMIT 10
    ) user_searches
    CROSS JOIN (
        SELECT COUNT(*) as total
        FROM search_history 
        WHERE user_id = p_user_id 
        AND created_at >= NOW() - INTERVAL '1 day' * v_period_days
    ) total_searches
    WHERE total_searches.total > 0;

    -- 5. Report Fields Top 10 (User)
    SELECT COALESCE(json_agg(
        json_build_object(
            'field', CASE 
                WHEN invention_title ILIKE '%AI%' OR invention_title ILIKE '%인공지능%' THEN 'Artificial Intelligence'
                WHEN invention_title ILIKE '%IoT%' OR invention_title ILIKE '%센서%' THEN 'IoT/Sensors'
                WHEN invention_title ILIKE '%블록체인%' OR invention_title ILIKE '%blockchain%' THEN 'Blockchain'
                WHEN invention_title ILIKE '%통신%' OR invention_title ILIKE '%telecommunication%' THEN 'Telecommunications'
                WHEN invention_title ILIKE '%반도체%' OR invention_title ILIKE '%semiconductor%' THEN 'Semiconductors'
                WHEN invention_title ILIKE '%교통%' OR invention_title ILIKE '%transportation%' THEN 'Transportation'
                WHEN invention_title ILIKE '%바이오%' OR invention_title ILIKE '%bio%' THEN 'Biotechnology'
                ELSE 'General'
            END,
            'ipc_code', CASE 
                WHEN invention_title ILIKE '%AI%' OR invention_title ILIKE '%인공지능%' THEN 'G06N'
                WHEN invention_title ILIKE '%IoT%' OR invention_title ILIKE '%센서%' THEN 'G08C'
                WHEN invention_title ILIKE '%블록체인%' OR invention_title ILIKE '%blockchain%' THEN 'H04L'
                WHEN invention_title ILIKE '%통신%' OR invention_title ILIKE '%telecommunication%' THEN 'H04B'
                WHEN invention_title ILIKE '%반도체%' OR invention_title ILIKE '%semiconductor%' THEN 'H01L'
                WHEN invention_title ILIKE '%교통%' OR invention_title ILIKE '%transportation%' THEN 'B60W'
                WHEN invention_title ILIKE '%바이오%' OR invention_title ILIKE '%bio%' THEN 'A61B'
                ELSE 'G'
            END,
            'report_count', report_count,
            'percentage', ROUND((report_count::DECIMAL / total_reports.total) * 100, 1)
        ) ORDER BY report_count DESC
    ), '[]'::json) INTO v_report_fields_top10
    FROM (
        SELECT 
            invention_title,
            COUNT(*) as report_count
        FROM ai_analysis_reports 
        WHERE user_id = p_user_id 
        AND created_at >= NOW() - INTERVAL '1 day' * v_period_days
        GROUP BY invention_title
        ORDER BY report_count DESC
        LIMIT 10
    ) user_reports
    CROSS JOIN (
        SELECT COUNT(*) as total
        FROM ai_analysis_reports 
        WHERE user_id = p_user_id 
        AND created_at >= NOW() - INTERVAL '1 day' * v_period_days
    ) total_reports
    WHERE total_reports.total > 0;

    -- 6. Market Search Fields Top 10 (All Users)
    SELECT COALESCE(json_agg(
        json_build_object(
            'field', COALESCE(technology_field, 'General'),
            'ipc_code', COALESCE(SUBSTRING(ipc_codes[1] FROM 1 FOR 4), 'G'),
            'search_count', search_count,
            'percentage', ROUND((search_count::DECIMAL / total_searches.total) * 100, 1)
        ) ORDER BY search_count DESC
    ), '[]'::json) INTO v_market_search_fields_top10
    FROM (
        SELECT 
            COALESCE(technology_field, 'General') as technology_field,
            ipc_codes,
            COUNT(*) as search_count
        FROM search_history 
        WHERE created_at >= NOW() - INTERVAL '1 day' * v_period_days
        GROUP BY technology_field, ipc_codes
        ORDER BY search_count DESC
        LIMIT 10
    ) market_searches
    CROSS JOIN (
        SELECT COUNT(*) as total
        FROM search_history 
        WHERE created_at >= NOW() - INTERVAL '1 day' * v_period_days
    ) total_searches
    WHERE total_searches.total > 0;

    -- 7. Market Report Fields Top 10 (All Users)
    SELECT COALESCE(json_agg(
        json_build_object(
            'field', CASE 
                WHEN invention_title ILIKE '%AI%' OR invention_title ILIKE '%인공지능%' THEN 'Artificial Intelligence'
                WHEN invention_title ILIKE '%IoT%' OR invention_title ILIKE '%센서%' THEN 'IoT/Sensors'
                WHEN invention_title ILIKE '%블록체인%' OR invention_title ILIKE '%blockchain%' THEN 'Blockchain'
                WHEN invention_title ILIKE '%통신%' OR invention_title ILIKE '%telecommunication%' THEN 'Telecommunications'
                WHEN invention_title ILIKE '%반도체%' OR invention_title ILIKE '%semiconductor%' THEN 'Semiconductors'
                WHEN invention_title ILIKE '%교통%' OR invention_title ILIKE '%transportation%' THEN 'Transportation'
                WHEN invention_title ILIKE '%바이오%' OR invention_title ILIKE '%bio%' THEN 'Biotechnology'
                ELSE 'General'
            END,
            'ipc_code', CASE 
                WHEN invention_title ILIKE '%AI%' OR invention_title ILIKE '%인공지능%' THEN 'G06N'
                WHEN invention_title ILIKE '%IoT%' OR invention_title ILIKE '%센서%' THEN 'G08C'
                WHEN invention_title ILIKE '%블록체인%' OR invention_title ILIKE '%blockchain%' THEN 'H04L'
                WHEN invention_title ILIKE '%통신%' OR invention_title ILIKE '%telecommunication%' THEN 'H04B'
                WHEN invention_title ILIKE '%반도체%' OR invention_title ILIKE '%semiconductor%' THEN 'H01L'
                WHEN invention_title ILIKE '%교통%' OR invention_title ILIKE '%transportation%' THEN 'B60W'
                WHEN invention_title ILIKE '%바이오%' OR invention_title ILIKE '%bio%' THEN 'A61B'
                ELSE 'G'
            END,
            'report_count', report_count,
            'percentage', ROUND((report_count::DECIMAL / total_reports.total) * 100, 1)
        ) ORDER BY report_count DESC
    ), '[]'::json) INTO v_market_report_fields_top10
    FROM (
        SELECT 
            invention_title,
            COUNT(*) as report_count
        FROM ai_analysis_reports 
        WHERE created_at >= NOW() - INTERVAL '1 day' * v_period_days
        GROUP BY invention_title
        ORDER BY report_count DESC
        LIMIT 10
    ) market_reports
    CROSS JOIN (
        SELECT COUNT(*) as total
        FROM ai_analysis_reports 
        WHERE created_at >= NOW() - INTERVAL '1 day' * v_period_days
    ) total_reports
    WHERE total_reports.total > 0;

    -- 8. Daily Searches (User)
    SELECT COALESCE(json_agg(
        json_build_object(
            'date', search_date::text,
            'count', search_count
        ) ORDER BY search_date
    ), '[]'::json) INTO v_daily_searches
    FROM (
        SELECT 
            DATE(created_at) as search_date,
            COUNT(*) as search_count
        FROM search_history 
        WHERE user_id = p_user_id 
        AND created_at >= NOW() - INTERVAL '1 day' * v_period_days
        GROUP BY DATE(created_at)
        ORDER BY search_date
    ) daily_user_searches;

    -- 9. Daily Reports (User)
    SELECT COALESCE(json_agg(
        json_build_object(
            'date', report_date::text,
            'count', report_count
        ) ORDER BY report_date
    ), '[]'::json) INTO v_daily_reports
    FROM (
        SELECT 
            DATE(created_at) as report_date,
            COUNT(*) as report_count
        FROM ai_analysis_reports 
        WHERE user_id = p_user_id 
        AND created_at >= NOW() - INTERVAL '1 day' * v_period_days
        GROUP BY DATE(created_at)
        ORDER BY report_date
    ) daily_user_reports;

    -- 10. Market Daily Searches (All Users Average)
    SELECT COALESCE(json_agg(
        json_build_object(
            'date', search_date::text,
            'count', ROUND(search_count::DECIMAL / user_count, 1)
        ) ORDER BY search_date
    ), '[]'::json) INTO v_market_daily_searches
    FROM (
        SELECT 
            DATE(sh.created_at) as search_date,
            COUNT(*) as search_count,
            COUNT(DISTINCT sh.user_id) as user_count
        FROM search_history sh
        WHERE sh.created_at >= NOW() - INTERVAL '1 day' * v_period_days
        GROUP BY DATE(sh.created_at)
        ORDER BY search_date
    ) daily_market_searches;

    -- 11. Market Daily Reports (All Users Average)
    SELECT COALESCE(json_agg(
        json_build_object(
            'date', report_date::text,
            'count', ROUND(report_count::DECIMAL / user_count, 1)
        ) ORDER BY report_date
    ), '[]'::json) INTO v_market_daily_reports
    FROM (
        SELECT 
            DATE(ar.created_at) as report_date,
            COUNT(*) as report_count,
            COUNT(DISTINCT ar.user_id) as user_count
        FROM ai_analysis_reports ar
        WHERE ar.created_at >= NOW() - INTERVAL '1 day' * v_period_days
        GROUP BY DATE(ar.created_at)
        ORDER BY report_date
    ) daily_market_reports;

    -- Build final result
    SELECT json_build_object(
        'quota_status', v_quota_status,
        'efficiency_metrics', v_efficiency_metrics,
        'recent_activities', v_recent_activities,
        'search_fields_top10', v_search_fields_top10,
        'report_fields_top10', v_report_fields_top10,
        'market_search_fields_top10', v_market_search_fields_top10,
        'market_report_fields_top10', v_market_report_fields_top10,
        'daily_searches', v_daily_searches,
        'daily_reports', v_daily_reports,
        'market_daily_searches', v_market_daily_searches,
        'market_daily_reports', v_market_daily_reports
    ) INTO v_result;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_dashboard_stats(UUID, TEXT) TO authenticated;