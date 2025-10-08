-- Add test data for dashboard functionality
DO $$
DECLARE
    test_user_id UUID;
    i INTEGER;
BEGIN
    -- Get or create test user
    SELECT id INTO test_user_id FROM users WHERE email = 'test@example.com' LIMIT 1;
    
    IF test_user_id IS NULL THEN
        -- Create test user if not exists
        INSERT INTO users (email, name, subscription_plan, total_logins, total_searches, total_reports)
        VALUES ('test@example.com', 'Test User', 'premium', 25, 45, 6)
        RETURNING id INTO test_user_id;
        RAISE NOTICE 'Created test user with ID: %', test_user_id;
    ELSE
        -- Update existing test user with some activity counts
        UPDATE users 
        SET total_logins = 25, total_searches = 45, total_reports = 6,
            subscription_plan = 'premium'
        WHERE id = test_user_id;
        RAISE NOTICE 'Updated test user with ID: %', test_user_id;
    END IF;
    
    -- Clear existing test data for this user
    DELETE FROM user_activities WHERE user_id = test_user_id;
    DELETE FROM ai_analysis_reports WHERE user_id = test_user_id;
    
    -- Add login activities (last 30 days)
    FOR i IN 1..25 LOOP
        INSERT INTO user_activities (user_id, activity_type, activity_data, created_at)
        VALUES (
            test_user_id,
            'login',
            '{"source": "web", "ip": "127.0.0.1"}'::jsonb,
            NOW() - (random() * INTERVAL '30 days')
        );
    END LOOP;
    
    -- Add search activities with various queries
    INSERT INTO user_activities (user_id, activity_type, activity_data, created_at) VALUES
    (test_user_id, 'search', '{"query": "AI 의료진단", "keyword": "AI 의료진단", "results_count": 15}'::jsonb, NOW() - INTERVAL '1 day'),
    (test_user_id, 'search', '{"query": "반도체 기술", "keyword": "반도체 기술", "results_count": 23}'::jsonb, NOW() - INTERVAL '2 days'),
    (test_user_id, 'search', '{"query": "바이오 센서", "keyword": "바이오 센서", "results_count": 18}'::jsonb, NOW() - INTERVAL '3 days'),
    (test_user_id, 'search', '{"query": "자율주행", "keyword": "자율주행", "results_count": 31}'::jsonb, NOW() - INTERVAL '4 days'),
    (test_user_id, 'search', '{"query": "블록체인", "keyword": "블록체인", "results_count": 12}'::jsonb, NOW() - INTERVAL '5 days'),
    (test_user_id, 'search', '{"query": "IoT 센서", "keyword": "IoT 센서", "results_count": 27}'::jsonb, NOW() - INTERVAL '6 days'),
    (test_user_id, 'search', '{"query": "머신러닝", "keyword": "머신러닝", "results_count": 19}'::jsonb, NOW() - INTERVAL '7 days'),
    (test_user_id, 'search', '{"query": "5G 통신", "keyword": "5G 통신", "results_count": 22}'::jsonb, NOW() - INTERVAL '8 days'),
    (test_user_id, 'search', '{"query": "양자컴퓨팅", "keyword": "양자컴퓨팅", "results_count": 8}'::jsonb, NOW() - INTERVAL '9 days'),
    (test_user_id, 'search', '{"query": "로봇공학", "keyword": "로봇공학", "results_count": 16}'::jsonb, NOW() - INTERVAL '10 days');
    
    -- Add more search activities for the remaining count
    FOR i IN 11..45 LOOP
        INSERT INTO user_activities (user_id, activity_type, activity_data, created_at)
        VALUES (
            test_user_id,
            'search',
            format('{"query": "기술검색%s", "keyword": "기술검색%s", "results_count": %s}', i, i, (random() * 30 + 5)::integer)::jsonb,
            NOW() - (random() * INTERVAL '30 days')
        );
    END LOOP;
    
    -- Add AI analysis reports
    INSERT INTO ai_analysis_reports (
        user_id, 
        application_number, 
        invention_title, 
        report_name, 
        analysis_type,
        market_penetration,
        competitive_landscape,
        revenue_model,
        created_at
    ) VALUES
    (test_user_id, 'KR10-2023-0001234', 'AI 기반 의료 진단 시스템', 'AI 의료진단 특허 분석', 'market', 
     '높은 성장 잠재력을 보이는 AI 의료진단 시장에서 혁신적인 기술로 주목받고 있습니다.', 
     '경쟁이 치열한 의료 AI 분야에서 차별화된 진단 정확도를 제공합니다.',
     '라이선싱 및 직접 판매를 통한 다각화된 수익 모델을 구축할 수 있습니다.', 
     NOW() - INTERVAL '1 day'),
    
    (test_user_id, 'KR10-2023-0002345', '반도체 제조 공정 개선 기술', '반도체 기술 특허 분석', 'business',
     '기존 반도체 시장의 확장과 함께 공정 효율성 개선에 대한 수요가 증가하고 있습니다.',
     '반도체 제조 분야에서 기술적 우위를 확보하여 경쟁력을 강화할 수 있습니다.',
     '기술 라이선싱을 통해 반도체 제조사와의 협력 관계를 구축할 수 있습니다.',
     NOW() - INTERVAL '3 days'),
    
    (test_user_id, 'KR10-2023-0003456', '바이오 센서 기반 헬스케어 디바이스', '바이오센서 시장 분석', 'market',
     '신규 헬스케어 시장 창출과 함께 개인 건강 관리에 대한 관심이 증가하고 있습니다.',
     '바이오센서 분야에서 선도 기업으로서의 위치를 확보할 수 있는 기회입니다.',
     '제품 판매와 구독 서비스를 결합한 헬스케어 플랫폼 사업 모델이 가능합니다.',
     NOW() - INTERVAL '5 days'),
    
    (test_user_id, 'KR10-2023-0004567', '자율주행차 센서 융합 기술', '자율주행 기술 분석', 'business',
     '급성장하는 자율주행차 시장에서 센서 융합 기술의 중요성이 부각되고 있습니다.',
     '자율주행 기술 분야에서 기존 업체들과의 기술 격차를 활용할 수 있습니다.',
     '부품 공급과 기술 제공을 통해 자동차 제조사와의 파트너십을 구축할 수 있습니다.',
     NOW() - INTERVAL '7 days'),
    
    (test_user_id, 'KR10-2023-0005678', '블록체인 기반 보안 시스템', '블록체인 보안 특허 분석', 'market',
     '보안에 대한 관심 증가와 함께 블록체인 기반 보안 시장이 확대되고 있습니다.',
     '블록체인 보안 분야에서 차별화된 기술력을 바탕으로 경쟁 우위를 확보할 수 있습니다.',
     '솔루션 라이선싱을 통해 금융 및 보안 업체와의 협력 관계를 구축할 수 있습니다.',
     NOW() - INTERVAL '10 days'),
    
    (test_user_id, 'KR10-2023-0006789', 'IoT 기반 스마트 팩토리 시스템', 'IoT 스마트팩토리 분석', 'business',
     '제조업의 디지털 전환 가속화로 스마트 팩토리에 대한 수요가 급증하고 있습니다.',
     'IoT 기반 통합 솔루션으로 제조업체들에게 차별화된 가치를 제공할 수 있습니다.',
     '플랫폼 구독 서비스와 컨설팅을 결합한 종합적인 사업 모델이 가능합니다.',
     NOW() - INTERVAL '12 days');
    
    RAISE NOTICE 'Added test data successfully!';
    RAISE NOTICE 'User activities: % login, % search', 
        (SELECT COUNT(*) FROM user_activities WHERE user_id = test_user_id AND activity_type = 'login'),
        (SELECT COUNT(*) FROM user_activities WHERE user_id = test_user_id AND activity_type = 'search');
    RAISE NOTICE 'AI analysis reports: %', 
        (SELECT COUNT(*) FROM ai_analysis_reports WHERE user_id = test_user_id);
        
END $$;