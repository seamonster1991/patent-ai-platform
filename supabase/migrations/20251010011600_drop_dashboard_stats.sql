-- Drop existing get_dashboard_stats function to allow recreation with new return type
DROP FUNCTION IF EXISTS get_dashboard_stats(uuid, text);
DROP FUNCTION IF EXISTS get_dashboard_stats(uuid);
DROP FUNCTION IF EXISTS get_dashboard_stats();