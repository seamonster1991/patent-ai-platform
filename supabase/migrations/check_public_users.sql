-- public.users 테이블의 사용자 확인
SELECT id, email, name, created_at 
FROM public.users 
ORDER BY created_at DESC 
LIMIT 5;