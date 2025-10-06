-- 현재 데이터베이스 상태 간단 확인
SELECT 'auth.users' as table_name, COUNT(*) as count FROM auth.users
UNION ALL
SELECT 'public.users', COUNT(*) FROM public.users
UNION ALL
SELECT 'search_history', COUNT(*) FROM public.search_history
UNION ALL
SELECT 'patent_detail_views', COUNT(*) FROM public.patent_detail_views
UNION ALL
SELECT 'ai_analysis_reports', COUNT(*) FROM public.ai_analysis_reports
UNION ALL
SELECT 'user_activities', COUNT(*) FROM public.user_activities
UNION ALL
SELECT 'user_login_logs', COUNT(*) FROM public.user_login_logs
UNION ALL
SELECT 'usage_cost_tracking', COUNT(*) FROM public.usage_cost_tracking;

-- 실제 사용자 ID 확인
SELECT 'Latest auth user:' as info, id::text as user_id, email 
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 1;

SELECT 'Latest public user:' as info, id::text as user_id, email 
FROM public.users 
ORDER BY created_at DESC 
LIMIT 1;