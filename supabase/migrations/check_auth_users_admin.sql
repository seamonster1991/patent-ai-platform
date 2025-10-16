-- Check if admin@p-ai.co.kr exists in auth.users table

-- Check auth.users table for admin account
SELECT 'auth.users admin account' as info,
       id, email, created_at, email_confirmed_at, last_sign_in_at
FROM auth.users 
WHERE email = 'admin@p-ai.co.kr';

-- If no admin account exists in auth.users, we need to create one
-- This query will show if we need to create the auth user
SELECT CASE 
  WHEN EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@p-ai.co.kr') 
  THEN 'Admin account exists in auth.users'
  ELSE 'Admin account MISSING in auth.users - needs to be created'
END as auth_status;