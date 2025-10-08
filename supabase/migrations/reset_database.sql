-- =====================================================
-- DB 데이터 완전 삭제 및 초기화 스크립트
-- =====================================================

-- 1. 모든 테이블 데이터 삭제 (TRUNCATE CASCADE)
TRUNCATE TABLE 
  competitor_mentions,
  patent_detail_views,
  patent_search_analytics,
  ai_analysis_reports,
  user_activities,
  saved_patents,
  usage_cost_tracking,
  llm_analysis_logs,
  search_keyword_analytics,
  reports,
  user_login_logs,
  report_history,
  system_metrics,
  billing_events,
  document_downloads,
  search_history,
  users
CASCADE;

-- 2. 시퀀스 및 ID 카운터 리셋 (UUID는 자동 생성이므로 별도 리셋 불필요)

-- 3. 테스트 데이터 생성

-- 3.1 관리자 계정 생성
INSERT INTO users (
  id, email, name, role, subscription_plan, 
  company, phone, bio, 
  total_searches, total_detail_views, total_logins, total_reports, total_usage_cost,
  last_login_at, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'admin@patent-ai.com',
  '관리자',
  'admin',
  'premium',
  'Patent AI Corp',
  '010-1234-5678',
  '시스템 관리자입니다.',
  0, 0, 0, 0, 0.00,
  NOW(),
  NOW() - INTERVAL '30 days',
  NOW()
);

-- 3.2 일반 사용자 계정들 생성
INSERT INTO users (
  id, email, name, role, subscription_plan, 
  company, phone, bio,
  total_searches, total_detail_views, total_logins, total_reports, total_usage_cost,
  last_login_at, created_at, updated_at
) VALUES 
-- 사용자 1: 활발한 사용자
(
  gen_random_uuid(),
  'user@patent-ai.com',
  '김특허',
  'user',
  'premium',
  '삼성전자',
  '010-2345-6789',
  '특허 분석 전문가입니다.',
  45, 120, 25, 15, 125000.00,
  NOW() - INTERVAL '2 hours',
  NOW() - INTERVAL '25 days',
  NOW() - INTERVAL '2 hours'
),
-- 사용자 2: 중간 사용자
(
  gen_random_uuid(),
  'researcher@patent-ai.com',
  '이연구',
  'user',
  'free',
  'LG전자',
  '010-3456-7890',
  'R&D 연구원입니다.',
  28, 75, 18, 8, 45000.00,
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '20 days',
  NOW() - INTERVAL '1 day'
),
-- 사용자 3: 신규 사용자
(
  gen_random_uuid(),
  'newbie@patent-ai.com',
  '박신규',
  'user',
  'free',
  '스타트업',
  '010-4567-8901',
  '특허 분야 신입입니다.',
  5, 12, 3, 1, 5000.00,
  NOW() - INTERVAL '3 hours',
  NOW() - INTERVAL '3 days',
  NOW() - INTERVAL '3 hours'
),
-- 사용자 4: 비활성 사용자
(
  gen_random_uuid(),
  'inactive@patent-ai.com',
  '최비활성',
  'user',
  'free',
  '대기업',
  '010-5678-9012',
  '가끔 사용하는 사용자입니다.',
  12, 25, 8, 3, 15000.00,
  NOW() - INTERVAL '15 days',
  NOW() - INTERVAL '45 days',
  NOW() - INTERVAL '15 days'
),
-- 사용자 5: 프리미엄 사용자
(
  gen_random_uuid(),
  'premium@patent-ai.com',
  '정프리미엄',
  'user',
  'premium',
  '현대자동차',
  '010-6789-0123',
  '프리미엄 구독자입니다.',
  67, 180, 35, 22, 180000.00,
  NOW() - INTERVAL '30 minutes',
  NOW() - INTERVAL '60 days',
  NOW() - INTERVAL '30 minutes'
);

-- 4. 사용자 활동 데이터 생성
DO $$
DECLARE
  user_record RECORD;
  activity_date DATE;
  i INTEGER;
BEGIN
  -- 각 사용자별로 활동 데이터 생성
  FOR user_record IN SELECT id, email, total_searches, total_reports FROM users WHERE role = 'user' LOOP
    
    -- 로그인 활동 생성
    FOR i IN 1..LEAST(user_record.total_searches, 30) LOOP
      activity_date := CURRENT_DATE - (random() * 30)::INTEGER;
      
      INSERT INTO user_activities (
        user_id, activity_type, activity_data, 
        ip_address, user_agent, created_at
      ) VALUES (
        user_record.id,
        'login',
        jsonb_build_object(
          'login_method', 'email',
          'session_duration', (random() * 3600000)::INTEGER
        ),
        ('192.168.1.' || (random() * 255)::INTEGER)::INET,
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        activity_date + (random() * INTERVAL '24 hours')
      );
    END LOOP;
    
    -- 검색 활동 생성
    FOR i IN 1..user_record.total_searches LOOP
      activity_date := CURRENT_DATE - (random() * 25)::INTEGER;
      
      INSERT INTO user_activities (
        user_id, activity_type, activity_data, created_at
      ) VALUES (
        user_record.id,
        'search',
        jsonb_build_object(
          'keyword', CASE (random() * 10)::INTEGER
            WHEN 0 THEN '인공지능'
            WHEN 1 THEN '자율주행'
            WHEN 2 THEN '배터리'
            WHEN 3 THEN '반도체'
            WHEN 4 THEN '5G통신'
            WHEN 5 THEN '블록체인'
            WHEN 6 THEN 'IoT'
            WHEN 7 THEN '로봇'
            WHEN 8 THEN '바이오'
            ELSE '신재생에너지'
          END,
          'results_count', (random() * 100 + 10)::INTEGER,
          'search_duration_ms', (random() * 5000 + 1000)::INTEGER
        ),
        activity_date + (random() * INTERVAL '24 hours')
      );
    END LOOP;
    
    -- 리포트 생성 활동
    FOR i IN 1..user_record.total_reports LOOP
      activity_date := CURRENT_DATE - (random() * 20)::INTEGER;
      
      INSERT INTO user_activities (
        user_id, activity_type, activity_data, created_at
      ) VALUES (
        user_record.id,
        'report_generate',
        jsonb_build_object(
          'report_type', CASE (random())::INTEGER WHEN 0 THEN 'market' ELSE 'business' END,
          'patent_id', 'KR' || (random() * 999999 + 100000)::INTEGER,
          'generation_time_ms', (random() * 30000 + 5000)::INTEGER
        ),
        activity_date + (random() * INTERVAL '24 hours')
      );
    END LOOP;
    
  END LOOP;
END $$;

-- 5. 검색 기록 데이터 생성
DO $$
DECLARE
  user_record RECORD;
  search_date DATE;
  i INTEGER;
  keywords TEXT[] := ARRAY['인공지능', '자율주행', '배터리', '반도체', '5G통신', '블록체인', 'IoT', '로봇', '바이오', '신재생에너지'];
  tech_fields TEXT[] := ARRAY['전자/통신', '기계/자동차', '화학/소재', '바이오/의료', '에너지/환경'];
BEGIN
  FOR user_record IN SELECT id FROM users WHERE role = 'user' LOOP
    FOR i IN 1..(random() * 20 + 5)::INTEGER LOOP
      search_date := CURRENT_DATE - (random() * 30)::INTEGER;
      
      INSERT INTO search_history (
        user_id, keyword, results_count, 
        technology_field, field_confidence,
        search_duration_ms, created_at
      ) VALUES (
        user_record.id,
        keywords[(random() * array_length(keywords, 1))::INTEGER + 1],
        (random() * 100 + 10)::INTEGER,
        tech_fields[(random() * array_length(tech_fields, 1))::INTEGER + 1],
        random() * 0.5 + 0.5,
        (random() * 5000 + 1000)::INTEGER,
        search_date + (random() * INTERVAL '24 hours')
      );
    END LOOP;
  END LOOP;
END $$;

-- 6. AI 분석 리포트 데이터 생성
DO $$
DECLARE
  user_record RECORD;
  report_date DATE;
  i INTEGER;
  patent_titles TEXT[] := ARRAY[
    '인공지능 기반 자율주행 시스템',
    '고효율 리튬이온 배터리 기술',
    '5G 통신용 반도체 칩셋',
    '블록체인 기반 보안 시스템',
    'IoT 센서 네트워크 기술',
    '로봇 제어 알고리즘',
    '바이오 신약 개발 플랫폼',
    '태양광 발전 효율 개선 기술'
  ];
BEGIN
  FOR user_record IN SELECT id, total_reports FROM users WHERE role = 'user' AND total_reports > 0 LOOP
    FOR i IN 1..user_record.total_reports LOOP
      report_date := CURRENT_DATE - (random() * 25)::INTEGER;
      
      INSERT INTO ai_analysis_reports (
        user_id, application_number, invention_title,
        market_penetration, competitive_landscape, market_growth_drivers,
        risk_factors, revenue_model, royalty_margin,
        new_business_opportunities, competitor_response_strategy,
        report_name, analysis_type, created_at
      ) VALUES (
        user_record.id,
        'KR' || (random() * 999999 + 100000)::INTEGER,
        patent_titles[(random() * array_length(patent_titles, 1))::INTEGER + 1],
        '시장 침투도 분석 내용...',
        '경쟁 환경 분석 내용...',
        '시장 성장 동력 분석 내용...',
        '위험 요소 분석 내용...',
        '수익 모델 분석 내용...',
        '로열티 마진 분석 내용...',
        '신규 사업 기회 분석 내용...',
        '경쟁사 대응 전략 분석 내용...',
        '시장분석리포트_' || i,
        CASE (random())::INTEGER WHEN 0 THEN 'market' ELSE 'business' END,
        report_date + (random() * INTERVAL '24 hours')
      );
    END LOOP;
  END LOOP;
END $$;

-- 7. 사용 비용 추적 데이터 생성
DO $$
DECLARE
  user_record RECORD;
  cost_date DATE;
  i INTEGER;
  service_types TEXT[] := ARRAY['search', 'report_generation', 'patent_analysis', 'document_download'];
BEGIN
  FOR user_record IN SELECT id, total_usage_cost FROM users WHERE role = 'user' AND total_usage_cost > 0 LOOP
    FOR i IN 1..(random() * 15 + 5)::INTEGER LOOP
      cost_date := CURRENT_DATE - (random() * 30)::INTEGER;
      
      INSERT INTO usage_cost_tracking (
        user_id, service_type, cost_amount, currency,
        billing_unit, quantity, created_at
      ) VALUES (
        user_record.id,
        service_types[(random() * array_length(service_types, 1))::INTEGER + 1],
        random() * 10000 + 1000,
        'KRW',
        'per_request',
        1,
        cost_date + (random() * INTERVAL '24 hours')
      );
    END LOOP;
  END LOOP;
END $$;

-- 8. 빌링 이벤트 데이터 생성 (프리미엄 사용자용)
DO $$
DECLARE
  user_record RECORD;
  billing_date DATE;
  i INTEGER;
BEGIN
  FOR user_record IN SELECT id FROM users WHERE subscription_plan = 'premium' LOOP
    FOR i IN 1..3 LOOP
      billing_date := CURRENT_DATE - (random() * 90)::INTEGER;
      
      INSERT INTO billing_events (
        user_id, event_type, subscription_tier, amount, currency,
        payment_method, event_data, created_at
      ) VALUES (
        user_record.id,
        'subscription_payment',
        'premium',
        29900,
        'KRW',
        'card',
        jsonb_build_object(
          'payment_success', true,
          'transaction_id', 'txn_' || gen_random_uuid()
        ),
        billing_date + (random() * INTERVAL '24 hours')
      );
    END LOOP;
  END LOOP;
END $$;

-- 9. 검색 키워드 분석 데이터 생성
DO $$
DECLARE
  user_record RECORD;
  keyword_date DATE;
  i INTEGER;
  keywords TEXT[] := ARRAY['인공지능', '자율주행', '배터리', '반도체', '5G통신', '블록체인', 'IoT', '로봇', '바이오', '신재생에너지'];
  tech_fields TEXT[] := ARRAY['전자/통신', '기계/자동차', '화학/소재', '바이오/의료', '에너지/환경'];
  ipc_classes TEXT[] := ARRAY['G06F', 'H04L', 'H01M', 'B60W', 'C07D'];
BEGIN
  FOR user_record IN SELECT id FROM users WHERE role = 'user' LOOP
    FOR i IN 1..(random() * 10 + 3)::INTEGER LOOP
      keyword_date := CURRENT_DATE - (random() * 30)::INTEGER;
      
      INSERT INTO search_keyword_analytics (
        user_id, keyword, technology_field, ipc_main_class,
        search_count, analytics_date, created_at
      ) VALUES (
        user_record.id,
        keywords[(random() * array_length(keywords, 1))::INTEGER + 1],
        tech_fields[(random() * array_length(tech_fields, 1))::INTEGER + 1],
        ipc_classes[(random() * array_length(ipc_classes, 1))::INTEGER + 1],
        (random() * 10 + 1)::INTEGER,
        keyword_date,
        keyword_date + (random() * INTERVAL '24 hours')
      );
    END LOOP;
  END LOOP;
END $$;

-- 10. 시스템 메트릭 데이터 생성
INSERT INTO system_metrics (metric_type, metric_name, value, unit, recorded_at) VALUES
('performance', 'avg_search_time', 2.5, 'seconds', NOW()),
('performance', 'avg_report_generation_time', 15.3, 'seconds', NOW()),
('system', 'total_api_calls', 15420, 'count', NOW()),
('system', 'error_rate', 0.02, 'percentage', NOW()),
('business', 'monthly_revenue', 2500000, 'KRW', NOW()),
('business', 'conversion_rate', 0.15, 'percentage', NOW());

-- 완료 메시지
SELECT 'DB 데이터 초기화 및 테스트 데이터 생성이 완료되었습니다.' AS status;