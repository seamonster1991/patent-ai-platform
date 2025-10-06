-- 테스트 사용자 데이터 생성 및 기존 데이터 확인
-- 이 스크립트는 대시보드 통계를 위한 실제 테스트 데이터를 생성합니다

-- 1. 기존 사용자 확인
DO $$
DECLARE
    test_user_id UUID;
    existing_user_count INTEGER;
BEGIN
    -- 기존 사용자 수 확인
    SELECT COUNT(*) INTO existing_user_count FROM users;
    RAISE NOTICE '기존 사용자 수: %', existing_user_count;
    
    -- 테스트 사용자 ID 설정 (고정 UUID 사용)
    test_user_id := '550e8400-e29b-41d4-a716-446655440000';
    
    -- 기존 테스트 데이터 삭제
    DELETE FROM usage_cost_tracking WHERE user_id = test_user_id;
    DELETE FROM user_login_logs WHERE user_id = test_user_id;
    DELETE FROM user_activities WHERE user_id = test_user_id;
    DELETE FROM ai_analysis_reports WHERE user_id = test_user_id;
    DELETE FROM patent_detail_views WHERE user_id = test_user_id;
    DELETE FROM search_history WHERE user_id = test_user_id;
    DELETE FROM users WHERE id = test_user_id;
    
    -- 테스트 사용자 생성
    INSERT INTO users (
        id, 
        email, 
        name, 
        subscription_plan, 
        usage_count, 
        total_searches, 
        total_detail_views, 
        total_logins, 
        total_usage_cost,
        created_at,
        updated_at,
        last_login_at
    ) VALUES (
        test_user_id,
        'test@example.com',
        '테스트 사용자',
        'premium',
        150,
        45,
        89,
        12,
        25000.50,
        NOW() - INTERVAL '30 days',
        NOW(),
        NOW() - INTERVAL '1 day'
    );
    
    RAISE NOTICE '테스트 사용자 생성 완료: %', test_user_id;
    
    -- 2. 검색 기록 데이터 생성 (최근 100일간)
    INSERT INTO search_history (
        id,
        user_id,
        keyword,
        applicant,
        application_date_from,
        application_date_to,
        search_results,
        created_at,
        results_count,
        search_filters,
        search_duration_ms,
        ipc_codes,
        technology_field
    )
    SELECT 
        gen_random_uuid(),
        test_user_id,
        CASE (random() * 10)::int
            WHEN 0 THEN '인공지능'
            WHEN 1 THEN '머신러닝'
            WHEN 2 THEN '딥러닝'
            WHEN 3 THEN '자율주행'
            WHEN 4 THEN '블록체인'
            WHEN 5 THEN '사물인터넷'
            WHEN 6 THEN '5G 통신'
            WHEN 7 THEN '양자컴퓨팅'
            WHEN 8 THEN '바이오기술'
            ELSE '신재생에너지'
        END,
        CASE (random() * 5)::int
            WHEN 0 THEN '삼성전자'
            WHEN 1 THEN 'LG전자'
            WHEN 2 THEN 'SK하이닉스'
            WHEN 3 THEN '현대자동차'
            ELSE NULL
        END,
        (NOW() - INTERVAL '100 days') + (random() * INTERVAL '100 days'),
        NOW(),
        '[]'::jsonb,
        (NOW() - INTERVAL '100 days') + (random() * INTERVAL '100 days'),
        (random() * 50 + 10)::int,
        '{}'::jsonb,
        (random() * 5000 + 1000)::int,
        ARRAY['G06F', 'H04L', 'G06N'],
        CASE (random() * 5)::int
            WHEN 0 THEN 'IT/소프트웨어'
            WHEN 1 THEN '통신/네트워크'
            WHEN 2 THEN '자동차/운송'
            WHEN 3 THEN '바이오/의료'
            ELSE '에너지/환경'
        END
    FROM generate_series(1, 45)
    ON CONFLICT DO NOTHING;
    
    -- 3. 특허 상세 조회 기록 생성
    INSERT INTO patent_detail_views (
        id,
        user_id,
        patent_application_number,
        patent_title,
        applicant_name,
        view_duration_ms,
        referrer_page,
        created_at
    )
    SELECT 
        gen_random_uuid(),
        test_user_id,
        '10-2023-' || LPAD((random() * 999999)::text, 6, '0'),
        CASE (random() * 8)::int
            WHEN 0 THEN '인공지능 기반 자율주행 시스템'
            WHEN 1 THEN '딥러닝을 이용한 영상 인식 방법'
            WHEN 2 THEN '블록체인 기반 보안 시스템'
            WHEN 3 THEN '5G 통신을 위한 안테나 설계'
            WHEN 4 THEN 'IoT 센서 네트워크 구성 방법'
            WHEN 5 THEN '양자 암호화 통신 시스템'
            WHEN 6 THEN '바이오 센서를 이용한 진단 장치'
            ELSE '태양광 발전 효율 개선 방법'
        END,
        CASE (random() * 5)::int
            WHEN 0 THEN '삼성전자주식회사'
            WHEN 1 THEN 'LG전자주식회사'
            WHEN 2 THEN 'SK하이닉스주식회사'
            WHEN 3 THEN '현대자동차주식회사'
            ELSE '네이버주식회사'
        END,
        (random() * 300000 + 30000)::int,
        '/search',
        (NOW() - INTERVAL '100 days') + (random() * INTERVAL '100 days')
    FROM generate_series(1, 89)
    ON CONFLICT DO NOTHING;
    
    -- 4. AI 분석 보고서 생성
    INSERT INTO ai_analysis_reports (
        id,
        application_number,
        invention_title,
        market_penetration,
        competitive_landscape,
        market_growth_drivers,
        risk_factors,
        revenue_model,
        royalty_margin,
        new_business_opportunities,
        competitor_response_strategy,
        user_id,
        generated_at,
        created_at
    )
    SELECT 
        gen_random_uuid(),
        '10-2023-' || LPAD((random() * 999999)::text, 6, '0'),
        CASE (random() * 5)::int
            WHEN 0 THEN 'AI 기반 자율주행 기술'
            WHEN 1 THEN '딥러닝 영상 처리 시스템'
            WHEN 2 THEN '블록체인 보안 플랫폼'
            WHEN 3 THEN '5G 통신 최적화 기술'
            ELSE 'IoT 스마트 센서 기술'
        END,
        '시장 침투율 분석 결과...',
        '경쟁 환경 분석 결과...',
        '시장 성장 동력 분석...',
        '위험 요소 분석...',
        '수익 모델 제안...',
        '로열티 마진 분석...',
        '신규 사업 기회...',
        '경쟁사 대응 전략...',
        test_user_id,
        (NOW() - INTERVAL '60 days') + (random() * INTERVAL '60 days'),
        (NOW() - INTERVAL '60 days') + (random() * INTERVAL '60 days')
    FROM generate_series(1, 15)
    ON CONFLICT DO NOTHING;
    
    -- 5. 사용자 활동 로그 생성 (최근 100일간)
    INSERT INTO user_activities (
        id,
        user_id,
        activity_type,
        activity_data,
        ip_address,
        user_agent,
        created_at
    )
    SELECT 
        gen_random_uuid(),
        test_user_id,
        CASE (random() * 6)::int
            WHEN 0 THEN 'login'
            WHEN 1 THEN 'search'
            WHEN 2 THEN 'view_patent'
            WHEN 3 THEN 'profile_update'
            WHEN 4 THEN 'dashboard_access'
            ELSE 'report_generate'
        END,
        '{"action": "user_activity"}'::jsonb,
        '192.168.1.' || (random() * 255)::int,
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        (NOW() - INTERVAL '100 days') + (random() * INTERVAL '100 days')
    FROM generate_series(1, 200)
    ON CONFLICT DO NOTHING;
    
    -- 6. 로그인 기록 생성
    INSERT INTO user_login_logs (
        id,
        user_id,
        login_method,
        ip_address,
        user_agent,
        login_success,
        session_duration_ms,
        created_at
    )
    SELECT 
        gen_random_uuid(),
        test_user_id,
        'email',
        '192.168.1.' || (random() * 255)::int,
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        true,
        (random() * 3600000 + 300000)::int,
        (NOW() - INTERVAL '30 days') + (random() * INTERVAL '30 days')
    FROM generate_series(1, 12)
    ON CONFLICT DO NOTHING;
    
    -- 7. 사용 비용 추적 데이터 생성
    INSERT INTO usage_cost_tracking (
        id,
        user_id,
        service_type,
        cost_amount,
        currency,
        billing_unit,
        quantity,
        metadata,
        created_at
    )
    SELECT 
        gen_random_uuid(),
        test_user_id,
        CASE (random() * 3)::int
            WHEN 0 THEN 'search_api'
            WHEN 1 THEN 'ai_analysis'
            ELSE 'document_download'
        END,
        (random() * 5000 + 100)::numeric,
        'KRW',
        CASE (random() * 3)::int
            WHEN 0 THEN 'per_search'
            WHEN 1 THEN 'per_analysis'
            ELSE 'per_download'
        END,
        (random() * 10 + 1)::int,
        '{"service": "patent_ai"}'::jsonb,
        (NOW() - INTERVAL '30 days') + (random() * INTERVAL '30 days')
    FROM generate_series(1, 25)
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE '테스트 데이터 생성 완료!';
    RAISE NOTICE '테스트 사용자 ID: %', test_user_id;
    
END $$;

-- 생성된 데이터 확인
SELECT 
    'users' as table_name,
    COUNT(*) as record_count
FROM users
WHERE id = '550e8400-e29b-41d4-a716-446655440000'

UNION ALL

SELECT 
    'search_history' as table_name,
    COUNT(*) as record_count
FROM search_history
WHERE user_id = '550e8400-e29b-41d4-a716-446655440000'

UNION ALL

SELECT 
    'patent_detail_views' as table_name,
    COUNT(*) as record_count
FROM patent_detail_views
WHERE user_id = '550e8400-e29b-41d4-a716-446655440000'

UNION ALL

SELECT 
    'ai_analysis_reports' as table_name,
    COUNT(*) as record_count
FROM ai_analysis_reports
WHERE user_id = '550e8400-e29b-41d4-a716-446655440000'

UNION ALL

SELECT 
    'user_activities' as table_name,
    COUNT(*) as record_count
FROM user_activities
WHERE user_id = '550e8400-e29b-41d4-a716-446655440000'

UNION ALL

SELECT 
    'user_login_logs' as table_name,
    COUNT(*) as record_count
FROM user_login_logs
WHERE user_id = '550e8400-e29b-41d4-a716-446655440000'

UNION ALL

SELECT 
    'usage_cost_tracking' as table_name,
    COUNT(*) as record_count
FROM usage_cost_tracking
WHERE user_id = '550e8400-e29b-41d4-a716-446655440000';