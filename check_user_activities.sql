-- 사용자 활동 데이터 확인
SELECT 
  user_id,
  activity_type,
  activity_data,
  created_at
FROM user_activities 
WHERE user_id = '276975db-635b-4c77-87a0-548f91b14231'
ORDER BY created_at DESC
LIMIT 10;