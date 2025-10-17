-- 테스트용 리포트 데이터 생성
INSERT INTO reports (user_id, patent_id, report_type, analysis_content, created_at) VALUES
-- 시장분석 리포트 (3개)
((SELECT id FROM users LIMIT 1), 'KR20230001', 'market', '시장분석 리포트 내용 1', NOW() - INTERVAL '10 days'),
((SELECT id FROM users LIMIT 1 OFFSET 1), 'KR20230002', 'market', '시장분석 리포트 내용 2', NOW() - INTERVAL '5 days'),
((SELECT id FROM users LIMIT 1), 'KR20230003', 'market', '시장분석 리포트 내용 3', NOW() - INTERVAL '2 days'),

-- 비즈니스 리포트 (2개)
((SELECT id FROM users LIMIT 1 OFFSET 1), 'KR20230004', 'business', '비즈니스 리포트 내용 1', NOW() - INTERVAL '8 days'),
((SELECT id FROM users LIMIT 1 OFFSET 2), 'KR20230005', 'business', '비즈니스 리포트 내용 2', NOW() - INTERVAL '3 days');