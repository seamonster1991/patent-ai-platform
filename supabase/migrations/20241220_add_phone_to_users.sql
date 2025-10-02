-- Add phone number field to users table
-- Migration: 20241220_add_phone_to_users.sql

-- Add phone column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- Add comment for documentation
COMMENT ON COLUMN users.phone IS 'User phone number (optional)';

-- Create index for phone number searches (optional, for future use)
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone) WHERE phone IS NOT NULL;

-- Update RLS policies to include phone field access
-- Users can view and update their own phone number
-- (The existing policies should already cover this, but we're being explicit)

-- Grant necessary permissions (should already be covered by existing grants)
-- GRANT SELECT, UPDATE ON users TO authenticated;