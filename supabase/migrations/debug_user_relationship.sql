-- Debug the relationship between auth.users and public.users for admin@p-ai.co.kr

-- Check auth.users
SELECT 'auth.users' as source, id, email, created_at 
FROM auth.users 
WHERE email = 'admin@p-ai.co.kr';

-- Check public.users
SELECT 'public.users' as source, id, email, name, role, created_at 
FROM public.users 
WHERE email = 'admin@p-ai.co.kr';

-- Check if there's a matching ID between auth.users and public.users
SELECT 
    'ID match check' as info,
    au.id as auth_id,
    pu.id as public_id,
    au.email,
    pu.role
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE au.email = 'admin@p-ai.co.kr';

-- Check for any duplicate entries
SELECT 'Duplicate check in public.users' as info, email, COUNT(*) as count
FROM public.users 
WHERE email = 'admin@p-ai.co.kr'
GROUP BY email;