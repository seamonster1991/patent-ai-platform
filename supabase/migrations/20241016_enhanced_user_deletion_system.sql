-- 삭제된 사용자 히스토리 관리 테이블 생성 (수정된 버전)
-- 1년간 보관 후 자동 삭제 및 재가입 시 포인트 지급 방지를 위한 테이블

-- 삭제된 사용자 히스토리 테이블
CREATE TABLE IF NOT EXISTS deleted_users_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(100),
    deletion_reason VARCHAR(50) NOT NULL CHECK (deletion_reason IN ('self_deleted', 'admin_deleted')),
    deleted_by UUID, -- 관리자가 삭제한 경우 관리자 ID
    deleted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    original_created_at TIMESTAMP WITH TIME ZONE, -- 원래 계정 생성일
    user_data JSONB, -- 필요한 경우 추가 사용자 데이터 저장
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_deleted_users_history_email ON deleted_users_history(email);
CREATE INDEX IF NOT EXISTS idx_deleted_users_history_user_id ON deleted_users_history(user_id);
CREATE INDEX IF NOT EXISTS idx_deleted_users_history_deleted_at ON deleted_users_history(deleted_at);
CREATE INDEX IF NOT EXISTS idx_deleted_users_history_deletion_reason ON deleted_users_history(deletion_reason);

-- 이메일 중복 방지를 위한 유니크 인덱스 (같은 이메일이 여러 번 삭제될 수 있으므로 partial index 사용)
CREATE UNIQUE INDEX IF NOT EXISTS idx_deleted_users_history_email_user_id ON deleted_users_history(email, user_id);

-- users 테이블에 이전 삭제 이력 추적을 위한 컬럼 추가
ALTER TABLE users ADD COLUMN IF NOT EXISTS previously_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deletion_reason VARCHAR(50);

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_users_previously_deleted ON users(previously_deleted) WHERE previously_deleted = TRUE;

-- 자동 업데이트 트리거 함수
CREATE OR REPLACE FUNCTION update_deleted_users_history_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
DROP TRIGGER IF EXISTS trigger_update_deleted_users_history_updated_at ON deleted_users_history;
CREATE TRIGGER trigger_update_deleted_users_history_updated_at
    BEFORE UPDATE ON deleted_users_history
    FOR EACH ROW
    EXECUTE FUNCTION update_deleted_users_history_updated_at();

-- 1년 경과 삭제된 사용자 자동 정리 함수
CREATE OR REPLACE FUNCTION cleanup_old_deleted_users()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- 1년(365일) 이상 경과한 삭제된 사용자들을 완전히 삭제
    WITH deleted_users_to_remove AS (
        SELECT user_id 
        FROM deleted_users_history 
        WHERE deleted_at < NOW() - INTERVAL '365 days'
    )
    DELETE FROM users 
    WHERE id IN (SELECT user_id FROM deleted_users_to_remove)
    AND deleted_at IS NOT NULL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- 히스토리에서도 1년 경과한 기록들을 정리 (이메일 블랙리스트는 유지)
    -- 단, 이메일 중복 체크를 위해 최신 기록 하나는 유지
    DELETE FROM deleted_users_history 
    WHERE deleted_at < NOW() - INTERVAL '365 days'
    AND id NOT IN (
        SELECT DISTINCT ON (email) id 
        FROM deleted_users_history 
        WHERE email = deleted_users_history.email 
        ORDER BY email, deleted_at DESC
    );
    
    -- 정리 로그 기록
    INSERT INTO system_logs (level, source, message, created_at)
    VALUES ('INFO', 'cleanup_job', 
            'Cleaned up ' || deleted_count || ' users older than 1 year', 
            NOW());
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 시스템 로그 테이블 (없는 경우에만 생성)
CREATE TABLE IF NOT EXISTS system_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    level VARCHAR(20) NOT NULL CHECK (level IN ('DEBUG', 'INFO', 'WARN', 'ERROR')),
    source VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 시스템 로그 인덱스
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);
CREATE INDEX IF NOT EXISTS idx_system_logs_source ON system_logs(source);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at);

-- 이전 삭제 이력 확인 함수
CREATE OR REPLACE FUNCTION check_previous_deletion(user_email VARCHAR(255))
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM deleted_users_history 
        WHERE email = user_email
    );
END;
$$ LANGUAGE plpgsql;

-- 사용자 삭제 시 히스토리 기록 함수
CREATE OR REPLACE FUNCTION record_user_deletion()
RETURNS TRIGGER AS $$
BEGIN
    -- 사용자가 삭제(soft delete)될 때 히스토리에 기록
    IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
        INSERT INTO deleted_users_history (
            user_id,
            email,
            name,
            deletion_reason,
            deleted_by,
            deleted_at,
            original_created_at,
            user_data
        ) VALUES (
            NEW.id,
            NEW.email,
            NEW.name,
            COALESCE(NEW.deletion_reason, 'admin_deleted'),
            NULL, -- 삭제한 관리자 ID는 별도로 설정
            NEW.deleted_at,
            NEW.created_at,
            jsonb_build_object(
                'role', NEW.role,
                'subscription_plan', NEW.subscription_plan,
                'last_login_at', NEW.last_login_at,
                'total_searches', NEW.total_searches,
                'total_reports', NEW.total_reports
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 사용자 삭제 트리거
DROP TRIGGER IF EXISTS trigger_record_user_deletion ON users;
CREATE TRIGGER trigger_record_user_deletion
    AFTER UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION record_user_deletion();

-- RLS (Row Level Security) 정책 설정
ALTER TABLE deleted_users_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

-- 관리자만 접근 가능하도록 정책 설정
DROP POLICY IF EXISTS "Admin access only" ON deleted_users_history;
CREATE POLICY "Admin access only" ON deleted_users_history
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'super_admin')
        )
    );

DROP POLICY IF EXISTS "Admin access only" ON system_logs;
CREATE POLICY "Admin access only" ON system_logs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'super_admin')
        )
    );

-- 정리 작업 스케줄링을 위한 함수 (수동 실행용)
CREATE OR REPLACE FUNCTION schedule_cleanup_job()
RETURNS TEXT AS $$
BEGIN
    -- 실제 스케줄링은 백엔드에서 처리
    -- 이 함수는 수동 실행용
    PERFORM cleanup_old_deleted_users();
    RETURN 'Cleanup job executed successfully';
END;
$$ LANGUAGE plpgsql;

-- 초기 데이터 확인 및 설정
DO $$
BEGIN
    -- 기존 삭제된 사용자들에 대한 히스토리 생성 (있는 경우)
    INSERT INTO deleted_users_history (
        user_id, email, name, deletion_reason, deleted_at, original_created_at
    )
    SELECT 
        id, email, name, 'admin_deleted', deleted_at, created_at
    FROM users 
    WHERE deleted_at IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM deleted_users_history 
        WHERE deleted_users_history.user_id = users.id
    );
    
    RAISE NOTICE 'Deleted users history table created and initialized successfully';
END $$;