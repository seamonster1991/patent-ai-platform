-- public.users에서 기존 admin 계정 삭제 후 auth.users ID로 재생성

-- 1. 기존 admin@p-ai.co.kr 관련 데이터 정리
DELETE FROM user_activities WHERE user_id IN (SELECT id FROM users WHERE email = 'admin@p-ai.co.kr');
DELETE FROM users WHERE email = 'admin@p-ai.co.kr';

-- 2. auth.users에서 ID 가져와서 public.users에 새로 생성
DO $$
DECLARE
    auth_user_id UUID;
BEGIN
    -- auth.users에서 admin@p-ai.co.kr의 ID 가져오기
    SELECT id INTO auth_user_id FROM auth.users WHERE email = 'admin@p-ai.co.kr';
    
    IF auth_user_id IS NOT NULL THEN
        -- public.users에 새 관리자 계정 생성
        INSERT INTO users (
            id,
            email,
            name,
            role,
            created_at,
            updated_at
        ) VALUES (
            auth_user_id,
            'admin@p-ai.co.kr',
            '시스템 관리자',
            'admin',
            NOW(),
            NOW()
        );
        
        RAISE NOTICE 'New admin user created with auth_user_id: %', auth_user_id;
    ELSE
        RAISE NOTICE 'Auth user not found for admin@p-ai.co.kr';
    END IF;
END $$;

-- 3. 결과 확인
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

-- 4. 모든 관리자 계정 확인
SELECT id, email, name, role FROM users WHERE role = 'admin';