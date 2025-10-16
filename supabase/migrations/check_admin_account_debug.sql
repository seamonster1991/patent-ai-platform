-- Check admin account status for debugging
-- This migration checks if the admin account exists and shows debug information

DO $$
DECLARE
    admin_count INTEGER;
    role_count INTEGER;
    admin_record RECORD;
    role_record RECORD;
BEGIN
    -- Check admin_roles table
    SELECT COUNT(*) INTO role_count FROM admin_roles;
    RAISE NOTICE 'Total admin roles: %', role_count;
    
    FOR role_record IN SELECT * FROM admin_roles LOOP
        RAISE NOTICE 'Role: % (ID: %, Permissions: %)', role_record.name, role_record.id, role_record.permissions;
    END LOOP;
    
    -- Check admin_users table
    SELECT COUNT(*) INTO admin_count FROM admin_users;
    RAISE NOTICE 'Total admin users: %', admin_count;
    
    FOR admin_record IN 
        SELECT au.*, ar.name as role_name 
        FROM admin_users au 
        LEFT JOIN admin_roles ar ON au.role_id = ar.id 
    LOOP
        RAISE NOTICE 'Admin User: % (Email: %, Role: %, Active: %)', 
            admin_record.name, admin_record.email, admin_record.role_name, admin_record.is_active;
        RAISE NOTICE 'Password Hash: %', LEFT(admin_record.password_hash, 20) || '...';
    END LOOP;
    
    -- Try to find the specific admin account
    SELECT COUNT(*) INTO admin_count 
    FROM admin_users 
    WHERE email = 'admin@p-ai.co.kr' AND is_active = true;
    
    RAISE NOTICE 'Active admin accounts with email admin@p-ai.co.kr: %', admin_count;
    
END $$;