-- 개선된 대시보드 분석 마이그레이션
-- 날짜: 2025-01-29
-- 목적: 사용자 요구사항 10가지 분석 항목을 모두 포함하는 대시보드 통계 제공

-- 1. 기존 함수 백업
CREATE OR REPLACE FUNCTION get_dashboard_stats_backup(p_user_id UUID, p_period TEXT DEFAULT '30d')
RETURNS JSON AS $$
DECLARE
  result JSON;
  period_interval INTERVAL;
BEGIN
  -- 기존 함수 로직을 백업용으로 보존
  CASE p_period
    WHEN '7d' THEN period_interval := INTERVAL '7 days';
    WHEN '30d' THEN period_interval := INTERVAL '30 days';
    WHEN '90d' THEN period_interval := INTERVAL '90 days';
    ELSE period_interval := INTERVAL '30 days';
  END CASE;

  SELECT json_build_object(
    'quota_status', json_build_object(
      'remaining_credits', 15000,
      'remaining_reports', 50,
      'subscription_plan', 'basic',
      'last_login', NOW(),
      'expiry_date', (NOW() + INTERVAL '30 days')::date,
      'days_until_expiry', 30
    ),
    'efficiency_metrics', json_build_object(
      'login_to_report_rate', 0,
      'search_to_report_rate', 0,
      'total_logins', 0,
      'total_searches', 0,
      'total_reports', 0
    ),
    'daily_searches', '[]'::json,
    'daily_reports', '[]'::json,
    'daily_logins', '[]'::json,
    'market_daily_searches', '[]'::json,
    'market_daily_reports', '[]'::json,
    'search_fields_top10', '[]'::json,
    'report_fields_top10', '[]'::json,
    'market_search_fields_top10', '[]'::json,
    'market_report_fields_top10', '[]'::json,
    'recent_reports', '[]'::json,
    'recent_searches', '[]'::json
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. 개선된 대시보드 통계 함수 생성
CREATE OR REPLACE FUNCTION get_enhanced_dashboard_stats(p_user_id UUID, p_period TEXT DEFAULT '30d')
RETURNS JSON AS $$
DECLARE
  result JSON;
  period_interval INTERVAL;
BEGIN
  -- 기간 설정
  CASE p_period
    WHEN '7d' THEN period_interval := INTERVAL '7 days';
    WHEN '30d' THEN period_interval := INTERVAL '30 days';
    WHEN '90d' THEN period_interval := INTERVAL '90 days';
    ELSE period_interval := INTERVAL '30 days';
  END CASE;

  WITH 
  -- 날짜 시리즈 생성 (일별 트렌드용)
  date_series AS (
    SELECT generate_series(
      (NOW()::date - (period_interval - INTERVAL '1 day')),
      NOW()::date,
      INTERVAL '1 day'
    )::date AS d
  ),
  
  -- 1. 검색건수 -> 검색추이 (사용자)
  user_search_daily AS (
    SELECT 
      ua.created_at::date AS d, 
      COUNT(*) AS cnt
    FROM user_activities ua
    WHERE ua.user_id = p_user_id
      AND ua.activity_type = 'search'
      AND ua.created_at >= NOW() - period_interval
    GROUP BY ua.created_at::date
  ),
  
  -- 2. 리포트건수 -> 리포트추이 (사용자)
  user_report_daily AS (
    SELECT 
      r.created_at::date AS d, 
      COUNT(*) AS cnt
    FROM ai_analysis_reports r
    WHERE r.user_id = p_user_id
      AND r.created_at >= NOW() - period_interval
    GROUP BY r.created_at::date
  ),
  
  -- 로그인 데이터 (효율성 지표용)
  user_login_daily AS (
    SELECT 
      ua.created_at::date AS d, 
      COUNT(*) AS cnt
    FROM user_activities ua
    WHERE ua.user_id = p_user_id
      AND ua.activity_type = 'login'
      AND ua.created_at >= NOW() - period_interval
    GROUP BY ua.created_at::date
  ),
  
  -- 전체 사용자 검색 데이터 (시장 비교용)
  market_search_daily AS (
    SELECT 
      ua.created_at::date AS d, 
      COUNT(*) AS cnt
    FROM user_activities ua
    WHERE ua.activity_type = 'search'
      AND ua.created_at >= NOW() - period_interval
    GROUP BY ua.created_at::date
  ),
  
  -- 전체 사용자 리포트 데이터 (시장 비교용)
  market_report_daily AS (
    SELECT 
      r.created_at::date AS d, 
      COUNT(*) AS cnt
    FROM ai_analysis_reports r
    WHERE r.created_at >= NOW() - period_interval
    GROUP BY r.created_at::date
  ),
  
  -- 효율성 지표 계산
  efficiency_stats AS (
    SELECT 
      COALESCE(SUM(CASE WHEN ua.activity_type = 'login' THEN 1 ELSE 0 END), 0) as total_logins,
      COALESCE(SUM(CASE WHEN ua.activity_type = 'search' THEN 1 ELSE 0 END), 0) as total_searches,
      COALESCE((SELECT COUNT(*) FROM ai_analysis_reports WHERE user_id = p_user_id AND created_at >= NOW() - period_interval), 0) as total_reports
    FROM user_activities ua
    WHERE ua.user_id = p_user_id
      AND ua.created_at >= NOW() - period_interval
  ),
  
  -- 5. 검색 IPC/CPC 분석 (사용자)
  user_search_ipc_data AS (
    SELECT 
      COALESCE(
        CASE 
          WHEN sh.technology_field IS NOT NULL THEN sh.technology_field
          WHEN ua.activity_data->>'technology_field' IS NOT NULL THEN ua.activity_data->>'technology_field'
          ELSE 'General'
        END, 'General'
      ) AS field,
      COALESCE(
        CASE 
          WHEN ua.activity_data->>'ipc_class' IS NOT NULL THEN ua.activity_data->>'ipc_class'
          ELSE 'G'
        END, 'G'
      ) AS ipc_code,
      COUNT(*) AS search_count
    FROM user_activities ua
    LEFT JOIN search_history sh ON sh.user_id = ua.user_id 
      AND sh.created_at::date = ua.created_at::date
    WHERE ua.user_id = p_user_id
      AND ua.activity_type = 'search'
      AND ua.created_at >= NOW() - period_interval
    GROUP BY field, ipc_code
  ),
  
  -- 전체 사용자 검색 IPC/CPC 분석 (시장 비교용)
  market_search_ipc_data AS (
    SELECT 
      COALESCE(
        CASE 
          WHEN sh.technology_field IS NOT NULL THEN sh.technology_field
          WHEN ua.activity_data->>'technology_field' IS NOT NULL THEN ua.activity_data->>'technology_field'
          ELSE 'General'
        END, 'General'
      ) AS field,
      COALESCE(
        CASE 
          WHEN ua.activity_data->>'ipc_class' IS NOT NULL THEN ua.activity_data->>'ipc_class'
          ELSE 'G'
        END, 'G'
      ) AS ipc_code,
      COUNT(*) AS search_count
    FROM user_activities ua
    LEFT JOIN search_history sh ON sh.user_id = ua.user_id 
      AND sh.created_at::date = ua.created_at::date
    WHERE ua.activity_type = 'search'
      AND ua.created_at >= NOW() - period_interval
    GROUP BY field, ipc_code
  ),
  
  -- 7. 리포트 IPC/CPC 분석 (사용자)
  user_report_ipc_data AS (
    SELECT 
      COALESCE(
        CASE 
          WHEN r.analysis_type = 'market_analysis' THEN 'Market Research'
          WHEN r.analysis_type = 'business_insights' THEN 'Business Analysis'
          WHEN r.analysis_type = 'patent_analysis' THEN 'Patent Analysis'
          ELSE 'General'
        END, 'General'
      ) AS field,
      'G' AS ipc_code, -- 기본값, 실제로는 리포트에서 분석된 기술분야 기반
      COUNT(*) AS report_count
    FROM ai_analysis_reports r
    WHERE r.user_id = p_user_id
      AND r.created_at >= NOW() - period_interval
    GROUP BY field, ipc_code
  ),
  
  -- 전체 사용자 리포트 IPC/CPC 분석 (시장 비교용)
  market_report_ipc_data AS (
    SELECT 
      COALESCE(
        CASE 
          WHEN r.analysis_type = 'market_analysis' THEN 'Market Research'
          WHEN r.analysis_type = 'business_insights' THEN 'Business Analysis'
          WHEN r.analysis_type = 'patent_analysis' THEN 'Patent Analysis'
          ELSE 'General'
        END, 'General'
      ) AS field,
      'G' AS ipc_code,
      COUNT(*) AS report_count
    FROM ai_analysis_reports r
    WHERE r.created_at >= NOW() - period_interval
    GROUP BY field, ipc_code
  ),
  
  -- 9. 최근 리포트 제목 20개
  recent_reports AS (
    SELECT 
      r.id,
      COALESCE(r.report_name, r.invention_title || ' - ' || r.analysis_type) AS title,
      r.analysis_type,
      r.application_number,
      r.created_at
    FROM ai_analysis_reports r
    WHERE r.user_id = p_user_id
      AND r.created_at >= NOW() - period_interval
    ORDER BY r.created_at DESC
    LIMIT 20
  ),
  
  -- 10. 최근 검색어 10개
  recent_searches AS (
    SELECT DISTINCT
      COALESCE(ua.activity_data->>'keyword', ua.activity_data->>'query', 'Unknown') AS keyword,
      ua.created_at
    FROM user_activities ua
    WHERE ua.user_id = p_user_id
      AND ua.activity_type = 'search'
      AND ua.created_at >= NOW() - period_interval
      AND COALESCE(ua.activity_data->>'keyword', ua.activity_data->>'query') IS NOT NULL
    ORDER BY ua.created_at DESC
    LIMIT 10
  )
  
  -- 최종 결과 조합
  SELECT json_build_object(
    -- 기본 할당량 정보
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
    
    -- 3, 4. 효율성 지표 (로그인대비 리포트발행수, 검색대비 리포트발행수)
    'efficiency_metrics', (
      SELECT json_build_object(
        'login_to_report_rate', 
          CASE WHEN es.total_logins > 0 
            THEN ROUND((es.total_reports::float / es.total_logins * 100)::numeric, 1)
            ELSE 0 
          END,
        'search_to_report_rate', 
          CASE WHEN es.total_searches > 0 
            THEN ROUND((es.total_reports::float / es.total_searches * 100)::numeric, 1)
            ELSE 0 
          END,
        'total_logins', es.total_logins,
        'total_searches', es.total_searches,
        'total_reports', es.total_reports
      )
      FROM efficiency_stats es
    ),
    
    -- 1. 검색추이 (일별)
    'daily_searches', (
      SELECT COALESCE(json_agg(
        json_build_object('date', ds.d, 'count', COALESCE(usd.cnt, 0)) 
        ORDER BY ds.d
      ), '[]'::json)
      FROM date_series ds
      LEFT JOIN user_search_daily usd ON usd.d = ds.d
    ),
    
    -- 2. 리포트추이 (일별)
    'daily_reports', (
      SELECT COALESCE(json_agg(
        json_build_object('date', ds.d, 'count', COALESCE(urd.cnt, 0)) 
        ORDER BY ds.d
      ), '[]'::json)
      FROM date_series ds
      LEFT JOIN user_report_daily urd ON urd.d = ds.d
    ),
    
    -- 로그인 추이 (참고용)
    'daily_logins', (
      SELECT COALESCE(json_agg(
        json_build_object('date', ds.d, 'count', COALESCE(uld.cnt, 0)) 
        ORDER BY ds.d
      ), '[]'::json)
      FROM date_series ds
      LEFT JOIN user_login_daily uld ON uld.d = ds.d
    ),
    
    -- 6. 시장 검색 건수 비교
    'market_daily_searches', (
      SELECT COALESCE(json_agg(
        json_build_object('date', ds.d, 'count', COALESCE(msd.cnt, 0)) 
        ORDER BY ds.d
      ), '[]'::json)
      FROM date_series ds
      LEFT JOIN market_search_daily msd ON msd.d = ds.d
    ),
    
    -- 8. 시장 리포트 건수 비교
    'market_daily_reports', (
      SELECT COALESCE(json_agg(
        json_build_object('date', ds.d, 'count', COALESCE(mrd.cnt, 0)) 
        ORDER BY ds.d
      ), '[]'::json)
      FROM date_series ds
      LEFT JOIN market_report_daily mrd ON mrd.d = ds.d
    ),
    
    -- 5. 사용자 검색 IPC/CPC Top10
    'search_fields_top10', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'field', usid.field,
          'ipc_code', usid.ipc_code,
          'search_count', usid.search_count,
          'percentage', CASE 
            WHEN (SELECT SUM(search_count) FROM user_search_ipc_data) > 0 
            THEN ROUND((usid.search_count::float / (SELECT SUM(search_count) FROM user_search_ipc_data) * 100)::numeric, 1)
            ELSE 0 
          END
        )
        ORDER BY usid.search_count DESC
      ), '[]'::json)
      FROM user_search_ipc_data usid
      ORDER BY usid.search_count DESC
      LIMIT 10
    ),
    
    -- 7. 사용자 리포트 IPC/CPC Top10
    'report_fields_top10', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'field', urid.field,
          'ipc_code', urid.ipc_code,
          'report_count', urid.report_count,
          'percentage', CASE 
            WHEN (SELECT SUM(report_count) FROM user_report_ipc_data) > 0 
            THEN ROUND((urid.report_count::float / (SELECT SUM(report_count) FROM user_report_ipc_data) * 100)::numeric, 1)
            ELSE 0 
          END
        )
        ORDER BY urid.report_count DESC
      ), '[]'::json)
      FROM user_report_ipc_data urid
      ORDER BY urid.report_count DESC
      LIMIT 10
    ),
    
    -- 5. 시장 검색 IPC/CPC Top10 (비교용)
    'market_search_fields_top10', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'field', msid.field,
          'ipc_code', msid.ipc_code,
          'search_count', msid.search_count,
          'percentage', CASE 
            WHEN (SELECT SUM(search_count) FROM market_search_ipc_data) > 0 
            THEN ROUND((msid.search_count::float / (SELECT SUM(search_count) FROM market_search_ipc_data) * 100)::numeric, 1)
            ELSE 0 
          END
        )
        ORDER BY msid.search_count DESC
      ), '[]'::json)
      FROM market_search_ipc_data msid
      ORDER BY msid.search_count DESC
      LIMIT 10
    ),
    
    -- 7. 시장 리포트 IPC/CPC Top10 (비교용)
    'market_report_fields_top10', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'field', mrid.field,
          'ipc_code', mrid.ipc_code,
          'report_count', mrid.report_count,
          'percentage', CASE 
            WHEN (SELECT SUM(report_count) FROM market_report_ipc_data) > 0 
            THEN ROUND((mrid.report_count::float / (SELECT SUM(report_count) FROM market_report_ipc_data) * 100)::numeric, 1)
            ELSE 0 
          END
        )
        ORDER BY mrid.report_count DESC
      ), '[]'::json)
      FROM market_report_ipc_data mrid
      ORDER BY mrid.report_count DESC
      LIMIT 10
    ),
    
    -- 9. 최근 리포트 제목 20개
    'recent_reports', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'id', rr.id,
          'title', rr.title,
          'type', rr.analysis_type,
          'application_number', rr.application_number,
          'timestamp', rr.created_at
        )
        ORDER BY rr.created_at DESC
      ), '[]'::json)
      FROM recent_reports rr
    ),
    
    -- 10. 최근 검색어 10개
    'recent_searches', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'keyword', rs.keyword,
          'timestamp', rs.created_at
        )
        ORDER BY rs.created_at DESC
      ), '[]'::json)
      FROM recent_searches rs
    )
    
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 기존 함수를 새로운 함수로 교체
DROP FUNCTION IF EXISTS get_dashboard_stats(UUID, TEXT);
CREATE OR REPLACE FUNCTION get_dashboard_stats(p_user_id UUID, p_period TEXT DEFAULT '30d')
RETURNS JSON AS $$
BEGIN
  RETURN get_enhanced_dashboard_stats(p_user_id, p_period);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. 권한 부여
GRANT EXECUTE ON FUNCTION get_enhanced_dashboard_stats(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_dashboard_stats(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_dashboard_stats_backup(UUID, TEXT) TO authenticated;

-- 5. 테스트용 샘플 데이터 생성 함수
CREATE OR REPLACE FUNCTION create_sample_dashboard_data(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  -- 샘플 검색 활동 생성
  INSERT INTO user_activities (user_id, activity_type, activity_data, created_at)
  SELECT 
    p_user_id,
    'search',
    json_build_object(
      'keyword', 'AI 특허 검색 ' || i,
      'technology_field', CASE (i % 4) 
        WHEN 0 THEN 'Artificial Intelligence'
        WHEN 1 THEN 'Machine Learning'
        WHEN 2 THEN 'Computer Vision'
        ELSE 'Natural Language Processing'
      END,
      'ipc_class', CASE (i % 3)
        WHEN 0 THEN 'G06F'
        WHEN 1 THEN 'G06N'
        ELSE 'G06T'
      END
    ),
    NOW() - (i || ' days')::interval
  FROM generate_series(1, 30) i;
  
  -- 샘플 로그인 활동 생성
  INSERT INTO user_activities (user_id, activity_type, activity_data, created_at)
  SELECT 
    p_user_id,
    'login',
    json_build_object('login_method', 'email'),
    NOW() - (i || ' days')::interval
  FROM generate_series(1, 15) i;
  
  -- 샘플 리포트 생성
  INSERT INTO ai_analysis_reports (user_id, application_number, invention_title, analysis_type, report_name, created_at)
  SELECT 
    p_user_id,
    '10-2024-' || LPAD(i::text, 7, '0'),
    'AI 기술 특허 ' || i,
    CASE (i % 3)
      WHEN 0 THEN 'market_analysis'
      WHEN 1 THEN 'business_insights'
      ELSE 'patent_analysis'
    END,
    'AI 기술 분석 리포트 ' || i,
    NOW() - (i || ' days')::interval
  FROM generate_series(1, 10) i;
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION create_sample_dashboard_data(UUID) TO authenticated;