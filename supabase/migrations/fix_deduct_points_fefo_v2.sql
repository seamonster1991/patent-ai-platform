-- 포인트 차감 함수 최종 수정 v2
-- type 필드를 'usage'로 변경하고 실제 포인트 차감 로직 구현

DROP FUNCTION IF EXISTS deduct_points_fefo(uuid,integer,text,text);

CREATE OR REPLACE FUNCTION deduct_points_fefo(
    p_user_id UUID,
    p_points INTEGER,
    p_report_type TEXT,
    p_request_id TEXT
) RETURNS TABLE(
    success BOOLEAN,
    deducted_points INTEGER,
    remaining_balance INTEGER,
    error_message TEXT
) AS $$
DECLARE
    v_current_balance INTEGER;
    v_total_deducted INTEGER := 0;
    v_new_balance INTEGER;
BEGIN
    -- 현재 포인트 잔액 확인 (만료되지 않은 포인트만)
    SELECT COALESCE(SUM(amount), 0) INTO v_current_balance
    FROM point_transactions 
    WHERE user_id = p_user_id 
    AND (expires_at IS NULL OR expires_at > NOW());
    
    -- 잔액 부족 확인
    IF v_current_balance < p_points THEN
        RETURN QUERY SELECT FALSE, 0, v_current_balance, '포인트가 부족합니다'::TEXT;
        RETURN;
    END IF;
    
    -- 중복 요청 확인 (request_id 필드 사용)
    IF EXISTS (
        SELECT 1 FROM point_transactions 
        WHERE user_id = p_user_id 
        AND request_id = p_request_id
    ) THEN
        RETURN QUERY SELECT FALSE, 0, v_current_balance, '중복 요청입니다'::TEXT;
        RETURN;
    END IF;
    
    -- 포인트 차감 기록 생성 (usage 타입 사용)
    INSERT INTO point_transactions (
        user_id, 
        type, 
        amount, 
        expires_at,
        report_type,
        request_id,
        created_at
    ) VALUES (
        p_user_id,
        'usage',
        -p_points,
        NOW() + INTERVAL '1 year', -- 사용 기록은 1년 후 만료
        p_report_type,
        p_request_id,
        NOW()
    );
    
    v_total_deducted := p_points;
    
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
    
    RETURN QUERY SELECT TRUE, v_total_deducted, v_new_balance, NULL::TEXT;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY SELECT FALSE, 0, 0, SQLERRM::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;