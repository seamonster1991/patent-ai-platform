-- Fix admin@p-ai.co.kr user role issue - 2025

-- First, check current role
SELECT 'Current admin user info' as info, id, email, name, role, created_at 
FROM public.users 
WHERE email = 'admin@p-ai.co.kr';

-- Update role to admin if it's not already
UPDATE public.users 
SET role = 'admin'
WHERE email = 'admin@p-ai.co.kr' AND role != 'admin';

-- Verify the update
SELECT 'Updated admin user info' as info, id, email, name, role, created_at 
FROM public.users 
WHERE email = 'admin@p-ai.co.kr';