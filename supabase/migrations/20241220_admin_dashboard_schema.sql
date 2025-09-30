-- Admin Dashboard Schema Migration
-- This migration creates tables for tracking admin dashboard metrics

-- 1. Update users table to include admin roles
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin'));

-- Create index for role-based queries
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 2. System metrics tracking table
CREATE TABLE IF NOT EXISTS system_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_type TEXT NOT NULL, -- 'api_calls', 'token_usage', 'latency', 'error_rate'
  metric_name TEXT NOT NULL, -- 'kipris_api', 'gemini_api', etc.
  value NUMERIC NOT NULL,
  unit TEXT, -- 'count', 'tokens', 'seconds', 'percentage'
  metadata JSONB DEFAULT '{}',
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for system metrics
CREATE INDEX IF NOT EXISTS idx_system_metrics_type_name ON system_metrics(metric_type, metric_name);
CREATE INDEX IF NOT EXISTS idx_system_metrics_recorded_at ON system_metrics(recorded_at);

-- 3. User activity tracking table
CREATE TABLE IF NOT EXISTS user_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL, -- 'login', 'search', 'report_generated', 'document_download'
  activity_data JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for user activities
CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON user_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_type ON user_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_user_activities_created_at ON user_activities(created_at);

-- 4. Patent search analytics table
CREATE TABLE IF NOT EXISTS patent_search_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  search_query TEXT NOT NULL,
  search_type TEXT, -- 'keyword', 'applicant', 'inventor', etc.
  results_count INTEGER DEFAULT 0,
  ipc_codes TEXT[], -- Array of IPC codes from results
  cpc_codes TEXT[], -- Array of CPC codes from results
  search_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for patent search analytics
CREATE INDEX IF NOT EXISTS idx_patent_search_user_id ON patent_search_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_patent_search_query ON patent_search_analytics USING gin(to_tsvector('english', search_query));
CREATE INDEX IF NOT EXISTS idx_patent_search_created_at ON patent_search_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_patent_search_ipc_codes ON patent_search_analytics USING gin(ipc_codes);

-- 5. LLM analysis tracking table
CREATE TABLE IF NOT EXISTS llm_analysis_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  patent_application_number TEXT NOT NULL,
  analysis_type TEXT NOT NULL, -- 'market_analysis', 'business_insight'
  prompt_tokens INTEGER DEFAULT 0,
  completion_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  cost_estimate NUMERIC(10,4) DEFAULT 0,
  processing_time_ms INTEGER,
  quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
  user_feedback TEXT,
  analysis_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for LLM analysis logs
CREATE INDEX IF NOT EXISTS idx_llm_analysis_user_id ON llm_analysis_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_llm_analysis_patent ON llm_analysis_logs(patent_application_number);
CREATE INDEX IF NOT EXISTS idx_llm_analysis_type ON llm_analysis_logs(analysis_type);
CREATE INDEX IF NOT EXISTS idx_llm_analysis_created_at ON llm_analysis_logs(created_at);

-- 6. Billing and subscription tracking table
CREATE TABLE IF NOT EXISTS billing_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'subscription_created', 'payment_succeeded', 'payment_failed', 'subscription_cancelled'
  subscription_tier TEXT, -- 'basic', 'pro', 'enterprise'
  amount NUMERIC(10,2),
  currency TEXT DEFAULT 'KRW',
  payment_method TEXT,
  stripe_event_id TEXT UNIQUE,
  event_data JSONB DEFAULT '{}',
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for billing events
CREATE INDEX IF NOT EXISTS idx_billing_events_user_id ON billing_events(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_events_type ON billing_events(event_type);
CREATE INDEX IF NOT EXISTS idx_billing_events_created_at ON billing_events(created_at);

-- 7. Document download tracking table
CREATE TABLE IF NOT EXISTS document_downloads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  patent_application_number TEXT NOT NULL,
  document_type TEXT NOT NULL, -- 'full_text', 'drawings', 'claims', etc.
  file_size_bytes BIGINT,
  download_success BOOLEAN DEFAULT true,
  download_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for document downloads
CREATE INDEX IF NOT EXISTS idx_document_downloads_user_id ON document_downloads(user_id);
CREATE INDEX IF NOT EXISTS idx_document_downloads_patent ON document_downloads(patent_application_number);
CREATE INDEX IF NOT EXISTS idx_document_downloads_type ON document_downloads(document_type);
CREATE INDEX IF NOT EXISTS idx_document_downloads_created_at ON document_downloads(created_at);

-- 8. Competitor mentions tracking table (extracted from LLM reports)
CREATE TABLE IF NOT EXISTS competitor_mentions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  analysis_id UUID REFERENCES llm_analysis_logs(id) ON DELETE CASCADE,
  competitor_name TEXT NOT NULL,
  mention_context TEXT,
  confidence_score NUMERIC(3,2) DEFAULT 0.5, -- 0.0 to 1.0
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for competitor mentions
CREATE INDEX IF NOT EXISTS idx_competitor_mentions_analysis_id ON competitor_mentions(analysis_id);
CREATE INDEX IF NOT EXISTS idx_competitor_mentions_name ON competitor_mentions(competitor_name);
CREATE INDEX IF NOT EXISTS idx_competitor_mentions_created_at ON competitor_mentions(created_at);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE patent_search_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE llm_analysis_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_mentions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for admin access
-- Only admin and super_admin roles can access these tables

-- System metrics policies
CREATE POLICY "Admin can view system metrics" ON system_metrics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admin can insert system metrics" ON system_metrics
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- User activities policies
CREATE POLICY "Admin can view user activities" ON user_activities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- Patent search analytics policies
CREATE POLICY "Admin can view patent search analytics" ON patent_search_analytics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- LLM analysis logs policies
CREATE POLICY "Admin can view LLM analysis logs" ON llm_analysis_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- Billing events policies
CREATE POLICY "Admin can view billing events" ON billing_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- Document downloads policies
CREATE POLICY "Admin can view document downloads" ON document_downloads
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- Competitor mentions policies
CREATE POLICY "Admin can view competitor mentions" ON competitor_mentions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- Grant permissions to authenticated users for their own data
GRANT SELECT ON system_metrics TO authenticated;
GRANT SELECT ON user_activities TO authenticated;
GRANT SELECT ON patent_search_analytics TO authenticated;
GRANT SELECT ON llm_analysis_logs TO authenticated;
GRANT SELECT ON billing_events TO authenticated;
GRANT SELECT ON document_downloads TO authenticated;
GRANT SELECT ON competitor_mentions TO authenticated;

-- Grant insert permissions for system logging
GRANT INSERT ON system_metrics TO authenticated;
GRANT INSERT ON user_activities TO authenticated;
GRANT INSERT ON patent_search_analytics TO authenticated;
GRANT INSERT ON llm_analysis_logs TO authenticated;
GRANT INSERT ON billing_events TO authenticated;
GRANT INSERT ON document_downloads TO authenticated;
GRANT INSERT ON competitor_mentions TO authenticated;