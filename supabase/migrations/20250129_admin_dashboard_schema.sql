-- Admin Dashboard Schema Migration
-- Creates missing tables for the new admin dashboard system
-- Note: admin_users and admin_roles already exist

-- Message Templates Table
CREATE TABLE IF NOT EXISTS message_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    type VARCHAR(50) NOT NULL,
    title_template VARCHAR(255) NOT NULL,
    content_template TEXT NOT NULL,
    variables JSONB DEFAULT '[]',
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Message Recipients Table
CREATE TABLE IF NOT EXISTS message_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID,
    user_id UUID,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    delivery_status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID,
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100) NOT NULL,
    resource_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admin Sessions Table
CREATE TABLE IF NOT EXISTS admin_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    refresh_token VARCHAR(255) UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- System Settings Table
CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    category VARCHAR(50) DEFAULT 'general',
    is_public BOOLEAN DEFAULT false,
    updated_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Grant permissions to roles
GRANT ALL PRIVILEGES ON message_templates TO authenticated;
GRANT SELECT ON message_templates TO anon;
GRANT ALL PRIVILEGES ON message_recipients TO authenticated;
GRANT SELECT ON message_recipients TO anon;
GRANT ALL PRIVILEGES ON audit_logs TO authenticated;
GRANT SELECT ON audit_logs TO anon;
GRANT ALL PRIVILEGES ON admin_sessions TO authenticated;
GRANT SELECT ON admin_sessions TO anon;
GRANT ALL PRIVILEGES ON system_settings TO authenticated;
GRANT SELECT ON system_settings TO anon;

-- Insert initial data for message_templates
INSERT INTO message_templates (name, type, title_template, content_template, variables, description) VALUES
('welcome_email', 'email', 'Welcome to Patent AI', 'Hello {{name}}, welcome to Patent AI! Your account has been created successfully.', '["name"]', 'Welcome email for new users'),
('password_reset', 'email', 'Password Reset Request', 'Hello {{name}}, click the link to reset your password: {{reset_link}}', '["name", "reset_link"]', 'Password reset email template'),
('payment_confirmation', 'email', 'Payment Confirmation', 'Hello {{name}}, your payment of {{amount}} has been processed successfully.', '["name", "amount"]', 'Payment confirmation email'),
('system_maintenance', 'notification', 'System Maintenance', 'System will be under maintenance from {{start_time}} to {{end_time}}.', '["start_time", "end_time"]', 'System maintenance notification')
ON CONFLICT (name) DO NOTHING;

-- Insert initial data for system_settings
INSERT INTO system_settings (key, value, description, category) VALUES
('site_name', '"Patent AI Admin Dashboard"', 'Site name displayed in the admin dashboard', 'general'),
('max_login_attempts', '5', 'Maximum login attempts before account lockout', 'security'),
('session_timeout', '3600', 'Session timeout in seconds', 'security'),
('email_notifications', 'true', 'Enable email notifications', 'notifications'),
('sms_notifications', 'false', 'Enable SMS notifications', 'notifications'),
('maintenance_mode', 'false', 'Enable maintenance mode', 'system'),
('api_rate_limit', '1000', 'API rate limit per hour', 'api'),
('file_upload_limit', '10485760', 'File upload limit in bytes (10MB)', 'uploads')
ON CONFLICT (key) DO NOTHING;