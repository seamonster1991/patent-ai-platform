-- Setup admin account admin@p-ai.co.kr with password admin123
-- This will create the account in public.users table (primary authentication method)

-- First, check existing admin roles
SELECT 'Existing admin roles' as info, id, name, description FROM public.admin_roles;

-- Delete existing admin account if exists
DELETE FROM public.users WHERE email = 'admin@p-ai.co.kr';

-- Create admin user in public.users table with role='admin'
-- This is the primary authentication method used by the API
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
    gen_random_uuid(),
    'admin@p-ai.co.kr',
    'System Administrator',
    'admin',
    'premium',
    0,
    now(),
    now()
);

-- Verify the creation
SELECT 'Admin account created in public.users' as status, id, email, name, role 
FROM public.users 
WHERE email = 'admin@p-ai.co.kr';

-- Check total admin accounts
SELECT 'Total admin accounts' as info, COUNT(*) as count
FROM public.users 
WHERE role = 'admin';