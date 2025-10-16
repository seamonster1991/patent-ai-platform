-- Verify admin@p-ai.co.kr user status after fix

-- Check current user info
SELECT 'Admin user current status' as info, 
       id, email, name, role, subscription_plan, created_at, updated_at
FROM public.users 
WHERE email = 'admin@p-ai.co.kr';

-- Check if there are any other admin users
SELECT 'All admin users' as info,
       id, email, name, role, subscription_plan, created_at
FROM public.users 
WHERE role IN ('admin', 'super_admin')
ORDER BY created_at;