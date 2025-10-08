-- 테스트용 실제 사용자 ID 가져오기
SELECT 
  id,
  email,
  created_at,
  last_sign_in_at
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 1;
SELECT 
  id,
  email,
  created_at,
  last_sign_in_at
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 1;