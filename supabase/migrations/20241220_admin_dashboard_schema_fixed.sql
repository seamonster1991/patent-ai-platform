-- Admin Dashboard Database Schema (Fixed)
-- This migration creates all necessary tables for the admin dashboard system

-- Drop existing tables if they exist to avoid conflicts
DROP TABLE IF EXISTS admin_users CASCADE;
DROP TABLE IF EXISTS admin_roles CASCADE;
DROP TABLE IF EXISTS system_messages CASCADE;
DROP TABLE IF EXISTS user_feedback CASCADE;
DROP TABLE IF EXISTS report_ratings CASCADE;
DROP TABLE IF EXISTS system_metrics CASCADE;
DROP TABLE IF EXISTS api_performance_logs CASCADE;
DROP TABLE IF EXISTS llm_usage_logs CASCADE;
DROP TABLE IF EXISTS cache_performance CASCADE;
DROP TABLE IF EXISTS search_analytics CASCADE;

-- 1. Admin Roles Table (create first for foreign key reference)
CREATE TABLE admin_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    permissions JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Admin Users Table
CREATE TABLE admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    role_id UUID NOT NULL REFERENCES admin_roles(id),
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. System Messages Table
CREATE TABLE system_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('info', 'warning', 'error', 'success')),
    target_audience VARCHAR(20) NOT NULL CHECK (target_audience IN ('all', 'users', 'admins')),
    is_active BOOLEAN DEFAULT true,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES admin_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. User Feedback Table
CREATE TABLE user_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('bug', 'feature', 'general', 'complaint')),
    subject VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved', 'closed')),
    priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    assigned_to UUID REFERENCES admin_users(id),
    response TEXT,
    responded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Report Ratings Table
CREATE TABLE report_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    report_id VARCHAR(100) NOT NULL,
    report_type VARCHAR(50) NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    feedback TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. System Metrics Table
CREATE TABLE system_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15,4) NOT NULL,
    metric_unit VARCHAR(20),
    category VARCHAR(50) NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- 7. API Performance Logs Table
CREATE TABLE api_performance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint VARCHAR(200) NOT NULL,
    method VARCHAR(10) NOT NULL,
    response_time_ms INTEGER NOT NULL,
    status_code INTEGER NOT NULL,
    user_id UUID,
    ip_address INET,
    user_agent TEXT,
    request_size_bytes INTEGER,
    response_size_bytes INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. LLM Usage Logs Table
CREATE TABLE llm_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    model_name VARCHAR(50) NOT NULL,
    prompt_tokens INTEGER NOT NULL,
    completion_tokens INTEGER NOT NULL,
    total_tokens INTEGER NOT NULL,
    cost_usd DECIMAL(10,6) NOT NULL,
    request_type VARCHAR(50) NOT NULL,
    report_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Cache Performance Table
CREATE TABLE cache_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cache_key VARCHAR(200) NOT NULL,
    hit BOOLEAN NOT NULL,
    response_time_ms INTEGER NOT NULL,
    cache_type VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Search Analytics Table
CREATE TABLE search_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    search_query TEXT NOT NULL,
    search_type VARCHAR(50) NOT NULL,
    results_count INTEGER NOT NULL,
    clicked_result_position INTEGER,
    session_id VARCHAR(100),
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default admin roles
INSERT INTO admin_roles (name, description, permissions) VALUES
('Super Admin', 'Full system access', '{"all": true}'),
('Operations Manager', 'System operations and monitoring', '{"home": true, "system": true, "analytics": ["performance", "costs"]}'),
('Business Analyst', 'Business intelligence and analytics', '{"analytics": true, "users": ["view", "reports"]}'),
('Customer Support', 'User support and feedback management', '{"users": ["view", "support"], "system": ["messages", "feedback"]}');

-- Create indexes for better performance
CREATE INDEX idx_admin_users_email ON admin_users(email);
CREATE INDEX idx_admin_users_role_id ON admin_users(role_id);
CREATE INDEX idx_system_messages_active ON system_messages(is_active, start_date, end_date);
CREATE INDEX idx_user_feedback_status ON user_feedback(status);
CREATE INDEX idx_user_feedback_user_id ON user_feedback(user_id);
CREATE INDEX idx_report_ratings_user_id ON report_ratings(user_id);
CREATE INDEX idx_report_ratings_report_type ON report_ratings(report_type);
CREATE INDEX idx_system_metrics_category ON system_metrics(category, recorded_at);
CREATE INDEX idx_api_performance_endpoint ON api_performance_logs(endpoint, created_at);
CREATE INDEX idx_llm_usage_user_id ON llm_usage_logs(user_id, created_at);
CREATE INDEX idx_cache_performance_type ON cache_performance(cache_type, created_at);
CREATE INDEX idx_search_analytics_query ON search_analytics(search_query, created_at);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_admin_users_updated_at BEFORE UPDATE ON admin_users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_admin_roles_updated_at BEFORE UPDATE ON admin_roles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_messages_updated_at BEFORE UPDATE ON system_messages 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_feedback_updated_at BEFORE UPDATE ON user_feedback 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enhanced point system functions

-- Function to grant signup bonus (3,000P, 3-month expiration)
CREATE OR REPLACE FUNCTION grant_signup_bonus(p_user_id UUID)
RETURNS TABLE(
    granted BOOLEAN,
    points_amount INTEGER,
    message TEXT,
    expires_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    v_existing_bonus INTEGER;
    v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Check if signup bonus already granted
    SELECT COUNT(*) INTO v_existing_bonus
    FROM point_transactions 
    WHERE user_id = p_user_id 
    AND transaction_type = 'signup_bonus';
    
    IF v_existing_bonus > 0 THEN
        RETURN QUERY SELECT false, 0, 'Signup bonus already granted'::TEXT, NULL::TIMESTAMP WITH TIME ZONE;
        RETURN;
    END IF;
    
    -- Set expiration to 3 months from now
    v_expires_at := NOW() + INTERVAL '3 months';
    
    -- Grant signup bonus
    INSERT INTO point_transactions (
        user_id, 
        transaction_type, 
        points_change, 
        description,
        expires_at,
        created_at
    ) VALUES (
        p_user_id, 
        'signup_bonus', 
        3000, 
        'Welcome bonus for new registration',
        v_expires_at,
        NOW()
    );
    
    RETURN QUERY SELECT true, 3000, 'Signup bonus granted successfully'::TEXT, v_expires_at;
END;
$$ LANGUAGE plpgsql;

-- Function to get comprehensive point grant statistics
CREATE OR REPLACE FUNCTION get_point_grant_stats(p_user_id UUID)
RETURNS TABLE(
    signup_bonus_granted BOOLEAN,
    signup_bonus_date TIMESTAMP WITH TIME ZONE,
    total_monthly_grants INTEGER,
    total_points_granted INTEGER,
    current_month_granted BOOLEAN,
    next_grant_date TIMESTAMP WITH TIME ZONE,
    expiring_points INTEGER,
    expiring_date TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    v_signup_bonus_granted BOOLEAN := false;
    v_signup_bonus_date TIMESTAMP WITH TIME ZONE;
    v_total_monthly_grants INTEGER := 0;
    v_total_points_granted INTEGER := 0;
    v_current_month_granted BOOLEAN := false;
    v_next_grant_date TIMESTAMP WITH TIME ZONE;
    v_expiring_points INTEGER := 0;
    v_expiring_date TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Check signup bonus
    SELECT COUNT(*) > 0, MIN(created_at) INTO v_signup_bonus_granted, v_signup_bonus_date
    FROM point_transactions 
    WHERE user_id = p_user_id AND transaction_type = 'signup_bonus';
    
    -- Count monthly grants
    SELECT COUNT(*) INTO v_total_monthly_grants
    FROM point_transactions 
    WHERE user_id = p_user_id AND transaction_type = 'monthly_free';
    
    -- Total points granted (free points only)
    SELECT COALESCE(SUM(points_change), 0) INTO v_total_points_granted
    FROM point_transactions 
    WHERE user_id = p_user_id 
    AND transaction_type IN ('signup_bonus', 'monthly_free');
    
    -- Check if current month granted
    SELECT COUNT(*) > 0 INTO v_current_month_granted
    FROM point_transactions 
    WHERE user_id = p_user_id 
    AND transaction_type = 'monthly_free'
    AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW());
    
    -- Calculate next grant date
    IF v_current_month_granted THEN
        v_next_grant_date := DATE_TRUNC('month', NOW()) + INTERVAL '1 month';
    ELSE
        v_next_grant_date := NOW();
    END IF;
    
    -- Get expiring points (within next 7 days)
    SELECT COALESCE(SUM(points_change), 0), MIN(expires_at) 
    INTO v_expiring_points, v_expiring_date
    FROM point_transactions 
    WHERE user_id = p_user_id 
    AND expires_at IS NOT NULL 
    AND expires_at BETWEEN NOW() AND NOW() + INTERVAL '7 days'
    AND points_change > 0;
    
    RETURN QUERY SELECT 
        v_signup_bonus_granted,
        v_signup_bonus_date,
        v_total_monthly_grants,
        v_total_points_granted,
        v_current_month_granted,
        v_next_grant_date,
        v_expiring_points,
        v_expiring_date;
END;
$$ LANGUAGE plpgsql;

-- Update existing monthly free points function to use 1,500 points and 1-month expiration
CREATE OR REPLACE FUNCTION check_and_grant_monthly_free_points(p_user_id UUID)
RETURNS TABLE(
    granted BOOLEAN,
    points_amount INTEGER,
    message TEXT,
    expires_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    v_last_grant_date DATE;
    v_current_month DATE;
    v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get current month
    v_current_month := DATE_TRUNC('month', NOW())::DATE;
    
    -- Check if already granted this month
    SELECT DATE_TRUNC('month', created_at)::DATE INTO v_last_grant_date
    FROM point_transactions 
    WHERE user_id = p_user_id 
    AND transaction_type = 'monthly_free'
    ORDER BY created_at DESC 
    LIMIT 1;
    
    -- If already granted this month, return false
    IF v_last_grant_date = v_current_month THEN
        RETURN QUERY SELECT false, 0, 'Monthly free points already granted this month'::TEXT, NULL::TIMESTAMP WITH TIME ZONE;
        RETURN;
    END IF;
    
    -- Set expiration to 1 month from now
    v_expires_at := NOW() + INTERVAL '1 month';
    
    -- Grant monthly free points (1,500P)
    INSERT INTO point_transactions (
        user_id, 
        transaction_type, 
        points_change, 
        description,
        expires_at,
        created_at
    ) VALUES (
        p_user_id, 
        'monthly_free', 
        1500, 
        'Monthly free points',
        v_expires_at,
        NOW()
    );
    
    RETURN QUERY SELECT true, 1500, 'Monthly free points granted successfully'::TEXT, v_expires_at;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON admin_users TO authenticated;
GRANT SELECT ON admin_roles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON system_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE ON user_feedback TO authenticated;
GRANT SELECT, INSERT ON report_ratings TO authenticated;
GRANT SELECT, INSERT ON system_metrics TO authenticated;
GRANT SELECT, INSERT ON api_performance_logs TO authenticated;
GRANT SELECT, INSERT ON llm_usage_logs TO authenticated;
GRANT SELECT, INSERT ON cache_performance TO authenticated;
GRANT SELECT, INSERT ON search_analytics TO authenticated;

-- Grant permissions to anon users (limited)
GRANT SELECT ON system_messages TO anon;
GRANT INSERT ON user_feedback TO anon;
GRANT INSERT ON report_ratings TO anon;
GRANT INSERT ON search_analytics TO anon;