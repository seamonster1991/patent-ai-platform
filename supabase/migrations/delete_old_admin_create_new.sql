-- 기존 admin@p-ai.com 계정 삭제 및 새 admin@p-ai.co.kr 계정 생성

-- 1. 기존 admin@p-ai.com 계정 확인
SELECT id, email, role FROM users WHERE email = 'admin@p-ai.com';

-- 2. 기존 admin@p-ai.com 계정 삭제 (있는 경우)
DELETE FROM users WHERE email = 'admin@p-ai.com';

-- 3. 새 관리자 계정 생성 (admin@p-ai.co.kr)
INSERT INTO users (
  id,
  email,
  name,
  role,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'admin@p-ai.co.kr',
  '시스템 관리자',
  'admin',
  NOW(),
  NOW()
) ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  updated_at = NOW();

-- 4. 결과 확인
SELECT id, email, name, role, created_at FROM users WHERE email = 'admin@p-ai.co.kr';

-- 5. 모든 관리자 계정 확인
SELECT id, email, name, role FROM users WHERE role = 'admin';