-- 월간 포인트 지급 함수들 업데이트 (description 컬럼 제거)

-- 월간 포인트 지급 함수 수정
CREATE OR REPLACE FUNCTION grant_monthly_points(p_user_id UUID, p_grant_month DATE DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
    v_grant_month DATE;
    v_user_registration_date DATE;
    v_points_to_grant INTEGER := 1500;
    v_existing_grant monthly_point_grants%ROWTYPE;
    v_transaction_id UUID;
    v_result JSON;
BEGIN
    -- 지급 월이 지정되지 않은 경우 현재 월 사용
    IF p_grant_month IS NULL THEN
        v_grant_month := DATE_TRUNC('month', CURRENT_DATE)::DATE;
    ELSE
        v_grant_month := DATE_TRUNC('month', p_grant_month)::DATE;
    END IF;
    
    -- 사용자 등록일 확인
    SELECT DATE(created_at) INTO v_user_registration_date
    FROM auth.users
    WHERE id = p_user_id;
    
    IF v_user_registration_date IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'User not found',
            'user_id', p_user_id
        );
    END IF;
    
    -- 등록일이 지급 월보다 늦은 경우 지급하지 않음
    IF v_user_registration_date > v_grant_month THEN
        RETURN json_build_object(
            'success', false,
            'error', 'User registered after grant month',
            'user_id', p_user_id,
            'registration_date', v_user_registration_date,
            'grant_month', v_grant_month
        );
    END IF;
    
    -- 이미 해당 월에 지급된 기록이 있는지 확인
    SELECT * INTO v_existing_grant
    FROM monthly_point_grants
    WHERE user_id = p_user_id AND grant_month = v_grant_month;
    
    IF FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Points already granted for this month',
            'user_id', p_user_id,
            'grant_month', v_grant_month,
            'existing_grant_id', v_existing_grant.id,
            'granted_at', v_existing_grant.granted_at
        );
    END IF;
    
    -- 포인트 지급 기록 생성
    INSERT INTO monthly_point_grants (user_id, grant_month, points_granted)
    VALUES (p_user_id, v_grant_month, v_points_to_grant)
    RETURNING id INTO v_transaction_id;
    
    -- 포인트 거래 기록 생성 (description 컬럼 제거)
    INSERT INTO point_transactions (
        user_id,
        type,
        amount,
        expires_at,
        created_at
    ) VALUES (
        p_user_id,
        'bonus',
        v_points_to_grant,
        (CURRENT_DATE + INTERVAL '365 days')::TIMESTAMP WITH TIME ZONE,
        NOW()
    );
    
    -- 사용자 포인트 잔액 업데이트
    PERFORM update_user_balance(p_user_id);
    
    RETURN json_build_object(
        'success', true,
        'user_id', p_user_id,
        'grant_month', v_grant_month,
        'points_granted', v_points_to_grant,
        'transaction_id', v_transaction_id,
        'granted_at', NOW()
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Failed to grant monthly points',
            'details', SQLERRM,
            'user_id', p_user_id,
            'grant_month', v_grant_month
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;