-- 검색 데이터 디버깅
SELECT 
  activity_data,
  activity_data->>'keyword' as keyword,
  activity_data->>'query' as query,
  created_at
FROM user_activities 
WHERE user_id = '276975db-635b-4c77-87a0-548f91b14231'
  AND activity_type = 'search'
ORDER BY created_at DESC;