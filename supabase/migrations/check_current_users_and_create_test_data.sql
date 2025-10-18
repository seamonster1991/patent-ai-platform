-- Check current users
SELECT COUNT(*) as user_count FROM users;
SELECT * FROM users LIMIT 5;

-- Check auth.users
SELECT COUNT(*) as auth_user_count FROM auth.users;

-- Create test user if none exist
DO $$
DECLARE
    test_user_id uuid;
    user_count integer;
BEGIN
    -- Check if users exist
    SELECT COUNT(*) INTO user_count FROM users;
    
    IF user_count = 0 THEN
        -- Create test user in auth.users first
        INSERT INTO auth.users (
            id,
            email,
            encrypted_password,
            email_confirmed_at,
            created_at,
            updated_at,
            confirmation_token,
            email_change_token_new,
            recovery_token
        ) VALUES (
            gen_random_uuid(),
            'test@patent-ai.com',
            '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
            now(),
            now(),
            now(),
            '',
            '',
            ''
        ) RETURNING id INTO test_user_id;
        
        -- Create corresponding user in public.users
        INSERT INTO users (
            id,
            email,
            name,
            phone,
            created_at,
            updated_at
        ) VALUES (
            test_user_id,
            'test@patent-ai.com',
            'Test User',
            '010-1234-5678',
            now(),
            now()
        );
        
        -- Create some test data
        INSERT INTO user_point_balances (user_id, total_points, available_points, used_points)
        VALUES (test_user_id, 5000, 3000, 2000);
        
        INSERT INTO search_history (user_id, keyword, created_at)
        VALUES 
            (test_user_id, 'AI 특허', now() - interval '1 day'),
            (test_user_id, '머신러닝', now() - interval '2 days'),
            (test_user_id, '딥러닝', now() - interval '3 days');
            
        INSERT INTO user_activities (user_id, activity_type, activity_data, created_at)
        VALUES 
            (test_user_id, 'search', '{"keyword": "AI 특허"}', now() - interval '1 day'),
            (test_user_id, 'report_generation', '{"report_id": "test"}', now() - interval '2 days');
            
        INSERT INTO reports (user_id, title, content, status, created_at)
        VALUES (test_user_id, 'AI 특허 분석 리포트', 'Test report content', 'completed', now() - interval '1 day');
        
        RAISE NOTICE 'Test user and data created successfully';
    ELSE
        RAISE NOTICE 'Users already exist, count: %', user_count;
    END IF;
END $$