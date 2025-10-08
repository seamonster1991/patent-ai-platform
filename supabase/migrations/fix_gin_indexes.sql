-- Fix GIN indexes for text fields in user_activities table

-- Add user_agent and ip_address columns if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_activities' AND column_name = 'user_agent') THEN
        ALTER TABLE user_activities ADD COLUMN user_agent TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_activities' AND column_name = 'ip_address') THEN
        ALTER TABLE user_activities ADD COLUMN ip_address INET;
    END IF;
END $$;

-- Create basic indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_activities_user_type ON user_activities(user_id, activity_type);
CREATE INDEX IF NOT EXISTS idx_user_activities_data_gin ON user_activities USING GIN (activity_data);

-- Use btree indexes for exact matches on JSONB fields
CREATE INDEX IF NOT EXISTS idx_user_activities_keyword_btree 
ON user_activities ((activity_data->>'keyword'));

CREATE INDEX IF NOT EXISTS idx_user_activities_application_number_btree 
ON user_activities ((activity_data->>'application_number'));

-- Partial indexes for specific activity types
CREATE INDEX IF NOT EXISTS idx_user_activities_search ON user_activities(user_id, created_at) 
WHERE activity_type = 'search';

CREATE INDEX IF NOT EXISTS idx_user_activities_patent_view ON user_activities(user_id, created_at) 
WHERE activity_type = 'patent_view';

CREATE INDEX IF NOT EXISTS idx_user_activities_ai_analysis ON user_activities(user_id, created_at) 
WHERE activity_type = 'ai_analysis';