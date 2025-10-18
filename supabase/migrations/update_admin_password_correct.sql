-- Update admin password with correct bcrypt hash
UPDATE admin_users 
SET password_hash = '$2b$10$zPWfwGXkhAMW2116uxp8oOTu1SiwbPkK5ZKG5mOpeIW0wByYqBVK2',
    updated_at = now()
WHERE email = 'admin@patent-ai.com';