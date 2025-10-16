-- 대시보드 통계 함수 테스트 및 데이터 진단

-- 1. 현재 사용자 확인
SELECT 'Current Users' as info, id, email, name, created_at 
FROM users 
ORDER BY created_at DESC 
LIMIT 5;

-- 2. 함수 직접 호출 테스트 (첫 번째 사용자)
WITH first_user AS (
    SELECT id FROM users ORDER BY created_at DESC LIMIT 1
)
SELECT 'Dashboard Stats' as info, get_dashboard_stats(first_user.id, '100d') as dashboard_stats
FROM first_user;

-- 3. 검색 기록 확인
SELECT 'Search History' as info, 
    COUNT(*) as total_count,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '100 days' THEN 1 END) as last_100_days,
    COUNT(CASE WHEN technology_field IS NOT NULL THEN 1 END) as with_tech_field,
    COUNT(CASE WHEN keyword IS NOT NULL THEN 1 END) as with_keyword
FROM search_history;

-- 4. 리포트 기록 확인
SELECT 'Report History' as info,
    COUNT(*) as total_count,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '100 days' THEN 1 END) as last_100_days,
    COUNT(CASE WHEN technology_field IS NOT NULL THEN 1 END) as with_tech_field,
    COUNT(CASE WHEN invention_title IS NOT NULL THEN 1 END) as with_title
FROM ai_analysis_reports;

-- 5. 최근 검색 기록 확인 (첫 번째 사용자)
WITH first_user AS (
    SELECT id FROM users ORDER BY created_at DESC LIMIT 1
)
SELECT 'Recent Searches' as info, keyword, technology_field, created_at 
FROM search_history, first_user
WHERE user_id = first_user.id
ORDER BY created_at DESC 
LIMIT 5;

-- 6. 최근 리포트 기록 확인 (첫 번째 사용자)
WITH first_user AS (
    SELECT id FROM users ORDER BY created_at DESC LIMIT 1
)
SELECT 'Recent Reports' as info, invention_title, technology_field, created_at 
FROM ai_analysis_reports, first_user
WHERE user_id = first_user.id
ORDER BY created_at DESC 
LIMIT 5;

-- 7. 기술 분야 분포 확인
SELECT 'Tech Field Distribution' as info, 
    technology_field, 
    COUNT(*) as count
FROM (
    SELECT technology_field FROM search_history WHERE technology_field IS NOT NULL
    UNION ALL
    SELECT technology_field FROM ai_analysis_reports WHERE technology_field IS NOT NULL
) combined
GROUP BY technology_field
ORDER BY count DESC;