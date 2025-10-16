-- Supabase Auth에 새 관리자 계정 생성

-- 1. 기존 admin@p-ai.com auth 계정 확인 및 삭제
DELETE FROM auth.users WHERE email = 'admin@p-ai.com';

-- 2. 기존 admin@p-ai.co.kr 계정이 있는지 확인하고 삭제
DELETE FROM auth.users WHERE email = 'admin@p-ai.co.kr';

-- 3. 새 관리자 auth 계정 생성 (admin@p-ai.co.kr)
-- 비밀번호: admin123 (해시화됨)
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@p-ai.co.kr',
  crypt('admin123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"name": "시스템 관리자"}',
  false,
  '',
  '',
  '',
  ''
);

-- 4. 결과 확인
SELECT id, email, email_confirmed_at, created_at FROM auth.users WHERE email = 'admin@p-ai.co.kr';