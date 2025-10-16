-- 현재 사용자를 위한 AI 분석 리포트 생성

DO $$
DECLARE
    current_user_id UUID := '51c66d4c-4a2f-4079-9173-a3d92b9702ed';
    i INTEGER;
    report_titles TEXT[] := ARRAY[
        '블록체인 기술 특허 시장 분석 리포트',
        '가방 디자인 특허 동향 분석',
        '가족 관련 특허 기술 분석',
        '스마트 가방 기술 특허 분석',
        '블록체인 보안 기술 시장 전망'
    ];
    tech_fields TEXT[] := ARRAY['H04L', 'A45C', 'G06Q', 'A45C', 'H04L'];
    application_numbers TEXT[] := ARRAY[
        '10-2024-0001001',
        '10-2024-0001002', 
        '10-2024-0001003',
        '10-2024-0001004',
        '10-2024-0001005'
    ];
BEGIN
    RAISE NOTICE '=== AI 분석 리포트 생성 시작 ===';
    RAISE NOTICE 'User ID: %', current_user_id;
    
    -- 기존 리포트 삭제 (중복 방지)
    DELETE FROM ai_analysis_reports WHERE user_id = current_user_id;
    RAISE NOTICE '기존 리포트 삭제 완료';
    
    -- 새 리포트 생성
    FOR i IN 1..5 LOOP
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
            application_numbers[i],
            report_titles[i],
            '시장 침투율: ' || (random() * 50 + 20)::integer || '%. 현재 기술은 초기 도입 단계에 있으며, 향후 3-5년 내 급속한 성장이 예상됩니다.',
            '주요 경쟁사로는 삼성전자, LG전자, 네이버 등이 있으며, 각각 고유한 기술적 접근 방식을 채택하고 있습니다.',
            '디지털 전환 가속화, 정부 정책 지원, 소비자 인식 개선 등이 주요 성장 동력으로 작용하고 있습니다.',
            '기술 표준화 지연, 규제 불확실성, 보안 우려 등이 주요 위험 요소로 식별됩니다.',
            'B2B 라이선싱, B2C 제품 판매, 플랫폼 수수료 모델 등 다양한 수익 창출 방안이 가능합니다.',
            '예상 로열티 마진: ' || (random() * 10 + 5)::integer || '-' || (random() * 15 + 10)::integer || '%. 기술의 혁신성과 시장 지배력에 따라 결정됩니다.',
            '새로운 비즈니스 모델 창출, 기존 산업과의 융합, 글로벌 시장 진출 등의 기회가 존재합니다.',
            '특허 회피 설계, 대안 기술 개발, 전략적 제휴 등의 대응 전략이 예상됩니다.',
            current_user_id,
            NOW() - INTERVAL '1 day' * (random() * 30)::integer,
            NOW() - INTERVAL '1 day' * (random() * 30)::integer,
            'AI_Report_' || i || '_' || to_char(NOW(), 'YYYYMMDD'),
            'ai_analysis_report_' || i || '.pdf',
            'market',
            CASE i
                WHEN 1 THEN ARRAY['H04L9/00', 'H04L9/32']
                WHEN 2 THEN ARRAY['A45C5/00', 'A45C13/00']
                WHEN 3 THEN ARRAY['G06Q50/00', 'A63F13/00']
                WHEN 4 THEN ARRAY['A45C5/00', 'G06K19/00']
                WHEN 5 THEN ARRAY['H04L9/00', 'G06F21/00']
            END,
            tech_fields[i],
            (random() * 0.3 + 0.7)::numeric,
            ARRAY[tech_fields[i]]
        );
        
        RAISE NOTICE '리포트 % 생성 완료: %', i, report_titles[i];
    END LOOP;
    
    RAISE NOTICE '=== AI 분석 리포트 생성 완료 ===';
    RAISE NOTICE '총 % 개의 리포트가 생성되었습니다.', array_length(report_titles, 1);
    
END $$;