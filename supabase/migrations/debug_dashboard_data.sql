-- 대시보드 데이터 디버깅을 위한 쿼리
-- 현재 사용자 정보 및 데이터 상태 확인

-- 1. 현재 사용자 정보 확인
SELECT 
    id,
    email,
    name,
    role,
    total_searches,
    total_reports,
    total_logins,
    created_at,
    updated_at
FROM users 
ORDER BY created_at DESC 
LIMIT 5;

-- 2. 사용자별 검색 기록 확인
SELECT 
    u.email,
    u.name,
    COUNT(sh.id) as search_count,
    MAX(sh.created_at) as last_search
FROM users u
LEFT JOIN search_history sh ON u.id = sh.user_id
GROUP BY u.id, u.email, u.name
ORDER BY search_count DESC;

-- 3. 사용자별 리포트 확인
SELECT 
    u.email,
    u.name,
    COUNT(ar.id) as report_count,
    MAX(ar.created_at) as last_report
FROM users u
LEFT JOIN ai_analysis_reports ar ON u.id = ar.user_id
GROUP BY u.id, u.email, u.name
ORDER BY report_count DESC;

-- 4. 사용자별 활동 기록 확인
SELECT 
    u.email,
    u.name,
    COUNT(ua.id) as activity_count,
    MAX(ua.created_at) as last_activity
FROM users u
LEFT JOIN user_activities ua ON u.id = ua.user_id
GROUP BY u.id, u.email, u.name
ORDER BY activity_count DESC;

-- 5. 최근 100일 데이터 확인
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

-- 6. 기술 분야 데이터 확인
SELECT 
    'search_history' as source,
    COUNT(*) as total_records,
    COUNT(CASE WHEN technology_fields IS NOT NULL AND technology_fields != '[]' THEN 1 END) as with_tech_fields
FROM search_history
UNION ALL
SELECT 
    'ai_analysis_reports' as source,
    COUNT(*) as total_records,
    COUNT(CASE WHEN technology_fields IS NOT NULL AND technology_fields != '[]' THEN 1 END) as with_tech_fields
FROM ai_analysis_reports;

-- 7. get_dashboard_stats 함수 직접 실행 테스트
SELECT get_dashboard_stats('100d');