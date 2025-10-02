-- Update admin user password to admin123456
-- This fixes the password mismatch issue where admin was created with admin123! but user expects admin123456

UPDATE auth.users 
SET encrypted_password = crypt('admin123456', gen_salt('bf'))
WHERE email = 'admin@p-ai.com';

-- Verify the admin user exists in public.users table with correct role
INSERT INTO public.users (
  id,
  email,
  name,
  role,
  subscription_plan,
  usage_count,
  created_at,
  updated_at
) 
SELECT 
  au.id,
  'admin@p-ai.com',
  '시스템 관리자',
  'admin',
  'premium',
  0,
  now(),
  now()
FROM auth.users au 
WHERE au.email = 'admin@p-ai.com'
ON CONFLICT (id) DO UPDATE SET
  role = 'admin',
  name = '시스템 관리자',
  subscription_plan = 'premium',
  updated_at = now();