-- Check if user dak240228@gmail.com still exists in auth.users table
SELECT 
    id,
    email,
    created_at,
    deleted_at,
    is_anonymous
FROM auth.users 
WHERE email = 'dak240228@gmail.com';

-- Check if user exists in public.users table
SELECT 
    id,
    email,
    created_at,
    updated_at
FROM public.users 
WHERE email = 'dak240228@gmail.com';

-- Check related data in other tables
SELECT 'payment_transactions' as table_name, COUNT(*) as count
FROM public.payment_transactions pt
JOIN auth.users u ON pt.user_id = u.id
WHERE u.email = 'dak240228@gmail.com'

UNION ALL

SELECT 'ai_analysis_reports' as table_name, COUNT(*) as count
FROM public.ai_analysis_reports ar
JOIN auth.users u ON ar.user_id = u.id
WHERE u.email = 'dak240228@gmail.com'

UNION ALL

SELECT 'search_history' as table_name, COUNT(*) as count
FROM public.search_history sh
JOIN auth.users u ON sh.user_id = u.id
WHERE u.email = 'dak240228@gmail.com'

UNION ALL

SELECT 'point_transactions' as table_name, COUNT(*) as count
FROM public.point_transactions pt
JOIN auth.users u ON pt.user_id = u.id
WHERE u.email = 'dak240228@gmail.com'

UNION ALL

SELECT 'deleted_users_history' as table_name, COUNT(*) as count
FROM public.deleted_users_history
WHERE email = 'dak240228@gmail.com';