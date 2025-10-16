-- 월간 무료 포인트 지급 시스템
-- 생성일: 2024-01-10
-- 설명: 매달 1500 포인트 무료 지급 시스템

-- 1. 월간 무료 포인트 지급 기록 테이블
CREATE TABLE IF NOT EXISTS monthly_free_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    points_granted INTEGER NOT NULL DEFAULT 1500,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- 중복 방지를 위한 유니크 제약
    UNIQUE(user_id, year, month)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_monthly_free_points_user_id ON monthly_free_points(user_id);
CREATE INDEX IF NOT EXISTS idx_monthly_free_points_year_month ON monthly_free_points(year, month);
CREATE INDEX IF NOT EXISTS idx_monthly_free_points_expires_at ON monthly_free_points(expires_at);

-- Row Level Security 활성화
ALTER TABLE monthly_free_points ENABLE ROW LEVEL SECURITY;

-- 정책: 사용자는 자신의 무료 포인트 기록만 조회 가능
DROP POLICY IF EXISTS "Users can view own monthly free points" ON monthly_free_points;
CREATE POLICY "Users can view own monthly free points" ON monthly_free_points
    FOR SELECT USING (auth.uid() = user_id);

-- 권한 부여
GRANT SELECT ON monthly_free_points TO anon;
GRANT ALL PRIVILEGES ON monthly_free_points TO authenticated;

-- 2. 월간 무료 포인트 지급 함수
CREATE OR REPLACE FUNCTION grant_monthly_free_points(p_user_id UUID)
RETURNS TABLE(
    success BOOLEAN,
    points_granted INTEGER,
    expires_at TIMESTAMP WITH TIME ZONE,
    already_granted BOOLEAN,
    error_message TEXT
) AS $$
DECLARE
    v_current_year INTEGER;
    v_current_month INTEGER;
    v_expires_at TIMESTAMP WITH TIME ZONE;
    v_existing_record RECORD;
    v_points_amount INTEGER := 1500;
BEGIN
    -- 현재 년월 가져오기
    v_current_year := EXTRACT(YEAR FROM NOW());
    v_current_month := EXTRACT(MONTH FROM NOW());
    
    -- 만료일 설정 (다음 달 말일)
    v_expires_at := (DATE_TRUNC('MONTH', NOW()) + INTERVAL '2 months' - INTERVAL '1 day')::TIMESTAMP WITH TIME ZONE;
    
    -- 이미 이번 달에 지급했는지 확인
    SELECT * INTO v_existing_record
    FROM monthly_free_points
    WHERE user_id = p_user_id
    AND year = v_current_year
    AND month = v_current_month;
    
    IF FOUND THEN
        -- 이미 지급된 경우
        RETURN QUERY SELECT FALSE, 0, v_existing_record.expires_at, TRUE, '이번 달 무료 포인트가 이미 지급되었습니다.'::TEXT;
        RETURN;
    END IF;
    
    -- 월간 무료 포인트 기록 생성
    INSERT INTO monthly_free_points (
        user_id, year, month, points_granted, expires_at
    ) VALUES (
        p_user_id, v_current_year, v_current_month, v_points_amount, v_expires_at
    );
    
    -- 포인트 거래 기록 생성
    INSERT INTO point_transactions (
        user_id, type, amount, source_amount_krw, expires_at, description
    ) VALUES (
        p_user_id, 'monthly_free', v_points_amount, 0, v_expires_at, '월간 무료 포인트 지급'
    );
    
    -- 사용자 포인트 잔액 업데이트
    INSERT INTO user_point_balances (user_id, current_balance, last_updated)
    VALUES (p_user_id, v_points_amount, NOW())
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        current_balance = user_point_balances.current_balance + v_points_amount,
        last_updated = NOW();
    
    RETURN QUERY SELECT TRUE, v_points_amount, v_expires_at, FALSE, NULL::TEXT;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY SELECT FALSE, 0, NULL::TIMESTAMP WITH TIME ZONE, FALSE, SQLERRM::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 사용자 로그인 시 월간 무료 포인트 자동 지급 함수
CREATE OR REPLACE FUNCTION check_and_grant_monthly_free_points(p_user_id UUID)
RETURNS TABLE(
    granted BOOLEAN,
    points_amount INTEGER,
    message TEXT
) AS $$
DECLARE
    v_result RECORD;
BEGIN
    -- 월간 무료 포인트 지급 시도
    SELECT * INTO v_result
    FROM grant_monthly_free_points(p_user_id)
    LIMIT 1;
    
    IF v_result.success THEN
        RETURN QUERY SELECT TRUE, v_result.points_granted, '월간 무료 포인트 1500P가 지급되었습니다!'::TEXT;
    ELSIF v_result.already_granted THEN
        RETURN QUERY SELECT FALSE, 0, '이번 달 무료 포인트가 이미 지급되었습니다.'::TEXT;
    ELSE
        RETURN QUERY SELECT FALSE, 0, v_result.error_message;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. 만료된 무료 포인트 정리 함수
CREATE OR REPLACE FUNCTION cleanup_expired_free_points()
RETURNS INTEGER AS $$
DECLARE
    v_cleaned_count INTEGER := 0;
BEGIN
    -- 만료된 무료 포인트 기록에서 포인트 차감
    WITH expired_points AS (
        SELECT mfp.user_id, mfp.points_granted
        FROM monthly_free_points mfp
        WHERE mfp.expires_at <= NOW()
        AND EXISTS (
            SELECT 1 FROM point_transactions pt
            WHERE pt.user_id = mfp.user_id
            AND pt.type = 'monthly_free'
            AND pt.expires_at = mfp.expires_at
            AND pt.amount > 0
        )
    )
    UPDATE user_point_balances upb
    SET current_balance = GREATEST(upb.current_balance - ep.points_granted, 0),
        last_updated = NOW()
    FROM expired_points ep
    WHERE upb.user_id = ep.user_id;
    
    GET DIAGNOSTICS v_cleaned_count = ROW_COUNT;
    
    RETURN v_cleaned_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. 월간 무료 포인트 통계 조회 함수
CREATE OR REPLACE FUNCTION get_monthly_free_points_stats(p_user_id UUID)
RETURNS TABLE(
    total_months INTEGER,
    total_points_granted INTEGER,
    current_month_granted BOOLEAN,
    next_grant_date DATE
) AS $$
DECLARE
    v_current_year INTEGER;
    v_current_month INTEGER;
    v_current_granted BOOLEAN := FALSE;
    v_next_grant_date DATE;
BEGIN
    v_current_year := EXTRACT(YEAR FROM NOW());
    v_current_month := EXTRACT(MONTH FROM NOW());
    
    -- 이번 달 지급 여부 확인
    SELECT EXISTS(
        SELECT 1 FROM monthly_free_points
        WHERE user_id = p_user_id
        AND year = v_current_year
        AND month = v_current_month
    ) INTO v_current_granted;
    
    -- 다음 지급일 계산
    IF v_current_granted THEN
        v_next_grant_date := (DATE_TRUNC('MONTH', NOW()) + INTERVAL '1 month')::DATE;
    ELSE
        v_next_grant_date := CURRENT_DATE;
    END IF;
    
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_months,
        COALESCE(SUM(points_granted), 0)::INTEGER as total_points_granted,
        v_current_granted as current_month_granted,
        v_next_grant_date as next_grant_date
    FROM monthly_free_points
    WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 완료 메시지
DO $$
BEGIN
    RAISE NOTICE '월간 무료 포인트 시스템이 성공적으로 생성되었습니다.';
    RAISE NOTICE '테이블: monthly_free_points';
    RAISE NOTICE '함수: grant_monthly_free_points, check_and_grant_monthly_free_points, cleanup_expired_free_points, get_monthly_free_points_stats';
END $$;