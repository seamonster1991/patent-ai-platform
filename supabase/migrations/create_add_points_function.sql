-- 포인트 추가/환불 함수 생성
-- 리포트 생성 실패 시 포인트 환불을 위한 함수

CREATE OR REPLACE FUNCTION add_points(
    p_user_id UUID,
    p_points INTEGER,
    p_transaction_type TEXT DEFAULT 'refund',
    p_description TEXT DEFAULT '포인트 환불'
) RETURNS TABLE(
    success BOOLEAN,
    added_points INTEGER,
    new_balance INTEGER,
    error_message TEXT
) AS $$
DECLARE
    v_new_balance INTEGER;
BEGIN
    -- 입력 검증
    IF p_points <= 0 THEN
        RETURN QUERY SELECT FALSE, 0, 0, '추가할 포인트는 0보다 커야 합니다'::TEXT;
        RETURN;
    END IF;
    
    IF p_user_id IS NULL THEN
        RETURN QUERY SELECT FALSE, 0, 0, '사용자 ID가 필요합니다'::TEXT;
        RETURN;
    END IF;
    
    -- 포인트 추가 기록 생성
    INSERT INTO point_transactions (
        user_id, 
        type, 
        amount, 
        expires_at,
        description,
        created_at
    ) VALUES (
        p_user_id,
        p_transaction_type,
        p_points,
        NOW() + INTERVAL '1 year', -- 환불된 포인트는 1년 후 만료
        p_description,
        NOW()
    );
    
    -- 새로운 잔액 계산
    SELECT COALESCE(SUM(amount), 0) INTO v_new_balance
    FROM point_transactions 
    WHERE user_id = p_user_id 
    AND (expires_at IS NULL OR expires_at > NOW());
    
    -- user_point_balances 테이블 업데이트
    UPDATE user_point_balances 
    SET current_balance = v_new_balance, last_updated = NOW()
    WHERE user_id = p_user_id;
    
    -- 사용자 잔액 레코드가 없으면 생성
    IF NOT FOUND THEN
        INSERT INTO user_point_balances (user_id, current_balance, last_updated)
        VALUES (p_user_id, v_new_balance, NOW());
    END IF;
    
    RETURN QUERY SELECT TRUE, p_points, v_new_balance, NULL::TEXT;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY SELECT FALSE, 0, 0, SQLERRM::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;