-- Update admin user with correct password hash
UPDATE admin_users 
SET 
  password_hash = '$2b$10$9zgPqNJ1udwKQlf9tFuwZOg1qEuD.Q3gcbS4E0n37OtiOLaXakM5e',
  is_active = true,
  updated_at = NOW()
WHERE email = 'admin@example.com';

-- If no admin user exists, create one
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
  'admin@example.com',
  '$2b$10$9zgPqNJ1udwKQlf9tFuwZOg1qEuD.Q3gcbS4E0n37OtiOLaXakM5e',
  'System Administrator',
  (SELECT id FROM admin_roles WHERE name = 'super_admin' LIMIT 1),
  true,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM admin_users WHERE email = 'admin@example.com'
);