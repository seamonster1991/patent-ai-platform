-- 향상된 100일 데이터 보존 정책 및 정리 시스템 (v2)
-- Enhanced 100-day data retention policy and cleanup system (v2)

-- 1. 기존 함수 제거 (충돌 방지)
DROP FUNCTION IF EXISTS cleanup_old_data();
DROP FUNCTION IF EXISTS cleanup_old_data(INTEGER);
DROP FUNCTION IF EXISTS cleanup_old_data(INTEGER, VARCHAR);

-- 2. 데이터 정리 로그 테이블 생성
CREATE TABLE IF NOT EXISTS data_cleanup_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cleanup_type VARCHAR(20) NOT NULL CHECK (cleanup_type IN ('auto', 'manual', 'selective')),
    target_tables TEXT[] NOT NULL,
    retention_days INTEGER NOT NULL DEFAULT 100,
    deleted_records INTEGER NOT NULL DEFAULT 0,
    cleanup_summary JSONB DEFAULT '{}',
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    executed_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_data_cleanup_logs_executed_at 
ON data_cleanup_logs(executed_at DESC);

CREATE INDEX IF NOT EXISTS idx_data_cleanup_logs_cleanup_type 
ON data_cleanup_logs(cleanup_type);

-- 3. 새로운 향상된 데이터 정리 함수 생성
CREATE OR REPLACE FUNCTION cleanup_old_data_enhanced(
    p_retention_days INTEGER DEFAULT 100,
    p_cleanup_type VARCHAR(20) DEFAULT 'auto'
) RETURNS JSONB AS $$
DECLARE
    v_cutoff_date TIMESTAMP WITH TIME ZONE;
    v_deleted_searches INTEGER := 0;
    v_deleted_reports INTEGER := 0;
    v_deleted_activities INTEGER := 0;
    v_cleanup_summary JSONB;
BEGIN
    -- 기준 날짜 계산
    v_cutoff_date := NOW() - INTERVAL '1 day' * p_retention_days;
    
    -- 오래된 검색 기록 삭제
    DELETE FROM search_history 
    WHERE created_at < v_cutoff_date;
    GET DIAGNOSTICS v_deleted_searches = ROW_COUNT;
    
    -- 오래된 AI 분석 리포트 삭제
    DELETE FROM ai_analysis_reports 
    WHERE created_at < v_cutoff_date;
    GET DIAGNOSTICS v_deleted_reports = ROW_COUNT;
    
    -- 오래된 사용자 활동 삭제
    DELETE FROM user_activities 
    WHERE created_at < v_cutoff_date;
    GET DIAGNOSTICS v_deleted_activities = ROW_COUNT;
    
    -- 정리 요약 생성
    v_cleanup_summary := jsonb_build_object(
        'cutoff_date', v_cutoff_date,
        'deleted_searches', v_deleted_searches,
        'deleted_reports', v_deleted_reports,
        'deleted_activities', v_deleted_activities,
        'total_deleted', v_deleted_searches + v_deleted_reports + v_deleted_activities
    );
    
    -- 정리 로그 기록
    INSERT INTO data_cleanup_logs (
        cleanup_type, 
        target_tables, 
        retention_days, 
        deleted_records, 
        cleanup_summary
    ) VALUES (
        p_cleanup_type,
        ARRAY['search_history', 'ai_analysis_reports', 'user_activities'],
        p_retention_days,
        v_deleted_searches + v_deleted_reports + v_deleted_activities,
        v_cleanup_summary
    );
    
    RETURN v_cleanup_summary;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. 선택적 테이블 정리 함수
CREATE OR REPLACE FUNCTION cleanup_specific_table_enhanced(
    p_table_name TEXT,
    p_retention_days INTEGER DEFAULT 100
) RETURNS INTEGER AS $$
DECLARE
    v_cutoff_date TIMESTAMP WITH TIME ZONE;
    v_deleted_count INTEGER := 0;
    v_sql TEXT;
BEGIN
    -- 허용된 테이블만 정리 가능
    IF p_table_name NOT IN ('search_history', 'ai_analysis_reports', 'user_activities') THEN
        RAISE EXCEPTION 'Invalid table name: %', p_table_name;
    END IF;
    
    v_cutoff_date := NOW() - INTERVAL '1 day' * p_retention_days;
    
    -- 동적 SQL 실행
    v_sql := format('DELETE FROM %I WHERE created_at < $1', p_table_name);
    EXECUTE v_sql USING v_cutoff_date;
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    -- 로그 기록
    INSERT INTO data_cleanup_logs (
        cleanup_type, 
        target_tables, 
        retention_days, 
        deleted_records, 
        cleanup_summary
    ) VALUES (
        'selective',
        ARRAY[p_table_name],
        p_retention_days,
        v_deleted_count,
        jsonb_build_object(
            'table_name', p_table_name,
            'cutoff_date', v_cutoff_date,
            'deleted_count', v_deleted_count
        )
    );
    
    RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. 데이터 현황 조회 함수
CREATE OR REPLACE FUNCTION get_data_retention_status_enhanced()
RETURNS TABLE(
    table_name TEXT,
    total_records BIGINT,
    records_within_retention BIGINT,
    records_beyond_retention BIGINT,
    oldest_record TIMESTAMP WITH TIME ZONE,
    newest_record TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'search_history'::TEXT,
        COUNT(*)::BIGINT,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '100 days')::BIGINT,
        COUNT(*) FILTER (WHERE created_at < NOW() - INTERVAL '100 days')::BIGINT,
        MIN(created_at),
        MAX(created_at)
    FROM search_history
    UNION ALL
    SELECT 
        'ai_analysis_reports'::TEXT,
        COUNT(*)::BIGINT,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '100 days')::BIGINT,
        COUNT(*) FILTER (WHERE created_at < NOW() - INTERVAL '100 days')::BIGINT,
        MIN(created_at),
        MAX(created_at)
    FROM ai_analysis_reports
    UNION ALL
    SELECT 
        'user_activities'::TEXT,
        COUNT(*)::BIGINT,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '100 days')::BIGINT,
        COUNT(*) FILTER (WHERE created_at < NOW() - INTERVAL '100 days')::BIGINT,
        MIN(created_at),
        MAX(created_at)
    FROM user_activities;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. 자동 정리 트리거 함수 (확률적 실행) - 기존 함수 업데이트
CREATE OR REPLACE FUNCTION trigger_auto_cleanup()
RETURNS trigger AS $$
BEGIN
    -- 0.1% 확률로 정리 함수 실행 (성능 고려)
    IF random() < 0.001 THEN
        PERFORM cleanup_old_data_enhanced(100, 'auto');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. 성능 최적화를 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_search_history_created_at 
ON search_history(created_at);

CREATE INDEX IF NOT EXISTS idx_ai_analysis_reports_created_at 
ON ai_analysis_reports(created_at);

CREATE INDEX IF NOT EXISTS idx_user_activities_created_at 
ON user_activities(created_at);

-- 8. 권한 부여
GRANT EXECUTE ON FUNCTION cleanup_old_data_enhanced TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_specific_table_enhanced TO authenticated;
GRANT EXECUTE ON FUNCTION get_data_retention_status_enhanced TO authenticated;

-- 9. 관리자용 뷰 생성
CREATE OR REPLACE VIEW data_cleanup_dashboard AS
SELECT 
    dcl.id,
    dcl.cleanup_type,
    dcl.target_tables,
    dcl.retention_days,
    dcl.deleted_records,
    dcl.cleanup_summary,
    dcl.executed_at,
    u.name as executed_by_name
FROM data_cleanup_logs dcl
LEFT JOIN users u ON dcl.executed_by = u.id
ORDER BY dcl.executed_at DESC;

-- 10. 최근 정리 작업 요약 뷰
CREATE OR REPLACE VIEW recent_cleanup_summary AS
SELECT 
    cleanup_type,
    COUNT(*) as execution_count,
    SUM(deleted_records) as total_deleted,
    AVG(deleted_records) as avg_deleted_per_run,
    MAX(executed_at) as last_execution,
    MIN(executed_at) as first_execution
FROM data_cleanup_logs
WHERE executed_at >= NOW() - INTERVAL '30 days'
GROUP BY cleanup_type
ORDER BY last_execution DESC;

-- 11. 즉시 한 번 실행하여 기존 100일 이전 데이터 정리
SELECT cleanup_old_data_enhanced(100, 'manual');

-- 함수 및 뷰에 대한 설명 추가
COMMENT ON FUNCTION cleanup_old_data_enhanced(INTEGER, VARCHAR) IS '지정된 보존 기간을 초과하는 모든 데이터를 삭제하고 정리 로그를 기록합니다.';
COMMENT ON FUNCTION cleanup_specific_table_enhanced(TEXT, INTEGER) IS '특정 테이블에서만 오래된 데이터를 삭제합니다.';
COMMENT ON FUNCTION get_data_retention_status_enhanced() IS '각 테이블의 데이터 보존 현황을 조회합니다.';
COMMENT ON VIEW data_cleanup_dashboard IS '데이터 정리 작업의 전체 이력을 보여주는 관리자용 대시보드입니다.';
COMMENT ON VIEW recent_cleanup_summary IS '최근 30일간의 데이터 정리 작업 요약을 제공합니다.';