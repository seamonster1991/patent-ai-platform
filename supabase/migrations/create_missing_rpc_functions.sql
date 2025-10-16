-- 누락된 RPC 함수들 생성
-- 포인트 관리 및 활동 추적을 위한 함수들

-- 1. 사용자 잔액 업데이트 함수
CREATE OR REPLACE FUNCTION update_user_balance(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  -- user_point_balances 테이블에 사용자 레코드가 없으면 생성
  INSERT INTO user_point_balances (user_id, current_balance, last_updated)
  VALUES (p_user_id, 0, NOW())
  ON CONFLICT (user_id) 
  DO UPDATE SET last_updated = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. 만료 예정 포인트 조회 함수
CREATE OR REPLACE FUNCTION get_expiring_points(p_user_id UUID, p_days_ahead INTEGER)
RETURNS TABLE(amount INTEGER, expires_at TIMESTAMP WITH TIME ZONE, days_left INTEGER) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(pt.amount), 0)::INTEGER as amount,
    pt.expires_at,
    EXTRACT(DAY FROM (pt.expires_at - NOW()))::INTEGER as days_left
  FROM point_transactions pt
  WHERE pt.user_id = p_user_id
    AND pt.transaction_type = 'earned'
    AND pt.expires_at IS NOT NULL
    AND pt.expires_at > NOW()
    AND pt.expires_at <= NOW() + INTERVAL '1 day' * p_days_ahead
    AND pt.amount > 0
  GROUP BY pt.expires_at
  ORDER BY pt.expires_at ASC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 로그인 활동 기록 함수
CREATE OR REPLACE FUNCTION record_login_activity(
  p_user_id UUID,
  p_ip_address TEXT,
  p_user_agent TEXT,
  p_login_method TEXT DEFAULT 'email',
  p_success BOOLEAN DEFAULT TRUE
)
RETURNS JSON AS $$
DECLARE
  v_login_record_id UUID;
  v_activity_record_id UUID;
  v_total_logins INTEGER;
BEGIN
  -- 로그인 기록 삽입
  INSERT INTO login_records (user_id, ip_address, user_agent, login_method, success, created_at)
  VALUES (p_user_id, p_ip_address, p_user_agent, p_login_method, p_success, NOW())
  RETURNING id INTO v_login_record_id;

  -- 사용자 활동 기록 삽입
  INSERT INTO user_activities (user_id, activity_type, ip_address, user_agent, created_at)
  VALUES (p_user_id, 'login', p_ip_address, p_user_agent, NOW())
  RETURNING id INTO v_activity_record_id;

  -- 총 로그인 횟수 조회
  SELECT COUNT(*) INTO v_total_logins
  FROM login_records
  WHERE user_id = p_user_id AND success = TRUE;

  -- 결과 반환
  RETURN json_build_object(
    'success', TRUE,
    'login_record_id', v_login_record_id,
    'activity_record_id', v_activity_record_id,
    'total_logins', v_total_logins,
    'message', 'Login recorded successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. 사용자 활동 기록 함수
CREATE OR REPLACE FUNCTION record_user_activity(
  p_user_id UUID,
  p_activity_type TEXT,
  p_ip_address TEXT,
  p_user_agent TEXT,
  p_session_id TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_activity_id UUID;
BEGIN
  -- 사용자 활동 기록 삽입
  INSERT INTO user_activities (
    user_id, 
    activity_type, 
    ip_address, 
    user_agent, 
    session_id, 
    metadata, 
    created_at
  )
  VALUES (
    p_user_id, 
    p_activity_type, 
    p_ip_address, 
    p_user_agent, 
    p_session_id, 
    p_metadata, 
    NOW()
  )
  RETURNING id INTO v_activity_id;

  -- 결과 반환
  RETURN json_build_object(
    'success', TRUE,
    'activity_id', v_activity_id,
    'message', 'Activity recorded successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. 필요한 테이블들이 존재하지 않는 경우 생성
CREATE TABLE IF NOT EXISTS user_point_balances (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_balance INTEGER DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS point_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('earned', 'spent', 'expired', 'refunded')),
  amount INTEGER NOT NULL,
  description TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS login_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address TEXT,
  user_agent TEXT,
  login_method TEXT DEFAULT 'email',
  success BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  session_id TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_user_point_balances_user_id ON user_point_balances(user_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_user_id ON point_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_expires_at ON point_transactions(expires_at);
CREATE INDEX IF NOT EXISTS idx_login_records_user_id ON login_records(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON user_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_activity_type ON user_activities(activity_type);