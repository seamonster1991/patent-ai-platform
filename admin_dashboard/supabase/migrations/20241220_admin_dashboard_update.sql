-- Admin Dashboard Update Migration
-- 기존 admin_users 테이블 업데이트 및 새로운 테이블 생성

-- 1. admin_users 테이블에 2FA 관련 컬럼 추가 (존재하지 않는 경우에만)
DO $$ 
BEGIN
    -- 2FA secret 컬럼 추가
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'admin_users' AND column_name = 'two_factor_secret') THEN
        ALTER TABLE admin_users ADD COLUMN two_factor_secret VARCHAR(255);
    END IF;
    
    -- 2FA enabled 컬럼 추가
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'admin_users' AND column_name = 'two_factor_enabled') THEN
        ALTER TABLE admin_users ADD COLUMN two_factor_enabled BOOLEAN DEFAULT false;
    END IF;
    
    -- 2FA backup codes 컬럼 추가
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'admin_users' AND column_name = 'backup_codes') THEN
        ALTER TABLE admin_users ADD COLUMN backup_codes JSONB DEFAULT '[]'::jsonb;
    END IF;
    
    -- 로그인 시도 관련 컬럼 추가
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'admin_users' AND column_name = 'failed_login_attempts') THEN
        ALTER TABLE admin_users ADD COLUMN failed_login_attempts INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'admin_users' AND column_name = 'locked_until') THEN
        ALTER TABLE admin_users ADD COLUMN locked_until TIMESTAMPTZ;
    END IF;
    
    -- 마지막 비밀번호 변경일 컬럼 추가
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'admin_users' AND column_name = 'password_changed_at') THEN
        ALTER TABLE admin_users ADD COLUMN password_changed_at TIMESTAMPTZ DEFAULT now();
    END IF;
END $$;

-- 2. admin_dashboard_metrics 테이블 생성 (존재하지 않는 경우에만)
CREATE TABLE IF NOT EXISTS admin_dashboard_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_name VARCHAR(255) NOT NULL,
    metric_value NUMERIC NOT NULL,
    metric_type VARCHAR(100) NOT NULL, -- 'count', 'percentage', 'amount', 'duration'
    category VARCHAR(100) NOT NULL, -- 'users', 'payments', 'system', 'analytics'
    period_type VARCHAR(50) NOT NULL, -- 'daily', 'weekly', 'monthly', 'yearly', 'real_time'
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. admin_notifications 테이블 생성 (존재하지 않는 경우에만)
CREATE TABLE IF NOT EXISTS admin_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES admin_users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('info', 'warning', 'error', 'success')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    is_read BOOLEAN DEFAULT false,
    action_url VARCHAR(500),
    action_label VARCHAR(100),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    read_at TIMESTAMPTZ
);

-- 4. admin_activity_logs 테이블 생성 (존재하지 않는 경우에만)
CREATE TABLE IF NOT EXISTS admin_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    action VARCHAR(255) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id UUID,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. real_time_metrics 테이블 생성 (존재하지 않는 경우에만)
CREATE TABLE IF NOT EXISTS real_time_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_key VARCHAR(255) NOT NULL,
    metric_value NUMERIC NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT now(),
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- 파티션을 위한 인덱스
    CONSTRAINT unique_metric_timestamp UNIQUE (metric_key, timestamp)
);

-- 6. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_admin_dashboard_metrics_category_period 
ON admin_dashboard_metrics(category, period_type, period_start);

CREATE INDEX IF NOT EXISTS idx_admin_dashboard_metrics_created_at 
ON admin_dashboard_metrics(created_at);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_admin_id_unread 
ON admin_notifications(admin_id, is_read, created_at);

CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_admin_id_created 
ON admin_activity_logs(admin_id, created_at);

CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_resource 
ON admin_activity_logs(resource_type, resource_id);

CREATE INDEX IF NOT EXISTS idx_real_time_metrics_key_timestamp 
ON real_time_metrics(metric_key, timestamp DESC);

-- 7. 기본 관리자 역할 데이터 삽입 (존재하지 않는 경우에만)
INSERT INTO admin_roles (name, description, permissions)
SELECT 'super_admin', '최고 관리자', '{
    "dashboard": {"read": true, "write": true, "delete": true},
    "users": {"read": true, "write": true, "delete": true},
    "payments": {"read": true, "write": true, "delete": true},
    "system": {"read": true, "write": true, "delete": true},
    "analytics": {"read": true, "write": true, "delete": true},
    "admin_management": {"read": true, "write": true, "delete": true}
}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM admin_roles WHERE name = 'super_admin');

INSERT INTO admin_roles (name, description, permissions)
SELECT 'admin', '일반 관리자', '{
    "dashboard": {"read": true, "write": true, "delete": false},
    "users": {"read": true, "write": true, "delete": false},
    "payments": {"read": true, "write": false, "delete": false},
    "system": {"read": true, "write": false, "delete": false},
    "analytics": {"read": true, "write": false, "delete": false},
    "admin_management": {"read": false, "write": false, "delete": false}
}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM admin_roles WHERE name = 'admin');

INSERT INTO admin_roles (name, description, permissions)
SELECT 'viewer', '조회 전용', '{
    "dashboard": {"read": true, "write": false, "delete": false},
    "users": {"read": true, "write": false, "delete": false},
    "payments": {"read": true, "write": false, "delete": false},
    "system": {"read": true, "write": false, "delete": false},
    "analytics": {"read": true, "write": false, "delete": false},
    "admin_management": {"read": false, "write": false, "delete": false}
}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM admin_roles WHERE name = 'viewer');

-- 8. 기본 시스템 설정 데이터 삽입
INSERT INTO system_settings (key, value, description, category, is_public)
SELECT 'admin_session_timeout', '3600', '관리자 세션 타임아웃 (초)', 'security', false
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE key = 'admin_session_timeout');

INSERT INTO system_settings (key, value, description, category, is_public)
SELECT 'max_login_attempts', '5', '최대 로그인 시도 횟수', 'security', false
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE key = 'max_login_attempts');

INSERT INTO system_settings (key, value, description, category, is_public)
SELECT 'account_lockout_duration', '1800', '계정 잠금 시간 (초)', 'security', false
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE key = 'account_lockout_duration');

INSERT INTO system_settings (key, value, description, category, is_public)
SELECT 'require_2fa', 'true', '2FA 필수 여부', 'security', false
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE key = 'require_2fa');

INSERT INTO system_settings (key, value, description, category, is_public)
SELECT 'dashboard_refresh_interval', '30', '대시보드 새로고침 간격 (초)', 'dashboard', false
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE key = 'dashboard_refresh_interval');

-- 9. 기본 메트릭 데이터 삽입
INSERT INTO admin_dashboard_metrics (metric_name, metric_value, metric_type, category, period_type)
SELECT 'total_users', 0, 'count', 'users', 'real_time'
WHERE NOT EXISTS (SELECT 1 FROM admin_dashboard_metrics WHERE metric_name = 'total_users' AND period_type = 'real_time');

INSERT INTO admin_dashboard_metrics (metric_name, metric_value, metric_type, category, period_type)
SELECT 'active_users_today', 0, 'count', 'users', 'daily'
WHERE NOT EXISTS (SELECT 1 FROM admin_dashboard_metrics WHERE metric_name = 'active_users_today' AND period_type = 'daily');

INSERT INTO admin_dashboard_metrics (metric_name, metric_value, metric_type, category, period_type)
SELECT 'total_revenue', 0, 'amount', 'payments', 'real_time'
WHERE NOT EXISTS (SELECT 1 FROM admin_dashboard_metrics WHERE metric_name = 'total_revenue' AND period_type = 'real_time');

INSERT INTO admin_dashboard_metrics (metric_name, metric_value, metric_type, category, period_type)
SELECT 'system_uptime', 100, 'percentage', 'system', 'real_time'
WHERE NOT EXISTS (SELECT 1 FROM admin_dashboard_metrics WHERE metric_name = 'system_uptime' AND period_type = 'real_time');

-- 10. 트리거 함수 생성 (updated_at 자동 업데이트)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 11. 트리거 생성
DROP TRIGGER IF EXISTS update_admin_dashboard_metrics_updated_at ON admin_dashboard_metrics;
CREATE TRIGGER update_admin_dashboard_metrics_updated_at
    BEFORE UPDATE ON admin_dashboard_metrics
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 12. RLS 정책 설정
ALTER TABLE admin_dashboard_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE real_time_metrics ENABLE ROW LEVEL SECURITY;

-- 관리자만 접근 가능한 정책 생성
CREATE POLICY admin_dashboard_metrics_policy ON admin_dashboard_metrics
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY admin_notifications_policy ON admin_notifications
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY admin_activity_logs_policy ON admin_activity_logs
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY real_time_metrics_policy ON real_time_metrics
    FOR ALL USING (auth.role() = 'service_role');

-- 13. 권한 부여
GRANT ALL PRIVILEGES ON admin_dashboard_metrics TO authenticated;
GRANT ALL PRIVILEGES ON admin_notifications TO authenticated;
GRANT ALL PRIVILEGES ON admin_activity_logs TO authenticated;
GRANT ALL PRIVILEGES ON real_time_metrics TO authenticated;

GRANT ALL PRIVILEGES ON admin_dashboard_metrics TO anon;
GRANT ALL PRIVILEGES ON admin_notifications TO anon;
GRANT ALL PRIVILEGES ON admin_activity_logs TO anon;
GRANT ALL PRIVILEGES ON real_time_metrics TO anon;

-- 14. 기본 관리자 계정 생성 (비밀번호: admin123!)
DO $$
DECLARE
    super_admin_role_id UUID;
    admin_exists BOOLEAN;
BEGIN
    -- super_admin 역할 ID 가져오기
    SELECT id INTO super_admin_role_id FROM admin_roles WHERE name = 'super_admin';
    
    -- 기본 관리자 계정 존재 여부 확인
    SELECT EXISTS(SELECT 1 FROM admin_users WHERE email = 'admin@patent-ai.com') INTO admin_exists;
    
    -- 계정이 존재하지 않으면 생성
    IF NOT admin_exists AND super_admin_role_id IS NOT NULL THEN
        INSERT INTO admin_users (email, password_hash, name, role_id, is_active, two_factor_enabled)
        VALUES (
            'admin@patent-ai.com',
            '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBdXig/8/VBvfy', -- admin123!
            'System Administrator',
            super_admin_role_id,
            true,
            false
        );
    END IF;
END $$;

COMMIT;