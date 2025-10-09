-- 데이터 보존 정책 테스트
-- 2025-01-30: 100일 데이터 보존 정책 및 일관성 확인

-- 1. 데이터 정리 함수 실행 테스트
SELECT 'Testing cleanup_old_data function...' as test_step;
SELECT cleanup_old_data();

-- 2. 사용자 총계 동기화 테스트
SELECT 'Testing sync_user_totals function...' as test_step;
SELECT sync_user_totals();

-- 3. 데이터 보존 상태 확인
SELECT 'Checking data retention status...' as test_step;
SELECT * FROM data_retention_status;

-- 4. 사용자 데이터 일관성 확인 (상위 5명)
SELECT 'Checking user data consistency...' as test_step;
SELECT * FROM user_data_consistency LIMIT 5;

-- 5. get_dashboard_stats 함수 테스트 (100d 기간)
SELECT 'Testing get_dashboard_stats with 100d period...' as test_step;
-- 첫 번째 사용자 ID 가져오기
DO $$
DECLARE
    test_user_id UUID;
    stats_result JSON;
BEGIN
    -- 첫 번째 사용자 ID 가져오기
    SELECT id INTO test_user_id FROM users WHERE role = 'user' LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        -- 대시보드 통계 조회 테스트
        SELECT get_dashboard_stats(test_user_id, '100d') INTO stats_result;
        
        RAISE NOTICE '✅ Dashboard stats test completed for user: %', test_user_id;
        RAISE NOTICE '📊 Stats result keys: %', (SELECT array_agg(key) FROM json_object_keys(stats_result) key);
    ELSE
        RAISE NOTICE '⚠️ No test user found';
    END IF;
END;
$$;

-- 6. 트리거 테스트를 위한 샘플 데이터 삽입 (테스트 후 삭제)
DO $$
DECLARE
    test_user_id UUID;
    test_search_id UUID;
    test_report_id UUID;
BEGIN
    -- 첫 번째 사용자 ID 가져오기
    SELECT id INTO test_user_id FROM users WHERE role = 'user' LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        -- 테스트 검색 기록 삽입
        INSERT INTO search_history (user_id, keyword, technology_field, ipc_codes, created_at)
        VALUES (test_user_id, 'test_search_trigger', 'AI Technology', ARRAY['G06N'], NOW())
        RETURNING id INTO test_search_id;
        
        -- 테스트 리포트 삽입
        INSERT INTO ai_analysis_reports (user_id, invention_title, analysis_type, created_at)
        VALUES (test_user_id, 'Test Report for Trigger', 'patentability', NOW())
        RETURNING id INTO test_report_id;
        
        -- 테스트 로그인 활동 삽입
        INSERT INTO user_activities (user_id, activity_type, created_at)
        VALUES (test_user_id, 'login', NOW());
        
        RAISE NOTICE '✅ Test data inserted - Search: %, Report: %', test_search_id, test_report_id;
        
        -- 사용자 총계 확인
        RAISE NOTICE '📊 User totals after trigger test: %', (
            SELECT json_build_object(
                'total_searches', total_searches,
                'total_reports', total_reports,
                'total_logins', total_logins
            )
            FROM users WHERE id = test_user_id
        );
        
        -- 테스트 데이터 정리
        DELETE FROM search_history WHERE id = test_search_id;
        DELETE FROM ai_analysis_reports WHERE id = test_report_id;
        DELETE FROM user_activities WHERE user_id = test_user_id AND activity_type = 'login' AND created_at >= NOW() - INTERVAL '1 minute';
        
        RAISE NOTICE '🧹 Test data cleaned up';
    ELSE
        RAISE NOTICE '⚠️ No test user found for trigger test';
    END IF;
END;
$$;

SELECT '✅ All tests completed successfully!' as final_result;