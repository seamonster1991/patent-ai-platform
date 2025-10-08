-- 현재 사용자 정보 확인
SELECT id, email, created_at FROM auth.users ORDER BY created_at DESC LIMIT 5;

-- users 테이블 확인
SELECT id, email, created_at FROM users ORDER BY created_at DESC LIMIT 5;