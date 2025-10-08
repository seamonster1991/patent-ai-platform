-- Fix GROUP BY error in get_dashboard_stats function
-- Description: Fix "column r.created_at must appear in the GROUP BY clause" error in recentActivities

CREATE OR REPLACE FUNCTION get_dashboard_stats(p_user_id UUID, p_period TEXT DEFAULT '30d')
RETURNS JSON AS $$
DECLARE
  result JSON;
  period_interval INTERVAL;
BEGIN
  -- Normalize and set period interval
  CASE p_period
    WHEN '7d' THEN period_interval := INTERVAL '7 days';
    WHEN '30d' THEN period_interval := INTERVAL '30 days';
    WHEN '90d' THEN period_interval := INTERVAL '90 days';
    ELSE period_interval := INTERVAL '30 days';
  END CASE;

  WITH date_series AS (
    SELECT generate_series(
      (NOW()::date - (period_interval - INTERVAL '1 day')),
      NOW()::date,
      INTERVAL '1 day'
    )::date AS d
  ),
  user_search_counts AS (
    SELECT created_at::date AS d, COUNT(*) AS cnt
    FROM patent_search_analytics
    WHERE user_id = p_user_id
      AND created_at >= NOW() - period_interval
    GROUP BY created_at::date
  ),
  user_report_counts AS (
    SELECT created_at::date AS d, COUNT(*) AS cnt
    FROM ai_analysis_reports
    WHERE user_id = p_user_id
      AND created_at >= NOW() - period_interval
    GROUP BY created_at::date
  ),
  market_search_counts AS (
    SELECT created_at::date AS d, COUNT(*) AS cnt
    FROM patent_search_analytics
    WHERE created_at >= NOW() - period_interval
    GROUP BY created_at::date
  ),
  market_report_counts AS (
    SELECT created_at::date AS d, COUNT(*) AS cnt
    FROM ai_analysis_reports
    WHERE created_at >= NOW() - period_interval
    GROUP BY created_at::date
  ),
  user_login_counts AS (
    SELECT created_at::date AS d, COUNT(*) AS cnt
    FROM user_login_logs
    WHERE user_id = p_user_id
      AND created_at >= NOW() - period_interval
    GROUP BY created_at::date
  ),
  daily_searches_json AS (
    SELECT json_agg(json_build_object('date', ds.d, 'count', COALESCE(usc.cnt, 0)) ORDER BY ds.d) AS j
    FROM date_series ds
    LEFT JOIN user_search_counts usc ON usc.d = ds.d
  ),
  daily_reports_json AS (
    SELECT json_agg(json_build_object('date', ds.d, 'count', COALESCE(urc.cnt, 0)) ORDER BY ds.d) AS j
    FROM date_series ds
    LEFT JOIN user_report_counts urc ON urc.d = ds.d
  ),
  daily_logins_json AS (
    SELECT json_agg(json_build_object('date', ds.d, 'count', COALESCE(ulc.cnt, 0)) ORDER BY ds.d) AS j
    FROM date_series ds
    LEFT JOIN user_login_counts ulc ON ulc.d = ds.d
  ),
  market_daily_searches_json AS (
    SELECT json_agg(json_build_object('date', ds.d, 'count', COALESCE(msc.cnt, 0)) ORDER BY ds.d) AS j
    FROM date_series ds
    LEFT JOIN market_search_counts msc ON msc.d = ds.d
  ),
  market_daily_reports_json AS (
    SELECT json_agg(json_build_object('date', ds.d, 'count', COALESCE(mrc.cnt, 0)) ORDER BY ds.d) AS j
    FROM date_series ds
    LEFT JOIN market_report_counts mrc ON mrc.d = ds.d
  ),
  search_field_counts AS (
    SELECT 
      COALESCE(technology_field, 'General') AS field,
      COALESCE(ipc_main_class, 'G') AS ipc_code,
      SUM(search_count) AS search_count
    FROM search_keyword_analytics
    WHERE user_id = p_user_id
      AND last_searched_at >= NOW() - period_interval
    GROUP BY COALESCE(technology_field, 'General'), COALESCE(ipc_main_class, 'G')
  ),
  search_field_top10 AS (
    SELECT field, ipc_code, search_count
    FROM search_field_counts
    ORDER BY search_count DESC
    LIMIT 10
  ),
  search_field_total AS (
    SELECT COALESCE(SUM(search_count), 0) AS total FROM search_field_counts
  ),
  report_ipc_counts AS (
    SELECT 
      'General' AS field,
      'G' AS ipc_code,
      COUNT(*) AS cnt
    FROM ai_analysis_reports r
    WHERE r.user_id = p_user_id
      AND r.created_at >= NOW() - period_interval
  ),
  report_ipc_top10 AS (
    SELECT field, ipc_code, cnt
    FROM report_ipc_counts
    ORDER BY cnt DESC
    LIMIT 10
  ),
  report_ipc_total AS (
    SELECT COALESCE(SUM(cnt), 0) AS total FROM report_ipc_counts
  ),
  market_search_field_counts AS (
    SELECT 
      COALESCE(technology_field, 'General') AS field,
      COALESCE(ipc_main_class, 'G') AS ipc_code,
      SUM(search_count) AS search_count
    FROM search_keyword_analytics
    WHERE last_searched_at >= NOW() - period_interval
    GROUP BY COALESCE(technology_field, 'General'), COALESCE(ipc_main_class, 'G')
  ),
  market_search_field_top10 AS (
    SELECT field, ipc_code, search_count
    FROM market_search_field_counts
    ORDER BY search_count DESC
    LIMIT 10
  ),
  market_search_field_total AS (
    SELECT COALESCE(SUM(search_count), 0) AS total FROM market_search_field_counts
  ),
  market_report_ipc_counts AS (
    SELECT 
      'General' AS field,
      'G' AS ipc_code,
      COUNT(*) AS cnt
    FROM ai_analysis_reports r
    WHERE r.created_at >= NOW() - period_interval
  ),
  market_report_ipc_top10 AS (
    SELECT field, ipc_code, cnt
    FROM market_report_ipc_counts
    ORDER BY cnt DESC
    LIMIT 10
  ),
  market_report_ipc_total AS (
    SELECT COALESCE(SUM(cnt), 0) AS total FROM market_report_ipc_counts
  )
  SELECT json_build_object(
    'quota_status', (
      SELECT json_build_object(
        'remaining_credits', COALESCE(u.total_usage_cost, 15000),
        'remaining_reports', GREATEST(50 - COALESCE(u.total_reports, 0), 0),
        'subscription_plan', COALESCE(u.subscription_plan, 'basic'),
        'last_login', u.last_login_at,
        'expiry_date', (NOW() + INTERVAL '30 days')::date,
        'days_until_expiry', 30
      )
      FROM users u WHERE u.id = p_user_id
    ),
    'efficiency_metrics', (
      SELECT json_build_object(
        'login_to_report_rate', COALESCE(ROUND(uem.login_to_report_rate::numeric, 1), 0),
        'search_to_report_rate', COALESCE(ROUND(uem.search_to_report_rate::numeric, 1), 0),
        'total_logins', COALESCE(uem.total_logins, 0),
        'total_searches', COALESCE(uem.total_searches, 0),
        'total_reports', COALESCE(uem.total_reports, 0)
      )
      FROM user_efficiency_metrics uem WHERE uem.user_id = p_user_id
    ),
    'recentActivities', COALESCE(
      (SELECT json_agg(activity_json ORDER BY created_at DESC)
       FROM (
         SELECT 
           json_build_object(
             'id', r.id,
             'title', COALESCE(r.report_name, r.invention_title || ' - ' || r.analysis_type),
             'type', 'report',
             'timestamp', r.created_at,
             'application_number', r.application_number,
             'analysis_type', r.analysis_type
           ) as activity_json,
           r.created_at
         FROM ai_analysis_reports r
         WHERE r.user_id = p_user_id 
           AND r.created_at >= NOW() - period_interval
         ORDER BY r.created_at DESC 
         LIMIT 20
       ) ordered_activities
      ), '[]'::json
    ),
    'daily_searches', (SELECT COALESCE(j, '[]'::json) FROM daily_searches_json),
    'daily_reports', (SELECT COALESCE(j, '[]'::json) FROM daily_reports_json),
    'daily_logins', (SELECT COALESCE(j, '[]'::json) FROM daily_logins_json),
    'market_daily_searches', (SELECT COALESCE(j, '[]'::json) FROM market_daily_searches_json),
    'market_daily_reports', (SELECT COALESCE(j, '[]'::json) FROM market_daily_reports_json),
    'search_fields_top10', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'field', sft.field,
          'ipc_code', sft.ipc_code,
          'search_count', sft.search_count,
          'percentage', CASE WHEN sftt.total > 0 THEN ROUND((sft.search_count::float / sftt.total * 100)::numeric, 1) ELSE 0 END
        )
        ORDER BY sft.search_count DESC
      ), '[]'::json)
      FROM search_field_top10 sft CROSS JOIN search_field_total sftt
    ),
    'report_fields_top10', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'field', rft.field,
          'ipc_code', rft.ipc_code,
          'report_count', rft.cnt,
          'percentage', CASE WHEN rtt.total > 0 THEN ROUND((rft.cnt::float / rtt.total * 100)::numeric, 1) ELSE 0 END
        )
        ORDER BY rft.cnt DESC
      ), '[]'::json)
      FROM report_ipc_top10 rft CROSS JOIN report_ipc_total rtt
    ),
    'market_search_fields_top10', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'field', msft.field,
          'ipc_code', msft.ipc_code,
          'search_count', msft.search_count,
          'percentage', CASE WHEN msftt.total > 0 THEN ROUND((msft.search_count::float / msftt.total * 100)::numeric, 1) ELSE 0 END
        )
        ORDER BY msft.search_count DESC
      ), '[]'::json)
      FROM market_search_field_top10 msft CROSS JOIN market_search_field_total msftt
    ),
    'market_report_fields_top10', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'field', mrft.field,
          'ipc_code', mrft.ipc_code,
          'report_count', mrft.cnt,
          'percentage', CASE WHEN mrtt.total > 0 THEN ROUND((mrft.cnt::float / mrtt.total * 100)::numeric, 1) ELSE 0 END
        )
        ORDER BY mrft.cnt DESC
      ), '[]'::json)
      FROM market_report_ipc_top10 mrft CROSS JOIN market_report_ipc_total mrtt
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_dashboard_stats(UUID, TEXT) TO authenticated;