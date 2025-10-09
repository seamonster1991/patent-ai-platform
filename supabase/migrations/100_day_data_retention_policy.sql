-- 100일 데이터 보존 정책 구현
-- 100일 이상 된 데이터 자동 삭제 및 데이터 일관성 확보

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

-- 4. 트리거 생성
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

-- 5. 매일 자동 실행을 위한 스케줄러 함수 (pg_cron 확장 필요)
-- Supabase에서는 Edge Functions나 외부 스케줄러 사용 권장
CREATE OR REPLACE FUNCTION schedule_daily_cleanup()
RETURNS void AS $$
BEGIN
    -- 이 함수는 외부 스케줄러(예: GitHub Actions, Vercel Cron)에서 호출
    PERFORM cleanup_old_data();
END;
$$ LANGUAGE plpgsql;

-- 6. 초기 데이터 정리 및 동기화 실행
DO $$
BEGIN
    RAISE NOTICE '🚀 Starting initial data cleanup and synchronization...';
    
    -- 기존 100일 이상 된 데이터 정리
    PERFORM cleanup_old_data();
    
    RAISE NOTICE '✅ Initial setup completed successfully';
END;
$$;

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

COMMENT ON FUNCTION cleanup_old_data() IS '100일 이상 된 데이터를 자동으로 삭제하는 함수';
COMMENT ON FUNCTION sync_user_totals() IS '사용자 총계를 실제 활동 데이터와 동기화하는 함수';
COMMENT ON FUNCTION update_user_totals_on_activity() IS '새로운 활동 발생 시 사용자 총계를 업데이트하는 트리거 함수';
COMMENT ON VIEW data_retention_status IS '데이터 보존 정책 상태를 확인하는 뷰';
COMMENT ON VIEW user_data_consistency IS '사용자별 데이터 일관성을 확인하는 뷰';