-- 회원가입 보너스 함수를 현재 point_transactions 테이블 스키마에 맞게 수정
-- 작성일: 2025-01-31
-- 설명: type 컬럼 사용, description 컬럼 제거, 올바른 컬럼명 사용

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
SECURITY DEFINER
AS $$
DECLARE
  v_expires_at TIMESTAMP WITH TIME ZONE;
  v_existing_count INTEGER;
BEGIN
  -- Check if signup bonus already granted
  SELECT COUNT(*) INTO v_existing_count
  FROM point_transactions
  WHERE user_id = p_user_id
  AND type = 'bonus';

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
    type,
    amount,
    source_amount_krw,
    expires_at,
    created_at
  ) VALUES (
    gen_random_uuid(),
    p_user_id,
    'bonus',
    5000,
    0,
    v_expires_at,
    NOW()
  );

  RETURN QUERY SELECT true, 5000, 'Signup bonus granted successfully'::TEXT, v_expires_at;
END;
$$;

-- 권한 부여
GRANT EXECUTE ON FUNCTION grant_signup_bonus(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION grant_signup_bonus(UUID) TO authenticated;

-- 회원가입 보너스 API 엔드포인트를 위한 함수 생성
CREATE OR REPLACE FUNCTION handle_signup_bonus(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result RECORD;
  v_response JSON;
BEGIN
  -- 회원가입 보너스 지급 시도
  SELECT * INTO v_result FROM grant_signup_bonus(p_user_id);
  
  -- JSON 응답 생성
  v_response := json_build_object(
    'success', v_result.granted,
    'points', v_result.points_amount,
    'message', v_result.message,
    'expires_at', v_result.expires_at
  );
  
  RETURN v_response;
END;
$$;

-- 권한 부여
GRANT EXECUTE ON FUNCTION handle_signup_bonus(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION handle_signup_bonus(UUID) TO authenticated;