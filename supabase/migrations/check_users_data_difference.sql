-- Check the difference between users table and auth.users
-- This will help us understand why Python script shows 15 users while Node.js API shows 20

-- 1. Count users in public.users table (what Python script uses)
SELECT 'public.users' as table_name, COUNT(*) as user_count
FROM users;

-- 2. Count users in auth.users table (what Node.js API uses)
SELECT 'auth.users' as table_name, COUNT(*) as user_count
FROM auth.users;

-- 3. Show all users from public.users table
SELECT 
    'public.users' as source,
    id,
    email,
    created_at
FROM users
ORDER BY created_at DESC;

-- 4. Show all users from auth.users table
SELECT 
    'auth.users' as source,
    id,
    email,
    created_at
FROM auth.users
ORDER BY created_at DESC;

-- 5. Find users that exist in auth.users but not in public.users
SELECT 
    'auth_only' as difference_type,
    au.id,
    au.email,
    au.created_at
FROM auth.users au
LEFT JOIN users u ON au.id = u.id
WHERE u.id IS NULL
ORDER BY au.created_at DESC;

-- 6. Find users that exist in public.users but not in auth.users
SELECT 
    'public_only' as difference_type,
    u.id,
    u.email,
    u.created_at
FROM users u
LEFT JOIN auth.users au ON u.id = au.id
WHERE au.id IS NULL
ORDER BY u.created_at DESC;