-- 현재 사용자 확인 및 생성
-- 사용자 ID: 276975db-635b-4c77-87a0-548f91b14231

-- 먼저 auth.users에서 사용자 정보 확인
SELECT id, email, created_at FROM auth.users WHERE id = '276975db-635b-4c77-87a0-548f91b14231';

-- users 테이블에서 사용자 정보 확인
SELECT id, email, created_at FROM users WHERE id = '276975db-635b-4c77-87a0-548f91b14231';

-- users 테이블에 사용자가 없다면 추가 (auth.users에서 정보 가져와서)
INSERT INTO users (id, email, created_at, updated_at)
SELECT 
    au.id,
    au.email,
    au.created_at,
    NOW()
FROM auth.users au
WHERE au.id = '276975db-635b-4c77-87a0-548f91b14231'
AND NOT EXISTS (
    SELECT 1 FROM users u WHERE u.id = au.id
);

-- 결과 확인
SELECT 'User created or already exists' as status, id, email FROM users WHERE id = '276975db-635b-4c77-87a0-548f91b14231';