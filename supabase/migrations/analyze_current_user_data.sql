-- 현재 사용자 데이터 분석

DO $$
DECLARE
    current_user_id UUID := '51c66d4c-4a2f-4079-9173-a3d92b9702ed';
    user_info RECORD;
    search_info RECORD;
BEGIN
    RAISE NOTICE '=== 현재 사용자 데이터 분석 ===';
    RAISE NOTICE 'User ID: %', current_user_id;
    
    -- 1. 사용자 기본 정보
    SELECT email, name, subscription_plan INTO user_info
    FROM users 
    WHERE id = current_user_id;
    
    RAISE NOTICE '1. 사용자 기본 정보:';
    RAISE NOTICE '   - Email: %, Name: %, Plan: %', user_info.email, user_info.name, user_info.subscription_plan;
    
    -- 2. 검색 기록 분석
    RAISE NOTICE '2. 검색 기록 분석:';
    RAISE NOTICE '   - 총 검색 수: %', (SELECT COUNT(*) FROM search_history WHERE user_id = current_user_id);
    RAISE NOTICE '   - 최근 30일 검색 수: %', (SELECT COUNT(*) FROM search_history WHERE user_id = current_user_id AND created_at >= NOW() - INTERVAL '30 days');
    
    -- 검색 키워드별 분석
    RAISE NOTICE '   - 검색 키워드 분포:';
    FOR search_info IN 
        SELECT keyword, COUNT(*) as cnt
        FROM search_history 
        WHERE user_id = current_user_id 
        GROUP BY keyword 
        ORDER BY COUNT(*) DESC 
        LIMIT 5
    LOOP
        RAISE NOTICE '     * %: % 회', search_info.keyword, search_info.cnt;
    END LOOP;
    
    -- 3. 리포트 분석
    RAISE NOTICE '3. AI 분석 리포트:';
    RAISE NOTICE '   - 총 리포트 수: %', (SELECT COUNT(*) FROM ai_analysis_reports WHERE user_id = current_user_id);
    RAISE NOTICE '   - 최근 30일 리포트 수: %', (SELECT COUNT(*) FROM ai_analysis_reports WHERE user_id = current_user_id AND created_at >= NOW() - INTERVAL '30 days');
    
    -- 4. 기술 분야 분석
    RAISE NOTICE '4. 기술 분야 분석:';
    RAISE NOTICE '   - 검색 기록의 technology_field 분포:';
    FOR search_info IN 
        SELECT COALESCE(technology_field, 'NULL') as field, COUNT(*) as cnt
        FROM search_history 
        WHERE user_id = current_user_id 
        GROUP BY technology_field 
        ORDER BY COUNT(*) DESC
    LOOP
        RAISE NOTICE '     * %: % 회', search_info.field, search_info.cnt;
    END LOOP;
    
    -- 5. 사용자 활동 분석
    RAISE NOTICE '5. 사용자 활동 분석:';
    RAISE NOTICE '   - 총 활동 수: %', (SELECT COUNT(*) FROM user_activities WHERE user_id = current_user_id);
    RAISE NOTICE '   - 활동 유형별 분포:';
    FOR search_info IN 
        SELECT activity_type, COUNT(*) as cnt
        FROM user_activities 
        WHERE user_id = current_user_id 
        GROUP BY activity_type 
        ORDER BY COUNT(*) DESC
    LOOP
        RAISE NOTICE '     * %: % 회', search_info.activity_type, search_info.cnt;
    END LOOP;
    
END $$;