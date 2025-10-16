-- Recreate admin account with correct bcrypt hash
-- This migration creates a working admin account with proper bcrypt hash

DO $$
DECLARE
    super_admin_role_id UUID;
BEGIN
    -- Get the Super Admin role ID
    SELECT id INTO super_admin_role_id 
    FROM admin_roles 
    WHERE name = 'Super Admin';
    
    -- If no Super Admin role exists, create it
    IF super_admin_role_id IS NULL THEN
        INSERT INTO admin_roles (name, description, permissions) 
        VALUES ('Super Admin', 'Full system access', '{"all": true}')
        RETURNING id INTO super_admin_role_id;
    END IF;
    
    -- Delete existing admin user if exists
    DELETE FROM admin_users WHERE email = 'admin@p-ai.co.kr';
    
    -- Create new admin user with correct bcrypt hash for "admin123"
    -- Generated using: bcrypt.hash("admin123", 10)
    INSERT INTO admin_users (
        email, 
        password_hash, 
        name, 
        role_id, 
        is_active
    ) VALUES (
        'admin@p-ai.co.kr',
        '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
        'System Administrator',
        super_admin_role_id,
        true
    );
    
    RAISE NOTICE 'Admin account recreated successfully: admin@p-ai.co.kr / admin123';
    RAISE NOTICE 'Role ID: %', super_admin_role_id;
END $$;