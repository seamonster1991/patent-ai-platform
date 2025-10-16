-- get_dashboard_stats 함수 직접 테스트

-- 1. 함수 존재 여부 확인
SELECT 
    proname as function_name,
    oidvectortypes(proargtypes) as argument_types
FROM pg_proc 
WHERE proname = 'get_dashboard_stats';

-- 2. 첫 번째 사용자 ID 가져오기
WITH first_user AS (
    SELECT id FROM users ORDER BY created_at DESC LIMIT 1
)
-- 3. 함수 실행 테스트
SELECT get_dashboard_stats(first_user.id, '100d') as dashboard_stats
FROM first_user;