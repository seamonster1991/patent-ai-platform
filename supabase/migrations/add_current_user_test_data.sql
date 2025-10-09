-- 현재 사용자 seongwankim@gmail.com에게 테스트 데이터 추가 (업데이트됨)

DO $$
DECLARE
    target_user_id UUID;
BEGIN
    -- 사용자 ID 가져오기
    SELECT id INTO target_user_id FROM users WHERE email = 'seongwankim@gmail.com';
    
    IF target_user_id IS NULL THEN
        RAISE EXCEPTION '사용자를 찾을 수 없습니다: seongwankim@gmail.com';
    END IF;
    
    -- 기존 데이터 삭제 (중복 방지)
    DELETE FROM user_activities WHERE user_id = target_user_id;
    DELETE FROM search_history WHERE user_id = target_user_id;
    DELETE FROM ai_analysis_reports WHERE user_id = target_user_id;
    
    -- 검색 기록 추가 (최근 30일간)
    INSERT INTO search_history (id, user_id, keyword, applicant, search_results, created_at) VALUES
    (gen_random_uuid(), target_user_id, '인공지능 특허', 'Samsung', '{"total": 150, "results": []}', NOW() - INTERVAL '1 day'),
    (gen_random_uuid(), target_user_id, '머신러닝 알고리즘', 'LG', '{"total": 89, "results": []}', NOW() - INTERVAL '3 days'),
    (gen_random_uuid(), target_user_id, '딥러닝 네트워크', 'SK', '{"total": 234, "results": []}', NOW() - INTERVAL '5 days'),
    (gen_random_uuid(), target_user_id, '자율주행 기술', 'Hyundai', '{"total": 67, "results": []}', NOW() - INTERVAL '7 days'),
    (gen_random_uuid(), target_user_id, '블록체인 보안', 'Kakao', '{"total": 45, "results": []}', NOW() - INTERVAL '10 days'),
    (gen_random_uuid(), target_user_id, '5G 통신 기술', 'KT', '{"total": 123, "results": []}', NOW() - INTERVAL '12 days'),
    (gen_random_uuid(), target_user_id, 'IoT 센서', 'Naver', '{"total": 78, "results": []}', NOW() - INTERVAL '15 days'),
    (gen_random_uuid(), target_user_id, '양자컴퓨팅', 'ETRI', '{"total": 34, "results": []}', NOW() - INTERVAL '18 days'),
    (gen_random_uuid(), target_user_id, '바이오 센서', 'Celltrion', '{"total": 56, "results": []}', NOW() - INTERVAL '20 days'),
    (gen_random_uuid(), target_user_id, '반도체 공정', 'TSMC', '{"total": 189, "results": []}', NOW() - INTERVAL '25 days');
    
    -- AI 분석 리포트 추가
    INSERT INTO ai_analysis_reports (id, user_id, application_number, invention_title, market_penetration, competitive_landscape, created_at) VALUES
    (gen_random_uuid(), target_user_id, 'KR10-2024-0001234', '인공지능 기반 음성인식 시스템', '시장 침투율 분석 결과...', '경쟁사 분석 결과...', NOW() - INTERVAL '2 days'),
    (gen_random_uuid(), target_user_id, 'KR10-2024-0005678', '머신러닝을 활용한 이미지 처리 기술', '시장 분석 데이터...', '기술 경쟁력 분석...', NOW() - INTERVAL '4 days'),
    (gen_random_uuid(), target_user_id, 'KR10-2024-0009012', '딥러닝 기반 자연어 처리 시스템', '시장 동향 분석...', '경쟁 환경 분석...', NOW() - INTERVAL '6 days'),
    (gen_random_uuid(), target_user_id, 'KR10-2024-0003456', '자율주행차 센서 융합 기술', '자동차 시장 분석...', '기술 트렌드 분석...', NOW() - INTERVAL '8 days'),
    (gen_random_uuid(), target_user_id, 'KR10-2024-0007890', '블록체인 기반 보안 프로토콜', '보안 시장 분석...', '기술 혁신 분석...', NOW() - INTERVAL '11 days');
    
    -- 사용자 활동 기록 추가
    INSERT INTO user_activities (id, user_id, activity_type, activity_data, created_at) VALUES
    (gen_random_uuid(), target_user_id, 'login', '{"ip": "192.168.1.100", "device": "desktop"}', NOW() - INTERVAL '1 hour'),
    (gen_random_uuid(), target_user_id, 'search', '{"keyword": "인공지능 특허", "results": 150}', NOW() - INTERVAL '1 day'),
    (gen_random_uuid(), target_user_id, 'report_generated', '{"report_id": "report_001", "type": "market"}', NOW() - INTERVAL '2 days'),
    (gen_random_uuid(), target_user_id, 'login', '{"ip": "192.168.1.100", "device": "mobile"}', NOW() - INTERVAL '2 days'),
    (gen_random_uuid(), target_user_id, 'search', '{"keyword": "머신러닝 알고리즘", "results": 89}', NOW() - INTERVAL '3 days'),
    (gen_random_uuid(), target_user_id, 'report_generated', '{"report_id": "report_002", "type": "business"}', NOW() - INTERVAL '4 days'),
    (gen_random_uuid(), target_user_id, 'login', '{"ip": "192.168.1.100", "device": "desktop"}', NOW() - INTERVAL '5 days'),
    (gen_random_uuid(), target_user_id, 'search', '{"keyword": "딥러닝 네트워크", "results": 234}', NOW() - INTERVAL '5 days'),
    (gen_random_uuid(), target_user_id, 'login', '{"ip": "192.168.1.100", "device": "desktop"}', NOW() - INTERVAL '7 days'),
    (gen_random_uuid(), target_user_id, 'report_generated', '{"report_id": "report_003", "type": "market"}', NOW() - INTERVAL '6 days');
    
    RAISE NOTICE '사용자 %에 대한 테스트 데이터가 성공적으로 추가되었습니다.', target_user_id;
    
END $$;