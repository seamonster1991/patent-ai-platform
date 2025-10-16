-- Create tables needed for analytics dashboard

-- User activity logs table
CREATE TABLE IF NOT EXISTS user_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    activity_type VARCHAR(50) NOT NULL,
    activity_data JSONB,
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Patent views table for tracking patent viewing patterns
CREATE TABLE IF NOT EXISTS patent_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    patent_id VARCHAR(50) NOT NULL,
    view_duration INTEGER, -- in seconds
    session_id VARCHAR(100),
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Report analytics table
CREATE TABLE IF NOT EXISTS report_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    report_type VARCHAR(50) NOT NULL,
    report_data JSONB,
    generation_time INTEGER, -- in seconds
    status VARCHAR(20) DEFAULT 'completed',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Technology trends table
CREATE TABLE IF NOT EXISTS technology_trends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    technology_field VARCHAR(100) NOT NULL,
    trend_score DECIMAL(5,2),
    patent_count INTEGER,
    growth_rate DECIMAL(5,2),
    period_start DATE,
    period_end DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User login logs table
CREATE TABLE IF NOT EXISTS user_login_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    login_method VARCHAR(50),
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_id ON user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_created_at ON user_activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_activity_type ON user_activity_logs(activity_type);

CREATE INDEX IF NOT EXISTS idx_patent_views_user_id ON patent_views(user_id);
CREATE INDEX IF NOT EXISTS idx_patent_views_patent_id ON patent_views(patent_id);
CREATE INDEX IF NOT EXISTS idx_patent_views_created_at ON patent_views(created_at);

CREATE INDEX IF NOT EXISTS idx_report_analytics_user_id ON report_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_report_analytics_report_type ON report_analytics(report_type);
CREATE INDEX IF NOT EXISTS idx_report_analytics_created_at ON report_analytics(created_at);

CREATE INDEX IF NOT EXISTS idx_technology_trends_field ON technology_trends(technology_field);
CREATE INDEX IF NOT EXISTS idx_technology_trends_period ON technology_trends(period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_user_login_logs_user_id ON user_login_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_login_logs_created_at ON user_login_logs(created_at);

-- Add indexes to existing search_analytics table
CREATE INDEX IF NOT EXISTS idx_search_analytics_user_id ON search_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_search_analytics_created_at ON search_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_search_analytics_search_type ON search_analytics(search_type);
CREATE INDEX IF NOT EXISTS idx_search_analytics_search_query ON search_analytics(search_query);

-- Verify tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('user_activity_logs', 'patent_views', 'report_analytics', 'technology_trends', 'user_login_logs')
ORDER BY table_name;