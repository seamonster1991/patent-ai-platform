-- 신규 가입자 웰컴 포인트 시스템
-- 신규 가입 시 5000포인트 자동 충전

-- 웰컴 포인트 지급 기록 테이블 생성
CREATE TABLE IF NOT EXISTS welcome_point_grants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    points_granted INTEGER NOT NULL DEFAULT 5000,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    grant_type VARCHAR(20) DEFAULT 'welcome_bonus',
    status VARCHAR(20) DEFAULT 'completed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 중복 지급 방지를 위한 유니크 제약조건
    UNIQUE(user_id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_welcome_point_grants_user_id ON welcome_point_grants(user_id);
CREATE INDEX IF NOT EXISTS idx_welcome_point_grants_granted_at ON welcome_point_grants(granted_at);

-- RLS 정책 활성화
ALTER TABLE welcome_point_grants ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 웰컴 포인트 지급 기록만 조회 가능
CREATE POLICY "Users can view their own welcome point grants" ON welcome_point_grants
    FOR SELECT USING (auth.uid() = user_id);

-- 관리자는 모든 웰컴 포인트 지급 기록 조회 가능
CREATE POLICY "Admins can view all welcome point grants" ON welcome_point_grants
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- 웰컴 포인트 지급 함수 생성
CREATE OR REPLACE FUNCTION grant_welcome_points(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
    v_points_to_grant INTEGER := 5000;
    v_existing_grant welcome_point_grants%ROWTYPE;
    v_transaction_id UUID;
    v_user_exists BOOLEAN;
BEGIN
    -- 사용자 존재 확인
    SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = p_user_id) INTO v_user_exists;
    
    IF NOT v_user_exists THEN
        RETURN json_build_object(
            'success', false,
            'error', 'User not found',
            'user_id', p_user_id
        );
    END IF;
    
    -- 이미 웰컴 포인트를 받았는지 확인
    SELECT * INTO v_existing_grant
    FROM welcome_point_grants
    WHERE user_id = p_user_id;
    
    IF FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Welcome points already granted',
            'user_id', p_user_id,
            'existing_grant_id', v_existing_grant.id,
            'granted_at', v_existing_grant.granted_at
        );
    END IF;
    
    -- 웰컴 포인트 지급 기록 생성
    INSERT INTO welcome_point_grants (user_id, points_granted)
    VALUES (p_user_id, v_points_to_grant)
    RETURNING id INTO v_transaction_id;
    
    -- 포인트 거래 기록 생성
    INSERT INTO point_transactions (
        user_id,
        type,
        amount,
        expires_at,
        description,
        created_at
    ) VALUES (
        p_user_id,
        'welcome_bonus',
        v_points_to_grant,
        (CURRENT_DATE + INTERVAL '365 days')::TIMESTAMP WITH TIME ZONE,
        '신규 가입 웰컴 보너스',
        NOW()
    );
    
    -- 사용자 포인트 잔액 업데이트
    INSERT INTO user_point_balances (user_id, current_balance, last_updated)
    VALUES (p_user_id, v_points_to_grant, NOW())
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        current_balance = user_point_balances.current_balance + v_points_to_grant,
        last_updated = NOW();
    
    RETURN json_build_object(
        'success', true,
        'user_id', p_user_id,
        'points_granted', v_points_to_grant,
        'transaction_id', v_transaction_id,
        'granted_at', NOW()
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Failed to grant welcome points',
            'details', SQLERRM,
            'user_id', p_user_id
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 사용자 등록 시 자동으로 웰컴 포인트 지급하는 트리거 함수
CREATE OR REPLACE FUNCTION trigger_grant_welcome_points()
RETURNS TRIGGER AS $$
BEGIN
    -- 새로운 사용자에게 웰컴 포인트 지급 (비동기로 처리)
    PERFORM grant_welcome_points(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 사용자 등록 시 웰컴 포인트 자동 지급 트리거 생성
DROP TRIGGER IF EXISTS auto_grant_welcome_points ON auth.users;
CREATE TRIGGER auto_grant_welcome_points
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION trigger_grant_welcome_points();