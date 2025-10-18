-- Update admin password with correct bcrypt hash
-- Password: admin123
UPDATE admin_users 
SET password_hash = '$2b$10$ciZEkpFzYQ1WHTayPJD7A.yZVVmfBHT1TcW8yvYTpinAbsKrezyeK'
WHERE email = 'admin@patent-ai.com';