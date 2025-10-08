-- 대시보드 테스트를 위한 샘플 데이터 추가
-- 현재 사용자 ID: 276975db-635b-4c77-87a0-548f91b14231

-- 1. 검색 기록 샘플 데이터
INSERT INTO search_history (user_id, keyword, technology_field, results_count, created_at) VALUES
('276975db-635b-4c77-87a0-548f91b14231', '인공지능', 'AI/ML', 25, NOW() - INTERVAL '1 day'),
('276975db-635b-4c77-87a0-548f91b14231', '블록체인', '블록체인', 18, NOW() - INTERVAL '2 days'),
('276975db-635b-4c77-87a0-548f91b14231', '자율주행', '자동차', 32, NOW() - INTERVAL '3 days'),
('276975db-635b-4c77-87a0-548f91b14231', '5G 통신', '통신', 15, NOW() - INTERVAL '5 days'),
('276975db-635b-4c77-87a0-548f91b14231', 'IoT 센서', 'IoT', 22, NOW() - INTERVAL '7 days');

-- 2. 사용자 활동 샘플 데이터
INSERT INTO user_activities (user_id, activity_type, activity_data, created_at) VALUES
('276975db-635b-4c77-87a0-548f91b14231', 'login', '{"ip": "192.168.1.1"}', NOW() - INTERVAL '1 hour'),
('276975db-635b-4c77-87a0-548f91b14231', 'search', '{"keyword": "인공지능", "results": 25}', NOW() - INTERVAL '1 day'),
('276975db-635b-4c77-87a0-548f91b14231', 'view_patent', '{"patent_id": "10-2023-0001234"}', NOW() - INTERVAL '1 day'),
('276975db-635b-4c77-87a0-548f91b14231', 'ai_analysis', '{"report_type": "market"}', NOW() - INTERVAL '2 days'),
('276975db-635b-4c77-87a0-548f91b14231', 'dashboard_access', '{}', NOW() - INTERVAL '3 days'),
('276975db-635b-4c77-87a0-548f91b14231', 'search', '{"keyword": "블록체인", "results": 18}', NOW() - INTERVAL '2 days'),
('276975db-635b-4c77-87a0-548f91b14231', 'login', '{"ip": "192.168.1.1"}', NOW() - INTERVAL '2 days'),
('276975db-635b-4c77-87a0-548f91b14231', 'search', '{"keyword": "자율주행", "results": 32}', NOW() - INTERVAL '3 days'),
('276975db-635b-4c77-87a0-548f91b14231', 'login', '{"ip": "192.168.1.1"}', NOW() - INTERVAL '3 days'),
('276975db-635b-4c77-87a0-548f91b14231', 'view_patent', '{"patent_id": "10-2023-0005678"}', NOW() - INTERVAL '4 days');

-- 3. AI 분석 리포트 샘플 데이터
INSERT INTO ai_analysis_reports (user_id, application_number, invention_title, report_name, analysis_type, created_at) VALUES
('276975db-635b-4c77-87a0-548f91b14231', '10-2023-0001234', '인공지능 기반 음성 인식 시스템', 'AI 음성인식 시장 분석', 'market', NOW() - INTERVAL '2 days'),
('276975db-635b-4c77-87a0-548f91b14231', '10-2023-0005678', '블록체인 기반 결제 시스템', '블록체인 결제 기술 분석', 'technology', NOW() - INTERVAL '5 days'),
('276975db-635b-4c77-87a0-548f91b14231', '10-2023-0009012', '자율주행 차량 제어 시스템', '자율주행 특허 분석', 'patent', NOW() - INTERVAL '7 days');

-- 4. 특허 상세 조회 샘플 데이터
INSERT INTO patent_detail_views (user_id, patent_application_number, patent_title, applicant_name, view_duration_ms, created_at) VALUES
('276975db-635b-4c77-87a0-548f91b14231', '10-2023-0001234', '인공지능 기반 음성 인식 시스템', '삼성전자', 45000, NOW() - INTERVAL '1 day'),
('276975db-635b-4c77-87a0-548f91b14231', '10-2023-0005678', '블록체인 기반 결제 시스템', 'LG전자', 32000, NOW() - INTERVAL '2 days'),
('276975db-635b-4c77-87a0-548f91b14231', '10-2023-0009012', '자율주행 차량 제어 시스템', '현대자동차', 28000, NOW() - INTERVAL '3 days'),
('276975db-635b-4c77-87a0-548f91b14231', '10-2023-0012345', '5G 통신 안테나 시스템', 'SK텔레콤', 38000, NOW() - INTERVAL '4 days'),
('276975db-635b-4c77-87a0-548f91b14231', '10-2023-0067890', 'IoT 센서 네트워크', 'KT', 25000, NOW() - INTERVAL '5 days');

-- 5. 사용 비용 추적 샘플 데이터
INSERT INTO usage_cost_tracking (user_id, service_type, cost_amount, currency, billing_unit, quantity, created_at) VALUES
('276975db-635b-4c77-87a0-548f91b14231', 'ai_analysis', 1500.00, 'KRW', 'per_report', 1, NOW() - INTERVAL '2 days'),
('276975db-635b-4c77-87a0-548f91b14231', 'patent_search', 500.00, 'KRW', 'per_search', 5, NOW() - INTERVAL '3 days'),
('276975db-635b-4c77-87a0-548f91b14231', 'ai_analysis', 1500.00, 'KRW', 'per_report', 1, NOW() - INTERVAL '5 days'),
('276975db-635b-4c77-87a0-548f91b14231', 'patent_detail_view', 100.00, 'KRW', 'per_view', 10, NOW() - INTERVAL '7 days');