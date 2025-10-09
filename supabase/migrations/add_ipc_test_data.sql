-- IPC 분류가 포함된 테스트 데이터 추가 (updated)

-- 기존 검색 기록 업데이트 (IPC 분류가 가능한 키워드로)
UPDATE search_history 
SET keyword = CASE 
  WHEN id = (SELECT id FROM search_history WHERE user_id = '550e8400-e29b-41d4-a716-446655440000' ORDER BY created_at DESC LIMIT 1 OFFSET 0) THEN '인공지능 기반 자율주행 시스템'
  WHEN id = (SELECT id FROM search_history WHERE user_id = '550e8400-e29b-41d4-a716-446655440000' ORDER BY created_at DESC LIMIT 1 OFFSET 1) THEN '머신러닝 알고리즘 최적화'
  WHEN id = (SELECT id FROM search_history WHERE user_id = '550e8400-e29b-41d4-a716-446655440000' ORDER BY created_at DESC LIMIT 1 OFFSET 2) THEN '블록체인 암호화 기술'
  WHEN id = (SELECT id FROM search_history WHERE user_id = '550e8400-e29b-41d4-a716-446655440000' ORDER BY created_at DESC LIMIT 1 OFFSET 3) THEN '5G 통신 네트워크'
  WHEN id = (SELECT id FROM search_history WHERE user_id = '550e8400-e29b-41d4-a716-446655440000' ORDER BY created_at DESC LIMIT 1 OFFSET 4) THEN 'IoT 센서 기술'
  WHEN id = (SELECT id FROM search_history WHERE user_id = '550e8400-e29b-41d4-a716-446655440000' ORDER BY created_at DESC LIMIT 1 OFFSET 5) THEN '바이오 의료 진단'
  WHEN id = (SELECT id FROM search_history WHERE user_id = '550e8400-e29b-41d4-a716-446655440000' ORDER BY created_at DESC LIMIT 1 OFFSET 6) THEN '반도체 칩 설계'
  WHEN id = (SELECT id FROM search_history WHERE user_id = '550e8400-e29b-41d4-a716-446655440000' ORDER BY created_at DESC LIMIT 1 OFFSET 7) THEN '양자 컴퓨팅 기술'
  WHEN id = (SELECT id FROM search_history WHERE user_id = '550e8400-e29b-41d4-a716-446655440000' ORDER BY created_at DESC LIMIT 1 OFFSET 8) THEN 'AI 딥러닝 모델'
  WHEN id = (SELECT id FROM search_history WHERE user_id = '550e8400-e29b-41d4-a716-446655440000' ORDER BY created_at DESC LIMIT 1 OFFSET 9) THEN '자동차 자율주행 센서'
  ELSE keyword
END
WHERE user_id = '550e8400-e29b-41d4-a716-446655440000';

-- AI 분석 리포트 추가 (IPC 분류가 가능한 제목으로)
INSERT INTO ai_analysis_reports (
  id,
  user_id,
  application_number,
  invention_title,
  market_penetration,
  created_at
) VALUES 
(
  gen_random_uuid(),
  '550e8400-e29b-41d4-a716-446655440000',
  'KR-2024-0001',
  '인공지능 기반 자율주행 차량 제어 시스템',
  'AI 기반 자율주행 기술 분석',
  NOW() - INTERVAL '1 day'
),
(
  gen_random_uuid(),
  '550e8400-e29b-41d4-a716-446655440000',
  'KR-2024-0002',
  '머신러닝을 활용한 의료 진단 시스템',
  '의료 AI 진단 기술 분석',
  NOW() - INTERVAL '2 days'
),
(
  gen_random_uuid(),
  '550e8400-e29b-41d4-a716-446655440000',
  'KR-2024-0003',
  '블록체인 기반 암호화 통신 프로토콜',
  '블록체인 보안 기술 분석',
  NOW() - INTERVAL '3 days'
),
(
  gen_random_uuid(),
  '550e8400-e29b-41d4-a716-446655440000',
  'KR-2024-0004',
  '5G 통신을 위한 고성능 반도체 칩',
  '5G 반도체 기술 분석',
  NOW() - INTERVAL '4 days'
),
(
  gen_random_uuid(),
  '550e8400-e29b-41d4-a716-446655440000',
  'KR-2024-0005',
  'IoT 센서 네트워크 최적화 기술',
  'IoT 센서 기술 분석',
  NOW() - INTERVAL '5 days'
);