-- Dashboard Analytics Schema Migration
-- Creates tables, views, and functions for user dashboard analytics

-- Create additional tables for dashboard analytics
CREATE TABLE IF NOT EXISTS usage_cost_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL,
  cost_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'KRW',
  billing_unit TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS billing_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  subscription_tier TEXT,
  amount NUMERIC(10,2),
  currency TEXT DEFAULT 'KRW',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS search_keyword_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  technology_field TEXT,
  ipc_main_class TEXT,
  search_count INTEGER DEFAULT 1,
  last_searched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_login_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  login_method TEXT DEFAULT 'email',
  ip_address INET,
  login_success BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS patent_detail_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  patent_application_number TEXT NOT NULL,
  patent_title TEXT,
  view_duration_ms INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_usage_cost_tracking_user_id ON usage_cost_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_cost_tracking_created_at ON usage_cost_tracking(created_at);
CREATE INDEX IF NOT EXISTS idx_billing_events_user_id ON billing_events(user_id);
CREATE INDEX IF NOT EXISTS idx_search_keyword_analytics_user_id ON search_keyword_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_search_keyword_analytics_keyword ON search_keyword_analytics(keyword);
CREATE INDEX IF NOT EXISTS idx_user_login_logs_user_id ON user_login_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_patent_detail_views_user_id ON patent_detail_views(user_id);

-- Create views for dashboard analytics
CREATE OR REPLACE VIEW user_efficiency_metrics AS
SELECT 
  u.id as user_id,
  u.email,
  COALESCE(u.total_logins, 0) as total_logins,
  COALESCE(u.total_searches, 0) as total_searches,
  COALESCE(u.total_reports, 0) as total_reports,
  CASE 
    WHEN COALESCE(u.total_logins, 0) > 0 THEN (COALESCE(u.total_reports, 0)::float / u.total_logins * 100)
    ELSE 0 
  END as login_to_report_rate,
  CASE 
    WHEN COALESCE(u.total_searches, 0) > 0 THEN (COALESCE(u.total_reports, 0)::float / u.total_searches * 100)
    ELSE 0 
  END as search_to_report_rate
FROM users u
WHERE u.role = 'user';

CREATE OR REPLACE VIEW user_technology_interests AS
SELECT 
  ska.user_id,
  ska.technology_field,
  ska.ipc_main_class,
  SUM(ska.search_count) as total_searches,
  COUNT(DISTINCT ska.keyword) as unique_keywords,
  MAX(ska.last_searched_at) as last_activity
FROM search_keyword_analytics ska
GROUP BY ska.user_id, ska.technology_field, ska.ipc_main_class
ORDER BY total_searches DESC;

CREATE OR REPLACE VIEW user_monthly_usage AS
SELECT 
  uct.user_id,
  DATE_TRUNC('month', uct.created_at) as month,
  uct.service_type,
  SUM(uct.cost_amount) as total_cost,
  SUM(uct.quantity) as total_quantity,
  COUNT(*) as transaction_count
FROM usage_cost_tracking uct
GROUP BY uct.user_id, DATE_TRUNC('month', uct.created_at), uct.service_type
ORDER BY month DESC;

-- Create dashboard stats function
CREATE OR REPLACE FUNCTION get_dashboard_stats(p_user_id UUID, p_period TEXT DEFAULT '30d')
RETURNS JSON AS $$
DECLARE
  result JSON;
  period_interval INTERVAL;
BEGIN
  -- Set period interval
  CASE p_period
    WHEN '7d' THEN period_interval := INTERVAL '7 days';
    WHEN '30d' THEN period_interval := INTERVAL '30 days';
    WHEN '90d' THEN period_interval := INTERVAL '90 days';
    ELSE period_interval := INTERVAL '30 days';
  END CASE;
  
  -- Build comprehensive stats JSON
  SELECT json_build_object(
    'quota_status', (
      SELECT json_build_object(
        'remaining_credits', COALESCE(u.total_usage_cost, 15000),
        'remaining_reports', GREATEST(50 - COALESCE(u.total_reports, 0), 0),
        'subscription_plan', COALESCE(u.subscription_plan, 'basic'),
        'last_login', u.last_login_at,
        'expiry_date', (NOW() + INTERVAL '30 days')::date,
        'days_until_expiry', 30
      )
      FROM users u WHERE u.id = p_user_id
    ),
    'efficiency_metrics', (
      SELECT json_build_object(
        'login_to_report_rate', COALESCE(ROUND(uem.login_to_report_rate::numeric, 1), 0),
        'search_to_report_rate', COALESCE(ROUND(uem.search_to_report_rate::numeric, 1), 0),
        'total_logins', COALESCE(uem.total_logins, 0),
        'total_searches', COALESCE(uem.total_searches, 0),
        'total_reports', COALESCE(uem.total_reports, 0)
      )
      FROM user_efficiency_metrics uem WHERE uem.user_id = p_user_id
    ),
    'recent_activities', (
      SELECT json_build_object(
        'reports', COALESCE(
          (SELECT json_agg(
            json_build_object(
              'title', COALESCE(activity_data->>'title', 'Untitled Report'),
              'created_at', created_at,
              'patent_id', activity_data->>'patent_id'
            )
          )
          FROM user_activities 
          WHERE user_id = p_user_id 
            AND activity_type = 'report_generate'
            AND created_at >= NOW() - period_interval
          ORDER BY created_at DESC 
          LIMIT 5), '[]'::json
        ),
        'searches', COALESCE(
          (SELECT json_agg(
            json_build_object(
              'keyword', keyword,
              'searched_at', last_searched_at,
              'technology_field', COALESCE(technology_field, 'General')
            )
          )
          FROM search_keyword_analytics 
          WHERE user_id = p_user_id
            AND last_searched_at >= NOW() - period_interval
          ORDER BY last_searched_at DESC 
          LIMIT 5), '[]'::json
        )
      )
    ),
    'technology_fields', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'field', COALESCE(technology_field, 'General'),
          'percentage', ROUND((total_searches::float / GREATEST(SUM(total_searches) OVER(), 1) * 100)::numeric, 1),
          'ipc_code', COALESCE(ipc_main_class, 'G'),
          'search_count', total_searches
        )
      ), '[]'::json)
      FROM (
        SELECT 
          COALESCE(technology_field, 'General') as technology_field, 
          COALESCE(ipc_main_class, 'G') as ipc_main_class, 
          total_searches
        FROM user_technology_interests 
        WHERE user_id = p_user_id
        ORDER BY total_searches DESC 
        LIMIT 3
      ) top_fields
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_dashboard_stats(UUID, TEXT) TO authenticated;
GRANT SELECT ON user_efficiency_metrics TO authenticated;
GRANT SELECT ON user_technology_interests TO authenticated;
GRANT SELECT ON user_monthly_usage TO authenticated;
GRANT SELECT ON usage_cost_tracking TO authenticated;
GRANT SELECT ON billing_events TO authenticated;
GRANT SELECT ON search_keyword_analytics TO authenticated;
GRANT SELECT ON user_login_logs TO authenticated;
GRANT SELECT ON patent_detail_views TO authenticated;

-- Enable RLS on new tables
ALTER TABLE usage_cost_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_keyword_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_login_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE patent_detail_views ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (with IF NOT EXISTS equivalent)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'usage_cost_tracking' AND policyname = 'Users can view their own usage cost tracking') THEN
    CREATE POLICY "Users can view their own usage cost tracking" ON usage_cost_tracking
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'billing_events' AND policyname = 'Users can view their own billing events') THEN
    CREATE POLICY "Users can view their own billing events" ON billing_events
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'search_keyword_analytics' AND policyname = 'Users can view their own search analytics') THEN
    CREATE POLICY "Users can view their own search analytics" ON search_keyword_analytics
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_login_logs' AND policyname = 'Users can view their own login logs') THEN
    CREATE POLICY "Users can view their own login logs" ON user_login_logs
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'patent_detail_views' AND policyname = 'Users can view their own patent detail views') THEN
    CREATE POLICY "Users can view their own patent detail views" ON patent_detail_views
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

-- Insert some sample data for testing
INSERT INTO search_keyword_analytics (user_id, keyword, technology_field, ipc_main_class, search_count, last_searched_at)
SELECT 
  u.id,
  'AI 음성인식',
  'Physics',
  'G',
  5,
  NOW() - INTERVAL '2 days'
FROM users u 
WHERE u.email = 'seongwan@example.com'
ON CONFLICT DO NOTHING;

INSERT INTO search_keyword_analytics (user_id, keyword, technology_field, ipc_main_class, search_count, last_searched_at)
SELECT 
  u.id,
  '머신러닝',
  'Computing',
  'G',
  3,
  NOW() - INTERVAL '1 day'
FROM users u 
WHERE u.email = 'seongwan@example.com'
ON CONFLICT DO NOTHING;

INSERT INTO usage_cost_tracking (user_id, service_type, cost_amount, billing_unit, quantity)
SELECT 
  u.id,
  'report_generation',
  500,
  'per_report',
  1
FROM users u 
WHERE u.email = 'seongwan@example.com'
ON CONFLICT DO NOTHING;