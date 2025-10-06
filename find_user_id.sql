-- seongwankim@gmail.com 사용자의 UUID 찾기
SELECT id, email, name, total_searches, total_detail_views, total_logins, total_usage_cost 
FROM users 
WHERE email = 'seongwankim@gmail.com';