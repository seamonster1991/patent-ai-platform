-- Check existing admin accounts in both tables

-- Check admin accounts in public.users table
SELECT 'public.users admin accounts' as table_name, id, email, name, role, created_at 
FROM public.users 
WHERE role = 'admin' OR email LIKE '%admin%'
ORDER BY created_at DESC;

-- Check admin accounts in admin_users table
SELECT 'admin_users accounts' as table_name, 
       au.id, 
       au.email, 
       au.name, 
       ar.name as role_name,
       au.is_active,
       au.created_at 
FROM public.admin_users au
LEFT JOIN public.admin_roles ar ON au.role_id = ar.id
ORDER BY au.created_at DESC;

-- Check admin roles
SELECT 'admin_roles' as table_name, id, name, description, permissions
FROM public.admin_roles
ORDER BY created_at DESC;