-- 테스트 사용자 계정 생성
-- 이 SQL은 Supabase Auth와 users 테이블에 테스트 계정을 생성합니다.

-- 1. demo 사용자 (일반 사용자)
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'demo@example.com',
  crypt('demo123456', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"name": "Demo User"}',
  false,
  'authenticated'
) ON CONFLICT (email) DO NOTHING;

-- 2. admin 사용자 (관리자)
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'admin@p-ai.com',
  crypt('admin123456', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"name": "Admin User", "role": "admin"}',
  false,
  'authenticated'
) ON CONFLICT (email) DO NOTHING;

-- users 테이블에 프로필 정보 추가
INSERT INTO public.users (
  id,
  email,
  name,
  subscription_plan,
  usage_count,
  role,
  created_at,
  updated_at
) 
SELECT 
  au.id,
  au.email,
  CASE 
    WHEN au.email = 'demo@example.com' THEN 'Demo User'
    WHEN au.email = 'admin@p-ai.com' THEN 'Admin User'
  END,
  'free',
  0,
  CASE 
    WHEN au.email = 'admin@p-ai.com' THEN 'admin'
    ELSE 'user'
  END,
  now(),
  now()
FROM auth.users au 
WHERE au.email IN ('demo@example.com', 'admin@p-ai.com')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  updated_at = now();