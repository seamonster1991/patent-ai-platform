-- 샘플 검색 기록 데이터 생성
INSERT INTO search_history (user_id, keyword, applicant, application_date_from, application_date_to, search_results, created_at)
VALUES 
  ('9a2c17e6-1972-4563-91e8-4bd50b5bf2f5', 'AI 인공지능', '삼성전자', '2023-01-01', '2024-12-31', '{"count": 150, "patents": []}', NOW() - INTERVAL '1 day'),
  ('9a2c17e6-1972-4563-91e8-4bd50b5bf2f5', '블록체인 기술', 'LG전자', '2023-01-01', '2024-12-31', '{"count": 89, "patents": []}', NOW() - INTERVAL '2 days'),
  ('9a2c17e6-1972-4563-91e8-4bd50b5bf2f5', 'IoT 센서', '현대자동차', '2023-01-01', '2024-12-31', '{"count": 234, "patents": []}', NOW() - INTERVAL '3 days'),
  ('51c66d4c-4a2f-4079-9173-a3d92b9702ed', '자율주행 기술', '네이버', '2023-01-01', '2024-12-31', '{"count": 67, "patents": []}', NOW() - INTERVAL '4 days'),
  ('51c66d4c-4a2f-4079-9173-a3d92b9702ed', '바이오 기술', '카카오', '2023-01-01', '2024-12-31', '{"count": 123, "patents": []}', NOW() - INTERVAL '5 days'),
  ('4e5e48c9-557a-47b6-9041-3ed876149ecc', '반도체 설계', 'SK하이닉스', '2023-01-01', '2024-12-31', '{"count": 345, "patents": []}', NOW() - INTERVAL '6 days'),
  ('8d6e35ea-4ec1-437c-b203-3909ba4d8605', '5G 통신', 'KT', '2023-01-01', '2024-12-31', '{"count": 78, "patents": []}', NOW() - INTERVAL '7 days'),
  ('bc3105c9-3a3a-4a98-b647-4148f7e4a418', '전기차 배터리', 'LG화학', '2023-01-01', '2024-12-31', '{"count": 156, "patents": []}', NOW() - INTERVAL '8 days'),
  ('95bd8fed-8ed3-443a-b9e4-becfa5171b8c', '머신러닝', '네이버', '2023-01-01', '2024-12-31', '{"count": 201, "patents": []}', NOW() - INTERVAL '9 days'),
  ('9a2c17e6-1972-4563-91e8-4bd50b5bf2f5', '양자컴퓨팅', 'IBM', '2023-01-01', '2024-12-31', '{"count": 45, "patents": []}', NOW() - INTERVAL '10 days');

-- 샘플 리포트 데이터 생성
INSERT INTO reports (user_id, patent_id, report_type, analysis_content, metadata, created_at)
VALUES 
  ('9a2c17e6-1972-4563-91e8-4bd50b5bf2f5', 'KR1020230001234', 'market', 'AI 기술 시장 분석 리포트입니다. 현재 AI 기술은 급속도로 발전하고 있으며...', '{"industry": "AI", "market_size": "1.2조원"}', NOW() - INTERVAL '1 day'),
  ('9a2c17e6-1972-4563-91e8-4bd50b5bf2f5', 'KR1020230005678', 'business', '블록체인 비즈니스 모델 분석입니다. 금융, 물류, 헬스케어 분야에서...', '{"industry": "blockchain", "applications": ["finance", "logistics"]}', NOW() - INTERVAL '2 days'),
  ('51c66d4c-4a2f-4079-9173-a3d92b9702ed', 'KR1020230009012', 'market', 'IoT 센서 시장 동향 분석 리포트입니다. 스마트홈, 스마트시티 분야에서...', '{"industry": "IoT", "growth_rate": "15%"}', NOW() - INTERVAL '3 days'),
  ('4e5e48c9-557a-47b6-9041-3ed876149ecc', 'KR1020230003456', 'business', '자율주행 기술의 비즈니스 잠재력 분석입니다. 완전자율주행 실현까지...', '{"industry": "automotive", "timeline": "2030년"}', NOW() - INTERVAL '4 days'),
  ('8d6e35ea-4ec1-437c-b203-3909ba4d8605', 'KR1020230007890', 'market', '바이오 기술 시장 분석 리포트입니다. 개인맞춤형 의료, 유전자 치료...', '{"industry": "biotech", "segments": ["personalized_medicine", "gene_therapy"]}', NOW() - INTERVAL '5 days');