-- 기존 사용자 정보 확인 및 업데이트
-- 이메일: seongwankim@gmail.com

-- 현재 사용자 정보 확인
SELECT id, email, name FROM users WHERE email = 'seongwankim@gmail.com';

-- 사용자 ID가 다르다면 기존 사용자의 ID를 업데이트
UPDATE users 
SET id = '276975db-635b-4c77-87a0-548f91b14231'::uuid,
    updated_at = NOW()
WHERE email = 'seongwankim@gmail.com' 
AND id != '276975db-635b-4c77-87a0-548f91b14231'::uuid;

-- 결과 확인
SELECT 'User updated successfully' as status, id, email, name FROM users WHERE email = 'seongwankim