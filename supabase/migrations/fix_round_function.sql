-- ROUND 함수 문제 수정 (updated)

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
      'login_to_report_rate', CASE 
        WHEN (SELECT COUNT(*) FROM user_activities WHERE user_id = p_user_id AND activity_type = 'login' AND created_at >= start_date) > 0 
        THEN CAST(
          (SELECT COUNT(*) FROM ai_analysis_reports WHERE user_id = p_user_id AND created_at >= start_date)::numeric / 
          (SELECT COUNT(*) FROM user_activities WHERE user_id = p_user_id AND activity_type = 'login' AND created_at >= start_date)::numeric * 100 AS numeric(10,1)
        )
        ELSE 0 
      END,
      'search_to_report_rate', CASE 
        WHEN (SELECT COUNT(*) FROM search_history WHERE user_id = p_user_id AND created_at >= start_date) > 0 
        THEN CAST(
          (SELECT COUNT(*) FROM ai_analysis_reports WHERE user_id = p_user_id AND created_at >= start_date)::numeric / 
          (SELECT COUNT(*) FROM search_history WHERE user_id = p_user_id AND created_at >= start_date)::numeric * 100 AS numeric(10,1)
        )
        ELSE 0 
      END,
      'total_logins', (
        SELECT COUNT(*) FROM user_activities 
        WHERE user_id = p_user_id 
          AND activity_type = 'login'
          AND created_at >= start_date
      ),
      'total_searches', (
        SELECT COUNT(*) FROM search_history 
        WHERE user_id = p_user_id 
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
            'title', invention_title,
            'type', 'report',
            'timestamp', created_at,
            'application_number', application_number
          )
        ), '[]'::json)
        FROM (
          SELECT id, invention_title, created_at, application_number
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
            'query', keyword,
            'type', 'search',
            'timestamp', created_at,
            'applicant', applicant
          )
        ), '[]'::json)
        FROM (
          SELECT id, keyword, created_at, applicant
          FROM search_history 
          WHERE user_id = p_user_id 
          ORDER BY created_at DESC 
          LIMIT 5
        ) recent_searches
      )
    ),
    'technology_fields', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'field', field_name,
          'ipc_code', ipc_code,
          'search_count', search_count,
          'percentage', percentage
        )
      ), '[]'::json)
      FROM (
        SELECT 
          CASE 
            WHEN keyword ILIKE '%인공지능%' OR keyword ILIKE '%AI%' OR keyword ILIKE '%머신러닝%' OR keyword ILIKE '%딥러닝%' THEN 'Artificial Intelligence'
            WHEN keyword ILIKE '%자율주행%' OR keyword ILIKE '%자동차%' THEN 'Transportation'
            WHEN keyword ILIKE '%블록체인%' OR keyword ILIKE '%암호%' THEN 'Blockchain'
            WHEN keyword ILIKE '%5G%' OR keyword ILIKE '%통신%' THEN 'Telecommunications'
            WHEN keyword ILIKE '%IoT%' OR keyword ILIKE '%센서%' THEN 'IoT/Sensors'
            WHEN keyword ILIKE '%바이오%' OR keyword ILIKE '%의료%' THEN 'Biotechnology'
            WHEN keyword ILIKE '%반도체%' OR keyword ILIKE '%칩%' THEN 'Semiconductors'
            WHEN keyword ILIKE '%양자%' THEN 'Quantum Technology'
            ELSE 'General'
          END AS field_name,
          CASE 
            WHEN keyword ILIKE '%인공지능%' OR keyword ILIKE '%AI%' OR keyword ILIKE '%머신러닝%' OR keyword ILIKE '%딥러닝%' THEN 'G06N'
            WHEN keyword ILIKE '%자율주행%' OR keyword ILIKE '%자동차%' THEN 'B60W'
            WHEN keyword ILIKE '%블록체인%' OR keyword ILIKE '%암호%' THEN 'H04L'
            WHEN keyword ILIKE '%5G%' OR keyword ILIKE '%통신%' THEN 'H04B'
            WHEN keyword ILIKE '%IoT%' OR keyword ILIKE '%센서%' THEN 'G08C'
            WHEN keyword ILIKE '%바이오%' OR keyword ILIKE '%의료%' THEN 'A61B'
            WHEN keyword ILIKE '%반도체%' OR keyword ILIKE '%칩%' THEN 'H01L'
            WHEN keyword ILIKE '%양자%' THEN 'G06N'
            ELSE 'G'
          END AS ipc_code,
          COUNT(*) AS search_count,
          CAST(COUNT(*)::numeric / (SELECT COUNT(*) FROM search_history WHERE user_id = p_user_id AND created_at >= start_date)::numeric * 100 AS numeric(10,1)) AS percentage
        FROM search_history 
        WHERE user_id = p_user_id 
          AND created_at >= start_date
        GROUP BY 
          CASE 
            WHEN keyword ILIKE '%인공지능%' OR keyword ILIKE '%AI%' OR keyword ILIKE '%머신러닝%' OR keyword ILIKE '%딥러닝%' THEN 'Artificial Intelligence'
            WHEN keyword ILIKE '%자율주행%' OR keyword ILIKE '%자동차%' THEN 'Transportation'
            WHEN keyword ILIKE '%블록체인%' OR keyword ILIKE '%암호%' THEN 'Blockchain'
            WHEN keyword ILIKE '%5G%' OR keyword ILIKE '%통신%' THEN 'Telecommunications'
            WHEN keyword ILIKE '%IoT%' OR keyword ILIKE '%센서%' THEN 'IoT/Sensors'
            WHEN keyword ILIKE '%바이오%' OR keyword ILIKE '%의료%' THEN 'Biotechnology'
            WHEN keyword ILIKE '%반도체%' OR keyword ILIKE '%칩%' THEN 'Semiconductors'
            WHEN keyword ILIKE '%양자%' THEN 'Quantum Technology'
            ELSE 'General'
          END,
          CASE 
            WHEN keyword ILIKE '%인공지능%' OR keyword ILIKE '%AI%' OR keyword ILIKE '%머신러닝%' OR keyword ILIKE '%딥러닝%' THEN 'G06N'
            WHEN keyword ILIKE '%자율주행%' OR keyword ILIKE '%자동차%' THEN 'B60W'
            WHEN keyword ILIKE '%블록체인%' OR keyword ILIKE '%암호%' THEN 'H04L'
            WHEN keyword ILIKE '%5G%' OR keyword ILIKE '%통신%' THEN 'H04B'
            WHEN keyword ILIKE '%IoT%' OR keyword ILIKE '%센서%' THEN 'G08C'
            WHEN keyword ILIKE '%바이오%' OR keyword ILIKE '%의료%' THEN 'A61B'
            WHEN keyword ILIKE '%반도체%' OR keyword ILIKE '%칩%' THEN 'H01L'
            WHEN keyword ILIKE '%양자%' THEN 'G06N'
            ELSE 'G'
          END
        ORDER BY COUNT(*) DESC
        LIMIT 5
      ) tech_fields
    ),
    'daily_searches', user_activity_data,
    'daily_reports', user_activity_data,
    'daily_logins', user_activity_data,
    'market_daily_searches', user_activity_data,
    'market_daily_reports', user_activity_data,
    'search_fields_top10', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'field', field_name,
          'ipc_code', ipc_code,
          'search_count', search_count,
          'percentage', percentage
        )
      ), '[]'::json)
      FROM (
        SELECT 
          CASE 
            WHEN keyword ILIKE '%인공지능%' OR keyword ILIKE '%AI%' OR keyword ILIKE '%머신러닝%' OR keyword ILIKE '%딥러닝%' THEN 'Artificial Intelligence'
            WHEN keyword ILIKE '%자율주행%' OR keyword ILIKE '%자동차%' THEN 'Transportation'
            WHEN keyword ILIKE '%블록체인%' OR keyword ILIKE '%암호%' THEN 'Blockchain'
            WHEN keyword ILIKE '%5G%' OR keyword ILIKE '%통신%' THEN 'Telecommunications'
            WHEN keyword ILIKE '%IoT%' OR keyword ILIKE '%센서%' THEN 'IoT/Sensors'
            WHEN keyword ILIKE '%바이오%' OR keyword ILIKE '%의료%' THEN 'Biotechnology'
            WHEN keyword ILIKE '%반도체%' OR keyword ILIKE '%칩%' THEN 'Semiconductors'
            WHEN keyword ILIKE '%양자%' THEN 'Quantum Technology'
            ELSE 'General'
          END AS field_name,
          CASE 
            WHEN keyword ILIKE '%인공지능%' OR keyword ILIKE '%AI%' OR keyword ILIKE '%머신러닝%' OR keyword ILIKE '%딥러닝%' THEN 'G06N'
            WHEN keyword ILIKE '%자율주행%' OR keyword ILIKE '%자동차%' THEN 'B60W'
            WHEN keyword ILIKE '%블록체인%' OR keyword ILIKE '%암호%' THEN 'H04L'
            WHEN keyword ILIKE '%5G%' OR keyword ILIKE '%통신%' THEN 'H04B'
            WHEN keyword ILIKE '%IoT%' OR keyword ILIKE '%센서%' THEN 'G08C'
            WHEN keyword ILIKE '%바이오%' OR keyword ILIKE '%의료%' THEN 'A61B'
            WHEN keyword ILIKE '%반도체%' OR keyword ILIKE '%칩%' THEN 'H01L'
            WHEN keyword ILIKE '%양자%' THEN 'G06N'
            ELSE 'G'
          END AS ipc_code,
          COUNT(*) AS search_count,
          CAST(COUNT(*)::numeric / (SELECT COUNT(*) FROM search_history WHERE user_id = p_user_id AND created_at >= start_date)::numeric * 100 AS numeric(10,1)) AS percentage
        FROM search_history 
        WHERE user_id = p_user_id 
          AND created_at >= start_date
        GROUP BY 
          CASE 
            WHEN keyword ILIKE '%인공지능%' OR keyword ILIKE '%AI%' OR keyword ILIKE '%머신러닝%' OR keyword ILIKE '%딥러닝%' THEN 'Artificial Intelligence'
            WHEN keyword ILIKE '%자율주행%' OR keyword ILIKE '%자동차%' THEN 'Transportation'
            WHEN keyword ILIKE '%블록체인%' OR keyword ILIKE '%암호%' THEN 'Blockchain'
            WHEN keyword ILIKE '%5G%' OR keyword ILIKE '%통신%' THEN 'Telecommunications'
            WHEN keyword ILIKE '%IoT%' OR keyword ILIKE '%센서%' THEN 'IoT/Sensors'
            WHEN keyword ILIKE '%바이오%' OR keyword ILIKE '%의료%' THEN 'Biotechnology'
            WHEN keyword ILIKE '%반도체%' OR keyword ILIKE '%칩%' THEN 'Semiconductors'
            WHEN keyword ILIKE '%양자%' THEN 'Quantum Technology'
            ELSE 'General'
          END,
          CASE 
            WHEN keyword ILIKE '%인공지능%' OR keyword ILIKE '%AI%' OR keyword ILIKE '%머신러닝%' OR keyword ILIKE '%딥러닝%' THEN 'G06N'
            WHEN keyword ILIKE '%자율주행%' OR keyword ILIKE '%자동차%' THEN 'B60W'
            WHEN keyword ILIKE '%블록체인%' OR keyword ILIKE '%암호%' THEN 'H04L'
            WHEN keyword ILIKE '%5G%' OR keyword ILIKE '%통신%' THEN 'H04B'
            WHEN keyword ILIKE '%IoT%' OR keyword ILIKE '%센서%' THEN 'G08C'
            WHEN keyword ILIKE '%바이오%' OR keyword ILIKE '%의료%' THEN 'A61B'
            WHEN keyword ILIKE '%반도체%' OR keyword ILIKE '%칩%' THEN 'H01L'
            WHEN keyword ILIKE '%양자%' THEN 'G06N'
            ELSE 'G'
          END
        ORDER BY COUNT(*) DESC
        LIMIT 10
      ) top_searches
    ),
    'report_fields_top10', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'field', field_name,
          'ipc_code', ipc_code,
          'report_count', report_count,
          'percentage', percentage
        )
      ), '[]'::json)
      FROM (
        SELECT 
          CASE 
            WHEN invention_title ILIKE '%인공지능%' OR invention_title ILIKE '%AI%' OR invention_title ILIKE '%머신러닝%' OR invention_title ILIKE '%딥러닝%' THEN 'Artificial Intelligence'
            WHEN invention_title ILIKE '%자율주행%' OR invention_title ILIKE '%자동차%' THEN 'Transportation'
            WHEN invention_title ILIKE '%블록체인%' OR invention_title ILIKE '%암호%' THEN 'Blockchain'
            WHEN invention_title ILIKE '%5G%' OR invention_title ILIKE '%통신%' THEN 'Telecommunications'
            WHEN invention_title ILIKE '%IoT%' OR invention_title ILIKE '%센서%' THEN 'IoT/Sensors'
            WHEN invention_title ILIKE '%바이오%' OR invention_title ILIKE '%의료%' THEN 'Biotechnology'
            WHEN invention_title ILIKE '%반도체%' OR invention_title ILIKE '%칩%' THEN 'Semiconductors'
            WHEN invention_title ILIKE '%양자%' THEN 'Quantum Technology'
            ELSE 'General'
          END AS field_name,
          CASE 
            WHEN invention_title ILIKE '%인공지능%' OR invention_title ILIKE '%AI%' OR invention_title ILIKE '%머신러닝%' OR invention_title ILIKE '%딥러닝%' THEN 'G06N'
            WHEN invention_title ILIKE '%자율주행%' OR invention_title ILIKE '%자동차%' THEN 'B60W'
            WHEN invention_title ILIKE '%블록체인%' OR invention_title ILIKE '%암호%' THEN 'H04L'
            WHEN invention_title ILIKE '%5G%' OR invention_title ILIKE '%통신%' THEN 'H04B'
            WHEN invention_title ILIKE '%IoT%' OR invention_title ILIKE '%센서%' THEN 'G08C'
            WHEN invention_title ILIKE '%바이오%' OR invention_title ILIKE '%의료%' THEN 'A61B'
            WHEN invention_title ILIKE '%반도체%' OR invention_title ILIKE '%칩%' THEN 'H01L'
            WHEN invention_title ILIKE '%양자%' THEN 'G06N'
            ELSE 'G'
          END AS ipc_code,
          COUNT(*) AS report_count,
          CAST(COUNT(*)::numeric / (SELECT COUNT(*) FROM ai_analysis_reports WHERE user_id = p_user_id AND created_at >= start_date)::numeric * 100 AS numeric(10,1)) AS percentage
        FROM ai_analysis_reports 
        WHERE user_id = p_user_id 
          AND created_at >= start_date
        GROUP BY 
          CASE 
            WHEN invention_title ILIKE '%인공지능%' OR invention_title ILIKE '%AI%' OR invention_title ILIKE '%머신러닝%' OR invention_title ILIKE '%딥러닝%' THEN 'Artificial Intelligence'
            WHEN invention_title ILIKE '%자율주행%' OR invention_title ILIKE '%자동차%' THEN 'Transportation'
            WHEN invention_title ILIKE '%블록체인%' OR invention_title ILIKE '%암호%' THEN 'Blockchain'
            WHEN invention_title ILIKE '%5G%' OR invention_title ILIKE '%통신%' THEN 'Telecommunications'
            WHEN invention_title ILIKE '%IoT%' OR invention_title ILIKE '%센서%' THEN 'IoT/Sensors'
            WHEN invention_title ILIKE '%바이오%' OR invention_title ILIKE '%의료%' THEN 'Biotechnology'
            WHEN invention_title ILIKE '%반도체%' OR invention_title ILIKE '%칩%' THEN 'Semiconductors'
            WHEN invention_title ILIKE '%양자%' THEN 'Quantum Technology'
            ELSE 'General'
          END,
          CASE 
            WHEN invention_title ILIKE '%인공지능%' OR invention_title ILIKE '%AI%' OR invention_title ILIKE '%머신러닝%' OR invention_title ILIKE '%딥러닝%' THEN 'G06N'
            WHEN invention_title ILIKE '%자율주행%' OR invention_title ILIKE '%자동차%' THEN 'B60W'
            WHEN invention_title ILIKE '%블록체인%' OR invention_title ILIKE '%암호%' THEN 'H04L'
            WHEN keyword ILIKE '%5G%' OR keyword ILIKE '%통신%' THEN 'H04B'
            WHEN invention_title ILIKE '%IoT%' OR invention_title ILIKE '%센서%' THEN 'G08C'
            WHEN invention_title ILIKE '%바이오%' OR invention_title ILIKE '%의료%' THEN 'A61B'
            WHEN invention_title ILIKE '%반도체%' OR invention_title ILIKE '%칩%' THEN 'H01L'
            WHEN invention_title ILIKE '%양자%' THEN 'G06N'
            ELSE 'G'
          END
        ORDER BY COUNT(*) DESC
        LIMIT 10
      ) top_reports
    ),
    'market_search_fields_top10', '[]'::json,
    'market_report_fields_top10', '[]'::json
  ) INTO result;
  
  RETURN result;
END;
$$;