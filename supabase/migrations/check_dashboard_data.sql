-- Check current dashboard data
DO $$
DECLARE
    test_user_id UUID;
    user_count INTEGER;
    activity_count INTEGER;
    report_count INTEGER;
    result JSON;
BEGIN
    -- Get test user ID
    SELECT id INTO test_user_id FROM users WHERE email = 'test@example.com' LIMIT 1;
    
    IF test_user_id IS NULL THEN
        RAISE NOTICE 'Test user not found, checking all users...';
        SELECT id INTO test_user_id FROM users LIMIT 1;
    END IF;
    
    IF test_user_id IS NULL THEN
        RAISE NOTICE 'No users found in database!';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Using user ID: %', test_user_id;
    
    -- Check data counts
    SELECT COUNT(*) INTO user_count FROM users;
    SELECT COUNT(*) INTO activity_count FROM user_activities WHERE user_id = test_user_id;
    SELECT COUNT(*) INTO report_count FROM ai_analysis_reports WHERE user_id = test_user_id;
    
    RAISE NOTICE 'Data counts - Users: %, Activities: %, Reports: %', user_count, activity_count, report_count;
    
    -- Check user totals (using PERFORM to discard results)
    PERFORM total_logins, total_searches, total_reports 
    FROM users 
    WHERE id = test_user_id;
    
    RAISE NOTICE 'User totals - Logins: %, Searches: %, Reports: %', 
        (SELECT total_logins FROM users WHERE id = test_user_id),
        (SELECT total_searches FROM users WHERE id = test_user_id),
        (SELECT total_reports FROM users WHERE id = test_user_id);
    
    -- Test the function
    SELECT get_dashboard_stats(test_user_id, '30d') INTO result;
    
    RAISE NOTICE 'Function result keys: %', (SELECT array_agg(key) FROM json_object_keys(result) AS key);
    RAISE NOTICE 'Efficiency metrics: %', result->'efficiency_metrics';
    RAISE NOTICE 'Recent activities count: %', json_array_length(result->'recentActivities');
    RAISE NOTICE 'Search fields count: %', json_array_length(result->'search_fields_top10');
    RAISE NOTICE 'Report fields count: %', json_array_length(result->'report_fields_top10');
    
END $$;