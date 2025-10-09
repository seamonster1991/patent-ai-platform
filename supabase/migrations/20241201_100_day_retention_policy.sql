-- 100일 데이터 보존 정책 구현
-- 100일이 넘는 데이터를 자동으로 삭제하는 함수와 트리거 생성

-- 1. 100일 이전 데이터 삭제 함수 생성
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS void AS $$
BEGIN
    -- user_activities 테이블에서 100일 이전 데이터 삭제
    DELETE FROM user_activities 
    WHERE created_at < NOW() - INTERVAL '100 days';
    
    -- patent_search_analytics 테이블에서 100일 이전 데이터 삭제
    DELETE FROM patent_search_analytics 
    WHERE created_at < NOW() - INTERVAL '100 days';
    
    -- ai_analysis_reports 테이블에서 100일 이전 데이터 삭제
    DELETE FROM ai_analysis_reports 
    WHERE created_at < NOW() - INTERVAL '100 days';
    
    -- 로그 출력 (선택사항)
    RAISE NOTICE '100일 이전 데이터 정리 완료: %', NOW();
END;
$$ LANGUAGE plpgsql;

-- 2. 매일 자동 실행을 위한 pg_cron 확장 활성화 (Supabase에서 지원하는 경우)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 3. 매일 자정에 실행되는 스케줄 생성 (pg_cron 사용 시)
-- SELECT cron.schedule('cleanup-old-data', '0 0 * * *', 'SELECT cleanup_old_data();');

-- 4. 대안: 트리거를 통한 자동 정리 (새 데이터 삽입 시 확률적으로 실행)
CREATE OR REPLACE FUNCTION trigger_cleanup_old_data()
RETURNS trigger AS $$
BEGIN
    -- 1% 확률로 정리 함수 실행 (성능 고려)
    IF random() < 0.01 THEN
        PERFORM cleanup_old_data();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. 각 테이블에 트리거 설정
DROP TRIGGER IF EXISTS cleanup_trigger_user_activities ON user_activities;
CREATE TRIGGER cleanup_trigger_user_activities
    AFTER INSERT ON user_activities
    FOR EACH ROW
    EXECUTE FUNCTION trigger_cleanup_old_data();

DROP TRIGGER IF EXISTS cleanup_trigger_patent_search ON patent_search_analytics;
CREATE TRIGGER cleanup_trigger_patent_search
    AFTER INSERT ON patent_search_analytics
    FOR EACH ROW
    EXECUTE FUNCTION trigger_cleanup_old_data();

DROP TRIGGER IF EXISTS cleanup_trigger_ai_reports ON ai_analysis_reports;
CREATE TRIGGER cleanup_trigger_ai_reports
    AFTER INSERT ON ai_analysis_reports
    FOR EACH ROW
    EXECUTE FUNCTION trigger_cleanup_old_data();

-- 6. 인덱스 최적화 (날짜 기반 쿼리 성능 향상)
CREATE INDEX IF NOT EXISTS idx_user_activities_created_at ON user_activities(created_at);
CREATE INDEX IF NOT EXISTS idx_patent_search_analytics_created_at ON patent_search_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_reports_created_at ON ai_analysis_reports(created_at);

-- 7. 즉시 한 번 실행하여 기존 100일 이전 데이터 정리
SELECT cleanup_old_data();

-- 8. 수동 정리를 위한 뷰 생성 (관리자용)
CREATE OR REPLACE VIEW old_data_summary AS
SELECT 
    'user_activities' as table_name,
    COUNT(*) as old_records_count,
    MIN(created_at) as oldest_record,
    MAX(created_at) as newest_old_record
FROM user_activities 
WHERE created_at < NOW() - INTERVAL '100 days'
UNION ALL
SELECT 
    'patent_search_analytics' as table_name,
    COUNT(*) as old_records_count,
    MIN(created_at) as oldest_record,
    MAX(created_at) as newest_old_record
FROM patent_search_analytics 
WHERE created_at < NOW() - INTERVAL '100 days'
UNION ALL
SELECT 
    'ai_analysis_reports' as table_name,
    COUNT(*) as old_records_count,
    MIN(created_at) as oldest_record,
    MAX(created_at) as newest_old_record
FROM ai_analysis_reports 
WHERE created_at < NOW() - INTERVAL '100 days';

COMMENT ON FUNCTION cleanup_old_data() IS '100일 이전의 모든 사용자 활동, 검색 분석, AI 리포트 데이터를 삭제합니다.';
COMMENT ON VIEW old_data_summary IS '100일 이전 데이터의 요약 정보를 제공합니다.';