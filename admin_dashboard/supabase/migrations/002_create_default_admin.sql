-- 기본 슈퍼 관리자 계정 생성
-- 비밀번호: admin123! (실제 운영 환경에서는 반드시 변경해야 함)
-- bcrypt 해시: $2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3bp.93oqm6

INSERT INTO admin_users (
    id,
    username,
    email,
    password_hash,
    role,
    is_active,
    is_2fa_enabled,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'admin',
    'admin@patent-ai.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3bp.93oqm6',
    'super_admin',
    true,
    false,
    NOW(),
    NOW()
) ON CONFLICT (username) DO NOTHING;

-- 기본 관리자 계정 생성
INSERT INTO admin_users (
    id,
    username,
    email,
    password_hash,
    role,
    is_active,
    is_2fa_enabled,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'manager',
    'manager@patent-ai.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3bp.93oqm6',
    'admin',
    true,
    false,
    NOW(),
    NOW()
) ON CONFLICT (username) DO NOTHING;

-- 초기 시스템 알림 생성
INSERT INTO system_alerts (
    type,
    title,
    message,
    severity,
    metadata,
    created_at
) VALUES 
(
    'info',
    '관리자 대시보드 시작됨',
    '관리자 대시보드가 성공적으로 초기화되었습니다.',
    1,
    '{"source": "system", "category": "initialization"}',
    NOW()
),
(
    'warning',
    '기본 비밀번호 변경 필요',
    '보안을 위해 기본 관리자 계정의 비밀번호를 변경해주세요.',
    3,
    '{"source": "security", "category": "password"}',
    NOW()
);

-- 초기 시스템 메트릭 생성 (예시 데이터)
INSERT INTO system_metrics (
    metric_type,
    metric_name,
    value,
    unit,
    tags,
    timestamp
) VALUES 
(
    'system',
    'cpu_usage',
    25.5,
    'percent',
    '{"host": "admin-server", "core": "avg"}',
    NOW()
),
(
    'system',
    'memory_usage',
    68.2,
    'percent',
    '{"host": "admin-server", "type": "physical"}',
    NOW()
),
(
    'system',
    'disk_usage',
    45.8,
    'percent',
    '{"host": "admin-server", "mount": "/"}',
    NOW()
),
(
    'application',
    'active_users',
    0,
    'count',
    '{"type": "concurrent"}',
    NOW()
),
(
    'application',
    'total_users',
    0,
    'count',
    '{"type": "registered"}',
    NOW()
);