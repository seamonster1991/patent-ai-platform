-- Update existing user to admin role or create new admin user
-- First, try to update existing user with admin email
UPDATE public.users 
SET role = 'admin', 
    name = '시스템 관리자',
    subscription_plan = 'premium'
WHERE email = 'admin@p-ai.com';

-- If no user was updated, insert a new admin user
-- Note: This will require manual creation of auth user through Supabase dashboard
INSERT INTO public.users (
  email,
  name,
  role,
  subscription_plan,
  usage_count,
  created_at,
  updated_at
) 
SELECT 
  'admin@p-ai.com',
  '시스템 관리자',
  'admin',
  'premium',
  0,
  now(),
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM public.users WHERE email = 'admin@p-ai.com'
);