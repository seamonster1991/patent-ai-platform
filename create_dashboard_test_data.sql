-- seongwankim@gmail.com 사용자를 위한 대시보드 테스트 데이터 생성

-- 1. 사용자 기본 통계 업데이트
UPDATE users 
SET 
  total_searches = 25,
  total_detail_views = 15,
  total_logins = 12,
  total_usage_cost = 150.50,
  last_login_at = NOW()
WHERE email = 'seongwankim@gmail.com';

-- 2. 검색 기록 데이터 생성 (keyword 컬럼 사용)
INSERT INTO search_history (user_id, keyword, results_count, technology_field, created_at)
SELECT 
  u.id,
  queries.keyword,
  queries.results_count,
  queries.technology_field,
  NOW() - INTERVAL '1 day' * queries.days_ago
FROM users u,
(VALUES 
  ('인공지능', 45, 'AI/ML', 1),
  ('블록체인', 32, '블록체인', 2),
  ('IoT 센서', 28, 'IoT', 3),
  ('자율주행', 55, '자동차', 4),
  ('5G 통신', 38, '통신', 5),
  ('배터리 기술', 42, '에너지', 7),
  ('반도체', 67, '반도체', 10),
  ('로봇공학', 29, '로봇', 12),
  ('바이오', 33, '바이오', 15),
  ('VR/AR', 24, 'VR/AR', 18)
) AS queries(keyword, results_count, technology_field, days_ago)
WHERE u.email = 'seongwankim@gmail.com';

-- 3. AI 분석 보고서 데이터 생성 (올바른 컬럼명 사용)
INSERT INTO ai_analysis_reports (user_id, report_name, invention_title, application_number, analysis_type, created_at)
SELECT 
  u.id,
  reports.report_name,
  reports.invention_title,
  reports.application_number,
  'market',
  NOW() - INTERVAL '1 day' * reports.days_ago
FROM users u,
(VALUES 
  ('AI 기반 음성인식 기술 분석', '음성인식 시스템 및 방법', '1020230115700', 2),
  ('블록체인 보안 기술 분석', '블록체인 기반 보안 시스템', '1020230098765', 5),
  ('IoT 센서 네트워크 분석', 'IoT 센서 통신 방법', '1020230087654', 8),
  ('자율주행 알고리즘 분석', '자율주행 제어 시스템', '1020230076543', 12),
  ('5G 통신 프로토콜 분석', '5G 네트워크 최적화 방법', '1020230065432', 15)
) AS reports(report_name, invention_title, application_number, days_ago)
WHERE u.email = 'seongwankim@gmail.com';

-- 4. 사용자 활동 데이터 생성 (최근 30일)
INSERT INTO user_activities (user_id, activity_type, activity_data, created_at)
SELECT 
  u.id,
  activities.activity_type,
  activities.activity_data::jsonb,
  NOW() - INTERVAL '1 day' * activities.days_ago
FROM users u,
(VALUES 
  ('search', '{"keyword": "인공지능", "results": 45}', 1),
  ('view_patent', '{"patent_number": "1020230115700"}', 1),
  ('search', '{"keyword": "블록체인", "results": 32}', 2),
  ('report_generate', '{"patent_number": "1020230115700", "type": "기술분석"}', 2),
  ('search', '{"keyword": "IoT", "results": 28}', 3),
  ('view_patent', '{"patent_number": "1020230098765"}', 3),
  ('search', '{"keyword": "자율주행", "results": 55}', 4),
  ('login', '{}', 4),
  ('search', '{"keyword": "5G", "results": 38}', 5),
  ('report_generate', '{"patent_number": "1020230098765", "type": "시장분석"}', 5),
  ('search', '{"keyword": "배터리", "results": 42}', 7),
  ('view_patent', '{"patent_number": "1020230087654"}', 7),
  ('login', '{}', 8),
  ('search', '{"keyword": "반도체", "results": 67}', 10),
  ('report_generate', '{"patent_number": "1020230087654", "type": "기술분석"}', 10),
  ('search', '{"keyword": "로봇", "results": 29}', 12),
  ('view_patent', '{"patent_number": "1020230076543"}', 12),
  ('login', '{}', 15),
  ('search', '{"keyword": "바이오", "results": 33}', 15),
  ('report_generate', '{"patent_number": "1020230076543", "type": "특허분석"}', 15),
  ('search', '{"keyword": "VR", "results": 24}', 18),
  ('view_patent', '{"patent_number": "1020230065432"}', 18),
  ('login', '{}', 20),
  ('report_generate', '{"patent_number": "1020230065432", "type": "기술분석"}', 20)
) AS activities(activity_type, activity_data, days_ago)
WHERE u.email = 'seongwankim@gmail.com';

-- 5. 확인 쿼리
SELECT 
  'User Stats' as table_name,
  total_searches,
  total_detail_views,
  total_logins,
  total_usage_cost
FROM users 
WHERE email = 'seongwankim@gmail.com';

SELECT 
  'Search History' as table_name,
  COUNT(*) as count
FROM search_history sh
JOIN users u ON sh.user_id = u.id
WHERE u.email = 'seongwankim@gmail.com';

SELECT 
  'AI Reports' as table_name,
  COUNT(*) as count
FROM ai_analysis_reports ar
JOIN users u ON ar.user_id = u.id
WHERE u.email = 'seongwankim@gmail.com';

SELECT 
  'User Activities' as table_name,
  COUNT(*) as count
FROM user_activities ua
JOIN users u ON ua.user_id = u.id
WHERE u.email = 'seongwankim@gmail.com';