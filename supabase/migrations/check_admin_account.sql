-- 관리자 계정 확인
SELECT 
    id,
    email,
    name,
    role_id,
    is_active,
    two_factor_enabled,
    failed_login_attempts,
    locked_until,
    created_at,
    last_login_at
FROM admin_users 
WHERE email = 'admin@p-ai.co.kr';

-- 관리자 역할 확인
SELECT * FROM admin_roles;