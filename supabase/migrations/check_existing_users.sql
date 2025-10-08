-- 기존 사용자 확인
SELECT id, email, created_at, last_sign_in_at 
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 5;