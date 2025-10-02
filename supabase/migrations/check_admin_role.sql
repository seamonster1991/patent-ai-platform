-- Check admin user role
SELECT id, email, name, role FROM users WHERE email = 'admin@p-ai.com';

-- Update admin user role if needed
UPDATE users SET role = 'admin' WHERE email = 'admin@p-ai.com';

-- Verify the update
SELECT id, email, name, role FROM users WHERE email = 'admin@p-ai.com';