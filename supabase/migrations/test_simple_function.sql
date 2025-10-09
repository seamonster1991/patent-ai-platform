-- 간단한 함수 테스트 (updated)

SELECT 
  id, keyword, created_at, applicant
FROM search_history 
WHERE user_id = '550e8400-e29b-41d4-a716-446655440000'
ORDER BY created_at DESC 
LIMIT 5;