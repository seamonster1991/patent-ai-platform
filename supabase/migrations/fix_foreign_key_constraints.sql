-- Fix foreign key constraints to use consistent user table references
-- Some tables reference auth.users while others reference public.users
-- This migration ensures all tables reference public.users consistently

-- Drop existing foreign key constraints that reference auth.users
ALTER TABLE patent_detail_views DROP CONSTRAINT IF EXISTS patent_detail_views_user_id_fkey;
ALTER TABLE usage_cost_tracking DROP CONSTRAINT IF EXISTS usage_cost_tracking_user_id_fkey;
ALTER TABLE saved_patents DROP CONSTRAINT IF EXISTS saved_patents_user_id_fkey;
ALTER TABLE search_keyword_analytics DROP CONSTRAINT IF EXISTS search_keyword_analytics_user_id_fkey;
ALTER TABLE user_login_logs DROP CONSTRAINT IF EXISTS user_login_logs_user_id_fkey;
ALTER TABLE llm_analysis_logs DROP CONSTRAINT IF EXISTS llm_analysis_logs_user_id_fkey;
ALTER TABLE patent_search_analytics DROP CONSTRAINT IF EXISTS patent_search_analytics_user_id_fkey;
ALTER TABLE billing_events DROP CONSTRAINT IF EXISTS billing_events_user_id_fkey;
ALTER TABLE document_downloads DROP CONSTRAINT IF EXISTS document_downloads_user_id_fkey;

-- Add new foreign key constraints that reference public.users
ALTER TABLE patent_detail_views 
ADD CONSTRAINT patent_detail_views_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE usage_cost_tracking 
ADD CONSTRAINT usage_cost_tracking_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE saved_patents 
ADD CONSTRAINT saved_patents_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE search_keyword_analytics 
ADD CONSTRAINT search_keyword_analytics_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE user_login_logs 
ADD CONSTRAINT user_login_logs_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE llm_analysis_logs 
ADD CONSTRAINT llm_analysis_logs_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE patent_search_analytics 
ADD CONSTRAINT patent_search_analytics_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE billing_events 
ADD CONSTRAINT billing_events_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE document_downloads 
ADD CONSTRAINT document_downloads_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Ensure all existing user_id values in these tables are valid
-- Remove any orphaned records that don't have corresponding users in public.users
DELETE FROM patent_detail_views 
WHERE user_id IS NOT NULL 
AND user_id NOT IN (SELECT id FROM public.users);

DELETE FROM usage_cost_tracking 
WHERE user_id IS NOT NULL 
AND user_id NOT IN (SELECT id FROM public.users);

DELETE FROM saved_patents 
WHERE user_id IS NOT NULL 
AND user_id NOT IN (SELECT id FROM public.users);

DELETE FROM search_keyword_analytics 
WHERE user_id IS NOT NULL 
AND user_id NOT IN (SELECT id FROM public.users);

DELETE FROM user_login_logs 
WHERE user_id IS NOT NULL 
AND user_id NOT IN (SELECT id FROM public.users);

DELETE FROM llm_analysis_logs 
WHERE user_id IS NOT NULL 
AND user_id NOT IN (SELECT id FROM public.users);

DELETE FROM patent_search_analytics 
WHERE user_id IS NOT NULL 
AND user_id NOT IN (SELECT id FROM public.users);

DELETE FROM billing_events 
WHERE user_id IS NOT NULL 
AND user_id NOT IN (SELECT id FROM public.users);

DELETE FROM document_downloads 
WHERE user_id IS NOT NULL 
AND user_id NOT IN (SELECT id FROM public.users)