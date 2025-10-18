-- Create admin role first
INSERT INTO admin_roles (id, name, description, permissions)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'super_admin',
  'Super Administrator with full access',
  '["user_management", "payment_management", "system_settings", "analytics", "reports"]'::jsonb
)
ON CONFLICT (name) DO NOTHING;