-- 월간 무료 포인트 관련 RPC 함수들 수정

-- 기존 함수들 삭제
DROP FUNCTION IF EXISTS check_and_grant_monthly_free_points(UUID);
DROP FUNCTION IF EXISTS grant_signup_bonus(UUID);
DROP FUNCTION IF EXISTS get_point_grant_stats(UUID);

-- 1. 월간 무료 포인트 확인 및 지급 함수
CREATE OR REPLACE FUNCTION check_and_grant_monthly_free_points(p_user_id UUID)
RETURNS TABLE(
  granted BOOLEAN,
  points_amount INTEGER,
  message TEXT,
  expires_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
  v_last_grant_date DATE;
  v_current_month DATE;
  v_points_amount INTEGER := 1500;
  v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
  -- 현재 월의 첫 번째 날
  v_current_month := DATE_TRUNC('month', NOW())::DATE;
  v_expires_at := (v_current_month + INTERVAL '1 month')::TIMESTAMP WITH TIME ZONE;
  
  -- 이번 달에 이미 무료 포인트를 받았는지 확인
  SELECT DATE_TRUNC('month', created_at)::DATE INTO v_last_grant_date
  FROM point_transactions
  WHERE user_id = p_user_id
    AND type = 'bonus'
    AND request_id = 'monthly_free_points'
    AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- 이번 달에 아직 받지 않았다면 지급
  IF v_last_grant_date IS NULL THEN
    -- 포인트 트랜잭션 기록
    INSERT INTO point_transactions (user_id, type, amount, request_id, expires_at)
    VALUES (p_user_id, 'bonus', v_points_amount, 'monthly_free_points', v_expires_at);
    
    -- 사용자 잔액 업데이트
    INSERT INTO user_point_balances (user_id, current_balance, last_updated)
    VALUES (p_user_id, v_points_amount, NOW())
    ON CONFLICT (user_id) 
    DO UPDATE SET 
      current_balance = user_point_balances.current_balance + v_points_amount,
      last_updated = NOW();
    
    RETURN QUERY SELECT TRUE, v_points_amount, 'Monthly free points granted successfully', v_expires_at;
  ELSE
    RETURN QUERY SELECT FALSE, 0, 'Monthly free points already granted this month', NULL::TIMESTAMP WITH TIME ZONE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. 신규 가입 보너스 지급 함수
CREATE OR REPLACE FUNCTION grant_signup_bonus(p_user_id UUID)
RETURNS TABLE(
  granted BOOLEAN,
  points_amount INTEGER,
  message TEXT,
  expires_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
  v_already_granted BOOLEAN := FALSE;
  v_points_amount INTEGER := 3000;
  v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
  -- 3개월 후 만료
  v_expires_at := NOW() + INTERVAL '3 months';
  
  -- 이미 신규 가입 보너스를 받았는지 확인
  SELECT EXISTS(
    SELECT 1 FROM point_transactions
    WHERE user_id = p_user_id
      AND type = 'bonus'
      AND request_id = 'signup_bonus'
  ) INTO v_already_granted;
  
  -- 아직 받지 않았다면 지급
  IF NOT v_already_granted THEN
    -- 포인트 트랜잭션 기록
    INSERT INTO point_transactions (user_id, type, amount, request_id, expires_at)
    VALUES (p_user_id, 'bonus', v_points_amount, 'signup_bonus', v_expires_at);
    
    -- 사용자 잔액 업데이트
    INSERT INTO user_point_balances (user_id, current_balance, last_updated)
    VALUES (p_user_id, v_points_amount, NOW())
    ON CONFLICT (user_id) 
    DO UPDATE SET 
      current_balance = user_point_balances.current_balance + v_points_amount,
      last_updated = NOW();
    
    RETURN QUERY SELECT TRUE, v_points_amount, 'Signup bonus granted successfully', v_expires_at;
  ELSE
    RETURN QUERY SELECT FALSE, 0, 'Signup bonus already granted', NULL::TIMESTAMP WITH TIME ZONE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 포인트 지급 통계 조회 함수
CREATE OR REPLACE FUNCTION get_point_grant_stats(p_user_id UUID)
RETURNS TABLE(
  signup_bonus_granted BOOLEAN,
  signup_bonus_date TIMESTAMP WITH TIME ZONE,
  total_monthly_grants INTEGER,
  total_points_granted INTEGER,
  current_month_granted BOOLEAN,
  next_grant_date DATE,
  expiring_points INTEGER,
  expiring_date TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
  v_signup_bonus_granted BOOLEAN := FALSE;
  v_signup_bonus_date TIMESTAMP WITH TIME ZONE;
  v_total_monthly_grants INTEGER := 0;
  v_total_points_granted INTEGER := 0;
  v_current_month_granted BOOLEAN := FALSE;
  v_next_grant_date DATE;
  v_expiring_points INTEGER := 0;
  v_expiring_date TIMESTAMP WITH TIME ZONE;
BEGIN
  -- 신규 가입 보너스 확인
  SELECT 
    EXISTS(SELECT 1 FROM point_transactions WHERE user_id = p_user_id AND request_id = 'signup_bonus'),
    (SELECT created_at FROM point_transactions WHERE user_id = p_user_id AND request_id = 'signup_bonus' LIMIT 1)
  INTO v_signup_bonus_granted, v_signup_bonus_date;
  
  -- 월간 무료 포인트 통계
  SELECT 
    COUNT(*),
    COALESCE(SUM(amount), 0)
  INTO v_total_monthly_grants, v_total_points_granted
  FROM point_transactions
  WHERE user_id = p_user_id AND request_id = 'monthly_free_points';
  
  -- 이번 달 지급 여부 확인
  SELECT EXISTS(
    SELECT 1 FROM point_transactions
    WHERE user_id = p_user_id
      AND request_id = 'monthly_free_points'
      AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())
  ) INTO v_current_month_granted;
  
  -- 다음 지급 가능 날짜 (다음 달 1일)
  IF v_current_month_granted THEN
    v_next_grant_date := (DATE_TRUNC('month', NOW()) + INTERVAL '1 month')::DATE;
  ELSE
    v_next_grant_date := NOW()::DATE;
  END IF;
  
  -- 만료 예정 포인트 (30일 이내)
  SELECT 
    COALESCE(SUM(amount), 0),
    MIN(expires_at)
  INTO v_expiring_points, v_expiring_date
  FROM point_transactions
  WHERE user_id = p_user_id
    AND type = 'bonus'
    AND expires_at IS NOT NULL
    AND expires_at > NOW()
    AND expires_at <= NOW() + INTERVAL '30 days'
    AND amount > 0;
  
  RETURN QUERY SELECT 
    v_signup_bonus_granted,
    v_signup_bonus_date,
    v_total_monthly_grants,
    v_total_points_granted,
    v_current_month_granted,
    v_next_grant_date,
    v_expiring_points,
    v_expiring_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;