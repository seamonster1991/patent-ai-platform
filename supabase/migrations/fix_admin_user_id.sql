-- Fix admin user ID mismatch between auth.users and public.users

-- First, get the auth.users ID for admin@p-ai.co.kr
-- Then update public.users to use the same ID

-- Delete existing admin user in public.users
DELETE FROM public.users WHERE email = 'admin@p-ai.co.kr';

-- Insert admin user with the correct ID from auth.users
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
    au.id,  -- Use the ID from auth.users
    'admin@p-ai.co.kr',
    'System Administrator',
    'admin',
    'premium',
    0,
    now(),
    now()
FROM auth.users au
WHERE au.email = 'admin@p-ai.co.kr';

-- Verify the fix
SELECT 
    'Fixed ID relationship' as status,
    au.id as auth_id,
    pu.id as public_id,
    au.email,
    pu.role,
    CASE WHEN au.id = pu.id THEN 'MATCH' ELSE 'MISMATCH' END as id_status
FROM auth.users au
JOIN public.users pu ON au.email = pu.email
WHERE au.email = 'admin@p-ai.co.kr';