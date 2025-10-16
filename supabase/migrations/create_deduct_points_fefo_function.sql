-- FEFO (First Expired, First Out) 방식으로 포인트 차감하는 함수 생성
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
    v_points_to_deduct INTEGER := p_points;
    v_total_deducted INTEGER := 0;
    v_transaction_record RECORD;
BEGIN
    -- 현재 포인트 잔액 확인
    SELECT COALESCE(SUM(amount), 0) INTO v_current_balance
    FROM point_transactions 
    WHERE user_id = p_user_id 
    AND (expires_at IS NULL OR expires_at > NOW());
    
    -- 잔액 부족 확인
    IF v_current_balance < p_points THEN
        RETURN QUERY SELECT FALSE, 0, v_current_balance, '포인트가 부족합니다'::TEXT;
        RETURN;
    END IF;
    
    -- 중복 요청 확인
    IF EXISTS (
        SELECT 1 FROM point_transactions 
        WHERE user_id = p_user_id 
        AND description LIKE '%' || p_request_id || '%'
    ) THEN
        RETURN QUERY SELECT FALSE, 0, v_current_balance, '중복 요청입니다'::TEXT;
        RETURN;
    END IF;
    
    -- FEFO 방식으로 포인트 차감
    -- 만료일이 가장 빠른 포인트부터 차감
    FOR v_transaction_record IN (
        SELECT id, amount, expires_at
        FROM point_transactions 
        WHERE user_id = p_user_id 
        AND amount > 0 
        AND (expires_at IS NULL OR expires_at > NOW())
        ORDER BY expires_at ASC NULLS LAST, created_at ASC
    ) LOOP
        -- 차감할 포인트가 남아있는 경우에만 처리
        IF v_points_to_deduct > 0 THEN
            DECLARE
                v_deduct_amount INTEGER;
            BEGIN
                -- 이 거래에서 차감할 포인트 계산
                v_deduct_amount := LEAST(v_transaction_record.amount, v_points_to_deduct);
                
                -- 포인트 차감 기록 생성
                INSERT INTO point_transactions (
                    user_id, 
                    type, 
                    amount, 
                    expires_at,
                    description,
                    created_at
                ) VALUES (
                    p_user_id,
                    'deduct',
                    -v_deduct_amount,
                    v_transaction_record.expires_at,
                    p_report_type || ' 리포트 생성 (' || p_request_id || ')',
                    NOW()
                );
                
                v_total_deducted := v_total_deducted + v_deduct_amount;
                v_points_to_deduct := v_points_to_deduct - v_deduct_amount;
            END;
        END IF;
        
        -- 모든 포인트를 차감했으면 종료
        EXIT WHEN v_points_to_deduct <= 0;
    END LOOP;
    
    -- 잔액 업데이트
    PERFORM update_user_balance(p_user_id);
    
    -- 새로운 잔액 계산
    SELECT COALESCE(SUM(amount), 0) INTO v_current_balance
    FROM point_transactions 
    WHERE user_id = p_user_id 
    AND (expires_at IS NULL OR expires_at > NOW());
    
    RETURN QUERY SELECT TRUE, v_total_deducted, v_current_balance, NULL::TEXT;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY SELECT FALSE, 0, 0, SQLERRM::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;