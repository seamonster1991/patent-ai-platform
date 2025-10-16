-- 대시보드 통계 함수 윈도우 함수 오류 수정

CREATE OR REPLACE FUNCTION get_dashboard_stats(
    p_user_id uuid DEFAULT NULL,
    p_period text DEFAULT '100d'
)
RETURNS jsonb AS $$
DECLARE
    result jsonb;
    period_interval interval;
    start_date timestamp;
    user_search_count integer;
    user_report_count integer;
    search_fields_data jsonb;
    report_fields_data jsonb;
    recent_searches_data jsonb;
    recent_reports_data jsonb;
    efficiency_data jsonb;
    quota_data jsonb;
    total_search_count integer;
    total_report_count integer;
BEGIN
    -- Parse period to interval
    period_interval := CASE 
        WHEN p_period = '7d' THEN INTERVAL '7 days'
        WHEN p_period = '30d' THEN INTERVAL '30 days'
        WHEN p_period = '100d' THEN INTERVAL '100 days'
        WHEN p_period = '1y' THEN INTERVAL '1 year'
        ELSE INTERVAL '100 days'
    END;
    
    start_date := NOW() - period_interval;

    -- Get user search count
    SELECT COUNT(*)
    INTO user_search_count
    FROM search_history
    WHERE (p_user_id IS NULL OR user_id = p_user_id)
        AND created_at >= start_date;

    -- Get user report count
    SELECT COUNT(*)
    INTO user_report_count
    FROM ai_analysis_reports
    WHERE (p_user_id IS NULL OR user_id = p_user_id)
        AND created_at >= start_date;

    -- Get total search count for percentage calculation
    SELECT SUM(count)
    INTO total_search_count
    FROM (
        SELECT COUNT(*) as count
        FROM search_history
        WHERE (p_user_id IS NULL OR user_id = p_user_id)
            AND created_at >= start_date
            AND keyword IS NOT NULL
            AND keyword != ''
        GROUP BY keyword
    ) search_counts;

    -- Get search fields top 10
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'field', keyword,
            'count', count,
            'percentage', CASE 
                WHEN total_search_count > 0 THEN ROUND((count * 100.0 / total_search_count)::numeric, 1)
                ELSE 0
            END
        )
        ORDER BY count DESC
    ), '[]'::jsonb)
    INTO search_fields_data
    FROM (
        SELECT 
            keyword,
            COUNT(*) as count
        FROM search_history
        WHERE (p_user_id IS NULL OR user_id = p_user_id)
            AND created_at >= start_date
            AND keyword IS NOT NULL
            AND keyword != ''
        GROUP BY keyword
        ORDER BY count DESC
        LIMIT 10
    ) search_stats;

    -- Get total report count for percentage calculation
    SELECT COUNT(*)
    INTO total_report_count
    FROM ai_analysis_reports
    WHERE (p_user_id IS NULL OR user_id = p_user_id)
        AND created_at >= start_date
        AND invention_title IS NOT NULL
        AND invention_title != '';

    -- Get report fields top 10
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'field', invention_title,
            'count', 1,
            'percentage', CASE 
                WHEN total_report_count > 0 THEN ROUND((100.0 / total_report_count)::numeric, 1)
                ELSE 0
            END
        )
        ORDER BY created_at DESC
    ), '[]'::jsonb)
    INTO report_fields_data
    FROM (
        SELECT 
            invention_title,
            created_at
        FROM ai_analysis_reports
        WHERE (p_user_id IS NULL OR user_id = p_user_id)
            AND created_at >= start_date
            AND invention_title IS NOT NULL
            AND invention_title != ''
        ORDER BY created_at DESC
        LIMIT 10
    ) report_stats;

    -- Get recent searches
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'keyword', keyword,
            'created_at', created_at,
            'technology_field', COALESCE(technology_field, '기타'),
            'results_count', COALESCE(results_count, 0)
        )
        ORDER BY created_at DESC
    ), '[]'::jsonb)
    INTO recent_searches_data
    FROM (
        SELECT 
            keyword,
            created_at,
            technology_field,
            results_count
        FROM search_history
        WHERE (p_user_id IS NULL OR user_id = p_user_id)
            AND created_at >= start_date
        ORDER BY created_at DESC
        LIMIT 10
    ) recent_search_stats;

    -- Get recent reports
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'title', COALESCE(report_name, invention_title),
            'invention_title', invention_title,
            'created_at', created_at,
            'technology_field', COALESCE(technology_field, '기타'),
            'application_number', application_number
        )
        ORDER BY created_at DESC
    ), '[]'::jsonb)
    INTO recent_reports_data
    FROM (
        SELECT 
            report_name,
            invention_title,
            created_at,
            technology_field,
            application_number
        FROM ai_analysis_reports
        WHERE (p_user_id IS NULL OR user_id = p_user_id)
            AND created_at >= start_date
        ORDER BY created_at DESC
        LIMIT 10
    ) recent_report_stats;

    -- Build quota status
    quota_data := jsonb_build_object(
        'currentUsage', user_search_count + user_report_count,
        'maxQuota', 1000,
        'usagePercentage', LEAST(((user_search_count + user_report_count) * 100.0 / 1000), 100),
        'remainingQuota', GREATEST(1000 - (user_search_count + user_report_count), 0),
        'searches', jsonb_build_object(
            'current', user_search_count,
            'total', 500
        ),
        'reports', jsonb_build_object(
            'current', user_report_count,
            'total', 500
        )
    );

    -- Build efficiency metrics
    efficiency_data := jsonb_build_object(
        'loginEfficiency', jsonb_build_object(
            'value', CASE WHEN user_search_count > 0 THEN ROUND((user_report_count * 100.0 / user_search_count)::numeric, 1) ELSE 0 END,
            'status', 'good',
            'totalLogins', 0,
            'reportsGenerated', user_report_count
        ),
        'searchConversion', jsonb_build_object(
            'value', CASE WHEN user_search_count > 0 THEN ROUND((user_report_count * 100.0 / user_search_count)::numeric, 1) ELSE 0 END,
            'status', 'good',
            'totalSearches', user_search_count,
            'reportsGenerated', user_report_count
        ),
        'loginToReportRate', CASE WHEN user_search_count > 0 THEN ROUND((user_report_count * 100.0 / user_search_count)::numeric, 1) ELSE 0 END,
        'searchToReportRate', CASE WHEN user_search_count > 0 THEN ROUND((user_report_count * 100.0 / user_search_count)::numeric, 1) ELSE 0 END,
        'monthlyReports', user_report_count,
        'monthlySearches', user_search_count
    );

    -- Build final result
    result := jsonb_build_object(
        'period', p_period,
        'generated_at', NOW(),
        'quota_status', quota_data,
        'efficiency_metrics', efficiency_data,
        'search_fields_top10', search_fields_data,
        'report_fields_top10', report_fields_data,
        'market_search_fields_top10', '[]'::jsonb,
        'market_report_fields_top10', '[]'::jsonb,
        'recent_activities', jsonb_build_object(
            'recent_searches', recent_searches_data,
            'recent_reports', recent_reports_data
        ),
        'search_trends', jsonb_build_object(
            'userDaily', '[]'::jsonb,
            'marketDaily', '[]'::jsonb
        ),
        'report_trends', jsonb_build_object(
            'userDaily', '[]'::jsonb,
            'marketDaily', '[]'::jsonb
        ),
        'searchFields', jsonb_build_object(
            'user', search_fields_data,
            'market', '[]'::jsonb
        ),
        'reportFields', jsonb_build_object(
            'user', report_fields_data,
            'market', '[]'::jsonb
        ),
        'recentReports', recent_reports_data,
        'recentSearches', recent_searches_data,
        'technologyFields', search_fields_data,
        'technology_fields', jsonb_build_object(
            'search_individual', search_fields_data,
            'search_market', '[]'::jsonb,
            'report_individual', report_fields_data,
            'report_market', '[]'::jsonb
        )
    );

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_dashboard_stats(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_dashboard_stats(UUID, TEXT) TO anon;