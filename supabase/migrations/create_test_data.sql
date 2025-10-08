-- 테스트 데이터 생성
-- 1. 테스트 사용자 생성 (이미 있다면 스킵)
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role
) VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'test@example.com',
  '$2a$10$dummy.hash.for.testing.purposes.only',
  NOW(),
  NOW(),
  NOW(),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"name": "테스트 사용자"}',
  false,
  'authenticated'
) ON CONFLICT (id) DO NOTHING;

-- 2. 사용자 활동 데이터 생성
INSERT INTO user_activities (
  user_id,
  activity_type,
  activity_data,
  created_at
) VALUES 
  ('550e8400-e29b-41d4-a716-446655440000', 'search', '{"query": "AI 특허", "results_count": 15}', NOW() - INTERVAL '1 day'),
  ('550e8400-e29b-41d4-a716-446655440000', 'search', '{"query": "반도체 기술", "results_count": 23}', NOW() - INTERVAL '2 days'),
  ('550e8400-e29b-41d4-a716-446655440000', 'search', '{"query": "배터리 특허", "results_count": 8}', NOW() - INTERVAL '3 days'),
  ('550e8400-e29b-41d4-a716-446655440000', 'report_generation', '{"report_type": "market_analysis", "patent_id": "US123456"}', NOW() - INTERVAL '1 day'),
  ('550e8400-e29b-41d4-a716-446655440000', 'report_generation', '{"report_type": "patent_analysis", "patent_id": "KR789012"}', NOW() - INTERVAL '5 days'),
  ('550e8400-e29b-41d4-a716-446655440000', 'dashboard_view', '{"page": "main"}', NOW() - INTERVAL '1 hour'),
  ('550e8400-e29b-41d4-a716-446655440000', 'login', '{}', NOW() - INTERVAL '2 hours')
ON CONFLICT DO NOTHING;

-- 3. AI 분석 리포트 데이터 생성
INSERT INTO ai_analysis_reports (
  user_id,
  application_number,
  invention_title,
  report_name,
  analysis_type,
  market_size_analysis,
  competitive_landscape,
  technology_trends,
  business_opportunities,
  investment_analysis,
  created_at
) VALUES 
  (
    '550e8400-e29b-41d4-a716-446655440000',
    'US123456',
    'AI 기반 의료진단 시스템',
    'AI 의료진단 시장분석 리포트',
    'market_analysis',
    '{"market_size": "50억 달러", "growth_rate": "15%"}',
    '{"competitors": ["Company A", "Company B"], "market_share": "25%"}',
    '{"trends": ["AI 발전", "의료 디지털화"]}',
    '{"opportunities": ["신시장 진출", "파트너십"]}',
    '{"roi": "300%", "payback_period": "2년"}',
    NOW() - INTERVAL '1 day'
  ),
  (
    '550e8400-e29b-41d4-a716-446655440000',
    'KR789012',
    '반도체 공정 최적화 기술',
    '반도체 기술 특허분석 리포트',
    'patent_analysis',
    '{"market_size": "120억 달러", "growth_rate": "8%"}',
    '{"competitors": ["Samsung", "TSMC"], "market_share": "15%"}',
    '{"trends": ["미세공정", "3D 구조"]}',
    '{"opportunities": ["차세대 공정", "AI 반도체"]}',
    '{"roi": "250%", "payback_period": "3년"}',
    NOW() - INTERVAL '5 days'
  )
ON CONFLICT DO NOTHING;
-- 1. 테스트 사용자 생성 (이미 있다면 스킵)
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role
) VALUES (
  'test-user-123',
  'test@example.com',
  '$2a$10$dummy.hash.for.testing.purposes.only',
  NOW(),
  NOW(),
  NOW(),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"name": "테스트 사용자"}',
  false,
  'authenticated'
) ON CONFLICT (id) DO NOTHING;

-- 2. 사용자 활동 데이터 생성
INSERT INTO user_activities (
  user_id,
  activity_type,
  activity_data,
  created_at
) VALUES 
  ('test-user-123', 'search', '{"query": "AI 특허", "results_count": 15}', NOW() - INTERVAL '1 day'),
  ('test-user-123', 'search', '{"query": "반도체 기술", "results_count": 23}', NOW() - INTERVAL '2 days'),
  ('test-user-123', 'search', '{"query": "배터리 특허", "results_count": 8}', NOW() - INTERVAL '3 days'),
  ('test-user-123', 'report_generation', '{"report_type": "market_analysis", "patent_id": "US123456"}', NOW() - INTERVAL '1 day'),
  ('test-user-123', 'report_generation', '{"report_type": "patent_analysis", "patent_id": "KR789012"}', NOW() - INTERVAL '5 days'),
  ('test-user-123', 'dashboard_view', '{"page": "main"}', NOW() - INTERVAL '1 hour'),
  ('test-user-123', 'login', '{}', NOW() - INTERVAL '2 hours')
ON CONFLICT DO NOTHING;

-- 3. AI 분석 리포트 데이터 생성
INSERT INTO ai_analysis_reports (
  user_id,
  application_number,
  invention_title,
  report_name,
  analysis_type,
  market_size_analysis,
  competitive_landscape,
  technology_trends,
  business_opportunities,
  investment_analysis,
  created_at
) VALUES 
  (
    'test-user-123',
    'US123456',
    'AI 기반 의료진단 시스템',
    'AI 의료진단 시장분석 리포트',
    'market_analysis',
    '{"market_size": "50억 달러", "growth_rate": "15%"}',
    '{"competitors": ["Company A", "Company B"], "market_share": "25%"}',
    '{"trends": ["AI 발전", "의료 디지털화"]}',
    '{"opportunities": ["신시장 진출", "파트너십"]}',
    '{"roi": "300%", "payback_period": "2년"}',
    NOW() - INTERVAL '1 day'
  ),
  (
    'test-user-123',
    'KR789012',
    '반도체 공정 최적화 기술',
    '반도체 기술 특허분석 리포트',
    'patent_analysis',
    '{"market_size": "120억 달러", "growth_rate": "8%"}',
    '{"competitors": ["Samsung", "TSMC"], "market_share": "15%"}',
    '{"trends": ["미세공정", "3D 구조"]}',
    '{"opportunities": ["차세대 공정", "AI 반도체"]}',
    '{"roi": "250%", "payback_period": "3년"}',
    NOW() - INTERVAL '5 days'
  )
ON CONFLICT DO NOTHING;