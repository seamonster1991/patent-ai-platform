-- Additional tables for complete admin dashboard functionality
-- This migration adds missing tables required by the PRD and technical architecture

-- 1. LLM Cost Tracking Table (more detailed than existing llm_usage_logs)
CREATE TABLE IF NOT EXISTS llm_cost_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_type VARCHAR(50) NOT NULL, -- 'gemini', 'openai', etc.
    tokens_used INTEGER NOT NULL,
    cost_usd DECIMAL(10,4) NOT NULL,
    request_type VARCHAR(50), -- 'analysis', 'search', 'report'
    user_id UUID,
    session_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Cache Statistics Table (aggregated cache performance data)
CREATE TABLE IF NOT EXISTS cache_statistics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cache_type VARCHAR(50) NOT NULL, -- 'llm_analysis', 'search_results'
    hit_count INTEGER DEFAULT 0,
    miss_count INTEGER DEFAULT 0,
    analytics_date DATE NOT NULL,
    total_requests INTEGER DEFAULT 0,
    hit_rate DECIMAL(5,2) DEFAULT 0, -- percentage
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Keyword Analytics Table (search keyword trends)
CREATE TABLE IF NOT EXISTS keyword_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    keyword VARCHAR(255) NOT NULL,
    search_count INTEGER NOT NULL,
    analytics_date DATE NOT NULL,
    growth_rate DECIMAL(5,2), -- weekly growth rate (%)
    rank_position INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Technology Field Analytics Table (IPC/CPC analysis)
CREATE TABLE IF NOT EXISTS technology_field_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ipc_code VARCHAR(20) NOT NULL,
    cpc_code VARCHAR(20),
    field_name VARCHAR(255) NOT NULL,
    analysis_count INTEGER NOT NULL,
    analytics_date DATE NOT NULL,
    percentage DECIMAL(5,2), -- percentage of total analyses
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Payment Records Table (for payment risk analysis)
CREATE TABLE IF NOT EXISTS payment_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    payment_method VARCHAR(50) NOT NULL, -- 'card', 'bank_transfer', etc.
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'KRW',
    status VARCHAR(20) NOT NULL, -- 'success', 'failed', 'pending', 'refunded'
    payment_gateway VARCHAR(50), -- 'stripe', 'toss', etc.
    gateway_transaction_id VARCHAR(255),
    failure_reason TEXT,
    card_last_four VARCHAR(4),
    card_expiry_month INTEGER,
    card_expiry_year INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

-- 6. User Activities Table (for user behavior tracking)
CREATE TABLE IF NOT EXISTS user_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    activity_type VARCHAR(50) NOT NULL, -- 'login', 'search', 'report_generate', 'point_use'
    activity_data JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_llm_cost_tracking_created_at ON llm_cost_tracking(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_llm_cost_tracking_service_type ON llm_cost_tracking(service_type, created_at);
CREATE INDEX IF NOT EXISTS idx_cache_statistics_date ON cache_statistics(analytics_date DESC);
CREATE INDEX IF NOT EXISTS idx_cache_statistics_type ON cache_statistics(cache_type, analytics_date);
CREATE INDEX IF NOT EXISTS idx_keyword_analytics_date ON keyword_analytics(analytics_date DESC);
CREATE INDEX IF NOT EXISTS idx_keyword_analytics_keyword ON keyword_analytics(keyword, analytics_date);
CREATE INDEX IF NOT EXISTS idx_technology_field_analytics_date ON technology_field_analytics(analytics_date DESC);
CREATE INDEX IF NOT EXISTS idx_technology_field_analytics_ipc ON technology_field_analytics(ipc_code, analytics_date);
CREATE INDEX IF NOT EXISTS idx_payment_records_user_id ON payment_records(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_payment_records_status ON payment_records(status, created_at);
CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON user_activities(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_user_activities_type ON user_activities(activity_type, created_at);

-- Insert sample data for testing and demonstration

-- Sample LLM cost tracking data
INSERT INTO llm_cost_tracking (service_type, tokens_used, cost_usd, request_type, user_id) VALUES
('gemini', 15000, 0.045, 'analysis', (SELECT id FROM users LIMIT 1)),
('gemini', 8500, 0.025, 'search', (SELECT id FROM users LIMIT 1)),
('gemini', 12000, 0.036, 'report', (SELECT id FROM users LIMIT 1)),
('gemini', 20000, 0.060, 'analysis', (SELECT id FROM users LIMIT 1)),
('gemini', 5500, 0.016, 'search', (SELECT id FROM users LIMIT 1));

-- Sample cache statistics data
INSERT INTO cache_statistics (cache_type, hit_count, miss_count, analytics_date, total_requests, hit_rate) VALUES
('llm_analysis', 850, 150, CURRENT_DATE, 1000, 85.0),
('search_results', 720, 280, CURRENT_DATE, 1000, 72.0),
('llm_analysis', 800, 200, CURRENT_DATE - 1, 1000, 80.0),
('search_results', 680, 320, CURRENT_DATE - 1, 1000, 68.0);

-- Sample keyword analytics data
INSERT INTO keyword_analytics (keyword, search_count, analytics_date, growth_rate, rank_position) VALUES
('artificial intelligence', 1250, CURRENT_DATE, 15.5, 1),
('machine learning', 980, CURRENT_DATE, 8.2, 2),
('blockchain', 750, CURRENT_DATE, -2.1, 3),
('quantum computing', 620, CURRENT_DATE, 22.8, 4),
('5G technology', 580, CURRENT_DATE, 5.4, 5),
('IoT sensors', 450, CURRENT_DATE, 12.3, 6),
('autonomous vehicles', 420, CURRENT_DATE, -5.2, 7),
('renewable energy', 380, CURRENT_DATE, 18.7, 8),
('biotechnology', 350, CURRENT_DATE, 9.1, 9),
('cybersecurity', 320, CURRENT_DATE, 6.8, 10);

-- Sample technology field analytics data
INSERT INTO technology_field_analytics (ipc_code, cpc_code, field_name, analysis_count, analytics_date, percentage) VALUES
('G06F', 'G06F3/01', 'Computer Technology', 450, CURRENT_DATE, 25.5),
('H04L', 'H04L29/06', 'Telecommunications', 320, CURRENT_DATE, 18.1),
('A61K', 'A61K31/00', 'Medical Technology', 280, CURRENT_DATE, 15.9),
('G01N', 'G01N33/50', 'Measurement Technology', 220, CURRENT_DATE, 12.5),
('H01L', 'H01L29/78', 'Semiconductors', 180, CURRENT_DATE, 10.2),
('C07D', 'C07D213/30', 'Organic Chemistry', 150, CURRENT_DATE, 8.5),
('B01D', 'B01D53/14', 'Chemical Engineering', 120, CURRENT_DATE, 6.8),
('F21V', 'F21V23/00', 'Lighting Technology', 45, CURRENT_DATE, 2.5);

-- Sample payment records data (using existing user IDs if available)
INSERT INTO payment_records (user_id, payment_method, amount, status, payment_gateway, card_last_four, card_expiry_month, card_expiry_year, created_at) VALUES
((SELECT id FROM users LIMIT 1), 'card', 29000, 'success', 'stripe', '1234', 12, 2025, NOW() - INTERVAL '1 day'),
((SELECT id FROM users LIMIT 1), 'card', 59000, 'success', 'stripe', '5678', 8, 2026, NOW() - INTERVAL '2 days'),
((SELECT id FROM users LIMIT 1), 'card', 29000, 'failed', 'stripe', '9012', 3, 2024, NOW() - INTERVAL '3 days');

-- Sample user activities data
INSERT INTO user_activities (user_id, activity_type, activity_data, created_at) VALUES
((SELECT id FROM users LIMIT 1), 'login', '{"ip": "192.168.1.1", "device": "desktop"}', NOW() - INTERVAL '1 hour'),
((SELECT id FROM users LIMIT 1), 'search', '{"query": "AI patent", "results": 150}', NOW() - INTERVAL '2 hours'),
((SELECT id FROM users LIMIT 1), 'report_generate', '{"type": "market_analysis", "patent_id": "US123456"}', NOW() - INTERVAL '3 hours');

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON llm_cost_tracking TO authenticated;
GRANT SELECT, INSERT, UPDATE ON cache_statistics TO authenticated;
GRANT SELECT, INSERT, UPDATE ON keyword_analytics TO authenticated;
GRANT SELECT, INSERT, UPDATE ON technology_field_analytics TO authenticated;
GRANT SELECT, INSERT, UPDATE ON payment_records TO authenticated;
GRANT SELECT, INSERT, UPDATE ON user_activities TO authenticated;

-- Grant permissions to anon users (limited)
GRANT SELECT ON keyword_analytics TO anon;
GRANT SELECT ON technology_field_analytics TO anon;
GRANT INSERT ON user_activities TO anon;