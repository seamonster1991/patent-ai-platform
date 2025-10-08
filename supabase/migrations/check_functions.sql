-- 데이터베이스 함수 확인
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name LIKE '%dashboard%'
ORDER BY routine_name;