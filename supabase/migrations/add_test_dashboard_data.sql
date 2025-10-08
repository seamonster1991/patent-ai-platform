-- Add test data for dashboard functionality
-- Description: Insert sample data to test dashboard features

-- First, let's get a real user ID from the users table and add test data
DO $$
DECLARE
    test_user_id UUID;
    i INTEGER;
BEGIN
    -- Get the first user ID from the users table
    SELECT id INTO test_user_id FROM users LIMIT 1;
    
    -- If no users exist, create a test user
    IF test_user_id IS NULL THEN
        INSERT INTO users (email, name, subscription_plan, total_logins, total_searches, total_reports)
        VALUES ('test@example.com', 'Test User', 'basic', 0, 0, 0)
        RETURNING id INTO test_user_id;
    END IF;
    
    -- Update user totals to reflect activity
    UPDATE users 
    SET 
        total_logins = 25,
        total_searches = 45,
        total_reports = 6,
        last_login_at = NOW() - INTERVAL '1 hour'
    WHERE id = test_user_id;
    
    -- Add login activities
    FOR i IN 1..25 LOOP
        INSERT INTO user_activities (user_id, activity_type, activity_data, created_at)
        VALUES (
            test_user_id,
            'login',
            '{"source": "web", "ip": "127.0.0.1"}'::jsonb,
            NOW() - INTERVAL '30 days' + (i * INTERVAL '1 day') + (random() * INTERVAL '12 hours')
        );
    END LOOP;
    
    -- Add search activities
    FOR i IN 1..45 LOOP
        INSERT INTO user_activities (user_id, activity_type, activity_data, created_at)
        VALUES (
            test_user_id,
            'search',
            json_build_object(
                'query', CASE (i % 5)
                    WHEN 0 THEN 'artificial intelligence'
                    WHEN 1 THEN 'machine learning'
                    WHEN 2 THEN 'neural network'
                    WHEN 3 THEN 'deep learning'
                    ELSE 'computer vision'
                END,
                'keyword', CASE (i % 5)
                    WHEN 0 THEN 'AI'
                    WHEN 1 THEN 'ML'
                    WHEN 2 THEN 'NN'
                    WHEN 3 THEN 'DL'
                    ELSE 'CV'
                END
            )::jsonb,
            NOW() - INTERVAL '30 days' + (i * INTERVAL '16 hours') + (random() * INTERVAL '8 hours')
        );
    END LOOP;
    
    -- Add report generation activities
    FOR i IN 1..6 LOOP
        INSERT INTO user_activities (user_id, activity_type, activity_data, created_at)
        VALUES (
            test_user_id,
            'report_generate',
            json_build_object(
                'report_type', CASE (i % 2) WHEN 0 THEN 'market' ELSE 'business' END,
                'patent_id', 'US' || (10000000 + i)::text
            )::jsonb,
            NOW() - INTERVAL '30 days' + (i * INTERVAL '5 days') + (random() * INTERVAL '12 hours')
        );
    END LOOP;
    
    -- Add AI analysis reports
    FOR i IN 1..6 LOOP
        INSERT INTO ai_analysis_reports (
            user_id, 
            application_number, 
            invention_title, 
            analysis_type, 
            report_name,
            market_penetration,
            competitive_landscape,
            market_growth_drivers,
            risk_factors,
            revenue_model,
            created_at
        )
        VALUES (
            test_user_id,
            'US' || (10000000 + i)::text,
            CASE i
                WHEN 1 THEN 'AI-Based Image Recognition System'
                WHEN 2 THEN 'Machine Learning Algorithm for Data Processing'
                WHEN 3 THEN 'Neural Network Architecture for Pattern Recognition'
                WHEN 4 THEN 'Deep Learning Model for Natural Language Processing'
                WHEN 5 THEN 'Computer Vision System for Object Detection'
                ELSE 'Automated Decision Making System'
            END,
            CASE (i % 3)
                WHEN 0 THEN 'market'
                WHEN 1 THEN 'business'
                ELSE 'technical'
            END,
            'AI Analysis Report #' || i,
            'High market penetration potential in AI sector',
            'Competitive landscape analysis shows strong positioning',
            'Growing demand for AI solutions drives market expansion',
            'Technology adoption risks and regulatory challenges',
            'Subscription-based SaaS model with licensing opportunities',
            NOW() - INTERVAL '30 days' + (i * INTERVAL '5 days') + (random() * INTERVAL '12 hours')
        );
    END LOOP;
    
    -- Add search keyword analytics
    INSERT INTO search_keyword_analytics (user_id, keyword, technology_field, ipc_main_class, search_count, last_searched_at)
    VALUES 
        (test_user_id, 'artificial intelligence', 'Computer Technology', 'G06', 15, NOW() - INTERVAL '1 day'),
        (test_user_id, 'machine learning', 'Computer Technology', 'G06', 12, NOW() - INTERVAL '2 days'),
        (test_user_id, 'neural network', 'Computer Technology', 'G06', 8, NOW() - INTERVAL '3 days'),
        (test_user_id, 'deep learning', 'Computer Technology', 'G06', 6, NOW() - INTERVAL '4 days'),
        (test_user_id, 'computer vision', 'Computer Technology', 'G06', 4, NOW() - INTERVAL '5 days');
    
    RAISE NOTICE 'Test data added for user ID: %', test_user_id;
END $$;