-- Create admin user in public.users table
-- This will create admin@p-ai.co.kr with password admin123

-- Delete existing admin account if exists
DELETE FROM public.users WHERE email = 'admin@p-ai.co.kr';

-- Create admin user in public.users table with role='admin'
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
SELECT 'Admin account created' as status, id, email, name, role 
FROM public.users 
WHERE email = 'admin@p-ai.co.kr';