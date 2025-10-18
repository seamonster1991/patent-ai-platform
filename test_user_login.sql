-- 테스트 사용자 확인
SELECT 
  au.id as auth_id,
  au.email,
  au.email_confirmed_at,
  pu.id as profile_id,
  pu.name,
  pu.role
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE au.email LIKE '%test%' OR au.email = 'user@patent-ai.com'
ORDER BY au.created_at DESC
LIMIT 5;