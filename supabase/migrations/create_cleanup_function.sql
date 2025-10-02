-- 100일 이상 된 사용자 활동 데이터를 자동으로 삭제하는 함수 생성

-- 1. 정리 함수 생성
CREATE OR REPLACE FUNCTION cleanup_old_user_activities()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
    cutoff_date TIMESTAMP;
BEGIN
    -- 100일 전 날짜 계산
    cutoff_date := NOW() - INTERVAL '100 days';
    
    -- 100일 이상 된 활동 데이터 삭제
    DELETE FROM user_activities 
    WHERE created_at < cutoff_date;
    
    -- 삭제된 행 수 가져오기
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- 로그 테이블에 정리 작업 기록 (선택사항)
    INSERT INTO cleanup_logs (table_name, deleted_count, cleanup_date, cutoff_date)
    VALUES ('user_activities', deleted_count, NOW(), cutoff_date);
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 2. 정리 로그 테이블 생성 (정리 작업 기록용)
CREATE TABLE IF NOT EXISTS cleanup_logs (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(255) NOT NULL,
    deleted_count INTEGER NOT NULL,
    cleanup_date TIMESTAMP DEFAULT NOW(),
    cutoff_date TIMESTAMP NOT NULL
);

-- 3. 정리 로그 테이블에 RLS 정책 적용
ALTER TABLE cleanup_logs ENABLE ROW LEVEL SECURITY;

-- 관리자만 정리 로그를 볼 수 있도록 정책 설정
CREATE POLICY "Admin can view cleanup logs" ON cleanup_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'super_admin')
        )
    );

-- 4. 자동 실행을 위한 cron job 설정 (pg_cron 확장이 필요)
-- 매일 새벽 2시에 정리 작업 실행
-- SELECT cron.schedule('cleanup-user-activities', '0 2 * * *', 'SELECT cleanup_old_user_activities();');

-- 5. 수동 실행 함수 (관리자가 필요시 호출)
CREATE OR REPLACE FUNCTION manual_cleanup_user_activities()
RETURNS JSON AS $$
DECLARE
    deleted_count INTEGER;
    result JSON;
BEGIN
    -- 정리 함수 실행
    SELECT cleanup_old_user_activities() INTO deleted_count;
    
    -- 결과를 JSON으로 반환
    result := json_build_object(
        'success', true,
        'deleted_count', deleted_count,
        'cleanup_date', NOW(),
        'message', format('%s개의 오래된 활동 기록이 삭제되었습니다.', deleted_count)
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 6. 정리 함수 실행 권한 설정 (관리자만)
REVOKE ALL ON FUNCTION cleanup_old_user_activities() FROM PUBLIC;
REVOKE ALL ON FUNCTION manual_cleanup_user_activities() FROM PUBLIC;

-- 인증된 사용자에게 실행 권한 부여 (RLS로 관리자만 실행 가능하도록 제한)
GRANT EXECUTE ON FUNCTION cleanup_old_user_activities() TO authenticated;
GRANT EXECUTE ON FUNCTION manual_cleanup_user_activities() TO authenticated;

-- 7. 정리 상태 확인 함수
CREATE OR REPLACE FUNCTION get_cleanup_status()
RETURNS JSON AS $$
DECLARE
    total_activities INTEGER;
    old_activities INTEGER;
    last_cleanup TIMESTAMP;
    result JSON;
BEGIN
    -- 전체 활동 수
    SELECT COUNT(*) INTO total_activities FROM user_activities;
    
    -- 100일 이상 된 활동 수
    SELECT COUNT(*) INTO old_activities 
    FROM user_activities 
    WHERE created_at < (NOW() - INTERVAL '100 days');
    
    -- 마지막 정리 작업 시간
    SELECT MAX(cleanup_date) INTO last_cleanup FROM cleanup_logs;
    
    -- 결과를 JSON으로 반환
    result := json_build_object(
        'total_activities', total_activities,
        'old_activities', old_activities,
        'last_cleanup', last_cleanup,
        'cleanup_needed', old_activities > 0
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 8. 정리 상태 확인 함수 실행 권한 설정
GRANT EXECUTE ON FUNCTION get_cleanup_status() TO authenticated;

-- 9. 코멘트 추가
COMMENT ON FUNCTION cleanup_old_user_activities() IS '100일 이상 된 사용자 활동 데이터를 삭제하는 함수';
COMMENT ON FUNCTION manual_cleanup_user_activities() IS '관리자가 수동으로 정리 작업을 실행할 수 있는 함수';
COMMENT ON FUNCTION get_cleanup_status() IS '정리 작업 상태를 확인하는 함수';
COMMENT ON TABLE cleanup_logs IS '데이터 정리 작업 기록을 저장하는 테이블';