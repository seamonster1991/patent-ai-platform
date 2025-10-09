-- 100일 데이터 보존 정책 및 데이터 일관성 확보
-- 2025-01-30: 100일 이상 된 데이터 자동 삭제 및 사용자 총계 동기화

-- 1. 100일 이상 된 데이터 자동 삭제 함수
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS void AS $$
DECLARE
    cutoff_date DATE;
    deleted_searches INTEGER;
    deleted_reports INTEGER;
    deleted_activities INTEGER;
BEGIN
    -- 100일 전 날짜 계산
    cutoff_date := CURRENT_DATE - INTERVAL '100 days';
    
    RAISE NOTICE '🧹 Starting data cleanup for records older than %', cutoff_date;
    
    -- search_history 테이블에서 100일 이상 된 데이터 삭제
    DELETE FROM search_history 
    WHERE created_at < cutoff_date;
    GET DIAGNOSTICS deleted_searches = ROW_COUNT;
    
    -- ai_analysis_reports 테이블에서 100일 이상 된 데이터 삭제
    DELETE FROM ai_analysis_reports 
    WHERE created_at < cutoff_date;
    GET DIAGNOSTICS deleted_reports = ROW_COUNT;
    
    -- user_activities 테이블에서 100일 이상 된 데이터 삭제
    DELETE FROM user_activities 
    WHERE created_at < cutoff_date;
    GET DIAGNOSTICS deleted_activities = ROW_COUNT;
    
    RAISE NOTICE '🧹 Data cleanup completed: % searches, % reports, % activities deleted', 
        deleted_searches, deleted_reports, deleted_activities;
        
    -- 데이터 정리 후 사용자 통계 동기화
    PERFORM sync_user_totals();
    
END;
$$ LANGUAGE plpgsql;

-- 2. 사용자 총계 동기화 함수 (실제 활동 데이터와 일치시키기)
CREATE OR REPLACE FUNCTION sync_user_totals()
RETURNS void AS $$
DECLARE
    user_record RECORD;
    actual_searches INTEGER;
    actual_reports INTEGER;
    actual_logins INTEGER;
BEGIN
    RAISE NOTICE '🔄 Starting user totals synchronization...';
    
    -- 모든 사용자에 대해 실제 활동 데이터로 총계 업데이트
    FOR user_record IN SELECT id FROM users LOOP
        -- 실제 검색 수 계산 (최근 100일)
        SELECT COUNT(*) INTO actual_searches
        FROM search_history 
        WHERE user_id = user_record.id 
        AND created_at >= CURRENT_DATE - INTERVAL '100 days';
        
        -- 실제 리포트 수 계산 (최근 100일)
        SELECT COUNT(*) INTO actual_reports
        FROM ai_analysis_reports 
        WHERE user_id = user_record.id 
        AND created_at >= CURRENT_DATE - INTERVAL '100 days';
        
        -- 실제 로그인 수 계산 (최근 100일)
        SELECT COUNT(*) INTO actual_logins
        FROM user_activities 
        WHERE user_id = user_record.id 
        AND activity_type = 'login'
        AND created_at >= CURRENT_DATE - INTERVAL '100 days';
        
        -- users 테이블 업데이트
        UPDATE users 
        SET 
            total_searches = actual_searches,
            total_reports = actual_reports,
            total_logins = actual_logins,
            updated_at = NOW()
        WHERE id = user_record.id;
        
    END LOOP;
    
    RAISE NOTICE '🔄 User totals synchronization completed';
END;
$$ LANGUAGE plpgsql;

-- 3. 새로운 활동 발생 시 사용자 총계 업데이트 트리거 함수
CREATE OR REPLACE FUNCTION update_user_totals_on_activity()
RETURNS TRIGGER AS $$
BEGIN
    -- search_history 테이블에 새 레코드 추가 시
    IF TG_TABLE_NAME = 'search_history' THEN
        IF TG_OP = 'INSERT' THEN
            UPDATE users 
            SET total_searches = (
                SELECT COUNT(*) 
                FROM search_history 
                WHERE user_id = NEW.user_id 
                AND created_at >= CURRENT_DATE - INTERVAL '100 days'
            ),
            updated_at = NOW()
            WHERE id = NEW.user_id;
        END IF;
    END IF;
    
    -- ai_analysis_reports 테이블에 새 레코드 추가 시
    IF TG_TABLE_NAME = 'ai_analysis_reports' THEN
        IF TG_OP = 'INSERT' THEN
            UPDATE users 
            SET total_reports = (
                SELECT COUNT(*) 
                FROM ai_analysis_reports 
                WHERE user_id = NEW.user_id 
                AND created_at >= CURRENT_DATE - INTERVAL '100 days'
            ),
            updated_at = NOW()
            WHERE id = NEW.user_id;
        END IF;
    END IF;
    
    -- user_activities 테이블에 로그인 활동 추가 시
    IF TG_TABLE_NAME = 'user_activities' THEN
        IF TG_OP = 'INSERT' AND NEW.activity_type = 'login' THEN
            UPDATE users 
            SET total_logins = (
                SELECT COUNT(*) 
                FROM user_activities 
                WHERE user_id = NEW.user_id 
                AND activity_type = 'login'
                AND created_at >= CURRENT_DATE - INTERVAL '100 days'
            ),
            updated_at = NOW()
            WHERE id = NEW.user_id;
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 4. 기존 트리거 삭제 후 새로 생성
DROP TRIGGER IF EXISTS trigger_update_search_totals ON search_history;
CREATE TRIGGER trigger_update_search_totals
    AFTER INSERT ON search_history
    FOR EACH ROW
    EXECUTE FUNCTION update_user_totals_on_activity();

DROP TRIGGER IF EXISTS trigger_update_report_totals ON ai_analysis_reports;
CREATE TRIGGER trigger_update_report_totals
    AFTER INSERT ON ai_analysis_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_user_totals_on_activity();

DROP TRIGGER IF EXISTS trigger_update_login_totals ON user_activities;
CREATE TRIGGER trigger_update_login_totals
    AFTER INSERT ON user_activities
    FOR EACH ROW
    EXECUTE FUNCTION update_user_totals_on_activity();

-- 5. get_dashboard_stats 함수 업데이트 (데이터 일관성 확보)
CREATE OR REPLACE FUNCTION get_dashboard_stats(p_user_id UUID, p_period TEXT DEFAULT '30d')
RETURNS JSON AS $$
DECLARE
    v_result JSON;
    v_quota_status JSON;
    v_efficiency_metrics JSON;
    v_recent_activities JSON;
    v_search_fields_top10 JSON;
    v_report_fields_top10 JSON;
    v_market_search_fields_top10 JSON;
    v_market_report_fields_top10 JSON;
    v_daily_searches JSON;
    v_daily_reports JSON;
    v_market_daily_searches JSON;
    v_market_daily_reports JSON;
    v_period_days INTEGER;
    v_recent_reports JSON;
    v_recent_searches JSON;
BEGIN
    -- Parse period parameter (extended to support '100d')
    v_period_days := CASE 
        WHEN p_period = '7d' THEN 7
        WHEN p_period = '30d' THEN 30
        WHEN p_period = '90d' THEN 90
        WHEN p_period = '100d' THEN 100
        ELSE 30
    END;

    -- 1. Quota Status
    SELECT json_build_object(
        'current_usage', COALESCE(u.usage_count, 0),
        'max_quota', CASE 
            WHEN u.subscription_plan = 'premium' THEN 1000 
            ELSE 100 
        END,
        'usage_percentage', ROUND(
            (COALESCE(u.usage_count, 0)::DECIMAL / 
            CASE WHEN u.subscription_plan = 'premium' THEN 1000 ELSE 100 END) * 100, 2
        ),
        'remaining_quota', CASE 
            WHEN u.subscription_plan = 'premium' THEN 1000 - COALESCE(u.usage_count, 0)
            ELSE 100 - COALESCE(u.usage_count, 0)
        END,
        'subscription_plan', COALESCE(u.subscription_plan, 'free')
    ) INTO v_quota_status
    FROM users u WHERE u.id = p_user_id;

    -- 2. Efficiency Metrics (실제 활동 데이터 기반으로 계산)
    WITH user_activity_stats AS (
        SELECT 
            -- 실제 검색 수 (최근 100일)
            (SELECT COUNT(*) FROM search_history WHERE user_id = p_user_id AND created_at >= NOW() - INTERVAL '100 days') as actual_searches,
            -- 실제 리포트 수 (최근 100일)
            (SELECT COUNT(*) FROM ai_analysis_reports WHERE user_id = p_user_id AND created_at >= NOW() - INTERVAL '100 days') as actual_reports,
            -- 실제 로그인 수 (최근 100일)
            (SELECT COUNT(*) FROM user_activities WHERE user_id = p_user_id AND activity_type = 'login' AND created_at >= NOW() - INTERVAL '100 days') as actual_logins,
            -- 기간별 리포트 수
            (SELECT COUNT(*) FROM ai_analysis_reports WHERE user_id = p_user_id AND created_at >= NOW() - INTERVAL '1 day' * v_period_days) as period_reports
    )
    SELECT json_build_object(
        'loginEfficiency', json_build_object(
            'value', CASE 
                WHEN actual_logins > 0 
                THEN ROUND((actual_reports::DECIMAL / actual_logins) * 100, 1)
                ELSE 0 
            END,
            'status', CASE 
                WHEN actual_logins = 0 THEN 'no_data'
                WHEN (actual_reports::DECIMAL / actual_logins) >= 0.8 THEN 'excellent'
                WHEN (actual_reports::DECIMAL / actual_logins) >= 0.5 THEN 'good'
                ELSE 'improvement_needed'
            END,
            'totalLogins', actual_logins,
            'reportsGenerated', actual_reports
        ),
        'searchConversion', json_build_object(
            'value', CASE 
                WHEN actual_searches > 0 
                THEN ROUND((actual_reports::DECIMAL / actual_searches) * 100, 1)
                ELSE 0 
            END,
            'status', CASE 
                WHEN actual_searches = 0 THEN 'no_data'
                WHEN (actual_reports::DECIMAL / actual_searches) >= 0.6 THEN 'excellent'
                WHEN (actual_reports::DECIMAL / actual_searches) >= 0.3 THEN 'good'
                ELSE 'improvement_needed'
            END,
            'totalSearches', actual_searches,
            'reportsGenerated', actual_reports
        ),
        'loginToReportRate', CASE 
            WHEN actual_logins > 0 
            THEN ROUND((actual_reports::DECIMAL / actual_logins) * 100, 1)
            ELSE 0 
        END,
        'searchToReportRate', CASE 
            WHEN actual_searches > 0 
            THEN ROUND((actual_reports::DECIMAL / actual_searches) * 100, 1)
            ELSE 0 
        END,
        'monthlyReports', period_reports,
        'monthlySearches', actual_searches
    ) INTO v_efficiency_metrics
    FROM user_activity_stats;

    -- 3. Recent Reports
    SELECT COALESCE(json_agg(
        json_build_object(
            'id', id,
            'title', COALESCE(report_name, invention_title),
            'report_type', analysis_type,
            'status', 'completed',
            'created_at', created_at,
            'technology_fields', ARRAY[COALESCE(invention_title, 'General')]
        ) ORDER BY created_at DESC
    ), '[]'::json) INTO v_recent_reports
    FROM (
        SELECT id, report_name, invention_title, analysis_type, created_at
        FROM ai_analysis_reports 
        WHERE user_id = p_user_id 
        AND created_at >= NOW() - INTERVAL '1 day' * v_period_days
        ORDER BY created_at DESC 
        LIMIT 10
    ) recent_reports_data;

    -- 4. Recent Searches
    SELECT COALESCE(json_agg(
        json_build_object(
            'keyword', keyword,
            'search_count', 1,
            'last_searched', created_at,
            'ipc_class', COALESCE(SUBSTRING(ipc_codes[1] FROM 1 FOR 4), 'G'),
            'cpc_class', COALESCE(SUBSTRING(ipc_codes[1] FROM 1 FOR 4), 'G')
        ) ORDER BY created_at DESC
    ), '[]'::json) INTO v_recent_searches
    FROM (
        SELECT keyword, created_at, ipc_codes
        FROM search_history 
        WHERE user_id = p_user_id 
        AND created_at >= NOW() - INTERVAL '1 day' * v_period_days
        ORDER BY created_at DESC 
        LIMIT 10
    ) recent_searches_data;

    -- 5. Search Fields Top 10 (User)
    SELECT COALESCE(json_agg(
        json_build_object(
            'field', COALESCE(technology_field, 'General'),
            'ipc_code', COALESCE(SUBSTRING(ipc_codes[1] FROM 1 FOR 4), 'G'),
            'search_count', search_count,
            'percentage', ROUND((search_count::DECIMAL / total_searches.total) * 100, 1)
        ) ORDER BY search_count DESC
    ), '[]'::json) INTO v_search_fields_top10
    FROM (
        SELECT 
            COALESCE(technology_field, 'General') as technology_field,
            ipc_codes,
            COUNT(*) as search_count
        FROM search_history 
        WHERE user_id = p_user_id 
        AND created_at >= NOW() - INTERVAL '1 day' * v_period_days
        GROUP BY technology_field, ipc_codes
        ORDER BY search_count DESC
        LIMIT 10
    ) user_searches
    CROSS JOIN (
        SELECT COUNT(*) as total
        FROM search_history 
        WHERE user_id = p_user_id 
        AND created_at >= NOW() - INTERVAL '1 day' * v_period_days
    ) total_searches
    WHERE total_searches.total > 0;

    -- 6. Report Fields Top 10 (User)
    SELECT COALESCE(json_agg(
        json_build_object(
            'ipc_code', CASE 
                WHEN invention_title ILIKE '%AI%' OR invention_title ILIKE '%인공지능%' THEN 'G06N'
                WHEN invention_title ILIKE '%통신%' OR invention_title ILIKE '%communication%' THEN 'H04L'
                WHEN invention_title ILIKE '%의료%' OR invention_title ILIKE '%medical%' THEN 'A61B'
                WHEN invention_title ILIKE '%자동차%' OR invention_title ILIKE '%automotive%' THEN 'B60W'
                WHEN invention_title ILIKE '%반도체%' OR invention_title ILIKE '%semiconductor%' THEN 'H01L'
                WHEN invention_title ILIKE '%디스플레이%' OR invention_title ILIKE '%display%' THEN 'G09G'
                WHEN invention_title ILIKE '%배터리%' OR invention_title ILIKE '%battery%' THEN 'H01M'
                WHEN invention_title ILIKE '%소프트웨어%' OR invention_title ILIKE '%software%' THEN 'G06F'
                WHEN invention_title ILIKE '%네트워크%' OR invention_title ILIKE '%network%' THEN 'H04W'
                WHEN invention_title ILIKE '%센서%' OR invention_title ILIKE '%sensor%' THEN 'G01D'
                WHEN invention_title ILIKE '%로봇%' OR invention_title ILIKE '%robot%' THEN 'B25J'
                WHEN invention_title ILIKE '%화학%' OR invention_title ILIKE '%chemical%' THEN 'C07D'
                WHEN invention_title ILIKE '%기계%' OR invention_title ILIKE '%machine%' THEN 'F16H'
                WHEN invention_title ILIKE '%전자%' OR invention_title ILIKE '%electronic%' THEN 'H05K'
                WHEN invention_title ILIKE '%광학%' OR invention_title ILIKE '%optical%' THEN 'G02B'
                WHEN invention_title ILIKE '%에너지%' OR invention_title ILIKE '%energy%' THEN 'F03D'
                WHEN invention_title ILIKE '%환경%' OR invention_title ILIKE '%environment%' THEN 'B01D'
                WHEN invention_title ILIKE '%식품%' OR invention_title ILIKE '%food%' THEN 'A23L'
                WHEN invention_title ILIKE '%건설%' OR invention_title ILIKE '%construction%' THEN 'E04B'
                WHEN invention_title ILIKE '%교통%' OR invention_title ILIKE '%transportation%' THEN 'B60W'
                WHEN invention_title ILIKE '%바이오%' OR invention_title ILIKE '%bio%' THEN 'A61B'
                ELSE 'G'
            END,
            'field', invention_title,
            'report_count', report_count,
            'percentage', ROUND((report_count::DECIMAL / total_reports.total) * 100, 1)
        ) ORDER BY report_count DESC
    ), '[]'::json) INTO v_report_fields_top10
    FROM (
        SELECT 
            invention_title,
            COUNT(*) as report_count
        FROM ai_analysis_reports 
        WHERE user_id = p_user_id 
        AND created_at >= NOW() - INTERVAL '1 day' * v_period_days
        GROUP BY invention_title
        ORDER BY report_count DESC
        LIMIT 10
    ) user_reports
    CROSS JOIN (
        SELECT COUNT(*) as total
        FROM ai_analysis_reports 
        WHERE user_id = p_user_id 
        AND created_at >= NOW() - INTERVAL '1 day' * v_period_days
    ) total_reports
    WHERE total_reports.total > 0;

    -- 7. Market Search Fields Top 10 (All Users)
    SELECT COALESCE(json_agg(
        json_build_object(
            'field', COALESCE(technology_field, 'General'),
            'ipc_code', COALESCE(SUBSTRING(ipc_codes[1] FROM 1 FOR 4), 'G'),
            'search_count', search_count,
            'percentage', ROUND((search_count::DECIMAL / total_searches.total) * 100, 1)
        ) ORDER BY search_count DESC
    ), '[]'::json) INTO v_market_search_fields_top10
    FROM (
        SELECT 
            COALESCE(technology_field, 'General') as technology_field,
            ipc_codes,
            COUNT(*) as search_count
        FROM search_history 
        WHERE created_at >= NOW() - INTERVAL '1 day' * v_period_days
        GROUP BY technology_field, ipc_codes
        ORDER BY search_count DESC
        LIMIT 10
    ) market_searches
    CROSS JOIN (
        SELECT COUNT(*) as total
        FROM search_history 
        WHERE created_at >= NOW() - INTERVAL '1 day' * v_period_days
    ) total_searches
    WHERE total_searches.total > 0;

    -- 8. Market Report Fields Top 10 (All Users)
    SELECT COALESCE(json_agg(
        json_build_object(
            'ipc_code', CASE 
                WHEN invention_title ILIKE '%AI%' OR invention_title ILIKE '%인공지능%' THEN 'G06N'
                WHEN invention_title ILIKE '%통신%' OR invention_title ILIKE '%communication%' THEN 'H04L'
                WHEN invention_title ILIKE '%의료%' OR invention_title ILIKE '%medical%' THEN 'A61B'
                WHEN invention_title ILIKE '%자동차%' OR invention_title ILIKE '%automotive%' THEN 'B60W'
                WHEN invention_title ILIKE '%반도체%' OR invention_title ILIKE '%semiconductor%' THEN 'H01L'
                WHEN invention_title ILIKE '%디스플레이%' OR invention_title ILIKE '%display%' THEN 'G09G'
                WHEN invention_title ILIKE '%배터리%' OR invention_title ILIKE '%battery%' THEN 'H01M'
                WHEN invention_title ILIKE '%소프트웨어%' OR invention_title ILIKE '%software%' THEN 'G06F'
                WHEN invention_title ILIKE '%네트워크%' OR invention_title ILIKE '%network%' THEN 'H04W'
                WHEN invention_title ILIKE '%센서%' OR invention_title ILIKE '%sensor%' THEN 'G01D'
                WHEN invention_title ILIKE '%로봇%' OR invention_title ILIKE '%robot%' THEN 'B25J'
                WHEN invention_title ILIKE '%화학%' OR invention_title ILIKE '%chemical%' THEN 'C07D'
                WHEN invention_title ILIKE '%기계%' OR invention_title ILIKE '%machine%' THEN 'F16H'
                WHEN invention_title ILIKE '%전자%' OR invention_title ILIKE '%electronic%' THEN 'H05K'
                WHEN invention_title ILIKE '%광학%' OR invention_title ILIKE '%optical%' THEN 'G02B'
                WHEN invention_title ILIKE '%에너지%' OR invention_title ILIKE '%energy%' THEN 'F03D'
                WHEN invention_title ILIKE '%환경%' OR invention_title ILIKE '%environment%' THEN 'B01D'
                WHEN invention_title ILIKE '%식품%' OR invention_title ILIKE '%food%' THEN 'A23L'
                WHEN invention_title ILIKE '%건설%' OR invention_title ILIKE '%construction%' THEN 'E04B'
                WHEN invention_title ILIKE '%교통%' OR invention_title ILIKE '%transportation%' THEN 'B60W'
                WHEN invention_title ILIKE '%바이오%' OR invention_title ILIKE '%bio%' THEN 'A61B'
                ELSE 'G'
            END,
            'field', invention_title,
            'report_count', report_count,
            'percentage', ROUND((report_count::DECIMAL / total_reports.total) * 100, 1)
        ) ORDER BY report_count DESC
    ), '[]'::json) INTO v_market_report_fields_top10
    FROM (
        SELECT 
            invention_title,
            COUNT(*) as report_count
        FROM ai_analysis_reports 
        WHERE created_at >= NOW() - INTERVAL '1 day' * v_period_days
        GROUP BY invention_title
        ORDER BY report_count DESC
        LIMIT 10
    ) market_reports
    CROSS JOIN (
        SELECT COUNT(*) as total
        FROM ai_analysis_reports 
        WHERE created_at >= NOW() - INTERVAL '1 day' * v_period_days
    ) total_reports
    WHERE total_reports.total > 0;

    -- 9. Daily Searches (User) - 일관성 확보
    SELECT COALESCE(json_agg(
        json_build_object(
            'date', search_date::text,
            'count', search_count
        ) ORDER BY search_date
    ), '[]'::json) INTO v_daily_searches
    FROM (
        SELECT 
            DATE(created_at) as search_date,
            COUNT(*) as search_count
        FROM search_history 
        WHERE user_id = p_user_id 
        AND created_at >= NOW() - INTERVAL '1 day' * v_period_days
        GROUP BY DATE(created_at)
        ORDER BY search_date
    ) daily_user_searches;

    -- 10. Daily Reports (User) - 일관성 확보
    SELECT COALESCE(json_agg(
        json_build_object(
            'date', report_date::text,
            'count', report_count
        ) ORDER BY report_date
    ), '[]'::json) INTO v_daily_reports
    FROM (
        SELECT 
            DATE(created_at) as report_date,
            COUNT(*) as report_count
        FROM ai_analysis_reports 
        WHERE user_id = p_user_id 
        AND created_at >= NOW() - INTERVAL '1 day' * v_period_days
        GROUP BY DATE(created_at)
        ORDER BY report_date
    ) daily_user_reports;

    -- 11. Market Daily Searches (All Users Average)
    SELECT COALESCE(json_agg(
        json_build_object(
            'date', search_date::text,
            'count', ROUND(search_count::DECIMAL / user_count, 1)
        ) ORDER BY search_date
    ), '[]'::json) INTO v_market_daily_searches
    FROM (
        SELECT 
            DATE(sh.created_at) as search_date,
            COUNT(*) as search_count,
            COUNT(DISTINCT sh.user_id) as user_count
        FROM search_history sh
        WHERE sh.created_at >= NOW() - INTERVAL '1 day' * v_period_days
        GROUP BY DATE(sh.created_at)
        ORDER BY search_date
    ) daily_market_searches;

    -- 12. Market Daily Reports (All Users Average)
    SELECT COALESCE(json_agg(
        json_build_object(
            'date', report_date::text,
            'count', ROUND(report_count::DECIMAL / user_count, 1)
        ) ORDER BY report_date
    ), '[]'::json) INTO v_market_daily_reports
    FROM (
        SELECT 
            DATE(ar.created_at) as report_date,
            COUNT(*) as report_count,
            COUNT(DISTINCT ar.user_id) as user_count
        FROM ai_analysis_reports ar
        WHERE ar.created_at >= NOW() - INTERVAL '1 day' * v_period_days
        GROUP BY DATE(ar.created_at)
        ORDER BY report_date
    ) daily_market_reports;

    -- 13. Recent Activities 통합
    SELECT json_build_object(
        'reports', v_recent_reports,
        'searches', v_recent_searches
    ) INTO v_recent_activities;

    -- 최종 결과 구성
    SELECT json_build_object(
        'quotaStatus', v_quota_status,
        'efficiencyMetrics', v_efficiency_metrics,
        'recentActivities', v_recent_activities,
        'searchFields', json_build_object(
            'user', v_search_fields_top10,
            'market', v_market_search_fields_top10
        ),
        'reportFields', json_build_object(
            'user', v_report_fields_top10,
            'market', v_market_report_fields_top10
        ),
        'searchTrends', json_build_object(
            'userDaily', v_daily_searches,
            'marketDaily', v_market_daily_searches
        ),
        'reportTrends', json_build_object(
            'userDaily', v_daily_reports,
            'marketDaily', v_market_daily_reports
        ),
        'recentReports', v_recent_reports,
        'recentSearches', v_recent_searches,
        'search_fields_top10', v_search_fields_top10,
        'report_fields_top10', v_report_fields_top10,
        'market_search_fields_top10', v_market_search_fields_top10,
        'market_report_fields_top10', v_market_report_fields_top10,
        'daily_searches', v_daily_searches,
        'daily_reports', v_daily_reports,
        'market_daily_searches', v_market_daily_searches,
        'market_daily_reports', v_market_daily_reports
    ) INTO v_result;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- 6. 매일 자동 실행을 위한 스케줄러 함수
CREATE OR REPLACE FUNCTION schedule_daily_cleanup()
RETURNS void AS $$
BEGIN
    -- 이 함수는 외부 스케줄러(예: GitHub Actions, Vercel Cron)에서 호출
    PERFORM cleanup_old_data();
END;
$$ LANGUAGE plpgsql;

-- 7. 데이터 정리 상태 확인 뷰
CREATE OR REPLACE VIEW data_retention_status AS
SELECT 
    'search_history' as table_name,
    COUNT(*) as total_records,
    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '100 days') as recent_records,
    COUNT(*) FILTER (WHERE created_at < CURRENT_DATE - INTERVAL '100 days') as old_records,
    MIN(created_at) as oldest_record,
    MAX(created_at) as newest_record
FROM search_history
UNION ALL
SELECT 
    'ai_analysis_reports' as table_name,
    COUNT(*) as total_records,
    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '100 days') as recent_records,
    COUNT(*) FILTER (WHERE created_at < CURRENT_DATE - INTERVAL '100 days') as old_records,
    MIN(created_at) as oldest_record,
    MAX(created_at) as newest_record
FROM ai_analysis_reports
UNION ALL
SELECT 
    'user_activities' as table_name,
    COUNT(*) as total_records,
    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '100 days') as recent_records,
    COUNT(*) FILTER (WHERE created_at < CURRENT_DATE - INTERVAL '100 days') as old_records,
    MIN(created_at) as oldest_record,
    MAX(created_at) as newest_record
FROM user_activities;

-- 8. 사용자별 데이터 일관성 확인 뷰
CREATE OR REPLACE VIEW user_data_consistency AS
SELECT 
    u.id as user_id,
    u.email,
    u.total_searches as stored_searches,
    u.total_reports as stored_reports,
    u.total_logins as stored_logins,
    (SELECT COUNT(*) FROM search_history sh WHERE sh.user_id = u.id AND sh.created_at >= CURRENT_DATE - INTERVAL '100 days') as actual_searches,
    (SELECT COUNT(*) FROM ai_analysis_reports ar WHERE ar.user_id = u.id AND ar.created_at >= CURRENT_DATE - INTERVAL '100 days') as actual_reports,
    (SELECT COUNT(*) FROM user_activities ua WHERE ua.user_id = u.id AND ua.activity_type = 'login' AND ua.created_at >= CURRENT_DATE - INTERVAL '100 days') as actual_logins,
    -- 일관성 체크
    (u.total_searches = (SELECT COUNT(*) FROM search_history sh WHERE sh.user_id = u.id AND sh.created_at >= CURRENT_DATE - INTERVAL '100 days')) as searches_consistent,
    (u.total_reports = (SELECT COUNT(*) FROM ai_analysis_reports ar WHERE ar.user_id = u.id AND ar.created_at >= CURRENT_DATE - INTERVAL '100 days')) as reports_consistent,
    (u.total_logins = (SELECT COUNT(*) FROM user_activities ua WHERE ua.user_id = u.id AND ua.activity_type = 'login' AND ua.created_at >= CURRENT_DATE - INTERVAL '100 days')) as logins_consistent
FROM users u
WHERE u.role = 'user';

-- 9. 초기 데이터 정리 및 동기화 실행
DO $$
BEGIN
    RAISE NOTICE '🚀 Starting initial data cleanup and synchronization...';
    
    -- 기존 100일 이상 된 데이터 정리
    PERFORM cleanup_old_data();
    
    RAISE NOTICE '✅ Initial setup completed successfully';
END;
$$;

-- 함수 및 뷰에 대한 설명 추가
COMMENT ON FUNCTION cleanup_old_data() IS '100일 이상 된 데이터를 자동으로 삭제하는 함수';
COMMENT ON FUNCTION sync_user_totals() IS '사용자 총계를 실제 활동 데이터와 동기화하는 함수';
COMMENT ON FUNCTION update_user_totals_on_activity() IS '새로운 활동 발생 시 사용자 총계를 업데이트하는 트리거 함수';
COMMENT ON FUNCTION get_dashboard_stats(UUID, TEXT) IS '대시보드 통계를 조회하는 함수 (데이터 일관성 확보)';
COMMENT ON VIEW data_retention_status IS '데이터 보존 정책 상태를 확인하는 뷰';
COMMENT ON VIEW user_data_consistency IS '사용자별 데이터 일관성을 확인하는 뷰';