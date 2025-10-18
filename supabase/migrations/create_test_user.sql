-- Create test user for payment testing
-- This will create a user in auth.users table via Supabase Auth

-- First, let's check if we can insert directly into auth.users
-- Note: This might not work due to RLS policies, but we'll try

INSERT INTO auth.users (
  id,
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
  '276975db-635b-4c77-87a0-548f91b14231',
  'test@patent-ai.com',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password: test123
  NOW(),
  NOW(),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"name": "Test User"}',
  false,
  'authenticated'
) ON CONFLICT (email) DO NOTHING;

-- Also create corresponding user profile if needed
INSERT INTO users (
  id,
  email,
  name,
  points,
  created_at
) VALUES (
  '276975db-635b-4c77-87a0-548f91b14231',
  'test@patent-ai.com',
  'Test User',
  1000,
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  name = EXCLUDED.name,