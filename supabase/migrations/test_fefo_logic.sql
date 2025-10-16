-- FEFO 포인트 차감 로직 테스트
DO $$
DECLARE
    test_user_id UUID;
    rec RECORD;
    remaining_deduct INTEGER;
    current_amount INTEGER;
    deduct_amount INTEGER;
    total_deducted INTEGER;
    available_points INTEGER;
BEGIN
    -- 기존 테스트 사용자 삭제 (있다면)
    DELETE FROM users WHERE email = 'test-fefo@example.com';

    -- 테스트 사용자 생성
    INSERT INTO users (email, name, subscription_plan)
    VALUES ('test-fefo@example.com', 'FEFO Test User', 'premium')
    RETURNING id INTO test_user_id;

    RAISE NOTICE '=== 테스트 사용자 생성: % ===', test_user_id;

    -- 사용자 포인트 잔액 초기화
    INSERT INTO user_point_balances (user_id, current_balance)
    VALUES (test_user_id, 0);

    -- 테스트 포인트 충전 (만료일이 다른 여러 건)
    INSERT INTO point_transactions (
        user_id, type, amount, source_amount_krw, expires_at
    ) VALUES
        (test_user_id, 'bonus', 50, 0, NOW() + INTERVAL '15 days'),
        (test_user_id, 'charge_monthly', 100, 10000, NOW() + INTERVAL '30 days'),
        (test_user_id, 'charge_addon', 200, 20000, NOW() + INTERVAL '60 days');

    -- 사용자 포인트 잔액 업데이트
    UPDATE user_point_balances 
    SET current_balance = 350 
    WHERE user_id = test_user_id;

    RAISE NOTICE '=== 초기 데이터 설정 완료 ===';
    RAISE NOTICE '총 포인트: 350 (보너스 50 - 15일, 월간 100 - 30일, 애드온 200 - 60일)';

    -- 현재 포인트 상태 확인
    RAISE NOTICE '=== 초기 포인트 상태 ===';
    FOR rec IN 
        SELECT id, type, amount, expires_at, created_at 
        FROM point_transactions 
        WHERE user_id = test_user_id 
          AND type IN ('charge_monthly', 'charge_addon', 'bonus')
        ORDER BY expires_at ASC
    LOOP
        RAISE NOTICE '타입: %, 포인트: %, 만료일: %', rec.type, rec.amount, rec.expires_at;
    END LOOP;

    -- 테스트 1: 150 포인트 차감 (FEFO 순서로)
    -- 예상: 보너스 50 + 월간 100 = 150 차감
    RAISE NOTICE '=== 150 포인트 차감 시작 (FEFO) ===';
    
    remaining_deduct := 150;
    total_deducted := 0;
    
    -- FEFO 순서로 포인트 차감
    FOR rec IN 
        SELECT id, type, amount, expires_at 
        FROM point_transactions 
        WHERE user_id = test_user_id 
          AND type IN ('charge_monthly', 'charge_addon', 'bonus')
          AND amount > 0
          AND expires_at > NOW()
        ORDER BY expires_at ASC
    LOOP
        current_amount := rec.amount;
        
        IF remaining_deduct <= 0 THEN
            EXIT;
        END IF;
        
        IF current_amount <= remaining_deduct THEN
            deduct_amount := current_amount;
        ELSE
            deduct_amount := remaining_deduct;
        END IF;
        
        -- 포인트 차감
        UPDATE point_transactions 
        SET amount = amount - deduct_amount 
        WHERE id = rec.id;
        
        remaining_deduct := remaining_deduct - deduct_amount;
        total_deducted := total_deducted + deduct_amount;
        
        RAISE NOTICE '포인트 차감: 타입=%, 차감량=%, 남은차감량=%, 만료일=%', 
                     rec.type, deduct_amount, remaining_deduct, rec.expires_at;
    END LOOP;
    
    -- 사용 내역 추가
    INSERT INTO point_transactions (
        user_id, type, amount, expires_at, report_type, request_id
    ) VALUES (
        test_user_id, 
        'usage', 
        -total_deducted, 
        NOW() + INTERVAL '1 year',
        'market_analysis',
        'test-request-1'
    );
    
    -- 잔액 업데이트
    UPDATE user_point_balances 
    SET current_balance = current_balance - total_deducted
    WHERE user_id = test_user_id;
    
    RAISE NOTICE '총 차감된 포인트: %', total_deducted;

    -- 첫 번째 차감 후 상태 확인
    RAISE NOTICE '=== 첫 번째 차감 후 포인트 상태 ===';
    FOR rec IN 
        SELECT id, type, amount, expires_at, created_at 
        FROM point_transactions 
        WHERE user_id = test_user_id 
        ORDER BY created_at
    LOOP
        RAISE NOTICE 'ID: %, 타입: %, 포인트: %, 만료일: %', rec.id, rec.type, rec.amount, rec.expires_at;
    END LOOP;

    -- 현재 잔액 확인
    SELECT current_balance INTO available_points FROM user_point_balances 
    WHERE user_id = test_user_id;
    RAISE NOTICE '=== 현재 잔액: % ===', available_points;

    -- 테스트 2: 300 포인트 차감 시도 (잔액 부족 테스트)
    RAISE NOTICE '=== 300 포인트 차감 시도 (잔액 부족 테스트) ===';
    
    available_points := 0;
    
    -- 사용 가능한 포인트 계산
    FOR rec IN 
        SELECT amount 
        FROM point_transactions 
        WHERE user_id = test_user_id 
          AND type IN ('charge_monthly', 'charge_addon', 'bonus')
          AND amount > 0
          AND expires_at > NOW()
    LOOP
        available_points := available_points + rec.amount;
    END LOOP;
    
    RAISE NOTICE '사용 가능한 포인트: %', available_points;
    
    IF available_points < 300 THEN
        RAISE NOTICE '포인트 부족: 필요=300, 보유=%', available_points;
        RAISE NOTICE '차감 실패 - 잔액 부족';
    ELSE
        RAISE NOTICE '포인트 차감 가능';
    END IF;

    -- 최종 상태 확인
    RAISE NOTICE '=== 최종 테스트 결과 ===';
    FOR rec IN 
        SELECT 
            type,
            amount,
            expires_at,
            CASE 
                WHEN expires_at < NOW() THEN '만료됨'
                WHEN amount = 0 THEN '소진됨'
                ELSE '사용가능'
            END as status
        FROM point_transactions 
        WHERE user_id = test_user_id 
          AND type IN ('charge_monthly', 'charge_addon', 'bonus')
        ORDER BY expires_at ASC
    LOOP
        RAISE NOTICE '타입: %, 포인트: %, 상태: %, 만료일: %', 
                     rec.type, rec.amount, rec.status, rec.expires_at;
    END LOOP;

    RAISE NOTICE '=== FEFO 테스트 완료 ===';
    
    -- 테스트 사용자 정리
    DELETE FROM users WHERE id = test_user_id;
    RAISE NOTICE '테스트 사용자 정리 완료';

END $$;