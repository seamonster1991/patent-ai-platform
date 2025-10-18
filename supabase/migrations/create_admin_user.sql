-- Create admin role if not exists
DO $$
DECLARE
    role_uuid UUID;
BEGIN
    -- Insert or get existing role
    INSERT INTO admin_roles (name, description, permissions)
    VALUES (
        'super_admin',
        'Super Administrator with full access',
        '["user_management", "system_settings", "analytics", "content_management", "payment_management"]'::jsonb
    )
    ON CONFLICT (name) DO NOTHING;
    
    -- Get the role UUID
    SELECT id INTO role_uuid FROM admin_roles WHERE name = 'super_admin';
    
    -- Create admin user with bcrypt hashed password
    -- Password: admin123 (hashed with bcrypt)
    INSERT INTO admin_users (
        email,
        password_hash,
        name,
        role_id,
        is_active
    )
    VALUES (
        'admin@patent-ai.com',
        '$2b$10$Ij1yz5wYK3Q9jeXHwHWurOUDOokBhH4dZ5fZheqPOMxEoNhexq0cS',
        'System Administrator',
        role_uuid,
        true
    )
    ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        name = EXCLUDED.name,
        role_id = EXCLUDED.role_id,
        is_active = EXCLUDED.is_active;
END $$;