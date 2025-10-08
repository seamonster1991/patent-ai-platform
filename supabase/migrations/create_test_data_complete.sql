-- 완전한 테스트 데이터 생성
-- 관리자 및 일반 사용자 계정과 샘플 활동 데이터 생성

-- 1. 관리자 계정 생성
INSERT INTO users (
    id,
    email,
    name,
    role,
    subscription_plan,
    company,
    phone,
    bio,
    total_searches,
    total_detail_views,
    total_logins,
    total_usage_cost,
    total_reports,
    last_login_at,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'admin@patent-ai.com',
    '관리자',
    'admin',
    'premium',
    'Patent AI Corp',
    '010-1234-5678',
    '시스템 관리자입니다.',
    150,
    300,
    45,
    125000.00,
    25,
    NOW() - INTERVAL '1 hour',
    NOW() - INTERVAL '30 days',
    NOW()
);

-- 2. 일반 사용자 계정들 생성
INSERT INTO users (
    id,
    email,
    name,
    role,
    subscription_plan,
    company,
    phone,
    bio,
    total_searches,
    total_detail_views,
    total_logins,
    total_usage_cost,
    total_reports,
    last_login_at,
    created_at,
    updated_at
) VALUES 
(
    gen_random_uuid(),
    'user@patent-ai.com',
    '김특허',
    'user',
    'premium',
    '삼성전자',
    '010-2345-6789',
    '특허 분석 전문가입니다.',
    85,
    170,
    28,
    75000.00,
    15,
    NOW() - INTERVAL '2 hours',
    NOW() - INTERVAL '15 days',
    NOW()
),
(
    gen_random_uuid(),
    'researcher@patent-ai.com',
    '이연구',
    'user',
    'free',
    'LG전자',
    '010-3456-7890',
    'R&D 연구원입니다.',
    42,
    84,
    15,
    25000.00,
    8,
    NOW() - INTERVAL '3 hours',
    NOW() - INTERVAL '7 days',
    NOW()
),
(
    gen_random_uuid(),
    'analyst@patent-ai.com',
    '박분석',
    'user',
    'premium',
    '현대자동차',
    '010-4567-8901',
    '특허 분석가입니다.',
    120,
    240,
    35,
    95000.00,
    20,
    NOW() - INTERVAL '30 minutes',
    NOW() - INTERVAL '20 days',
    NOW()
);

-- 3. 사용자 활동 데이터 생성
-- 관리자 활동
INSERT INTO user_activities (
    user_id,
    activity_type,
    activity_data,
    ip_address,
    user_agent,
    created_at
)
SELECT 
    u.id,
    activities.activity_type,
    activities.activity_data::jsonb,
    '192.168.1.100'::inet,
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    activities.created_at
FROM users u,
(VALUES
    ('login', '{"method": "email", "success": true}', NOW() - INTERVAL '1 hour'),
    ('dashboard_access', '{"page": "admin_home"}', NOW() - INTERVAL '55 minutes'),
    ('dashboard_access', '{"page": "admin_users"}', NOW() - INTERVAL '50 minutes'),
    ('dashboard_access', '{"page": "admin_statistics"}', NOW() - INTERVAL '45 minutes')
) AS activities(activity_type, activity_data, created_at)
WHERE u.email = 'admin@patent-ai.com';

-- 일반 사용자들 활동
INSERT INTO user_activities (
    user_id,
    activity_type,
    activity_data,
    ip_address,
    user_agent,
    created_at
)
SELECT 
    u.id,
    activities.activity_type,
    activities.activity_data::jsonb,
    '192.168.1.101'::inet,
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    activities.created_at
FROM users u,
(VALUES
    ('login', '{"method": "email", "success": true}', NOW() - INTERVAL '2 hours'),
    ('search', '{"keyword": "인공지능", "results": 45}', NOW() - INTERVAL '1 hour 50 minutes'),
    ('patent_view', '{"patent_id": "10-2023-0001234", "view_duration": 120}', NOW() - INTERVAL '1 hour 30 minutes'),
    ('ai_analysis', '{"analysis_type": "competitor", "cost": 0.05}', NOW() - INTERVAL '1 hour'),
    ('report_generation', '{"report_type": "trend_analysis", "cost": 0.10}', NOW() - INTERVAL '30 minutes')
) AS activities(activity_type, activity_data, created_at)
WHERE u.email IN ('user@patent-ai.com', 'analyst@patent-ai.com', 'researcher@patent-ai.com');

-- 4. 검색 기록 생성
INSERT INTO search_history (
    user_id,
    keyword,
    applicant,
    application_date_from,
    application_date_to,
    search_results,
    results_count,
    search_filters,
    search_duration_ms,
    ipc_codes,
    technology_field,
    field_confidence,
    created_at
)
SELECT 
    u.id,
    searches.keyword,
    searches.applicant,
    searches.application_date_from,
    searches.application_date_to,
    searches.search_results,
    searches.results_count,
    searches.search_filters,
    searches.search_duration_ms,
    searches.ipc_codes,
    searches.technology_field,
    searches.field_confidence,
    searches.created_at
FROM users u,
(VALUES
    ('인공지능', '삼성전자', '2023-01-01'::date, '2023-12-31'::date, '{"patents": [{"id": "10-2023-0001234", "title": "AI 기반 특허 분석 시스템"}]}'::jsonb, 45, '{"ipc": ["G06F"], "status": "등록"}'::jsonb, 1250, ARRAY['G06F15/18'], '인공지능/머신러닝', 0.95, NOW() - INTERVAL '1 hour 50 minutes'),
    ('자율주행', '현대자동차', '2022-01-01'::date, '2023-12-31'::date, '{"patents": [{"id": "10-2023-0005678", "title": "자율주행 제어 시스템"}]}'::jsonb, 32, '{"ipc": ["B60W"], "status": "공개"}'::jsonb, 980, ARRAY['B60W30/18'], '자동차/운송', 0.88, NOW() - INTERVAL '3 hours'),
    ('배터리', 'LG에너지솔루션', '2023-01-01'::date, '2023-12-31'::date, '{"patents": [{"id": "10-2023-0009012", "title": "리튬이온 배터리 관리 시스템"}]}'::jsonb, 67, '{"ipc": ["H01M"], "status": "등록"}'::jsonb, 1450, ARRAY['H01M10/48'], '에너지/배터리', 0.92, NOW() - INTERVAL '5 hours')
) AS searches(keyword, applicant, application_date_from, application_date_to, search_results, results_count, search_filters, search_duration_ms, ipc_codes, technology_field, field_confidence, created_at)
WHERE u.email IN ('user@patent-ai.com', 'analyst@patent-ai.com', 'researcher@patent-ai.com');

-- 5. AI 분석 리포트 생성
INSERT INTO ai_analysis_reports (
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
    report_name,
    analysis_type,
    created_at
)
SELECT 
    reports.application_number,
    reports.invention_title,
    reports.market_penetration,
    reports.competitive_landscape,
    reports.market_growth_drivers,
    reports.risk_factors,
    reports.revenue_model,
    reports.royalty_margin,
    reports.new_business_opportunities,
    reports.competitor_response_strategy,
    u.id,
    reports.report_name,
    reports.analysis_type,
    reports.created_at
FROM users u,
(VALUES
    ('10-2023-0001234', 'AI 기반 특허 분석 시스템', '시장 침투율이 높으며...', '경쟁사 분석 결과...', '시장 성장 동력...', '위험 요소 분석...', '수익 모델 제안...', '로열티 마진 분석...', '신규 사업 기회...', '경쟁사 대응 전략...', 'AI 특허 분석 리포트', 'market', NOW() - INTERVAL '1 hour 30 minutes'),
    ('10-2023-0005678', '자율주행 제어 시스템', '자율주행 시장에서...', '글로벌 자동차 업체들...', '자율주행 기술 발전...', '규제 리스크 존재...', '라이선싱 모델...', '높은 로열티 기대...', '모빌리티 서비스...', '특허 포트폴리오 강화...', '자율주행 기술 분석', 'business', NOW() - INTERVAL '3 hours'),
    ('10-2023-0009012', '리튬이온 배터리 관리 시스템', '전기차 시장 확대로...', '배터리 업체 간 경쟁...', 'ESG 정책 확산...', '원자재 가격 변동...', '기술 라이선싱...', '중간 수준 마진...', '에너지 저장 시스템...', '차별화된 기술 개발...', '배터리 기술 분석', 'market', NOW() - INTERVAL '5 hours')
) AS reports(application_number, invention_title, market_penetration, competitive_landscape, market_growth_drivers, risk_factors, revenue_model, royalty_margin, new_business_opportunities, competitor_response_strategy, report_name, analysis_type, created_at)
WHERE u.email IN ('user@patent-ai.com', 'analyst@patent-ai.com');

-- 완료 메시지
SELECT 'Test data creation completed successfully' as status;