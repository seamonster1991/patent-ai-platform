-- Fix Dashboard Data Display Issues
-- Description: Create missing views and fix data display problems

-- Drop and recreate user_efficiency_metrics view
DROP VIEW IF EXISTS user_efficiency_metrics;

CREATE VIEW user_efficiency_metrics AS
SELECT 
  u.id as user_id,
  u.total_logins,
  u.total_searches,
  u.total_reports,
  CASE 
    WHEN COALESCE(u.total_logins, 0) > 0 THEN (COALESCE(u.total_reports, 0)::float / u.total_logins * 100)
    ELSE 0 
  END as login_to_report_rate,
  CASE 
    WHEN COALESCE(u.total_searches, 0) > 0 THEN (COALESCE(u.total_reports, 0)::float / u.total_searches * 100)
    ELSE 0 
  END as search_to_report_rate
FROM users u;

-- Update get_dashboard_stats function to handle missing data better
CREATE OR REPLACE FUNCTION get_dashboard_stats(p_user_id UUID, p_period TEXT DEFAULT '30d')
RETURNS JSON AS $$
DECLARE
  result JSON;
  period_interval INTERVAL;
  user_total_logins INTEGER;
  user_total_searches INTEGER;
  user_total_reports INTEGER;
  period_logins INTEGER;
  period_searches INTEGER;
  period_reports INTEGER;
BEGIN
  -- Normalize and set period interval
  CASE p_period
    WHEN '7d' THEN period_interval := INTERVAL '7 days';
    WHEN '30d' THEN period_interval := INTERVAL '30 days';
    WHEN '90d' THEN period_interval := INTERVAL '90 days';
    ELSE period_interval := INTERVAL '30 days';
  END CASE;

  -- Get user totals from users table
  SELECT 
    COALESCE(total_logins, 0),
    COALESCE(total_searches, 0),
    COALESCE(total_reports, 0)
  INTO user_total_logins, user_total_searches, user_total_reports
  FROM users 
  WHERE id = p_user_id;

  -- Get period-specific counts
  SELECT 
    COALESCE(COUNT(*) FILTER (WHERE activity_type = 'login'), 0),
    COALESCE(COUNT(*) FILTER (WHERE activity_type = 'search'), 0)
  INTO period_logins, period_searches
  FROM user_activities
  WHERE user_id = p_user_id 
    AND created_at >= NOW() - period_interval;

  -- Get period reports count
  SELECT COALESCE(COUNT(*), 0)
  INTO period_reports
  FROM ai_analysis_reports
  WHERE user_id = p_user_id 
    AND created_at >= NOW() - period_interval;

  -- Build the result JSON
  WITH date_series AS (
    SELECT generate_series(
      (NOW()::date - (period_interval - INTERVAL '1 day')),
      NOW()::date,
      INTERVAL '1 day'
    )::date AS d
  ),
  user_search_counts AS (
    SELECT created_at::date AS d, COUNT(*) AS cnt
    FROM user_activities
    WHERE user_id = p_user_id
      AND activity_type = 'search'
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
  user_login_counts AS (
    SELECT created_at::date AS d, COUNT(*) AS cnt
    FROM user_activities
    WHERE user_id = p_user_id
      AND activity_type = 'login'
      AND created_at >= NOW() - period_interval
    GROUP BY created_at::date
  ),
  market_search_counts AS (
    SELECT created_at::date AS d, COUNT(*) AS cnt
    FROM user_activities
    WHERE activity_type = 'search'
      AND created_at >= NOW() - period_interval
    GROUP BY created_at::date
  ),
  market_report_counts AS (
    SELECT created_at::date AS d, COUNT(*) AS cnt
    FROM ai_analysis_reports
    WHERE created_at >= NOW() - period_interval
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
  )
  SELECT json_build_object(
    'quota_status', (
      SELECT json_build_object(
        'remaining_credits', COALESCE(15000 - u.total_usage_cost, 15000),
        'remaining_reports', GREATEST(50 - COALESCE(u.total_reports, 0), 0),
        'subscription_plan', COALESCE(u.subscription_plan, 'basic'),
        'last_login', u.last_login_at,
        'expiry_date', (NOW() + INTERVAL '30 days')::date,
        'days_until_expiry', 30
      )
      FROM users u WHERE u.id = p_user_id
    ),
    'efficiency_metrics', json_build_object(
      'login_to_report_rate', CASE 
        WHEN user_total_logins > 0 THEN ROUND((user_total_reports::float / user_total_logins * 100)::numeric, 1)
        ELSE 0 
      END,
      'search_to_report_rate', CASE 
        WHEN user_total_searches > 0 THEN ROUND((user_total_reports::float / user_total_searches * 100)::numeric, 1)
        ELSE 0 
      END,
      'total_logins', user_total_logins,
      'total_searches', user_total_searches,
      'total_reports', user_total_reports,
      'period_logins', period_logins,
      'period_searches', period_searches,
      'period_reports', period_reports
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
         
         UNION ALL
         
         SELECT 
           json_build_object(
             'id', ua.id,
             'title', CASE 
               WHEN ua.activity_data IS NOT NULL AND ua.activity_data->>'query' IS NOT NULL 
               THEN ua.activity_data->>'query'
               WHEN ua.activity_data IS NOT NULL AND ua.activity_data->>'keyword' IS NOT NULL 
               THEN ua.activity_data->>'keyword'
               ELSE 'Search Activity'
             END,
             'type', 'search',
             'timestamp', ua.created_at,
             'activity_data', COALESCE(ua.activity_data, '{}'::jsonb)
           ) as activity_json,
           ua.created_at
         FROM user_activities ua
         WHERE ua.user_id = p_user_id 
           AND ua.activity_type = 'search'
           AND ua.created_at >= NOW() - period_interval
         
         ORDER BY created_at DESC 
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
          'field', search_term,
          'count', cnt
        )
        ORDER BY cnt DESC
      ), '[]'::json)
      FROM (
        SELECT 
          CASE 
            WHEN ua.activity_data IS NOT NULL AND ua.activity_data->>'query' IS NOT NULL 
            THEN ua.activity_data->>'query'
            WHEN ua.activity_data IS NOT NULL AND ua.activity_data->>'keyword' IS NOT NULL 
            THEN ua.activity_data->>'keyword'
            ELSE 'Unknown'
          END as search_term,
          COUNT(*) as cnt
        FROM user_activities ua
        WHERE ua.user_id = p_user_id
          AND ua.activity_type = 'search'
          AND ua.created_at >= NOW() - period_interval
          AND ua.activity_data IS NOT NULL
          AND (ua.activity_data->>'query' IS NOT NULL OR ua.activity_data->>'keyword' IS NOT NULL)
        GROUP BY CASE 
          WHEN ua.activity_data IS NOT NULL AND ua.activity_data->>'query' IS NOT NULL 
          THEN ua.activity_data->>'query'
          WHEN ua.activity_data IS NOT NULL AND ua.activity_data->>'keyword' IS NOT NULL 
          THEN ua.activity_data->>'keyword'
          ELSE 'Unknown'
        END
        ORDER BY cnt DESC
        LIMIT 10
      ) search_stats
    ),
    'report_fields_top10', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'field', invention_title,
          'count', 1
        )
        ORDER BY created_at DESC
      ), '[]'::json)
      FROM (
        SELECT invention_title, created_at
        FROM ai_analysis_reports
        WHERE user_id = p_user_id
          AND created_at >= NOW() - period_interval
        ORDER BY created_at DESC
        LIMIT 10
      ) report_stats
    ),
    'market_search_fields_top10', '[]'::json,
    'market_report_fields_top10', '[]'::json
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_dashboard_stats(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_dashboard_stats(UUID, TEXT) TO anon;