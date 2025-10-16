-- 테스트 데이터 추가

-- 현재 사용자 ID 가져오기 (로그인된 사용자)
DO $$
DECLARE
    test_user_id uuid := '276975db-635b-4c77-87a0-548f91b14231';
BEGIN
    -- 기존 테스트 데이터 삭제
    DELETE FROM search_history WHERE user_id = test_user_id;
    DELETE FROM ai_analysis_reports WHERE user_id = test_user_id;

    -- 검색 기록 테스트 데이터 추가
    INSERT INTO search_history (user_id, keyword, technology_field, results_count, created_at) VALUES
    (test_user_id, '인공지능 머신러닝', '물리학', 150, NOW() - INTERVAL '1 day'),
    (test_user_id, '자율주행 자동차', '처리조작/운수', 89, NOW() - INTERVAL '2 days'),
    (test_user_id, '블록체인 암호화', '전기', 67, NOW() - INTERVAL '3 days'),
    (test_user_id, '5G 통신 네트워크', '전기', 234, NOW() - INTERVAL '4 days'),
    (test_user_id, 'IoT 스마트 센서', '물리학', 123, NOW() - INTERVAL '5 days'),
    (test_user_id, '바이오 의료기기', '생활필수품', 78, NOW() - INTERVAL '6 days'),
    (test_user_id, '반도체 메모리', '전기', 156, NOW() - INTERVAL '7 days'),
    (test_user_id, '양자 컴퓨팅', '물리학', 45, NOW() - INTERVAL '8 days'),
    (test_user_id, '로봇 자동화', '처리조작/운수', 98, NOW() - INTERVAL '9 days'),
    (test_user_id, '신재생 에너지', '기계공학/조명/가열/무기/폭파', 112, NOW() - INTERVAL '10 days');

    -- AI 분석 리포트 테스트 데이터 추가
    INSERT INTO ai_analysis_reports (user_id, report_name, invention_title, technology_field, application_number, created_at) VALUES
    (test_user_id, 'AI 기반 이미지 인식 시스템 분석', '딥러닝을 이용한 실시간 객체 인식 장치', '물리학', '10-2024-0001234', NOW() - INTERVAL '1 day'),
    (test_user_id, '자율주행 제어 시스템 분석', '차량용 자율주행 제어 알고리즘', '처리조작/운수', '10-2024-0001235', NOW() - INTERVAL '3 days'),
    (test_user_id, '블록체인 보안 기술 분석', '분산원장 기반 데이터 보안 시스템', '전기', '10-2024-0001236', NOW() - INTERVAL '5 days'),
    (test_user_id, '5G 안테나 설계 분석', '밀리미터파 대역 다중 안테나 시스템', '전기', '10-2024-0001237', NOW() - INTERVAL '7 days'),
    (test_user_id, 'IoT 센서 네트워크 분석', '저전력 무선 센서 네트워크 프로토콜', '물리학', '10-2024-0001238', NOW() - INTERVAL '9 days'),
    (test_user_id, '의료용 진단 장치 분석', '인공지능 기반 의료 영상 진단 시스템', '생활필수품', '10-2024-0001239', NOW() - INTERVAL '11 days'),
    (test_user_id, '반도체 공정 기술 분석', '3D NAND 플래시 메모리 제조 공정', '전기', '10-2024-0001240', NOW() - INTERVAL '13 days'),
    (test_user_id, '양자 암호화 기술 분석', '양자키 분배 시스템', '물리학', '10-2024-0001241', NOW() - INTERVAL '15 days');

    RAISE NOTICE '테스트 데이터가 성공적으로 추가되었습니다.';
END $$;