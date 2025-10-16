-- 기술 분야 분석 데이터 생성 (도넛 차트용)

DO $$
DECLARE
    current_user_id UUID := '51c66d4c-4a2f-4079-9173-a3d92b9702ed';
    tech_field_record RECORD;
    total_searches INTEGER;
    total_reports INTEGER;
BEGIN
    RAISE NOTICE '=== 기술 분야 분석 데이터 생성 시작 ===';
    RAISE NOTICE 'User ID: %', current_user_id;
    
    -- 기존 기술 분야 분석 데이터 삭제 (중복 방지)
    DELETE FROM technology_field_analysis WHERE user_id = current_user_id;
    RAISE NOTICE '기존 기술 분야 분석 데이터 삭제 완료';
    
    -- 전체 검색 및 리포트 수 계산
    SELECT COUNT(*) INTO total_searches 
    FROM search_history 
    WHERE user_id = current_user_id;
    
    SELECT COUNT(*) INTO total_reports 
    FROM ai_analysis_reports 
    WHERE user_id = current_user_id;
    
    RAISE NOTICE '전체 검색 수: %, 전체 리포트 수: %', total_searches, total_reports;
    
    -- 개인 검색 기술 분야 분석 데이터 생성
    FOR tech_field_record IN 
        SELECT 
            technology_field,
            COUNT(*) as field_count
        FROM search_history 
        WHERE user_id = current_user_id 
          AND technology_field IS NOT NULL
        GROUP BY technology_field
    LOOP
        INSERT INTO technology_field_analysis (
            user_id,
            field_type,
            technology_field,
            count,
            percentage,
            analysis_type,
            period_days,
            created_at
        ) VALUES (
            current_user_id,
            'search_individual',
            tech_field_record.technology_field,
            tech_field_record.field_count,
            CASE 
                WHEN total_searches > 0 THEN (tech_field_record.field_count::numeric / total_searches * 100)
                ELSE 0
            END,
            'individual',
            100,
            NOW()
        );
        
        RAISE NOTICE '개인 검색 분야 추가: % (개수: %, 비율: %)', 
            tech_field_record.technology_field, 
            tech_field_record.field_count,
            CASE 
                WHEN total_searches > 0 THEN (tech_field_record.field_count::numeric / total_searches * 100)
                ELSE 0
            END;
    END LOOP;
    
    -- 개인 리포트 기술 분야 분석 데이터 생성
    FOR tech_field_record IN 
        SELECT 
            technology_field,
            COUNT(*) as field_count
        FROM ai_analysis_reports 
        WHERE user_id = current_user_id 
          AND technology_field IS NOT NULL
        GROUP BY technology_field
    LOOP
        INSERT INTO technology_field_analysis (
            user_id,
            field_type,
            technology_field,
            count,
            percentage,
            analysis_type,
            period_days,
            created_at
        ) VALUES (
            current_user_id,
            'report_individual',
            tech_field_record.technology_field,
            tech_field_record.field_count,
            CASE 
                WHEN total_reports > 0 THEN (tech_field_record.field_count::numeric / total_reports * 100)
                ELSE 0
            END,
            'individual',
            100,
            NOW()
        );
        
        RAISE NOTICE '개인 리포트 분야 추가: % (개수: %, 비율: %)', 
            tech_field_record.technology_field, 
            tech_field_record.field_count,
            CASE 
                WHEN total_reports > 0 THEN (tech_field_record.field_count::numeric / total_reports * 100)
                ELSE 0
            END;
    END LOOP;
    
    -- 시장 검색 기술 분야 분석 데이터 생성 (샘플 데이터)
    INSERT INTO technology_field_analysis (user_id, field_type, technology_field, count, percentage, analysis_type, period_days, created_at) VALUES
    (current_user_id, 'search_market', 'H04L', 1100, 35.5, 'market', 100, NOW()),
    (current_user_id, 'search_market', 'G06F', 850, 27.4, 'market', 100, NOW()),
    (current_user_id, 'search_market', 'A45C', 420, 13.5, 'market', 100, NOW()),
    (current_user_id, 'search_market', 'G06Q', 380, 12.3, 'market', 100, NOW()),
    (current_user_id, 'search_market', 'G06N', 250, 8.1, 'market', 100, NOW()),
    (current_user_id, 'search_market', 'H04W', 100, 3.2, 'market', 100, NOW());
    
    -- 시장 리포트 기술 분야 분석 데이터 생성 (샘플 데이터)
    INSERT INTO technology_field_analysis (user_id, field_type, technology_field, count, percentage, analysis_type, period_days, created_at) VALUES
    (current_user_id, 'report_market', 'H04L', 143, 42.0, 'market', 100, NOW()),
    (current_user_id, 'report_market', 'G06F', 95, 27.9, 'market', 100, NOW()),
    (current_user_id, 'report_market', 'A45C', 45, 13.2, 'market', 100, NOW()),
    (current_user_id, 'report_market', 'G06Q', 35, 10.3, 'market', 100, NOW()),
    (current_user_id, 'report_market', 'G06N', 22, 6.5, 'market', 100, NOW());
    
    RAISE NOTICE '시장 분석 데이터 생성 완료';
    
    -- 생성된 데이터 확인
    RAISE NOTICE '=== 생성된 기술 분야 분석 데이터 ===';
    FOR tech_field_record IN 
        SELECT field_type, technology_field, count, percentage
        FROM technology_field_analysis 
        WHERE user_id = current_user_id 
        ORDER BY field_type, percentage DESC
    LOOP
        RAISE NOTICE '타입: %, 분야: %, 개수: %, 비율: %', 
            tech_field_record.field_type,
            tech_field_record.technology_field, 
            tech_field_record.count,
            tech_field_record.percentage;
    END LOOP;
    
    RAISE NOTICE '=== 기술 분야 분석 데이터 생성 완료 ===';
    
END $$;