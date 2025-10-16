-- Create admin account in Supabase Auth system
-- This will create the admin@p-ai.co.kr account in auth.users table

-- First, check if the account already exists in auth.users
SELECT 'Existing auth.users accounts' as info, id, email, created_at 
FROM auth.users 
WHERE email = 'admin@p-ai.co.kr';

-- Insert admin account into auth.users table
-- Note: This is a direct insert into auth.users which should be done carefully
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    invited_at,
    confirmation_token,
    confirmation_sent_at,
    recovery_token,
    recovery_sent_at,
    email_change_token_new,
    email_change,
    email_change_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at,
    phone,
    phone_confirmed_at,
    phone_change,
    phone_change_token,
    phone_change_sent_at,
    email_change_token_current,
    email_change_confirm_status,
    banned_until,
    reauthentication_token,
    reauthentication_sent_at,
    is_sso_user,
    deleted_at
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'admin@p-ai.co.kr',
    crypt('admin123', gen_salt('bf')), -- bcrypt hash for 'admin123'
    now(),
    null,
    '',
    null,
    '',
    null,
    '',
    '',
    null,
    null,
    '{"provider": "email", "providers": ["email"]}',
    '{}',
    false,
    now(),
    now(),
    null,
    null,
    '',
    '',
    null,
    '',
    0,
    null,
    '',
    null,
    false,
    null
);

-- Verify the creation
SELECT 'Admin account in auth.users' as status, id, email, created_at, email_confirmed_at
FROM auth.users 
WHERE email = 'admin@p-ai.co.kr';