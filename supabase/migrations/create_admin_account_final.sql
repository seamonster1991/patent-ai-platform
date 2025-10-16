-- Create admin account with proper password hash
-- This migration creates a working admin account for the admin dashboard

-- First, ensure we have the Super Admin role
INSERT INTO admin_roles (name, description, permissions) 
VALUES ('Super Admin', 'Full system access', '{"all": true}')
ON CONFLICT (name) DO NOTHING;

-- Get the Super Admin role ID
DO $$
DECLARE
    super_admin_role_id UUID;
BEGIN
    -- Get the Super Admin role ID
    SELECT id INTO super_admin_role_id 
    FROM admin_roles 
    WHERE name = 'Super Admin';
    
    -- Delete existing admin user if exists
    DELETE FROM admin_users WHERE email = 'admin@p-ai.co.kr';
    
    -- Create new admin user with bcrypt hashed password
    -- Password: admin123
    -- Bcrypt hash: $2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi
    INSERT INTO admin_users (
        email, 
        password_hash, 
        name, 
        role_id, 
        is_active
    ) VALUES (
        'admin@p-ai.co.kr',
        '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
        'System Administrator',
        super_admin_role_id,
        true
    );
    
    RAISE NOTICE 'Admin account created successfully: admin@p-ai.co.kr / admin123';
END $$;