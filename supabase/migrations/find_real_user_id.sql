-- 실제 사용자 ID 찾기
SELECT id, email, name FROM users WHERE email LIKE '%seongwan%' OR email LIKE '%gmail%' LIMIT 5;