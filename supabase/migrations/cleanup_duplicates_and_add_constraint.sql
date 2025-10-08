-- Step 1: Identify and remove duplicate reports
-- Keep only the most recent report for each user_id + application_number + analysis_type combination

WITH duplicate_reports AS (
  SELECT 
    id,
    user_id,
    application_number,
    analysis_type,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, application_number, analysis_type 
      ORDER BY created_at DESC
    ) as rn
  FROM ai_analysis_reports
)
DELETE FROM ai_analysis_reports 
WHERE id IN (
  SELECT id 
  FROM duplicate_reports 
  WHERE rn > 1
);

-- Step 2: Add unique constraint to prevent future duplicates
ALTER TABLE ai_analysis_reports 
ADD CONSTRAINT unique_user_application_analysis 
UNIQUE (user_id, application_number, analysis_type);

-- Step 3: Add comment to explain the constraint
COMMENT ON CONSTRAINT unique_user_application_analysis ON ai_analysis_reports 
IS 'Prevents duplicate reports for the same user, application number, and analysis type combination';