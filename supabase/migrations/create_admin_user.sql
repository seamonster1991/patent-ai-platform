-- Delete existing admin user if exists
DELETE FROM auth.users WHERE email = 'admin@p-ai.com';

-- Create admin user in auth.users table
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@p-ai.com',
  crypt('admin123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"],"role":"admin"}',
  '{"name":"Administrator","role":"admin"}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
);

-- Create admin user profile in users table
INSERT INTO users (
  id,
  email,
  name,
  subscription_plan,
  usage_count,
  created_at,
  updated_at
) 
SELECT 
  u.id,
  'admin@p-ai.com',
  'Administrator',
  'premium',
  0,
  NOW(),
  NOW()
FROM auth.users u 
WHERE u.email = 'admin@p-ai.com';