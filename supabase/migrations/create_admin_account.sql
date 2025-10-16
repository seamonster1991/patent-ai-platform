-- 관리자 역할 생성 (이미 존재할 수 있음)
INSERT INTO admin_roles (id, name, description, permissions) 
VALUES (
    gen_random_uuid(),
    'super_admin',
    'Super Administrator with full access',
    '{"users": {"read": true, "write": true, "delete": true}, "dashboard": {"read": true, "write": true}, "system": {"read": true, "write": true, "admin": true}}'::jsonb
) ON CONFLICT (name) DO NOTHING;

-- 관리자 계정 생성
-- 비밀번호 'admin123'의 bcrypt 해시: $2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBdXfs2Stk5v9W
INSERT INTO admin_users (
    id,
    email,
    password_hash,
    name,
    role_id,
    is_active,
    two_factor_enabled,
    failed_login_attempts,
    created_at,
    updated_at,
    password_changed_at
) VALUES (
    gen_random_uuid(),
    'admin@p-ai.co.kr',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBdXfs2Stk5v9W',
    'System Administrator',
    (SELECT id FROM admin_roles WHERE name = 'super_admin'),
    true,
    false,
    0,
    now(),
    now(),
    now()
) ON CONFLICT (email) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    is_active = true,
    failed_login_attempts = 0,
    locked_until = NULL,
    updated_at = now();

-- 생성된 계정 확인
SELECT 
    id,
    email,
    name,
    role_id,
    is_active,
    two_factor_enabled,
    failed_login_attempts,
    created_at
FROM admin_users 
WHERE email = 'admin@p-ai.co.kr';