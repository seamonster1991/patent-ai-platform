-- Check if test data was created successfully
SELECT 
    'Users' as table_name,
    COUNT(*) as count
FROM users
WHERE email = 'test@example.com'

UNION ALL

SELECT 
    'User Activities' as table_name,
    COUNT(*) as count
FROM user_activities
WHERE user_id = (SELECT id FROM users WHERE email = 'test@example.com' LIMIT 1)

UNION ALL

SELECT 
    'AI Analysis Reports' as table_name,
    COUNT(*) as count
FROM ai_analysis_reports
WHERE user_id = (SELECT id FROM users WHERE email = 'test@example.com' LIMIT 1)

UNION ALL

SELECT 
    'Search Keyword Analytics' as table_name,
    COUNT(*) as count
FROM search_keyword_analytics
WHERE user_id = (SELECT id FROM users WHERE email = 'test@example.com' LIMIT 1);

-- Get the test user ID
SELECT 
    id as test_user_id,
    email,
    name
FROM users 
WHERE email = 'test@example.com';

-- Check user activities data
SELECT 
    activity_type,
    activity_data,
    created_at
FROM user_activities 
WHERE user_id = (SELECT id FROM users WHERE email = 'test@example.com' LIMIT 1)
ORDER BY created_at DESC
LIMIT 5;