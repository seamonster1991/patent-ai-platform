-- 현재 사용자 데이터 확인 (수정됨 - 올바른 컬럼명 사용)
-- 사용자 정보 확인
SELECT 
  'users' as table_name,
  id,
  email,
  created_at
FROM users 
WHERE email = 'seongwankim@gmail.com';

-- 검색 기록 확인
SELECT 
  'search_history' as table_name,
  COUNT(*) as total_count,
  MAX(sh.created_at) as latest_search
FROM search_history sh
JOIN users u ON sh.user_id = u.id
WHERE u.email = 'seongwankim@gmail.com';

-- AI 리포트 확인
SELECT 
  'ai_analysis_reports' as table_name,
  COUNT(*) as total_count,
  MAX(ar.created_at) as latest_report
FROM ai_analysis_reports ar
JOIN users u ON ar.user_id = u.id
WHERE u.email = 'seongwankim@gmail.com';

-- 사용자 활동 확인
SELECT 
  'user_activities' as table_name,
  activity_type,
  COUNT(*) as count
FROM user_activities ua
JOIN users u ON ua.user_id = u.id
WHERE u.email = 'seongwankim@gmail.com'
GROUP BY activity_type;

-- 최근 검색 기록 (상세)
SELECT 
  'recent_searches' as table_name,
  keyword,
  sh.created_at
FROM search_history sh
JOIN users u ON sh.user_id = u.id
WHERE u.email = 'seongwankim@gmail.com'
ORDER BY sh.created_at DESC
LIMIT 5;

-- 최근 리포트 (상세)
SELECT 
  'recent_reports' as table_name,
  application_number,
  invention_title,
  ar.created_at
FROM ai_analysis_reports ar
JOIN users u ON ar.user_id = u.id
WHERE u.email = 'seongwankim@gmail.com'
ORDER BY ar.created_at DESC
LIMIT 5;