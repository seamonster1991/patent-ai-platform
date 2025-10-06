-- Insert sample data for testing dashboard functionality
-- First, get a real user ID from auth.users table

DO $$
DECLARE
    sample_user_id UUID;
BEGIN
    -- Get the first available user ID from auth.users
    SELECT id INTO sample_user_id FROM auth.users LIMIT 1;
    
    -- If no users exist, create a sample user entry in public.users table
    IF sample_user_id IS NULL THEN
        -- Generate a UUID for sample user
        sample_user_id := gen_random_uuid();
        
        -- Insert into public.users table (not auth.users as that's managed by Supabase Auth)
        INSERT INTO users (id, email, name, subscription_plan, usage_count, role, phone, created_at, updated_at) 
        VALUES (sample_user_id, 'guest@example.com', 'Guest User', 'free', 0, 'user', '010-1234-5678', NOW(), NOW());
    END IF;

    -- Insert sample user activities
    INSERT INTO user_activities (user_id, activity_type, activity_data, created_at) VALUES
    -- Recent login activities
    (sample_user_id, 'login', '{"ip_address": "127.0.0.1", "user_agent": "Mozilla/5.0"}', NOW() - INTERVAL '1 hour'),
    (sample_user_id, 'login', '{"ip_address": "127.0.0.1", "user_agent": "Mozilla/5.0"}', NOW() - INTERVAL '1 day'),
    (sample_user_id, 'login', '{"ip_address": "127.0.0.1", "user_agent": "Mozilla/5.0"}', NOW() - INTERVAL '2 days'),

    -- Recent search activities
    (sample_user_id, 'search', '{"searchWord": "인공지능", "query": "인공지능", "resultCount": 25, "searchType": "keyword"}', NOW() - INTERVAL '30 minutes'),
    (sample_user_id, 'search', '{"searchWord": "머신러닝", "query": "머신러닝", "resultCount": 18, "searchType": "keyword"}', NOW() - INTERVAL '2 hours'),
    (sample_user_id, 'search', '{"searchWord": "자율주행", "query": "자율주행", "resultCount": 32, "searchType": "keyword"}', NOW() - INTERVAL '1 day'),
    (sample_user_id, 'search', '{"searchWord": "블록체인", "query": "블록체인", "resultCount": 15, "searchType": "keyword"}', NOW() - INTERVAL '2 days'),
    (sample_user_id, 'search', '{"searchWord": "IoT", "query": "IoT", "resultCount": 22, "searchType": "keyword"}', NOW() - INTERVAL '3 days'),

    -- Dashboard access activities
    (sample_user_id, 'dashboard_access', '{"page": "main_dashboard"}', NOW() - INTERVAL '15 minutes'),
    (sample_user_id, 'dashboard_access', '{"page": "main_dashboard"}', NOW() - INTERVAL '1 day'),

    -- Patent view activities
    (sample_user_id, 'view_patent', '{"patent_id": "10-2023-0001234", "application_number": "10-2023-0001234"}', NOW() - INTERVAL '45 minutes'),
    (sample_user_id, 'view_patent', '{"patent_id": "10-2023-0005678", "application_number": "10-2023-0005678"}', NOW() - INTERVAL '3 hours');

    -- Insert sample search history
    INSERT INTO search_history (user_id, keyword, search_results, created_at) VALUES
    (sample_user_id, '인공지능', '[{"applicationNumber": "10-2023-0001234", "title": "AI 기반 이미지 인식 시스템"}]', NOW() - INTERVAL '30 minutes'),
    (sample_user_id, '머신러닝', '[{"applicationNumber": "10-2023-0005678", "title": "머신러닝을 이용한 예측 모델"}]', NOW() - INTERVAL '2 hours'),
    (sample_user_id, '자율주행', '[{"applicationNumber": "10-2023-0009012", "title": "자율주행 차량의 경로 계획 방법"}]', NOW() - INTERVAL '1 day');

    -- Insert sample reports
    INSERT INTO reports (user_id, patent_id, report_type, analysis_content, created_at) VALUES
    (sample_user_id, '10-2023-0001234', 'market', '이 특허는 AI 이미지 인식 분야에서 높은 시장 가치를 가지고 있습니다.', NOW() - INTERVAL '1 hour'),
    (sample_user_id, '10-2023-0005678', 'business', '머신러닝 예측 모델 특허로 다양한 산업 분야에 적용 가능합니다.', NOW() - INTERVAL '1 day');

    -- Insert sample AI analysis reports
    INSERT INTO ai_analysis_reports (user_id, application_number, invention_title, market_penetration, competitive_landscape, created_at) VALUES
    (sample_user_id, '10-2023-0001234', 'AI 기반 이미지 인식 시스템', '높은 시장 침투력을 보유하고 있으며...', '경쟁사 대비 우수한 기술력...', NOW() - INTERVAL '2 hours'),
    (sample_user_id, '10-2023-0005678', '머신러닝을 이용한 예측 모델', '예측 모델 시장에서의 성장 가능성...', '기존 솔루션 대비 정확도 향상...', NOW() - INTERVAL '1 day');

    -- Insert sample saved patents
    INSERT INTO saved_patents (user_id, patent_application_number, patent_title, applicant_name, application_date, notes, tags) VALUES
    (sample_user_id, '10-2023-0001234', 'AI 기반 이미지 인식 시스템', '삼성전자', '2023-01-15', '관심 있는 AI 기술', ARRAY['AI', '이미지인식']),
    (sample_user_id, '10-2023-0005678', '머신러닝을 이용한 예측 모델', 'LG전자', '2023-02-20', '머신러닝 관련 특허', ARRAY['머신러닝', '예측모델']),
    (sample_user_id, '10-2023-0009012', '자율주행 차량의 경로 계획 방법', '현대자동차', '2023-03-10', '자율주행 기술', ARRAY['자율주행', '경로계획']);

    -- Insert sample patent search analytics (only if user_id references auth.users)
    -- Note: This table references auth.users, so we'll skip it for now
    
    -- Insert sample LLM analysis logs (only if user_id references auth.users)
    -- Note: This table references auth.users, so we'll skip it for now
    
    -- Insert sample document downloads (only if user_id references auth.users)
    -- Note: This table references auth.users, so we'll skip it for now

END $$;