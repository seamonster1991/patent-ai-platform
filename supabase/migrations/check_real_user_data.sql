-- 실제 사용자 데이터 확인
-- 1. 사용자 목록 확인
SELECT 
  'users' as table_name,
  COUNT(*) as total_count,
  COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END) as recent_count
FROM auth.users;

-- 2. 실제 사용자 정보 (최근 5명)
SELECT 
  id,
  email,
  created_at,
  last_sign_in_at,
  email_confirmed_at
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 5;

-- 3. 사용자 활동 데이터 확인
SELECT 
  'user_activities' as table_name,
  COUNT(*) as total_activities,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(CASE WHEN activity_type = 'search' THEN 1 END) as search_count,
  COUNT(CASE WHEN activity_type = 'report_generation' THEN 1 END) as report_count,
  MAX(created_at) as latest_activity
FROM user_activities;

-- 4. AI 분석 리포트 확인
SELECT 
  'ai_analysis_reports' as table_name,
  COUNT(*) as total_reports,
  COUNT(DISTINCT user_id) as unique_users,
  MAX(created_at) as latest_report
FROM ai_analysis_reports;

-- 5. 최근 활동이 있는 사용자 확인
SELECT DISTINCT
  ua.user_id,
  u.email,
  COUNT(ua.id) as activity_count,
  MAX(ua.created_at) as last_activity
FROM user_activities ua
JOIN auth.users u ON ua.user_id = u.id
GROUP BY ua.user_id, u.email
ORDER BY last_activity DESC
LIMIT 5;

-- 6. 최근 리포트 생성한 사용자 확인
SELECT DISTINCT
  ar.user_id,
  u.email,
  COUNT(ar.id) as report_count,
  MAX(ar.created_at) as last_report
FROM ai_analysis_reports ar
JOIN auth.users u ON ar.user_id = u.id
GROUP BY ar.user_id, u.email
ORDER BY last_report DESC
LIMIT 5;
-- 1. 사용자 목록 확인
SELECT 
  'users' as table_name,
  COUNT(*) as total_count,
  COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END) as recent_count
FROM auth.users;

-- 2. 실제 사용자 정보 (최근 5명)
SELECT 
  id,
  email,
  created_at,
  last_sign_in_at,
  email_confirmed_at
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 5;

-- 3. 사용자 활동 데이터 확인
SELECT 
  'user_activities' as table_name,
  COUNT(*) as total_activities,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(CASE WHEN activity_type = 'search' THEN 1 END) as search_count,
  COUNT(CASE WHEN activity_type = 'report_generation' THEN 1 END) as report_count,
  MAX(created_at) as latest_activity
FROM user_activities;

-- 4. AI 분석 리포트 확인
SELECT 
  'ai_analysis_reports' as table_name,
  COUNT(*) as total_reports,
  COUNT(DISTINCT user_id) as unique_users,
  MAX(created_at) as latest_report
FROM ai_analysis_reports;

-- 5. 최근 활동이 있는 사용자 확인
SELECT DISTINCT
  ua.user_id,
  u.email,
  COUNT(ua.id) as activity_count,
  MAX(ua.created_at) as last_activity
FROM user_activities ua
JOIN auth.users u ON ua.user_id = u.id
GROUP BY ua.user_id, u.email
ORDER BY last_activity DESC
LIMIT 5;

-- 6. 최근 리포트 생성한 사용자 확인
SELECT DISTINCT
  ar.user_id,
  u.email,
  COUNT(ar.id) as report_count,
  MAX(ar.created_at) as last_report
FROM ai_analysis_reports ar
JOIN auth.users u ON ar.user_id = u.id
GROUP BY ar.user_id, u.email
ORDER BY last_report DESC
LIMIT 5;