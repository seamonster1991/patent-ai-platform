-- Add technology_fields column to patent_search_analytics table
ALTER TABLE patent_search_analytics 
ADD COLUMN IF NOT EXISTS technology_fields text[] DEFAULT '{}';

-- Add technology_fields column to ai_analysis_reports table (if not exists)
ALTER TABLE ai_analysis_reports 
ADD COLUMN IF NOT EXISTS technology_fields text[] DEFAULT '{}';

-- Add comment for the new columns
COMMENT ON COLUMN patent_search_analytics.technology_fields IS 'Array of technology fields extracted from IPC/CPC codes and keywords';
COMMENT ON COLUMN ai_analysis_reports.technology_fields IS 'Array of technology fields extracted from patent data';