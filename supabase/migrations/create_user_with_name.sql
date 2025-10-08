-- 사용자 생성 (name 필드 포함)
-- 사용자 ID: 276975db-635b-4c77-87a0-548f91b14231

-- users 테이블에 사용자 추가 (name 필드 포함)
INSERT INTO users (id, email, name, created_at, updated_at)
SELECT 
    '276975db-635b-4c77-87a0-548f91b14231'::uuid,
    'seongwankim@gmail.com',
    'Seongwan Kim',
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE id = '276975db-635b-4c77-87a0-548f91b14231'
);

-- 결과 확인
SELECT 'User created successfully' as status, id, email, name FROM users WHERE id = '276975db-635b-4c77-87a0-548f91b14231';