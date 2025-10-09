-- 간단한 데이터 보존 정책 테스트
-- 2025-01-30: 100일 데이터 보존 정책 확인

-- 1. 데이터 보존 상태 확인
SELECT 'Checking data retention status...' as test_step;
SELECT * FROM data_retention_status;

-- 2. 사용자 데이터 일관성 확인 (상위 3명)
SELECT 'Checking user data consistency...' as test_step;
SELECT * FROM user_data_consistency LIMIT 3;

-- 3. 함수 존재 확인
SELECT 'Checking if functions exist...' as test_step;
SELECT 
    'cleanup_old_data' as function_name,
    EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'cleanup_old_data') as exists
UNION ALL
SELECT 
    'sync_user_totals' as function_name,
    EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'sync_user_totals') as exists
UNION ALL
SELECT 
    'get_dashboard_stats' as function_name,
    EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'get_dashboard_stats') as exists;

-- 4. 트리거 존재 확인
SELECT 'Checking if triggers exist...' as test_step;
SELECT 
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation
FROM information_schema.triggers 
WHERE trigger_name IN (
    'trigger_update_search_totals',
    'trigger_update_report_totals', 
    'trigger_update_login_totals'
);

-- 5. 최근 100일 데이터 요약
SELECT 'Summary of recent 100 days data...' as test_step;
SELECT 
    'search_history' as table_name,
    COUNT(*) as total_records,
    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '100 days') as recent_100d_records,
    MIN(created_at) as oldest_record,
    MAX(created_at) as newest_record
FROM search_history
UNION ALL
SELECT 
    'ai_analysis_reports' as table_name,
    COUNT(*) as total_records,
    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '100 days') as recent_100d_records,
    MIN(created_at) as oldest_record,
    MAX(created_at) as newest_record
FROM ai_analysis_reports
UNION ALL
SELECT 
    'user_activities' as table_name,
    COUNT(*) as total_records,
    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '100 days') as recent_100d_records,
    MIN(created_at) as oldest_record,
    MAX(created_at) as newest_record
FROM user_activities;

SELECT '✅ Simple test completed successfully!' as final_result;