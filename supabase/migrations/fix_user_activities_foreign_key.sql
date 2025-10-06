-- Fix user_activities foreign key constraint to reference public.users instead of auth.users

-- Drop the existing foreign key constraint
ALTER TABLE user_activities DROP CONSTRAINT IF EXISTS user_activities_user_id_fkey;

-- Delete user_activities records that reference non-existent users
DELETE FROM user_activities 
WHERE user_id NOT IN (SELECT id FROM public.users);

-- Add the correct foreign key constraint referencing public.users
ALTER TABLE user_activities 
ADD CONSTRAINT user_activities_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;