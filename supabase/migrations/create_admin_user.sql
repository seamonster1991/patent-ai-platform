-- Create admin user if not exists
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  role,
  aud,
  confirmation_token,
  email_change_token_new,
  recovery_token
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'admin@p-ai.com',
  crypt('admin123!', gen_salt('bf')),
  now(),
  now(),
  now(),
  'authenticated',
  'authenticated',
  '',
  '',
  ''
) ON CONFLICT (email) DO NOTHING;

-- Get the admin user ID
DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  SELECT id INTO admin_user_id FROM auth.users WHERE email = 'admin@p-ai.com';
  
  -- Insert into users table if not exists
  INSERT INTO public.users (
    id,
    email,
    name,
    role,
    subscription_plan,
    usage_count,
    created_at,
    updated_at
  ) VALUES (
    admin_user_id,
    'admin@p-ai.com',
    '시스템 관리자',
    'admin',
    'enterprise',
    0,
    now(),
    now()
  ) ON CONFLICT (id) DO UPDATE SET
    role = 'admin',
    name = '시스템 관리자',
    subscription_plan = 'enterprise';
END $$;