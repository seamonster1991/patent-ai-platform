-- 대시보드 테스트 데이터 생성

DO $$
DECLARE
    test_user_id UUID;
    i INTEGER;
    search_keywords TEXT[] := ARRAY['AI 기술', '머신러닝', '딥러닝', '자율주행', '블록체인', '사물인터넷', '빅데이터', '클라우드', '로봇공학', '바이오기술'];
    tech_fields TEXT[] := ARRAY['G06F', 'H04L', 'G06N', 'B60W', 'H04B', 'G06Q', 'G01S', 'A61B', 'B25J', 'C12N'];
    report_titles TEXT[] := ARRAY[
        'AI 기반 자율주행 기술 시장 분석',
        '머신러닝 알고리즘 특허 동향',
        '딥러닝 반도체 기술 분석',
        '블록체인 보안 기술 연구',
        'IoT 센서 기술 시장 전망',
        '빅데이터 분석 플랫폼 특허',
        '클라우드 컴퓨팅 인프라 기술',
        '로봇 제어 시스템 분석',
        '바이오 센서 기술 동향',
        '5G 통신 기술 특허 분석'
    ];
BEGIN
    -- 첫 번째 사용자 ID 가져오기
    SELECT id INTO test_user_id FROM users ORDER BY created_at DESC LIMIT 1;
    
    IF test_user_id IS NULL THEN
        RAISE EXCEPTION 'No users found in database';
    END IF;
    
    RAISE NOTICE 'Creating test data for user: %', test_user_id;
    
    -- 1. 검색 기록 생성 (최근 30일)
    FOR i IN 1..20 LOOP
        INSERT INTO search_history (
            user_id,
            keyword,
            applicant,
            application_date_from,
            application_date_to,
            search_results,
            created_at,
            results_count,
            search_filters,
            search_duration_ms,
            ipc_codes,
            technology_field,
            field_confidence
        ) VALUES (
            test_user_id,
            search_keywords[((i-1) % array_length(search_keywords, 1)) + 1],
            CASE WHEN i % 3 = 0 THEN '삼성전자' WHEN i % 3 = 1 THEN 'LG전자' ELSE NULL END,
            CURRENT_DATE - INTERVAL '2 years',
            CURRENT_DATE,
            '{"patents": [{"id": "' || i || '", "title": "Test Patent ' || i || '"}]}'::jsonb,
            NOW() - INTERVAL '1 day' * (random() * 30)::integer,
            (random() * 100 + 10)::integer,
            '{"sort": "date", "order": "desc"}'::jsonb,
            (random() * 5000 + 1000)::integer,
            ARRAY[tech_fields[((i-1) % array_length(tech_fields, 1)) + 1]],
            tech_fields[((i-1) % array_length(tech_fields, 1)) + 1],
            (random() * 0.3 + 0.7)::numeric
        );
    END LOOP;
    
    -- 2. AI 분석 리포트 생성 (최근 30일)
    FOR i IN 1..15 LOOP
        INSERT INTO ai_analysis_reports (
            application_number,
            invention_title,
            market_penetration,
            competitive_landscape,
            market_growth_drivers,
            risk_factors,
            revenue_model,
            royalty_margin,
            new_business_opportunities,
            competitor_response_strategy,
            user_id,
            generated_at,
            created_at,
            report_name,
            original_filename,
            analysis_type,
            ipc_codes,
            technology_field,
            field_confidence,
            technology_fields
        ) VALUES (
            '10-2023-' || LPAD(i::text, 7, '0'),
            report_titles[((i-1) % array_length(report_titles, 1)) + 1],
            '시장 침투율 분석 내용 ' || i,
            '경쟁 환경 분석 내용 ' || i,
            '시장 성장 동력 분석 ' || i,
            '위험 요소 분석 ' || i,
            '수익 모델 분석 ' || i,
            '로열티 마진 분석 ' || i,
            '신규 사업 기회 ' || i,
            '경쟁사 대응 전략 ' || i,
            test_user_id,
            NOW() - INTERVAL '1 day' * (random() * 30)::integer,
            NOW() - INTERVAL '1 day' * (random() * 30)::integer,
            'Report_' || i || '_' || to_char(NOW(), 'YYYYMMDD'),
            'patent_analysis_' || i || '.pdf',
            'market',
            ARRAY[tech_fields[((i-1) % array_length(tech_fields, 1)) + 1]],
            tech_fields[((i-1) % array_length(tech_fields, 1)) + 1],
            (random() * 0.3 + 0.7)::numeric,
            ARRAY[tech_fields[((i-1) % array_length(tech_fields, 1)) + 1]]
        );
    END LOOP;
    
    -- 3. 사용자 활동 기록 생성 (최근 30일)
    -- 로그인 활동
    FOR i IN 1..10 LOOP
        INSERT INTO user_activities (
            user_id,
            activity_type,
            activity_data,
            ip_address,
            user_agent,
            created_at
        ) VALUES (
            test_user_id,
            'login',
            '{"login_method": "email", "success": true}'::jsonb,
            '192.168.1.' || (random() * 254 + 1)::integer,
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            NOW() - INTERVAL '1 day' * (random() * 30)::integer
        );
    END LOOP;
    
    -- 검색 활동
    FOR i IN 1..25 LOOP
        INSERT INTO user_activities (
            user_id,
            activity_type,
            activity_data,
            ip_address,
            user_agent,
            created_at
        ) VALUES (
            test_user_id,
            'search',
            ('{"keyword": "' || search_keywords[((i-1) % array_length(search_keywords, 1)) + 1] || '", "results_count": ' || (random() * 100 + 10)::integer || '}')::jsonb,
            '192.168.1.' || (random() * 254 + 1)::integer,
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            NOW() - INTERVAL '1 day' * (random() * 30)::integer
        );
    END LOOP;
    
    -- 리포트 생성 활동
    FOR i IN 1..15 LOOP
        INSERT INTO user_activities (
            user_id,
            activity_type,
            activity_data,
            ip_address,
            user_agent,
            created_at
        ) VALUES (
            test_user_id,
            'report_generate',
            ('{"report_name": "' || report_titles[((i-1) % array_length(report_titles, 1)) + 1] || '", "analysis_type": "market"}')::jsonb,
            '192.168.1.' || (random() * 254 + 1)::integer,
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            NOW() - INTERVAL '1 day' * (random() * 30)::integer
        );
    END LOOP;
    
    -- 4. 사용자 통계 업데이트
    UPDATE users 
    SET 
        total_searches = (SELECT COUNT(*) FROM search_history WHERE user_id = test_user_id),
        total_reports = (SELECT COUNT(*) FROM ai_analysis_reports WHERE user_id = test_user_id),
        total_logins = (SELECT COUNT(*) FROM user_activities WHERE user_id = test_user_id AND activity_type = 'login'),
        updated_at = NOW()
    WHERE id = test_user_id;
    
    RAISE NOTICE 'Test data creation completed successfully!';
    RAISE NOTICE 'Created % search records', (SELECT COUNT(*) FROM search_history WHERE user_id = test_user_id);
    RAISE NOTICE 'Created % report records', (SELECT COUNT(*) FROM ai_analysis_reports WHERE user_id = test_user_id);
    RAISE NOTICE 'Created % activity records', (SELECT COUNT(*) FROM user_activities WHERE user_id = test_user_id);
    
END $$;