-- 실제 사용자 ID로 샘플 데이터 추가
-- 사용자 ID: 276975db-635b-4c77-87a0-548f91b14231

-- 검색 기록 샘플 데이터
INSERT INTO search_history (
    id,
    user_id,
    keyword,
    technology_field,
    results_count,
    search_filters,
    created_at
) VALUES 
    (gen_random_uuid(), '276975db-635b-4c77-87a0-548f91b14231', '인공지능', 'AI/ML', 150, '{"country": "KR", "year_range": "2020-2024"}', NOW() - INTERVAL '1 day'),
    (gen_random_uuid(), '276975db-635b-4c77-87a0-548f91b14231', '머신러닝', 'AI/ML', 89, '{"country": "US", "year_range": "2019-2024"}', NOW() - INTERVAL '2 days'),
    (gen_random_uuid(), '276975db-635b-4c77-87a0-548f91b14231', '블록체인', 'Blockchain', 67, '{"country": "KR", "year_range": "2021-2024"}', NOW() - INTERVAL '3 days'),
    (gen_random_uuid(), '276975db-635b-4c77-87a0-548f91b14231', '자율주행', 'Automotive', 234, '{"country": "ALL", "year_range": "2018-2024"}', NOW() - INTERVAL '5 days'),
    (gen_random_uuid(), '276975db-635b-4c77-87a0-548f91b14231', '5G 통신', 'Telecommunications', 178, '{"country": "KR", "year_range": "2020-2024"}', NOW() - INTERVAL '7 days');

-- 사용자 활동 샘플 데이터
INSERT INTO user_activities (
    id,
    user_id,
    activity_type,
    description,
    metadata,
    created_at
) VALUES 
    (gen_random_uuid(), '276975db-635b-4c77-87a0-548f91b14231', 'search', '인공지능 키워드로 특허 검색', '{"keyword": "인공지능", "results": 150}', NOW() - INTERVAL '1 day'),
    (gen_random_uuid(), '276975db-635b-4c77-87a0-548f91b14231', 'patent_view', '특허 상세 정보 조회', '{"patent_number": "KR102345678", "title": "딥러닝 기반 이미지 인식 시스템"}', NOW() - INTERVAL '1 day'),
    (gen_random_uuid(), '276975db-635b-4c77-87a0-548f91b14231', 'report_generation', 'AI 분석 보고서 생성', '{"report_type": "analysis", "patent_number": "KR102345678"}', NOW() - INTERVAL '2 days'),
    (gen_random_uuid(), '276975db-635b-4c77-87a0-548f91b14231', 'search', '머신러닝 키워드로 특허 검색', '{"keyword": "머신러닝", "results": 89}', NOW() - INTERVAL '2 days'),
    (gen_random_uuid(), '276975db-635b-4c77-87a0-548f91b14231', 'bookmark', '특허 북마크 추가', '{"patent_number": "US10987654", "title": "Neural Network Architecture"}', NOW() - INTERVAL '3 days'),
    (gen_random_uuid(), '276975db-635b-4c77-87a0-548f91b14231', 'login', '사용자 로그인', '{"login_method": "email", "ip": "192.168.1.100"}', NOW() - INTERVAL '1 hour'),
    (gen_random_uuid(), '276975db-635b-4c77-87a0-548f91b14231', 'page_navigation', '대시보드 페이지 방문', '{"page": "/dashboard", "referrer": "/search"}', NOW() - INTERVAL '30 minutes'),
    (gen_random_uuid(), '276975db-635b-4c77-87a0-548f91b14231', 'filter_change', '검색 필터 변경', '{"filter_type": "year_range", "value": "2020-2024"}', NOW() - INTERVAL '4 days'),
    (gen_random_uuid(), '276975db-635b-4c77-87a0-548f91b14231', 'document_download', '특허 문서 다운로드', '{"patent_number": "KR102345678", "format": "PDF"}', NOW() - INTERVAL '5 days'),
    (gen_random_uuid(), '276975db-635b-4c77-87a0-548f91b14231', 'profile_update', '프로필 정보 수정', '{"field": "company", "value": "테크 스타트업"}', NOW() - INTERVAL '10 days');

-- AI 분석 보고서 샘플 데이터
INSERT INTO ai_analysis_reports (
    id,
    user_id,
    report_name,
    analysis_type,
    patent_data,
    ai_analysis_result,
    created_at
) VALUES 
    (gen_random_uuid(), '276975db-635b-4c77-87a0-548f91b14231', '인공지능 특허 분석 보고서', 'analysis', 
     '{"patent_number": "KR102345678", "title": "딥러닝 기반 이미지 인식 시스템", "inventor": "김철수"}',
     '{"summary": "혁신적인 딥러닝 기술", "market_potential": "높음", "technical_score": 85}', 
     NOW() - INTERVAL '2 days'),
    (gen_random_uuid(), '276975db-635b-4c77-87a0-548f91b14231', '블록체인 기술 분석', 'market', 
     '{"patent_number": "US10987654", "title": "Blockchain-based Security System", "inventor": "John Smith"}',
     '{"market_size": "$2.5B", "competition_level": "중간", "commercialization_potential": "높음"}', 
     NOW() - INTERVAL '5 days'),
    (gen_random_uuid(), '276975db-635b-4c77-87a0-548f91b14231', '자율주행 특허 동향', 'trend', 
     '{"patent_number": "EP3456789", "title": "Autonomous Vehicle Navigation", "inventor": "Maria Garcia"}',
     '{"trend_direction": "상승", "key_players": ["Tesla", "Google", "Apple"], "growth_rate": "15%"}', 
     NOW() - INTERVAL '7 days');

-- 특허 상세 조회 기록 샘플 데이터
INSERT INTO patent_detail_views (
    id,
    user_id,
    patent_number,
    invention_title,
    view_duration_seconds,
    created_at
) VALUES 
    (gen_random_uuid(), '276975db-635b-4c77-87a0-548f91b14231', 'KR102345678', '딥러닝 기반 이미지 인식 시스템', 180, NOW() - INTERVAL '1 day'),
    (gen_random_uuid(), '276975db-635b-4c77-87a0-548f91b14231', 'US10987654', 'Neural Network Architecture', 240, NOW() - INTERVAL '2 days'),
    (gen_random_uuid(), '276975db-635b-4c77-87a0-548f91b14231', 'EP3456789', 'Autonomous Vehicle Navigation', 320, NOW() - INTERVAL '3 days'),
    (gen_random_uuid(), '276975db-635b-4c77-87a0-548f91b14231', 'JP2023123456', 'Quantum Computing Algorithm', 150, NOW() - INTERVAL '4 days'),
    (gen_random_uuid(), '276975db-635b-4c77-87a0-548f91b14231', 'CN114567890', '5G Communication Protocol', 200, NOW() - INTERVAL '5 days'),
    (gen_random_uuid(), '276975db-635b-4c77-87a0-548f91b14231', 'KR102234567', 'IoT 센서 네트워크', 160, NOW() - INTERVAL '6 days'),
    (gen_random_uuid(), '276975db-635b-4c77-87a0-548f91b14231', 'US11123456', 'Blockchain Security Protocol', 280, NOW() - INTERVAL '7 days');

-- 사용량 비용 추적 샘플 데이터
INSERT INTO usage_cost_tracking (
    id,
    user_id,
    service_type,
    usage_amount,
    cost_krw,
    billing_date,
    created_at
) VALUES 
    (gen_random_uuid(), '276975db-635b-4c77-87a0-548f91b14231', 'ai_analysis', 5, 25000, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
    (gen_random_uuid(), '276975db-635b-4c77-87a0-548f91b14231', 'patent_search', 50, 15000, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
    (gen_random_uuid(), '276975db-635b-4c77-87a0-548f91b14231', 'document_download', 10, 5000, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),
    (gen_random_uuid(), '276975db-635b-4c77-87a0-548f91b14231', 'ai_analysis', 3, 15000, NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),
    (gen_random_uuid(), '276975db-635b-4c77-87a0-548f91b14231', 'patent_search', 30, 9000, NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days'),
    (gen_random_uuid(), '276975db-635b-4c77-87a0-548f91b14231', 'premium_features', 1, 50000, NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days');