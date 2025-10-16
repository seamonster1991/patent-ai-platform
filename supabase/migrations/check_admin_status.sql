-- Check admin account status in all relevant tables
-- This query checks for admin@p-ai.co.kr in auth.users, public.users, and admin_users

-- Check auth.users table
SELECT 'auth.users' as table_name, 
       id, 
       email, 
       created_at, 
       email_confirmed_at, 
       last_sign_in_at
FROM auth.users 
WHERE email = 'admin@p-ai.co.kr';

-- Check public.users table
SELECT 'public.users' as table_name,
       id,
       email,
       name,
       role,
       created_at,
       last_login_at
FROM public.users 
WHERE email = 'admin@p-ai.co.kr';

-- Check admin_users table
SELECT 'admin_users' as table_name,
       id,
       email,
       name,
       is_active,
       last_login_at,
       created_at
FROM public.admin_users 
WHERE email = 'admin@p-ai.co.kr';

-- Count total admin accounts
SELECT 'Total admin accounts in public.users' as info, COUNT(*) as count
FROM public.users 
WHERE role = 'admin';

SELECT 'Total accounts in admin_users' as info, COUNT(*) as count
FROM public.admin_users;