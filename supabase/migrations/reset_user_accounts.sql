-- 기존 사용자 데이터 정리
DELETE FROM users WHERE email IN ('seongwankim@gmail.com', 'admin@p-ai.co.kr');

-- 일반 사용자 계정 생성 (seongwankim@gmail.com)
INSERT INTO users (
  id, email, name, role, subscription_plan, 
  company, phone, bio,
  total_searches, total_detail_views, total_logins, total_reports, total_usage_cost,
  last_login_at, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'seongwankim@gmail.com',
  '김성완',
  'user',
  'premium',
  'Patent Research Co.',
  '010-1234-5678',
  '특허 연구원입니다.',
  45, 120, 25, 8, 85000.00,
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '15 days',
  NOW()
);

-- 관리자 계정 생성 (admin@p-ai.co.kr)
INSERT INTO users (
  id, email, name, role, subscription_plan, 
  company, phone, bio,
  total_searches, total_detail_views, total_logins, total_reports, total_usage_cost,
  last_login_at, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'admin@p-ai.co.kr',
  '시스템 관리자',
  'admin',
  'premium',
  'Patent AI',
  '010-9876-5432',
  '시스템 관리자입니다.',
  150, 350, 80, 35, 450000.00,
  NOW(),
  NOW() - INTERVAL '60 days',
  NOW()
);

-- 기본 시스템 메트릭 데이터 생성
DELETE FROM system_metrics WHERE recorded_at::date = NOW()::date;

INSERT INTO system_metrics (metric_type, metric_name, value, unit, recorded_at) VALUES
('performance', 'avg_search_time', 2.5, 'seconds', NOW()),
('performance', 'avg_report_generation_time', 15.3, 'seconds', NOW()),
('system', 'total_api_calls', 15420, 'count', NOW()),
('system', 'error_rate', 0.02, 'percentage', NOW()),
('business', 'monthly_revenue', 2500000, 'KRW', NOW()),
('business', 'conversion_rate', 0.15, 'percentage', NOW()),
('business', 'active_users', 1250, 'count', NOW()),
('business', 'premium_users', 180, 'count', NOW());

SELECT '사용자 계정 재설정 및 기본 데이터 생성 완료' AS status;