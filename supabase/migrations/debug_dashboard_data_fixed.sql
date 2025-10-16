-- 대시보드 데이터 디버깅을 위한 간단한 쿼리

-- 1. 현재 사용자 정보 확인
SELECT 
    id,
    email,
    name,
    role,
    total_searches,
    total_reports,
    total_logins,
    created_at
FROM users 
ORDER BY created_at DESC 
LIMIT 5;

-- 2. 테이블별 전체 데이터 개수 확인
SELECT 
    'users' as table_name,
    COUNT(*) as total_count
FROM users
UNION ALL
SELECT 
    'search_history' as table_name,
    COUNT(*) as total_count
FROM search_history
UNION ALL
SELECT 
    'ai_analysis_reports' as table_name,
    COUNT(*) as total_count
FROM ai_analysis_reports
UNION ALL
SELECT 
    'user_activities' as table_name,
    COUNT(*) as total_count
FROM user_activities;

-- 3. 최근 100일 데이터 확인
SELECT 
    'search_history' as table_name,
    COUNT(*) as total_count,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '100 days' THEN 1 END) as last_100_days
FROM search_history
UNION ALL
SELECT 
    'ai_analysis_reports' as table_name,
    COUNT(*) as total_count,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '100 days' THEN 1 END) as last_100_days
FROM ai_analysis_reports
UNION ALL
SELECT 
    'user_activities' as table_name,
    COUNT(*) as total_count,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '100 days' THEN 1 END) as last_100_days
FROM user_activities;