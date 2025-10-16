-- auth.users와 public.users 테이블 동기화

-- 1. auth.users에서 새 관리자 계정의 ID 가져오기
DO $$
DECLARE
    auth_user_id UUID;
BEGIN
    -- auth.users에서 admin@p-ai.co.kr의 ID 가져오기
    SELECT id INTO auth_user_id FROM auth.users WHERE email = 'admin@p-ai.co.kr';
    
    IF auth_user_id IS NOT NULL THEN
        -- public.users 테이블 업데이트 (auth.users의 ID와 동기화)
        UPDATE users 
        SET id = auth_user_id
        WHERE email = 'admin@p-ai.co.kr';
        
        RAISE NOTICE 'Admin user synchronized with auth_user_id: %', auth_user_id;
    ELSE
        RAISE NOTICE 'Auth user not found for admin@p-ai.co.kr';
    END IF;
END $$;

-- 2. 결과 확인
SELECT 
    u.id as public_user_id,
    u.email,
    u.name,
    u.role,
    au.id as auth_user_id,
    au.email_confirmed_at
FROM users u
LEFT JOIN auth.users au ON u.id = au.id
WHERE u.email = 'admin@p-ai.co.kr';

-- 3. 모든 관리자 계정 확인
SELECT id, email, name, role FROM users WHERE role = 'admin'