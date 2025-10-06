-- 현재 데이터베이스의 모든 사용자 확인
SELECT id, email, name, total_searches, total_detail_views, total_logins, total_usage_cost, created_at 
FROM users 
ORDER BY created_at DESC 
LIMIT 10;