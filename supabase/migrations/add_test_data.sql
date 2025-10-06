-- 테스트 사용자 데이터 추가
INSERT INTO users (id, email, name, created_at, updated_at) 
VALUES ('550e8400-e29b-41d4-a716-446655440000', 'testuser@example.com', '테스트 사용자', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  updated_at = NOW();

-- 검색 기록 테스트 데이터 추가
INSERT INTO search_history (id, user_id, keyword, results_count, created_at) VALUES
('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', '인공지능', 150, NOW() - INTERVAL '1 day'),
('550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', '머신러닝', 89, NOW() - INTERVAL '2 days'),
('550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440000', '딥러닝', 234, NOW() - INTERVAL '3 days'),
('550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440000', '자율주행', 67, NOW() - INTERVAL '4 days'),
('550e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440000', '블록체인', 123, NOW() - INTERVAL '5 days')
ON CONFLICT (id) DO NOTHING;

-- AI 분석 리포트 테스트 데이터 추가
INSERT INTO ai_analysis_reports (id, user_id, application_number, invention_title, market_penetration, created_at) VALUES
('550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440000', '1020230001234', 'AI 기술 분석 리포트', '인공지능 관련 특허 분석 내용', NOW() - INTERVAL '1 day'),
('550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440000', '1020230005678', '머신러닝 요약 리포트', '머신러닝 특허 요약 내용', NOW() - INTERVAL '2 days'),
('550e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440000', '1020230009876', '딥러닝 분석 리포트', '딥러닝 기술 분석 내용', NOW() - INTERVAL '3 days')
ON CONFLICT (id) DO NOTHING;

-- 특허 상세 조회 기록 테스트 데이터 추가
INSERT INTO patent_detail_views (id, user_id, patent_application_number, patent_title, created_at) VALUES
('550e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440000', '1020230001234', 'AI 기술 특허', NOW() - INTERVAL '1 day'),
('550e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440000', '1020230005678', '머신러닝 특허', NOW() - INTERVAL '2 days'),
('550e8400-e29b-41d4-a716-446655440022', '550e8400-e29b-41d4-a716-446655440000', '1020230009876', '딥러닝 특허', NOW() - INTERVAL '3 days'),
('550e8400-e29b-41d4-a716-446655440023', '550e8400-e29b-41d4-a716-446655440000', '1020230011111', '자율주행 특허', NOW() - INTERVAL '4 days'),
('550e8400-e29b-41d4-a716-446655440024', '550e8400-e29b-41d4-a716-446655440000', '1020230022222', '블록체인 특허', NOW() - INTERVAL '5 days'),
('550e8400-e29b-41d4-a716-446655440025', '550e8400-e29b-41d4-a716-446655440000', '1020230033333', 'IoT 특허', NOW() - INTERVAL '6 days')
ON CONFLICT (id) DO NOTHING;

-- 사용자 로그인 기록 테스트 데이터 추가
INSERT INTO user_login_logs (id, user_id, created_at) VALUES
('550e8400-e29b-41d4-a716-446655440030', '550e8400-e29b-41d4-a716-446655440000', NOW() - INTERVAL '1 day'),
('550e8400-e29b-41d4-a716-446655440031', '550e8400-e29b-41d4-a716-446655440000', NOW() - INTERVAL '2 days'),
('550e8400-e29b-41d4-a716-446655440032', '550e8400-e29b-41d4-a716-446655440000', NOW() - INTERVAL '3 days'),
('550e8400-e29b-41d4-a716-446655440033', '550e8400-e29b-41d4-a716-446655440000', NOW() - INTERVAL '5 days'),
('550e8400-e29b-41d4-a716-446655440034', '550e8400-e29b-41d4-a716-446655440000', NOW() - INTERVAL '7 days')
ON CONFLICT (id) DO NOTHING;

-- 사용량 비용 추적 테스트 데이터 추가
INSERT INTO usage_cost_tracking (id, user_id, service_type, cost, usage_date, created_at) VALUES
('550e8400-e29b-41d4-a716-446655440040', '550e8400-e29b-41d4-a716-446655440000', 'search', 1.50, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
('550e8400-e29b-41d4-a716-446655440041', '550e8400-e29b-41d4-a716-446655440000', 'ai_analysis', 5.00, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
('550e8400-e29b-41d4-a716-446655440042', '550e8400-e29b-41d4-a716-446655440000', 'search', 2.30, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),
('550e8400-e29b-41d4-a716-446655440043', '550e8400-e29b-41d4-a716-446655440000', 'ai_analysis', 3.75, NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days'),
('550e8400-e29b-41d4-a716-446655440044', '550e8400-e29b-41d4-a716-446655440000', 'search', 0.80, NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days')
ON CONFLICT (id) DO NOTHING;