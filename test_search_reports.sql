-- 검색 후 리포트 생성 테스트 데이터
-- 먼저 검색 기록 추가
INSERT INTO search_history (user_id, keyword, created_at) VALUES
((SELECT id FROM users LIMIT 1), '인공지능', NOW() - INTERVAL '1 hour'),
((SELECT id FROM users LIMIT 1 OFFSET 1), '블록체인', NOW() - INTERVAL '30 minutes');

-- 검색 후 3분 뒤에 리포트 생성 (전환율 계산용)
INSERT INTO reports (user_id, search_history_id, patent_id, report_type, analysis_content, created_at) VALUES
((SELECT id FROM users LIMIT 1), 
 (SELECT id FROM search_history WHERE keyword = '인공지능' ORDER BY created_at DESC LIMIT 1),
 'KR20230006', 'market', '검색 후 생성된 시장분석 리포트', 
 (SELECT created_at FROM search_history WHERE keyword = '인공지능' ORDER BY created_at DESC LIMIT 1) + INTERVAL '3 minutes'),
((SELECT id FROM users LIMIT 1 OFFSET 1), 
 (SELECT id FROM search_history WHERE keyword = '블록체인' ORDER BY created_at DESC LIMIT 1),
 'KR20230007', 'business', '검색 후 생성된 비즈니스 리포트', 
 (SELECT created_at FROM search_history WHERE keyword = '블록체인' ORDER BY created_at DESC LIMIT 1) + INTERVAL '2 minutes');