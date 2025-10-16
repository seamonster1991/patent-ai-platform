-- 데이터 동기화 및 검증

DO $$
DECLARE
    current_user_id UUID := '51c66d4c-4a2f-4079-9173-a3d92b9702ed';
    dashboard_stats jsonb;
BEGIN
    RAISE NOTICE '=== 데이터 동기화 및 검증 시작 ===';
    RAISE NOTICE 'User ID: %', current_user_id;
    
    -- 1. sync_user_totals() 함수 실행
    RAISE NOTICE '1. sync_user_totals() 함수 실행 중...';
    PERFORM sync_user_totals();
    RAISE NOTICE 'sync_user_totals() 완료';
    
    -- 2. get_dashboard_stats() 함수 실행 및 결과 확인
    RAISE NOTICE '2. get_dashboard_stats() 함수 실행 중...';
    SELECT get_dashboard_stats(current_user_id, '100d') INTO dashboard_stats;
    
    -- 3. 결과 검증
    RAISE NOTICE '=== 대시보드 통계 검증 ===';
    RAISE NOTICE 'Period: %', (dashboard_stats->>'period');
    RAISE NOTICE 'Generated At: %', (dashboard_stats->>'generated_at');
    
    -- Quota Status
    RAISE NOTICE '--- Quota Status ---';
    RAISE NOTICE 'Used: %', (dashboard_stats->'quota_status'->>'used');
    RAISE NOTICE 'Total: %', (dashboard_stats->'quota_status'->>'total');
    RAISE NOTICE 'Percentage: %', (dashboard_stats->'quota_status'->>'percentage');
    
    -- Search Trends
    RAISE NOTICE '--- Search Trends ---';
    RAISE NOTICE 'Market - Avg Daily: %', (dashboard_stats->'search_trends'->'market'->>'avg_daily_searches');
    RAISE NOTICE 'Market - Total Period: %', (dashboard_stats->'search_trends'->'market'->>'total_period_searches');
    RAISE NOTICE 'Individual - Total: %', (dashboard_stats->'search_trends'->'individual'->>'total_searches');
    RAISE NOTICE 'Individual - Conversion Rate: %', (dashboard_stats->'search_trends'->'individual'->>'conversion_rate');
    
    -- Report Trends
    RAISE NOTICE '--- Report Trends ---';
    RAISE NOTICE 'Market - Avg Daily: %', (dashboard_stats->'report_trends'->'market'->>'avg_daily_reports');
    RAISE NOTICE 'Market - Total Period: %', (dashboard_stats->'report_trends'->'market'->>'total_period_reports');
    RAISE NOTICE 'Individual - Total: %', (dashboard_stats->'report_trends'->'individual'->>'total_reports');
    RAISE NOTICE 'Individual - Conversion Rate: %', (dashboard_stats->'report_trends'->'individual'->>'conversion_rate');
    
    -- Technology Fields
    RAISE NOTICE '--- Technology Fields ---';
    RAISE NOTICE 'Search Market: %', (dashboard_stats->'technology_fields'->>'search_market');
    RAISE NOTICE 'Search Individual: %', (dashboard_stats->'technology_fields'->>'search_individual');
    RAISE NOTICE 'Report Market: %', (dashboard_stats->'technology_fields'->>'report_market');
    RAISE NOTICE 'Report Individual: %', (dashboard_stats->'technology_fields'->>'report_individual');
    
    -- Recent Activities
    RAISE NOTICE '--- Recent Activities ---';
    RAISE NOTICE 'Recent Searches Count: %', jsonb_array_length(dashboard_stats->'recent_activities'->'recent_searches');
    RAISE NOTICE 'Recent Reports Count: %', jsonb_array_length(dashboard_stats->'recent_activities'->'recent_reports');
    
    -- Efficiency Metrics
    RAISE NOTICE '--- Efficiency Metrics ---';
    RAISE NOTICE 'Efficiency Score: %', (dashboard_stats->'efficiency_metrics'->>'efficiency_score');
    RAISE NOTICE 'Report Conversion Rate: %', (dashboard_stats->'efficiency_metrics'->>'report_conversion_rate');
    RAISE NOTICE 'Search Conversion Rate: %', (dashboard_stats->'efficiency_metrics'->>'search_conversion_rate');
    
    -- 4. 데이터 완성도 검증
    RAISE NOTICE '=== 데이터 완성도 검증 ===';
    
    -- 검색 데이터 확인
    IF (dashboard_stats->'search_trends'->'individual'->>'total_searches')::integer > 0 THEN
        RAISE NOTICE '✓ 개인 검색 데이터 존재';
    ELSE
        RAISE NOTICE '✗ 개인 검색 데이터 없음';
    END IF;
    
    -- 리포트 데이터 확인
    IF (dashboard_stats->'report_trends'->'individual'->>'total_reports')::integer > 0 THEN
        RAISE NOTICE '✓ 개인 리포트 데이터 존재';
    ELSE
        RAISE NOTICE '✗ 개인 리포트 데이터 없음';
    END IF;
    
    -- 기술 분야 데이터 확인
    IF jsonb_array_length(dashboard_stats->'technology_fields'->'search_individual') > 0 THEN
        RAISE NOTICE '✓ 개인 검색 기술 분야 데이터 존재';
    ELSE
        RAISE NOTICE '✗ 개인 검색 기술 분야 데이터 없음';
    END IF;
    
    IF jsonb_array_length(dashboard_stats->'technology_fields'->'report_individual') > 0 THEN
        RAISE NOTICE '✓ 개인 리포트 기술 분야 데이터 존재';
    ELSE
        RAISE NOTICE '✗ 개인 리포트 기술 분야 데이터 없음';
    END IF;
    
    IF jsonb_array_length(dashboard_stats->'technology_fields'->'search_market') > 0 THEN
        RAISE NOTICE '✓ 시장 검색 기술 분야 데이터 존재';
    ELSE
        RAISE NOTICE '✗ 시장 검색 기술 분야 데이터 없음';
    END IF;
    
    IF jsonb_array_length(dashboard_stats->'technology_fields'->'report_market') > 0 THEN
        RAISE NOTICE '✓ 시장 리포트 기술 분야 데이터 존재';
    ELSE
        RAISE NOTICE '✗ 시장 리포트 기술 분야 데이터 없음';
    END IF;
    
    RAISE NOTICE '=== 데이터 동기화 및 검증 완료 ===';
    
END $$;