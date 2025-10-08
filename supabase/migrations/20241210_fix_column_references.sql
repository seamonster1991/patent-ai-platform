-- Fix dashboard stats function with correct table structure
-- This migration fixes column reference errors and improves data retrieval

CREATE OR REPLACE FUNCTION get_dashboard_stats(p_user_id UUID, p_period TEXT DEFAULT '30d')
RETURNS JSON AS $$
DECLARE
  period_interval INTERVAL;
  result JSON;
BEGIN
  -- Convert period to interval
  CASE p_period
    WHEN '7d' THEN period_interval := INTERVAL '7 days';
    WHEN '30d' THEN period_interval := INTERVAL '30 days';
    WHEN '90d' THEN period_interval := INTERVAL '90 days';
    ELSE period_interval := INTERVAL '30 days';
  END CASE;

  WITH daily_searches AS (
    SELECT 
      DATE(sh.created_at) AS search_date,
      COUNT(*) AS search_count
    FROM search_history sh
    WHERE sh.user_id = p_user_id 
      AND sh.created_at >= NOW() - period_interval
    GROUP BY DATE(sh.created_at)
    ORDER BY search_date
  ),
  daily_searches_json AS (
    SELECT json_agg(
      json_build_object(
        'date', ds.search_date,
        'searches', ds.search_count
      )
      ORDER BY ds.search_date
    ) AS j
    FROM daily_searches ds
  ),
  daily_reports AS (
    SELECT 
      DATE(r.created_at) AS report_date,
      COUNT(*) AS report_count
    FROM ai_analysis_reports r
    WHERE r.user_id = p_user_id 
      AND r.created_at >= NOW() - period_interval
    GROUP BY DATE(r.created_at)
    ORDER BY report_date
  ),
  daily_reports_json AS (
    SELECT json_agg(
      json_build_object(
        'date', dr.report_date,
        'reports', dr.report_count
      )
      ORDER BY dr.report_date
    ) AS j
    FROM daily_reports dr
  ),
  daily_logins AS (
    SELECT 
      DATE(ua.created_at) AS login_date,
      COUNT(*) AS login_count
    FROM user_activities ua
    WHERE ua.user_id = p_user_id 
      AND ua.activity_type = 'login'
      AND ua.created_at >= NOW() - period_interval
    GROUP BY DATE(ua.created_at)
    ORDER BY login_date
  ),
  daily_logins_json AS (
    SELECT json_agg(
      json_build_object(
        'date', dl.login_date,
        'logins', dl.login_count
      )
      ORDER BY dl.login_date
    ) AS j
    FROM daily_logins dl
  ),
  -- Market data (global statistics)
  market_daily_searches AS (
    SELECT 
      DATE(sh.created_at) AS search_date,
      COUNT(*) AS search_count
    FROM search_history sh
    WHERE sh.created_at >= NOW() - period_interval
    GROUP BY DATE(sh.created_at)
    ORDER BY search_date
  ),
  market_daily_searches_json AS (
    SELECT json_agg(
      json_build_object(
        'date', mds.search_date,
        'searches', mds.search_count
      )
      ORDER BY mds.search_date
    ) AS j
    FROM market_daily_searches mds
  ),
  market_daily_reports AS (
    SELECT 
      DATE(r.created_at) AS report_date,
      COUNT(*) AS report_count
    FROM ai_analysis_reports r
    WHERE r.created_at >= NOW() - period_interval
    GROUP BY DATE(r.created_at)
    ORDER BY report_date
  ),
  market_daily_reports_json AS (
    SELECT json_agg(
      json_build_object(
        'date', mdr.report_date,
        'reports', mdr.report_count
      )
      ORDER BY mdr.report_date
    ) AS j
    FROM market_daily_reports mdr
  ),
  -- User search field analysis
  search_field_counts AS (
    SELECT 
      COALESCE(sh.technology_field, 'General') AS field,
      COALESCE(sh.ipc_codes[1], 'G') AS ipc_code,
      COUNT(*) AS search_count
    FROM search_history sh
    WHERE sh.user_id = p_user_id
      AND sh.created_at >= NOW() - period_interval
    GROUP BY COALESCE(sh.technology_field, 'General'), COALESCE(sh.ipc_codes[1], 'G')
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
  -- User report field analysis
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
  -- Market search field analysis
  market_search_field_counts AS (
    SELECT 
      COALESCE(technology_field, 'General') AS field,
      COALESCE(ipc_codes[1], 'G') AS ipc_code,
      COUNT(*) AS search_count
    FROM search_history
    WHERE created_at >= NOW() - period_interval
    GROUP BY COALESCE(technology_field, 'General'), COALESCE(ipc_codes[1], 'G')
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
  -- Market report field analysis
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
  ),
  -- Calculate efficiency metrics
  user_stats AS (
    SELECT 
      COALESCE(
        (SELECT COUNT(*) FROM user_activities 
         WHERE user_id = p_user_id 
           AND activity_type = 'login' 
           AND created_at >= NOW() - period_interval), 
        0
      ) AS total_logins,
      COALESCE(
        (SELECT COUNT(*) FROM search_history 
         WHERE user_id = p_user_id 
           AND created_at >= NOW() - period_interval), 
        0
      ) AS total_searches,
      COALESCE(
        (SELECT COUNT(*) FROM ai_analysis_reports 
         WHERE user_id = p_user_id 
           AND created_at >= NOW() - period_interval), 
        0
      ) AS total_reports
  ),
  -- Recent activities
  recent_reports AS (
    SELECT json_agg(
      json_build_object(
        'id', r.id,
        'title', COALESCE(r.report_name, r.invention_title),
        'type', 'report',
        'timestamp', r.created_at,
        'application_number', r.application_number,
        'analysis_type', r.analysis_type
      ) ORDER BY r.created_at DESC
    ) AS activities
    FROM ai_analysis_reports r
    WHERE r.user_id = p_user_id 
      AND r.created_at >= NOW() - period_interval
    ORDER BY r.created_at DESC 
    LIMIT 10
  ),
  recent_searches AS (
    SELECT json_agg(
      json_build_object(
        'id', sh.id,
        'query', sh.keyword,
        'type', 'search',
        'timestamp', sh.created_at,
        'results_count', sh.results_count
      ) ORDER BY sh.created_at DESC
    ) AS activities
    FROM search_history sh
    WHERE sh.user_id = p_user_id 
      AND sh.created_at >= NOW() - period_interval
    ORDER BY sh.created_at DESC 
    LIMIT 10
  )
  SELECT json_build_object(
    'quota_status', (
      SELECT json_build_object(
        'remaining_credits', 15000,
        'remaining_reports', 50,
        'subscription_plan', COALESCE(u.subscription_plan, 'basic'),
        'last_login', u.last_login_at,
        'expiry_date', (NOW() + INTERVAL '30 days')::date,
        'days_until_expiry', 30
      )
      FROM users u WHERE u.id = p_user_id
    ),
    'efficiency_metrics', (
      SELECT json_build_object(
        'login_to_report_rate', CASE WHEN us.total_logins > 0 THEN ROUND((us.total_reports::float / us.total_logins * 100)::numeric, 1) ELSE 0 END,
        'search_to_report_rate', CASE WHEN us.total_searches > 0 THEN ROUND((us.total_reports::float / us.total_searches * 100)::numeric, 1) ELSE 0 END,
        'total_logins', us.total_logins,
        'total_searches', us.total_searches,
        'total_reports', us.total_reports
      )
      FROM user_stats us
    ),
    'recent_activities', (
      SELECT json_build_object(
        'reports', COALESCE(rr.activities, '[]'::json),
        'searches', COALESCE(rs.activities, '[]'::json)
      )
      FROM recent_reports rr, recent_searches rs
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
    ),
    'technology_fields', '[]'::json
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_dashboard_stats(UUID, TEXT) TO authenticated;