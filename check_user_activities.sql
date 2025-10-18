-- 활동이 있는 사용자들과 활동 수 확인
SELECT 
    user_id, 
    COUNT(*) as activity_count,
    COUNT(CASE WHEN activity_type = 'search' THEN 1 END) as search_count,
    COUNT(CASE WHEN activity_type = 'report_generate' THEN 1 END) as report_count
FROM user_activities 
WHERE user_id IS NOT NULL 
GROUP BY user_id 
ORDER BY activity_count DESC 
LIMIT 10;