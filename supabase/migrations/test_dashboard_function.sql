-- Test the get_dashboard_stats function directly
DO $$
DECLARE
    test_user_id UUID;
    result JSON;
BEGIN
    -- Get test user ID
    SELECT id INTO test_user_id FROM users WHERE email = 'test@example.com' LIMIT 1;
    
    IF test_user_id IS NULL THEN
        RAISE NOTICE 'Test user not found!';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Testing with user ID: %', test_user_id;
    
    -- Call the function
    SELECT get_dashboard_stats(test_user_id, '30d') INTO result;
    
    -- Display the result structure
    RAISE NOTICE 'Function result: %', result;
    
    -- Check specific parts of the result
    RAISE NOTICE 'Quota status: %', result->'quota_status';
    RAISE NOTICE 'Efficiency metrics: %', result->'efficiency_metrics';
    RAISE NOTICE 'Recent activities: %', result->'recentActivities';
    RAISE NOTICE 'Daily searches: %', result->'daily_searches';
    RAISE NOTICE 'Daily reports: %', result->'daily_reports';
    RAISE NOTICE 'Search fields top 10: %', result->'search_fields_top10';
    RAISE NOTICE 'Report fields top 10: %', result->'report_fields_top10';
    
END $$;