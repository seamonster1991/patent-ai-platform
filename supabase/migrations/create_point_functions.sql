-- FEFO (First Expire First Out) 포인트 차감 함수
CREATE OR REPLACE FUNCTION deduct_points_fefo(
  p_user_id UUID,
  p_amount INTEGER,
  p_report_type TEXT,
  p_request_id TEXT
)
RETURNS TABLE(
  success BOOLEAN,
  remaining_balance INTEGER,
  transactions_created INTEGER,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_balance INTEGER := 0;
  v_remaining_to_deduct INTEGER := p_amount;
  v_transaction_record RECORD;
  v_deduct_amount INTEGER;
  v_transactions_count INTEGER := 0;
  v_new_balance INTEGER;
BEGIN
  -- 현재 잔액 확인
  SELECT COALESCE(current_balance, 0) INTO v_current_balance
  FROM user_point_balances
  WHERE user_id = p_user_id;
  
  -- 잔액 부족 확인
  IF v_current_balance < p_amount THEN
    RETURN QUERY SELECT 
      FALSE as success,
      v_current_balance as remaining_balance,
      0 as transactions_created,
      '포인트 잔액이 부족합니다.' as error_message;
    RETURN;
  END IF;
  
  -- FEFO 순서로 포인트 차감 (만료일이 빠른 순서대로)
  FOR v_transaction_record IN
    SELECT id, amount, expires_at
    FROM point_transactions
    WHERE user_id = p_user_id
      AND type IN ('charge_monthly', 'charge_addon', 'bonus')
      AND amount > 0
      AND expires_at > NOW()
    ORDER BY expires_at ASC, created_at ASC
  LOOP
    -- 차감할 금액 계산
    v_deduct_amount := LEAST(v_transaction_record.amount, v_remaining_to_deduct);
    
    -- 포인트 차감 트랜잭션 생성
    INSERT INTO point_transactions (
      user_id,
      type,
      amount,
      source_amount_krw,
      expires_at,
      report_type,
      request_id,
      created_at
    ) VALUES (
      p_user_id,
      'usage',
      -v_deduct_amount,
      0,
      v_transaction_record.expires_at,
      p_report_type,
      p_request_id,
      NOW()
    );
    
    v_transactions_count := v_transactions_count + 1;
    v_remaining_to_deduct := v_remaining_to_deduct - v_deduct_amount;
    
    -- 모든 포인트를 차감했으면 종료
    IF v_remaining_to_deduct <= 0 THEN
      EXIT;
    END IF;
  END LOOP;
  
  -- 새로운 잔액 계산
  v_new_balance := v_current_balance - p_amount;
  
  -- 사용자 잔액 업데이트
  INSERT INTO user_point_balances (user_id, current_balance, last_updated)
  VALUES (p_user_id, v_new_balance, NOW())
  ON CONFLICT (user_id)
  DO UPDATE SET 
    current_balance = v_new_balance,
    last_updated = NOW();
  
  RETURN QUERY SELECT 
    TRUE as success,
    v_new_balance as remaining_balance,
    v_transactions_count as transactions_created,
    NULL::TEXT as error_message;
END;
$$;

-- 포인트 충전 함수
CREATE OR REPLACE FUNCTION charge_points(
  p_user_id UUID,
  p_amount_krw INTEGER,
  p_payment_type TEXT,
  p_payment_id TEXT,
  p_description TEXT,
  p_expires_at TIMESTAMPTZ
)
RETURNS TABLE(
  success BOOLEAN,
  new_balance INTEGER,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_balance INTEGER := 0;
  v_new_balance INTEGER;
BEGIN
  -- 현재 잔액 조회
  SELECT COALESCE(current_balance, 0) INTO v_current_balance
  FROM user_point_balances
  WHERE user_id = p_user_id;
  
  -- 포인트 충전 트랜잭션 생성
  INSERT INTO point_transactions (
    user_id,
    type,
    amount,
    source_amount_krw,
    expires_at,
    request_id,
    created_at
  ) VALUES (
    p_user_id,
    p_payment_type,
    p_amount_krw, -- 결제 금액만큼 포인트 충전
    p_amount_krw,
    p_expires_at,
    p_payment_id,
    NOW()
  );
  
  -- 새로운 잔액 계산
  v_new_balance := v_current_balance + p_amount_krw;
  
  -- 사용자 잔액 업데이트
  INSERT INTO user_point_balances (user_id, current_balance, last_updated)
  VALUES (p_user_id, v_new_balance, NOW())
  ON CONFLICT (user_id)
  DO UPDATE SET 
    current_balance = v_new_balance,
    last_updated = NOW();
  
  RETURN QUERY SELECT 
    TRUE as success,
    v_new_balance as new_balance,
    NULL::TEXT as error_message;
END;
$$;

-- 포인트 복구 함수 (리포트 생성 실패 시 사용)
CREATE OR REPLACE FUNCTION refund_points(
  p_user_id UUID,
  p_amount INTEGER,
  p_request_id TEXT,
  p_description TEXT
)
RETURNS TABLE(
  success BOOLEAN,
  new_balance INTEGER,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_balance INTEGER := 0;
  v_new_balance INTEGER;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- 현재 잔액 조회
  SELECT COALESCE(current_balance, 0) INTO v_current_balance
  FROM user_point_balances
  WHERE user_id = p_user_id;
  
  -- 만료일을 30일 후로 설정
  v_expires_at := NOW() + INTERVAL '30 days';
  
  -- 포인트 환불 트랜잭션 생성
  INSERT INTO point_transactions (
    user_id,
    type,
    amount,
    source_amount_krw,
    expires_at,
    request_id,
    created_at
  ) VALUES (
    p_user_id,
    'bonus', -- 환불은 보너스 포인트로 처리
    p_amount,
    0,
    v_expires_at,
    p_request_id,
    NOW()
  );
  
  -- 새로운 잔액 계산
  v_new_balance := v_current_balance + p_amount;
  
  -- 사용자 잔액 업데이트
  INSERT INTO user_point_balances (user_id, current_balance, last_updated)
  VALUES (p_user_id, v_new_balance, NOW())
  ON CONFLICT (user_id)
  DO UPDATE SET 
    current_balance = v_new_balance,
    last_updated = NOW();
  
  RETURN QUERY SELECT 
    TRUE as success,
    v_new_balance as new_balance,
    NULL::TEXT as error_message;
END;
$$;

-- 포인트 잔액 계산 함수 (실시간 계산)
CREATE OR REPLACE FUNCTION calculate_point_balance(p_user_id UUID)
RETURNS TABLE(
  current_balance INTEGER,
  expiring_soon INTEGER,
  expiring_date TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_balance INTEGER := 0;
  v_expiring INTEGER := 0;
  v_expiring_date TIMESTAMPTZ;
BEGIN
  -- 현재 유효한 포인트 잔액 계산
  SELECT COALESCE(SUM(amount), 0) INTO v_balance
  FROM point_transactions
  WHERE user_id = p_user_id
    AND expires_at > NOW();
  
  -- 7일 이내 만료 예정 포인트 계산
  SELECT 
    COALESCE(SUM(amount), 0),
    MIN(expires_at)
  INTO v_expiring, v_expiring_date
  FROM point_transactions
  WHERE user_id = p_user_id
    AND expires_at > NOW()
    AND expires_at <= NOW() + INTERVAL '7 days'
    AND amount > 0;
  
  -- 사용자 잔액 테이블 업데이트
  INSERT INTO user_point_balances (user_id, current_balance, last_updated)
  VALUES (p_user_id, v_balance, NOW())
  ON CONFLICT (user_id)
  DO UPDATE SET 
    current_balance = v_balance,
    last_updated = NOW();
  
  RETURN QUERY SELECT 
    v_balance as current_balance,
    COALESCE(v_expiring, 0) as expiring_soon,
    v_expiring_date as expiring_date;
END;
$$;