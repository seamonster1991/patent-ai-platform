-- 포인트 충전 함수 업데이트 (10% 보너스는 추가 충전시만)
CREATE OR REPLACE FUNCTION charge_points(
    p_user_id UUID,
    p_amount_krw INTEGER,
    p_payment_type TEXT,
    p_payment_id TEXT
) RETURNS TABLE(
    success BOOLEAN,
    base_points INTEGER,
    bonus_points INTEGER,
    total_points INTEGER,
    expires_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT
) AS $$
DECLARE
    v_base_points INTEGER;
    v_bonus_points INTEGER := 0;
    v_expires_at TIMESTAMP WITH TIME ZONE;
    v_total_points INTEGER;
BEGIN
    -- 기본 포인트 계산
    v_base_points := CASE 
        WHEN p_payment_type = 'monthly' THEN 10000  -- 정기 구독은 고정 10,000P
        ELSE FLOOR(p_amount_krw / 1.1)  -- 추가 충전은 VAT 제외하고 계산 (VAT 포함 금액에서 VAT 제외)
    END;
    
    -- 보너스 포인트 계산 (추가 충전시에만 10% 보너스)
    IF p_payment_type = 'addon' THEN
        v_bonus_points := FLOOR(v_base_points * 0.1);  -- 10% 보너스
    END IF;
    
    -- 만료 일시 설정
    v_expires_at := CASE 
        WHEN p_payment_type = 'monthly' THEN NOW() + INTERVAL '30 days'  -- 1개월
        ELSE NOW() + INTERVAL '90 days'  -- 3개월
    END;
    
    v_total_points := v_base_points + v_bonus_points;
    
    -- 기본 포인트 거래 기록
    INSERT INTO point_transactions (
        user_id, type, amount, source_amount_krw, expires_at
    ) VALUES (
        p_user_id, 
        CASE WHEN p_payment_type = 'monthly' THEN 'charge_monthly' ELSE 'charge_addon' END,
        v_base_points, 
        p_amount_krw, 
        v_expires_at
    );
    
    -- 보너스 포인트 거래 기록 (추가 충전시에만)
    IF v_bonus_points > 0 THEN
        INSERT INTO point_transactions (
            user_id, type, amount, source_amount_krw, expires_at
        ) VALUES (
            p_user_id, 'bonus', v_bonus_points, 0, v_expires_at
        );
    END IF;
    
    -- 결제 로그 기록
    INSERT INTO payment_logs (
        user_id, payment_id, amount_krw, status, payment_type, processed_at
    ) VALUES (
        p_user_id, p_payment_id, p_amount_krw, 'completed', p_payment_type, NOW()
    );
    
    -- 잔액 업데이트
    PERFORM update_user_balance(p_user_id);
    
    RETURN QUERY SELECT TRUE, v_base_points, v_bonus_points, v_total_points, v_expires_at, NULL::TEXT;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY SELECT FALSE, 0, 0, 0, NULL::TIMESTAMP WITH TIME ZONE, SQLERRM::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;