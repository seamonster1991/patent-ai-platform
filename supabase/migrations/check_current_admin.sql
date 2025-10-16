-- Check current admin account status across all tables

-- Check auth.users
SELECT 'auth.users' as table_name, id, email, created_at, email_confirmed_at, last_sign_in_at
FROM auth.users 
WHERE email = 'admin@p-ai.co.kr';

-- Check public.users  
SELECT 'public.users' as table_name, id, email, name, role, created_at, last_login_at
FROM public.users 
WHERE email = 'admin@p-ai.co.kr';

-- Check admin_users
SELECT 'admin_users' as table_name, id, email, name, is_active, created_at
FROM public.admin_users 
WHERE email = 'admin@p-ai.co.kr';