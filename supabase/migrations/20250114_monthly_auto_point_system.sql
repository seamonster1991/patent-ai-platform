-- 월간 자동 포인트 지급 시스템
-- 매달 회원 가입일에 1,500 포인트 자동 충전

-- 월간 포인트 지급 기록 테이블 생성
CREATE TABLE IF NOT EXISTS monthly_point_grants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    grant_month DATE NOT NULL, -- 지급 월 (YYYY-MM-01 형식)
    points_granted INTEGER NOT NULL DEFAULT 1500,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    grant_type VARCHAR(20) DEFAULT 'monthly_auto',
    status VARCHAR(20) DEFAULT 'completed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 중복 지급 방지를 위한 유니크 제약조건
    UNIQUE(user_id, grant_month)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_monthly_point_grants_user_id ON monthly_point_grants(user_id);
CREATE INDEX IF NOT EXISTS idx_monthly_point_grants_grant_month ON monthly_point_grants(grant_month);
CREATE INDEX IF NOT EXISTS idx_monthly_point_grants_granted_at ON monthly_point_grants(granted_at);

-- RLS 정책 활성화
ALTER TABLE monthly_point_grants ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 월간 포인트 지급 기록만 조회 가능
CREATE POLICY "Users can view their own monthly point grants" ON monthly_point_grants
    FOR SELECT USING (auth.uid() = user_id);

-- 관리자는 모든 월간 포인트 지급 기록 조회 가능
CREATE POLICY "Admins can view all monthly point grants" ON monthly_point_grants
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- 월간 포인트 지급 함수 생성
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
    
    -- 포인트 거래 기록 생성
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

-- 모든 적격 사용자에게 월간 포인트 지급하는 함수
CREATE OR REPLACE FUNCTION grant_monthly_points_to_all(p_grant_month DATE DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
    v_grant_month DATE;
    v_user_record RECORD;
    v_grant_result JSON;
    v_success_count INTEGER := 0;
    v_error_count INTEGER := 0;
    v_results JSON[] := '{}';
    v_final_result JSON;
BEGIN
    -- 지급 월이 지정되지 않은 경우 현재 월 사용
    IF p_grant_month IS NULL THEN
        v_grant_month := DATE_TRUNC('month', CURRENT_DATE)::DATE;
    ELSE
        v_grant_month := DATE_TRUNC('month', p_grant_month)::DATE;
    END IF;
    
    -- 적격 사용자들에게 포인트 지급
    FOR v_user_record IN 
        SELECT u.id, u.created_at
        FROM auth.users u
        WHERE DATE(u.created_at) <= v_grant_month
        AND NOT EXISTS (
            SELECT 1 FROM monthly_point_grants mpg
            WHERE mpg.user_id = u.id AND mpg.grant_month = v_grant_month
        )
    LOOP
        -- 각 사용자에게 포인트 지급
        SELECT grant_monthly_points(v_user_record.id, v_grant_month) INTO v_grant_result;
        
        -- 결과 기록
        v_results := v_results || v_grant_result;
        
        IF (v_grant_result->>'success')::BOOLEAN THEN
            v_success_count := v_success_count + 1;
        ELSE
            v_error_count := v_error_count + 1;
        END IF;
    END LOOP;
    
    v_final_result := json_build_object(
        'success', true,
        'grant_month', v_grant_month,
        'total_processed', v_success_count + v_error_count,
        'success_count', v_success_count,
        'error_count', v_error_count,
        'results', v_results
    );
    
    RETURN v_final_result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Failed to grant monthly points to all users',
            'details', SQLERRM,
            'grant_month', v_grant_month
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 월간 포인트 지급 상태 확인 함수
CREATE OR REPLACE FUNCTION check_monthly_point_grants_status(p_grant_month DATE DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
    v_grant_month DATE;
    v_total_users INTEGER;
    v_granted_users INTEGER;
    v_pending_users INTEGER;
    v_result JSON;
BEGIN
    -- 지급 월이 지정되지 않은 경우 현재 월 사용
    IF p_grant_month IS NULL THEN
        v_grant_month := DATE_TRUNC('month', CURRENT_DATE)::DATE;
    ELSE
        v_grant_month := DATE_TRUNC('month', p_grant_month)::DATE;
    END IF;
    
    -- 전체 적격 사용자 수
    SELECT COUNT(*) INTO v_total_users
    FROM auth.users
    WHERE DATE(created_at) <= v_grant_month;
    
    -- 이미 지급받은 사용자 수
    SELECT COUNT(*) INTO v_granted_users
    FROM monthly_point_grants
    WHERE grant_month = v_grant_month;
    
    -- 지급 대기 사용자 수
    v_pending_users := v_total_users - v_granted_users;
    
    v_result := json_build_object(
        'grant_month', v_grant_month,
        'total_eligible_users', v_total_users,
        'granted_users', v_granted_users,
        'pending_users', v_pending_users,
        'completion_rate', 
        CASE 
            WHEN v_total_users > 0 THEN ROUND((v_granted_users::DECIMAL / v_total_users) * 100, 2)
            ELSE 0
        END
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 월간 포인트 지급 알림 함수 (향후 확장용)
CREATE OR REPLACE FUNCTION notify_monthly_point_grant(p_user_id UUID, p_points INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
    -- 향후 이메일/푸시 알림 기능 구현 예정
    -- 현재는 로그만 기록
    INSERT INTO user_activities (
        user_id,
        activity_type,
        activity_data,
        created_at
    ) VALUES (
        p_user_id,
        'monthly_point_grant',
        json_build_object(
            'points_granted', p_points,
            'grant_type', 'monthly_auto',
            'notification_sent', true
        ),
        NOW()
    );
    
    RETURN true;
EXCEPTION
    WHEN OTHERS THEN
        RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 월간 포인트 지급 스케줄러 함수 (cron job용)
CREATE OR REPLACE FUNCTION monthly_point_grant_scheduler()
RETURNS JSON AS $$
DECLARE
    v_current_month DATE;
    v_result JSON;
BEGIN
    v_current_month := DATE_TRUNC('month', CURRENT_DATE)::DATE;
    
    -- 현재 월에 대한 월간 포인트 지급 실행
    SELECT grant_monthly_points_to_all(v_current_month) INTO v_result;
    
    -- 결과 로깅
    INSERT INTO user_activities (
        user_id,
        activity_type,
        activity_data,
        created_at
    ) VALUES (
        NULL, -- 시스템 활동
        'monthly_point_grant_scheduler',
        v_result,
        NOW()
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 초기 데이터 설정 (현재 월에 대한 포인트 지급)
-- 주석 처리: 실제 운영에서는 스케줄러를 통해 실행
-- SELECT grant_monthly_points_to_all();