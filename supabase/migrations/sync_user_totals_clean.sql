-- 사용자 통계 동기화 실행

DO $$
DECLARE
    test_user_id UUID;
BEGIN
    -- 첫 번째 사용자 ID 가져오기
    SELECT id INTO test_user_id FROM users ORDER BY created_at DESC LIMIT 1;
    
    IF test_user_id IS NULL THEN
        RAISE EXCEPTION 'No users found in database';
    END IF;
    
    RAISE NOTICE 'Syncing totals for all users (including user: %)', test_user_id;
    
    -- sync_user_totals 함수 실행 (매개변수 없음)
    PERFORM sync_user_totals();
    
    RAISE NOTICE 'Sync completed successfully';
    
    -- 업데이트된 사용자 정보 확인
    RAISE NOTICE 'Updated user stats:';
    RAISE NOTICE 'User ID: %', test_user_id;
    RAISE NOTICE 'Total searches: %', (SELECT total_searches FROM users WHERE id = test_user_id);
    RAISE NOTICE 'Total reports: %', (SELECT total_reports FROM users WHERE id = test_user_id);
    RAISE NOTICE 'Total logins: %', (SELECT total_logins FROM users WHERE id = test_user_id);
    
END $$;