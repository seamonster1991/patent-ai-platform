-- 회원가입 보너스를 5,000포인트로 수정하고 만료 기간을 1개월로 변경
-- 작성일: 2025-01-31

-- 기존 함수 삭제
DROP FUNCTION IF EXISTS grant_signup_bonus(UUID);

-- 새로운 회원가입 보너스 함수 생성 (5,000P, 1개월 만료)
CREATE OR REPLACE FUNCTION grant_signup_bonus(p_user_id UUID)
RETURNS TABLE(
  granted BOOLEAN,
  points_amount INTEGER,
  message TEXT,
  expires_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_expires_at TIMESTAMP WITH TIME ZONE;
  v_existing_count INTEGER;
BEGIN
  -- Check if signup bonus already granted
  SELECT COUNT(*) INTO v_existing_count
  FROM point_transactions
  WHERE user_id = p_user_id
  AND transaction_type = 'signup_bonus';

  IF v_existing_count > 0 THEN
    RETURN QUERY SELECT false, 0, 'Signup bonus already granted'::TEXT, NULL::TIMESTAMP WITH TIME ZONE;
    RETURN;
  END IF;

  -- Set expiration date (1 month from now)
  v_expires_at := NOW() + INTERVAL '1 month';

  -- Grant signup bonus (5,000 points)
  INSERT INTO point_transactions (
    id,
    user_id,
    amount,
    transaction_type,
    description,
    expires_at,
    created_at
  ) VALUES (
    gen_random_uuid(),
    p_user_id,
    5000,
    'signup_bonus',
    '회원가입 축하 포인트 (5,000P)',
    v_expires_at,
    NOW()
  );

  -- Update user balance
  PERFORM update_user_balance(p_user_id);

  RETURN QUERY SELECT true, 5000, 'Signup bonus granted successfully'::TEXT, v_expires_at;
END;
$$;

-- 함수에 대한 권한 설정
GRANT EXECUTE ON FUNCTION grant_signup_bonus(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION grant_signup_bonus(UUID) TO authenticated;

-- 기존 get_point_grant_stats 함수도 업데이트 (5,000포인트 반영)
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
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_signup_bonus_granted BOOLEAN := false;
  v_signup_bonus_date TIMESTAMP WITH TIME ZONE;
  v_total_monthly_grants INTEGER := 0;
  v_total_points_granted INTEGER := 0;
  v_current_month_granted BOOLEAN := false;
  v_next_grant_date DATE;
  v_expiring_points INTEGER := 0;
  v_expiring_date TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Check signup bonus
  SELECT COUNT(*) > 0, MIN(created_at) INTO v_signup_bonus_granted, v_signup_bonus_date
  FROM point_transactions
  WHERE user_id = p_user_id AND transaction_type = 'signup_bonus';

  -- Check current month grant
  SELECT COUNT(*) > 0 INTO v_current_month_granted
  FROM point_transactions
  WHERE user_id = p_user_id 
  AND transaction_type = 'monthly_free'
  AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW());

  -- Count total monthly grants and points
  SELECT COUNT(*), COALESCE(SUM(amount), 0) INTO v_total_monthly_grants, v_total_points_granted
  FROM point_transactions
  WHERE user_id = p_user_id
  AND transaction_type IN ('signup_bonus', 'monthly_free');

  -- Calculate next grant date (1st of next month)
  v_next_grant_date := DATE_TRUNC('month', NOW()) + INTERVAL '1 month';

  -- Get expiring points (within 7 days)
  SELECT COALESCE(SUM(amount), 0), MIN(expires_at) INTO v_expiring_points, v_expiring_date
  FROM point_transactions
  WHERE user_id = p_user_id
  AND expires_at IS NOT NULL
  AND expires_at <= NOW() + INTERVAL '7 days'
  AND expires_at > NOW();

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
$$;

-- 함수에 대한 권한 설정
GRANT EXECUTE ON FUNCTION get_point_grant_stats(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION get_point_grant_stats(UUID) TO authenticated;