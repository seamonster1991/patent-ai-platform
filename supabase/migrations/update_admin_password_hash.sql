-- Update admin password with correct bcrypt hash
-- This migration updates the admin password hash with a verified working hash

UPDATE admin_users 
SET password_hash = '$2b$10$73vMvkZncY94mUtPmtd3IuLAVotClqnvxjdS4G0nDWJ03WACnp3sm'
WHERE email = 'admin@p-ai.co.kr';

-- Verify the update
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO updated_count 
    FROM admin_users 
    WHERE email = 'admin@p-ai.co.kr' 
    AND password_hash = '$2b$10$73vMvkZncY94mUtPmtd3IuLAVotClqnvxjdS4G0nDWJ03WACnp3sm';
    
    RAISE NOTICE 'Admin password updated. Affected rows: %', updated_count;
END $$;