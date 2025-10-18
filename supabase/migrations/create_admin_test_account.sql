-- Create admin role if not exists
INSERT INTO admin_roles (id, name, description, permissions)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'super_admin',
  'Super Administrator with full access',
  '["user_management", "payment_management", "system_settings", "analytics", "reports"]'::jsonb
)
ON CONFLICT (name) DO NOTHING;

-- Create test admin user
-- Password: admin123 (hashed with bcrypt)
INSERT INTO admin_users (
  id,
  email,
  password_hash,
  name,
  role_id,
  is_active,
  created_at,
  updated_at
)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567891',
  'admin@patent-ai.com',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- admin123
  'Test Admin',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  true,
  now(),
  now()
)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  name = EXCLUDED.name,
  role_id = EXCLUDED.role_id,
  is_active = EXCLUDED.is_active,
  updated_at = now();