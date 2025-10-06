-- Migration: Enhance Dashboard Metrics
-- Description: Add tables and fields to support new dashboard metrics requirements

-- Add missing fields to search_history table for better analytics
ALTER TABLE search_history 
ADD COLUMN IF NOT EXISTS results_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS search_filters JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS search_duration_ms INTEGER,
ADD COLUMN IF NOT EXISTS ipc_codes TEXT[],
ADD COLUMN IF NOT EXISTS technology_field TEXT;

-- Add missing fields to users table for tracking
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS total_searches INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_detail_views INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_logins INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_usage_cost NUMERIC(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;

-- Create patent_detail_views table to track detail page views
CREATE TABLE IF NOT EXISTS patent_detail_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    patent_application_number TEXT NOT NULL,
    patent_title TEXT,
    applicant_name TEXT,
    view_duration_ms INTEGER,
    referrer_page TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create search_keyword_analytics table for field distribution
CREATE TABLE IF NOT EXISTS search_keyword_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    keyword TEXT NOT NULL,
    technology_field TEXT,
    ipc_main_class TEXT, -- First letter of IPC code (A, B, C, D, E, F, G, H)
    search_count INTEGER DEFAULT 1,
    last_searched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, keyword, technology_field)
);

-- Create user_login_logs table for tracking login statistics
CREATE TABLE IF NOT EXISTS user_login_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    login_method TEXT DEFAULT 'email', -- email, google, etc.
    ip_address INET,
    user_agent TEXT,
    login_success BOOLEAN DEFAULT TRUE,
    session_duration_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create usage_cost_tracking table for detailed cost tracking
CREATE TABLE IF NOT EXISTS usage_cost_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    service_type TEXT NOT NULL, -- 'search', 'ai_analysis', 'document_download', etc.
    cost_amount NUMERIC(10,4) NOT NULL,
    currency TEXT DEFAULT 'KRW',
    billing_unit TEXT, -- 'per_search', 'per_token', 'per_download', etc.
    quantity INTEGER DEFAULT 1,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_search_history_user_created ON search_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_history_technology_field ON search_history(technology_field);
CREATE INDEX IF NOT EXISTS idx_patent_detail_views_user_created ON patent_detail_views(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_keyword_analytics_user_field ON search_keyword_analytics(user_id, technology_field);
CREATE INDEX IF NOT EXISTS idx_search_keyword_analytics_last_searched ON search_keyword_analytics(last_searched_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_login_logs_user_created ON user_login_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_cost_tracking_user_created ON usage_cost_tracking(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_cost_tracking_service_type ON usage_cost_tracking(service_type);

-- Enable RLS on new tables
ALTER TABLE patent_detail_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_keyword_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_login_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_cost_tracking ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for new tables
-- Patent detail views policies
CREATE POLICY "Users can view their own patent detail views" ON patent_detail_views
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own patent detail views" ON patent_detail_views
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Search keyword analytics policies
CREATE POLICY "Users can view their own search analytics" ON search_keyword_analytics
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own search analytics" ON search_keyword_analytics
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own search analytics" ON search_keyword_analytics
    FOR UPDATE USING (auth.uid() = user_id);

-- User login logs policies
CREATE POLICY "Users can view their own login logs" ON user_login_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own login logs" ON user_login_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Usage cost tracking policies
CREATE POLICY "Users can view their own usage costs" ON usage_cost_tracking
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own usage costs" ON usage_cost_tracking
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Grant permissions to anon and authenticated roles
GRANT SELECT ON patent_detail_views TO anon, authenticated;
GRANT INSERT ON patent_detail_views TO authenticated;

GRANT SELECT ON search_keyword_analytics TO anon, authenticated;
GRANT INSERT, UPDATE ON search_keyword_analytics TO authenticated;

GRANT SELECT ON user_login_logs TO anon, authenticated;
GRANT INSERT ON user_login_logs TO authenticated;

GRANT SELECT ON usage_cost_tracking TO anon, authenticated;
GRANT INSERT ON usage_cost_tracking TO authenticated;

-- Create function to categorize IPC codes into technology fields
CREATE OR REPLACE FUNCTION get_technology_field_from_ipc(ipc_code TEXT)
RETURNS TEXT AS $$
BEGIN
    IF ipc_code IS NULL OR LENGTH(ipc_code) = 0 THEN
        RETURN 'Unknown';
    END IF;
    
    CASE UPPER(SUBSTRING(ipc_code, 1, 1))
        WHEN 'A' THEN RETURN 'Human Necessities';
        WHEN 'B' THEN RETURN 'Operations & Transport';
        WHEN 'C' THEN RETURN 'Chemistry & Metallurgy';
        WHEN 'D' THEN RETURN 'Textiles & Paper';
        WHEN 'E' THEN RETURN 'Fixed Constructions';
        WHEN 'F' THEN RETURN 'Mechanical Engineering';
        WHEN 'G' THEN RETURN 'Physics';
        WHEN 'H' THEN RETURN 'Electricity';
        ELSE RETURN 'Other';
    END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create function to update user statistics
CREATE OR REPLACE FUNCTION update_user_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update total searches when search_history is inserted
    IF TG_TABLE_NAME = 'search_history' AND TG_OP = 'INSERT' THEN
        UPDATE users 
        SET total_searches = total_searches + 1
        WHERE id = NEW.user_id;
        RETURN NEW;
    END IF;
    
    -- Update total detail views when patent_detail_views is inserted
    IF TG_TABLE_NAME = 'patent_detail_views' AND TG_OP = 'INSERT' THEN
        UPDATE users 
        SET total_detail_views = total_detail_views + 1
        WHERE id = NEW.user_id;
        RETURN NEW;
    END IF;
    
    -- Update total logins when user_login_logs is inserted
    IF TG_TABLE_NAME = 'user_login_logs' AND TG_OP = 'INSERT' THEN
        UPDATE users 
        SET total_logins = total_logins + 1,
            last_login_at = NEW.created_at
        WHERE id = NEW.user_id;
        RETURN NEW;
    END IF;
    
    -- Update total usage cost when usage_cost_tracking is inserted
    IF TG_TABLE_NAME = 'usage_cost_tracking' AND TG_OP = 'INSERT' THEN
        UPDATE users 
        SET total_usage_cost = total_usage_cost + NEW.cost_amount
        WHERE id = NEW.user_id;
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically update user statistics
DROP TRIGGER IF EXISTS trigger_update_search_stats ON search_history;
CREATE TRIGGER trigger_update_search_stats
    AFTER INSERT ON search_history
    FOR EACH ROW EXECUTE FUNCTION update_user_stats();

DROP TRIGGER IF EXISTS trigger_update_detail_view_stats ON patent_detail_views;
CREATE TRIGGER trigger_update_detail_view_stats
    AFTER INSERT ON patent_detail_views
    FOR EACH ROW EXECUTE FUNCTION update_user_stats();

DROP TRIGGER IF EXISTS trigger_update_login_stats ON user_login_logs;
CREATE TRIGGER trigger_update_login_stats
    AFTER INSERT ON user_login_logs
    FOR EACH ROW EXECUTE FUNCTION update_user_stats();

DROP TRIGGER IF EXISTS trigger_update_cost_stats ON usage_cost_tracking;
CREATE TRIGGER trigger_update_cost_stats
    AFTER INSERT ON usage_cost_tracking
    FOR EACH ROW EXECUTE FUNCTION update_user_stats();

-- Insert some sample data for testing (optional)
-- This will be populated by the application during normal usage

COMMENT ON TABLE patent_detail_views IS 'Tracks when users view patent detail pages';
COMMENT ON TABLE search_keyword_analytics IS 'Analytics for search keywords and technology field distribution';
COMMENT ON TABLE user_login_logs IS 'Logs user login events for statistics';
COMMENT ON TABLE usage_cost_tracking IS 'Tracks usage costs for different services';