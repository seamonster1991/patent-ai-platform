-- Get the role ID and create admin user
WITH role_info AS (
  SELECT id FROM admin_roles WHERE name = 'super_admin' LIMIT 1
)
INSERT INTO admin_users (
  email,
  password_hash,
  name,
  role_id,
  is_active,
  created_at,
  updated_at
)
SELECT 
  'admin@patent-ai.com',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- admin123
  'Test Admin',
  role_info.id,
  true,
  now(),
  now()
FROM role_info
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  name = EXCLUDED.name,
  role_id = EXCLUDED.role_id,
  is_active = EXCLUDED.is_active,
  updated_at = now();