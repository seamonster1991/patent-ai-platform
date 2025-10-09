-- get_dashboard_stats 함수 테스트 (업데이트됨)
-- 1. 현재 사용자 ID 확인
SELECT id, email FROM users WHERE email = 'seongwankim@gmail.com';

-- 2. get_dashboard_stats 함수 실행
SELECT * FROM get_dashboard_stats((SELECT id FROM users WHERE email = 'seongwankim@gmail.com'));