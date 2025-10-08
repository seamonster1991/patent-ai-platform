-- 실제 사용자 ID 가져오기
SELECT id, email, name 
FROM public.users 
ORDER BY created_at DESC 
LIMIT 1;