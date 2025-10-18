-- Check existing admin roles
SELECT * FROM admin_roles;

-- Create admin role with proper UUID
INSERT INTO admin_roles (name, description, permissions)
VALUES (
  'super_admin',
  'Super Administrator with full access',
  '["user_management", "payment_management", "system_settings", "analytics", "reports"]'::jsonb
)
ON CONFLICT (name) DO NOTHING
RETURNING id, name;