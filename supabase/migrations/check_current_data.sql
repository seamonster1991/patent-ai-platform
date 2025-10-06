-- 현재 데이터베이스 상태 확인
SELECT 'auth.users' as table_name, COUNT(*) as count, 
       (SELECT id FROM auth.users ORDER BY created_at DESC LIMIT 1) as latest_user_id,
       (SELECT email FROM auth.users ORDER BY created_at DESC LIMIT 1) as latest_email
FROM auth.users
UNION ALL
SELECT 'public.users', COUNT(*), 
       (SELECT id FROM public.users ORDER BY created_at DESC LIMIT 1)::text,
       (SELECT email FROM public.users ORDER BY created_at DESC LIMIT 1)
FROM public.users
UNION ALL
SELECT 'search_history', COUNT(*), 
       (SELECT user_id FROM public.search_history ORDER BY created_at DESC LIMIT 1)::text,
       NULL
FROM public.search_history
UNION ALL
SELECT 'patent_detail_views', COUNT(*), 
       (SELECT user_id FROM public.patent_detail_views ORDER BY created_at DESC LIMIT 1)::text,
       NULL
FROM public.patent_detail_views
UNION ALL
SELECT 'ai_analysis_reports', COUNT(*), 
       (SELECT user_id FROM public.ai_analysis_reports ORDER BY created_at DESC LIMIT 1)::text,
       NULL
FROM public.ai_analysis_reports
UNION ALL
SELECT 'user_activities', COUNT(*), 
       (SELECT user_id FROM public.user_activities ORDER BY created_at DESC LIMIT 1)::text,
       NULL
FROM public.user_activities
UNION ALL
SELECT 'user_login_logs', COUNT(*), 
       (SELECT user_id FROM public.user_login_logs ORDER BY created_at DESC LIMIT 1)::text,
       NULL
FROM public.user_login_logs
UNION ALL
SELECT 'usage_cost_tracking', COUNT(*), 
       (SELECT user_id FROM public.usage_cost_tracking ORDER BY created_at DESC LIMIT 1)::text,
       NULL
FROM public.usage_cost_tracking;