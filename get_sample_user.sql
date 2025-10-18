-- 활동이 있는 첫 번째 사용자 ID 가져오기
SELECT user_id FROM user_activities WHERE user_id IS NOT NULL LIMIT 1;