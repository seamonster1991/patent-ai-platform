-- get_dashboard_stats 함수 생성 (API가 기대하는 함수명과 구조)
CREATE OR REPLACE FUNCTION get_dashboard_stats(
  p_user_id UUID,
  p_period TEXT DEFAULT '30d'
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  days_count INTEGER;
  start_date DATE;
  result JSON;
  user_activity_data JSON;
BEGIN
  -- 기간에 따른 일수 계산
  CASE p_period
    WHEN '7d' THEN days_count := 7;
    WHEN '30d' THEN days_count := 30;
    WHEN '90d' THEN days_count := 90;
    ELSE days_count := 30;
  END CASE;
  
  start_date := CURRENT_DATE - INTERVAL '1 day' * days_count;
  
  -- 사용자 활동 데이터 생성 (날짜별)
  WITH date_series AS (
    SELECT generate_series(
      start_date,
      CURRENT_DATE - INTERVAL '1 day',
      INTERVAL '1 day'
    )::DATE AS date
  ),
  daily_activities AS (
    SELECT 
      ds.date,
      COALESCE(COUNT(ua.id), 0) AS count
    FROM date_series ds
    LEFT JOIN user_activities ua ON 
      DATE(ua.created_at) = ds.date 
      AND ua.user_id = p_user_id
    GROUP BY ds.date
    ORDER BY ds.date
  )
  SELECT json_agg(
    json_build_object(
      'date', date,
      'count', count
    )
  ) INTO user_activity_data
  FROM daily_activities;
  
  -- 최종 결과 구성
  SELECT json_build_object(
    'quota_status', json_build_object(
      'remaining_credits', 15000,
      'remaining_reports', 50,
      'subscription_plan', 'basic',
      'last_login', NOW()::TEXT,
      'expiry_date', (NOW() + INTERVAL '30 days')::TEXT,
      'days_until_expiry', 30
    ),
    'efficiency_metrics', json_build_object(
      'login_to_report_rate', 0.8,
      'search_to_report_rate', 0.6,
      'total_logins', (
        SELECT COUNT(*) FROM user_activities 
        WHERE user_id = p_user_id 
          AND activity_type = 'login'
          AND created_at >= start_date
      ),
      'total_searches', (
        SELECT COUNT(*) FROM user_activities 
        WHERE user_id = p_user_id 
          AND activity_type = 'search'
          AND created_at >= start_date
      ),
      'total_reports', (
        SELECT COUNT(*) FROM ai_analysis_reports 
        WHERE user_id = p_user_id 
          AND created_at >= start_date
      )
    ),
    'recent_activities', json_build_object(
      'reports', (
        SELECT COALESCE(json_agg(
          json_build_object(
            'id', id,
            'report_name', report_name,
            'invention_title', invention_title,
            'created_at', created_at
          )
        ), '[]'::json)
        FROM (
          SELECT id, report_name, invention_title, created_at
          FROM ai_analysis_reports 
          WHERE user_id = p_user_id 
          ORDER BY created_at DESC 
          LIMIT 5
        ) recent_reports
      ),
      'searches', (
        SELECT COALESCE(json_agg(
          json_build_object(
            'id', id,
            'activity_data', activity_data,
            'created_at', created_at
          )
        ), '[]'::json)
        FROM (
          SELECT id, activity_data, created_at
          FROM user_activities 
          WHERE user_id = p_user_id 
            AND activity_type = 'search'
          ORDER BY created_at DESC 
          LIMIT 5
        ) recent_searches
      )
    ),
    'technology_fields', '[]'::json,
    'daily_searches', user_activity_data,
    'daily_reports', user_activity_data,
    'daily_logins', user_activity_data,
    'market_daily_searches', user_activity_data,
    'market_daily_reports', user_activity_data,
    'search_fields_top10', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'field', keyword,
          'count', count
        )
      ), '[]'::json)
      FROM (
        SELECT 
          COALESCE(activity_data->>'keyword', activity_data->>'query') AS keyword,
          COUNT(*) AS count
        FROM user_activities 
        WHERE user_id = p_user_id 
          AND activity_type = 'search'
          AND created_at >= start_date
          AND (activity_data->>'keyword' IS NOT NULL OR activity_data->>'query' IS NOT NULL)
        GROUP BY COALESCE(activity_data->>'keyword', activity_data->>'query')
        ORDER BY count DESC
        LIMIT 10
      ) top_searches
    ),
    'report_fields_top10', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'field', invention_title,
          'count', 1
        )
      ), '[]'::json)
      FROM (
        SELECT invention_title
        FROM ai_analysis_reports 
        WHERE user_id = p_user_id 
          AND created_at >= start_date
        ORDER BY created_at DESC
        LIMIT 10
      ) top_reports
    ),
    'market_search_fields_top10', '[]'::json,
    'market_report_fields_top10', '[]'::json
  ) INTO result;
  
  RETURN result;
END;
$$;
CREATE OR REPLACE FUNCTION get_dashboard_stats(
  p_user_id UUID,
  p_period TEXT DEFAULT '30d'
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  days_count INTEGER;
  start_date DATE;
  result JSON;
  user_activity_data JSON;
BEGIN
  -- 기간에 따른 일수 계산
  CASE p_period
    WHEN '7d' THEN days_count := 7;
    WHEN '30d' THEN days_count := 30;
    WHEN '90d' THEN days_count := 90;
    ELSE days_count := 30;
  END CASE;
  
  start_date := CURRENT_DATE - INTERVAL '1 day' * days_count;
  
  -- 사용자 활동 데이터 생성 (날짜별)
  WITH date_series AS (
    SELECT generate_series(
      start_date,
      CURRENT_DATE - INTERVAL '1 day',
      INTERVAL '1 day'
    )::DATE AS date
  ),
  daily_activities AS (
    SELECT 
      ds.date,
      COALESCE(COUNT(ua.id), 0) AS count
    FROM date_series ds
    LEFT JOIN user_activities ua ON 
      DATE(ua.created_at) = ds.date 
      AND ua.user_id = p_user_id
    GROUP BY ds.date
    ORDER BY ds.date
  )
  SELECT json_agg(
    json_build_object(
      'date', date,
      'count', count
    )
  ) INTO user_activity_data
  FROM daily_activities;
  
  -- 최종 결과 구성
  SELECT json_build_object(
    'quota_status', json_build_object(
      'remaining_credits', 15000,
      'remaining_reports', 50,
      'subscription_plan', 'basic',
      'last_login', NOW()::TEXT,
      'expiry_date', (NOW() + INTERVAL '30 days')::TEXT,
      'days_until_expiry', 30
    ),
    'efficiency_metrics', json_build_object(
      'login_to_report_rate', 0.8,
      'search_to_report_rate', 0.6,
      'total_logins', (
        SELECT COUNT(*) FROM user_activities 
        WHERE user_id = p_user_id 
          AND activity_type = 'login'
          AND created_at >= start_date
      ),
      'total_searches', (
        SELECT COUNT(*) FROM user_activities 
        WHERE user_id = p_user_id 
          AND activity_type = 'search'
          AND created_at >= start_date
      ),
      'total_reports', (
        SELECT COUNT(*) FROM ai_analysis_reports 
        WHERE user_id = p_user_id 
          AND created_at >= start_date
      )
    ),
    'recent_activities', json_build_object(
      'reports', (
        SELECT COALESCE(json_agg(
          json_build_object(
            'id', id,
            'report_name', report_name,
            'invention_title', invention_title,
            'created_at', created_at
          )
        ), '[]'::json)
        FROM (
          SELECT id, report_name, invention_title, created_at
          FROM ai_analysis_reports 
          WHERE user_id = p_user_id 
          ORDER BY created_at DESC 
          LIMIT 5
        ) recent_reports
      ),
      'searches', (
        SELECT COALESCE(json_agg(
          json_build_object(
            'id', id,
            'activity_data', activity_data,
            'created_at', created_at
          )
        ), '[]'::json)
        FROM (
          SELECT id, activity_data, created_at
          FROM user_activities 
          WHERE user_id = p_user_id 
            AND activity_type = 'search'
          ORDER BY created_at DESC 
          LIMIT 5
        ) recent_searches
      )
    ),
    'technology_fields', '[]'::json,
    'daily_searches', user_activity_data,
    'daily_reports', user_activity_data,
    'daily_logins', user_activity_data,
    'market_daily_searches', user_activity_data,
    'market_daily_reports', user_activity_data,
    'search_fields_top10', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'field', query,
          'count', count
        )
      ), '[]'::json)
      FROM (
        SELECT 
          activity_data->>'query' AS query,
          COUNT(*) AS count
        FROM user_activities 
        WHERE user_id = p_user_id 
          AND activity_type = 'search'
          AND created_at >= start_date
          AND activity_data->>'query' IS NOT NULL
        GROUP BY activity_data->>'query'
        ORDER BY count DESC
        LIMIT 10
      ) top_searches
    ),
    'report_fields_top10', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'field', invention_title,
          'count', 1
        )
      ), '[]'::json)
      FROM (
        SELECT invention_title
        FROM ai_analysis_reports 
        WHERE user_id = p_user_id 
          AND created_at >= start_date
        ORDER BY created_at DESC
        LIMIT 10
      ) top_reports
    ),
    'market_search_fields_top10', '[]'::json,
    'market_report_fields_top10', '[]'::json
  ) INTO result;
  
  RETURN result;
END;
$$;