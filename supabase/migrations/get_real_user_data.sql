-- 실제 사용자 데이터 확인
SELECT 
  id,
  email,
  created_at,
  last_sign_in_at
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 5;

-- 각 테이블의 데이터 개수 확인
SELECT 
  'users' as table_name, 
  COUNT(*) as count 
FROM auth.users
UNION ALL
SELECT 
  'public.users' as table_name, 
  COUNT(*) as count 
FROM public.users
UNION ALL
SELECT 
  'search_history' as table_name, 
  COUNT(*) as count 
FROM public.search_history
UNION ALL
SELECT 
  'patent_detail_views' as table_name, 
  COUNT(*) as count 
FROM public.patent_detail_views
UNION ALL
SELECT 
  'ai_analysis_reports' as table_name, 
  COUNT(*) as count 
FROM public.ai_analysis_reports
UNION ALL
SELECT 
  'user_activities' as table_name, 
  COUNT(*) as count 
FROM public.user_activities
UNION ALL
SELECT 
  'user_login_logs' as table_name, 
  COUNT(*) as count 
FROM public.user_login_logs
UNION ALL
SELECT 
  'usage_cost_tracking' as table_name, 
  COUNT(*) as count 
FROM public.usage_cost_tracking;