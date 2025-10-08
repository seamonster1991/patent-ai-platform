-- 기존 사용자 중 아무나 선택해서 샘플 데이터 추가
-- 먼저 기존 사용자 ID 하나를 가져와서 사용

DO $$
DECLARE
    target_user_id UUID;
BEGIN
    -- 첫 번째 사용자 ID 가져오기
    SELECT id INTO target_user_id FROM users LIMIT 1;
    
    -- 사용자가 있다면 샘플 데이터 추가
    IF target_user_id IS NOT NULL THEN
        -- 기존 데이터 삭제 (중복 방지)
        DELETE FROM search_history WHERE user_id = target_user_id;
        DELETE FROM user_activities WHERE user_id = target_user_id;
        DELETE FROM ai_analysis_reports WHERE user_id = target_user_id;
        DELETE FROM patent_detail_views WHERE user_id = target_user_id;
        DELETE FROM usage_cost_tracking WHERE user_id = target_user_id;
        
        -- 검색 기록 샘플 데이터
        INSERT INTO search_history (
            id, user_id, keyword, technology_field, results_count, search_filters, created_at
        ) VALUES 
            (gen_random_uuid(), target_user_id, '인공지능', 'AI/ML', 150, '{"country": "KR", "year_range": "2020-2024"}', NOW() - INTERVAL '1 day'),
            (gen_random_uuid(), target_user_id, '머신러닝', 'AI/ML', 89, '{"country": "US", "year_range": "2019-2024"}', NOW() - INTERVAL '2 days'),
            (gen_random_uuid(), target_user_id, '블록체인', 'Blockchain', 67, '{"country": "KR", "year_range": "2021-2024"}', NOW() - INTERVAL '3 days'),
            (gen_random_uuid(), target_user_id, '자율주행', 'Automotive', 234, '{"country": "ALL", "year_range": "2018-2024"}', NOW() - INTERVAL '5 days'),
            (gen_random_uuid(), target_user_id, '5G 통신', 'Telecommunications', 178, '{"country": "KR", "year_range": "2020-2024"}', NOW() - INTERVAL '7 days');

        -- 사용자 활동 샘플 데이터
        INSERT INTO user_activities (
            id, user_id, activity_type, description, metadata, created_at
        ) VALUES 
            (gen_random_uuid(), target_user_id, 'search', '인공지능 키워드로 특허 검색', '{"keyword": "인공지능", "results": 150}', NOW() - INTERVAL '1 day'),
            (gen_random_uuid(), target_user_id, 'patent_view', '특허 상세 정보 조회', '{"patent_number": "KR102345678", "title": "