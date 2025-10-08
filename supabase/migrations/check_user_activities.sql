-- 현재 로그인된 사용자의 활동 데이터 확인
SELECT 
  user_id,
  activity_type,
  activity_data,
  created_at
FROM user_activities 
WHERE user_id = '276975db-635b-4c77-87a0-548f91b14231'
ORDER BY created_at DESC
LIMIT 20;

-- 해당 사용자의 리포트 데이터 확인
SELECT 
  user_id,
  report_name,
  invention_title,
  created_at
FROM ai_analysis_reports 
WHERE user_id = '276975db-635b-4c77-87a0-548f91b14231'
ORDER BY created_at DESC
LIMIT 10;