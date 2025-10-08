-- Add unique constraint to prevent duplicate reports
-- This ensures that each user can only have one report per application_number and analysis_type combination

ALTER TABLE ai_analysis_reports 
ADD CONSTRAINT unique_user_application_analysis 
UNIQUE (user_id, application_number, analysis_type);

-- Add comment to explain the constraint
COMMENT ON CONSTRAINT unique_user_application_analysis ON ai_analysis_reports 
IS 'Prevents duplicate reports for the same user, application number, and analysis type combination';