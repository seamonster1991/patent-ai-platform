-- Fix user_login_logs table structure
ALTER TABLE user_login_logs ADD COLUMN IF NOT EXISTS success BOOLEAN DEFAULT true;
ALTER TABLE user_login_logs ADD COLUMN IF NOT EXISTS user_agent TEXT;