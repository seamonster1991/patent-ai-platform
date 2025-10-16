-- NicePay 결제시스템 함수 생성
-- 결제 처리 및 환불 관련 함수들

-- 결제 처리 함수 생성
CREATE OR REPLACE FUNCTION process_payment_completion(
    p_order_id VARCHAR(50),
    p_tid VARCHAR(50),
    p_result_code VARCHAR(10),
    p_result_msg TEXT,
    p_nicepay_response JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order_record payment_orders%ROWTYPE;
    v_transaction_id UUID;
    v_points_to_grant INTEGER := 0;
    v_bonus_points INTEGER := 0;
    v_expires_at TIMESTAMP WITH TIME ZONE;
    v_result JSONB;
BEGIN
    -- 주문 정보 조회
    SELECT * INTO v_order_record
    FROM payment_orders
    WHERE order_id = p_order_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Order not found');
    END IF;
    
    -- 거래 기록 생성 또는 업데이트
    INSERT INTO payment_transactions (
        order_id, tid, pay_method, amount, status, result_code, result_msg, nicepay_response, approved_at
    ) VALUES (
        v_order_record.id, p_tid, v_order_record.pay_method, v_order_record.amount,
        CASE WHEN p_result_code = '0000' THEN 'approved' ELSE 'failed' END,
        p_result_code, p_result_msg, p_nicepay_response,
        CASE WHEN p_result_code = '0000' THEN NOW() ELSE NULL END
    )
    ON CONFLICT (tid) DO UPDATE SET
        status = CASE WHEN p_result_code = '0000' THEN 'approved' ELSE 'failed' END,
        result_code = p_result_code,
        result_msg = p_result_msg,
        nicepay_response = p_nicepay_response,
        approved_at = CASE WHEN p_result_code = '0000' THEN NOW() ELSE approved_at END,
        updated_at = NOW()
    RETURNING id INTO v_transaction_id;
    
    -- 결제 성공 시 처리
    IF p_result_code = '0000' THEN
        -- 주문 상태 업데이트
        UPDATE payment_orders 
        SET status = 'completed', updated_at = NOW()
        WHERE id = v_order_record.id;
        
        -- 포인트 지급 처리
        SELECT points, bonus_points INTO v_points_to_grant, v_bonus_points
        FROM payment_products
        WHERE id = v_order_record.product_id;
        
        IF v_points_to_grant > 0 THEN
            -- 만료일 설정 (구독: 1개월, 포인트: 3개월)
            v_expires_at := NOW() + INTERVAL '3 months';
            IF v_order_record.product_type = 'subscription' THEN
                v_expires_at := NOW() + INTERVAL '1 month';
            END IF;
            
            -- 기본 포인트 지급
            INSERT INTO point_transactions (
                user_id, type, amount, source_amount_krw, expires_at, description
            ) VALUES (
                v_order_record.user_id,
                CASE WHEN v_order_record.product_type = 'subscription' THEN 'charge_monthly' ELSE 'charge_addon' END,
                v_points_to_grant,
                v_order_record.amount,
                v_expires_at,
                '결제 완료: ' || v_order_record.goods_name
            );
            
            -- 보너스 포인트 지급 (있는 경우)
            IF v_bonus_points > 0 THEN
                INSERT INTO point_transactions (
                    user_id, type, amount, source_amount_krw, expires_at, description
                ) VALUES (
                    v_order_record.user_id, 'bonus', v_bonus_points, 0, v_expires_at,
                    '보너스 포인트: ' || v_order_record.goods_name
                );
            END IF;
        END IF;
        
        v_result := jsonb_build_object(
            'success', true,
            'points_granted', v_points_to_grant + v_bonus_points,
            'transaction_id', v_transaction_id
        );
    ELSE
        -- 결제 실패 시 주문 상태 업데이트
        UPDATE payment_orders 
        SET status = 'failed', updated_at = NOW()
        WHERE id = v_order_record.id;
        
        v_result := jsonb_build_object(
            'success', false,
            'error', p_result_msg,
            'transaction_id', v_transaction_id
        );
    END IF;
    
    -- 로그 기록
    INSERT INTO payment_logs (order_id, transaction_id, event_type, event_data)
    VALUES (p_order_id, v_transaction_id, 'payment_completion', v_result);
    
    RETURN v_result;
END;
$$;

-- 환불 처리 함수
CREATE OR REPLACE FUNCTION process_refund_request(
    p_transaction_id UUID,
    p_refund_amount INTEGER,
    p_reason TEXT,
    p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_transaction_record payment_transactions%ROWTYPE;
    v_order_record payment_orders%ROWTYPE;
    v_refund_id UUID;
    v_result JSONB;
BEGIN
    -- 거래 정보 조회
    SELECT * INTO v_transaction_record
    FROM payment_transactions
    WHERE id = p_transaction_id AND status = 'approved';
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Transaction not found or not approved');
    END IF;
    
    -- 주문 정보 조회
    SELECT * INTO v_order_record
    FROM payment_orders
    WHERE id = v_transaction_record.order_id AND user_id = p_user_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Order not found or access denied');
    END IF;
    
    -- 환불 금액 검증
    IF p_refund_amount > v_transaction_record.amount THEN
        RETURN jsonb_build_object('success', false, 'error', 'Refund amount exceeds transaction amount');
    END IF;
    
    -- 환불 요청 생성
    INSERT INTO refunds (
        transaction_id, order_id, user_id, refund_amount, reason, status
    ) VALUES (
        p_transaction_id, v_order_record.id, p_user_id, p_refund_amount, p_reason, 'pending'
    ) RETURNING id INTO v_refund_id;
    
    v_result := jsonb_build_object(
        'success', true,
        'refund_id', v_refund_id,
        'status', 'pending'
    );
    
    -- 로그 기록
    INSERT INTO payment_logs (order_id, transaction_id, event_type, event_data)
    VALUES (v_order_record.order_id, p_transaction_id, 'refund_requested', v_result);
    
    RETURN v_result;
END;
$$;