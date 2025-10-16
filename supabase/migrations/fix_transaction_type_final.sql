-- Final fix for transaction_type column references
-- Force drop and recreate all functions with correct column names

-- Drop all existing functions
DROP FUNCTION IF EXISTS check_and_grant_monthly_free_points(UUID) CASCADE;
DROP FUNCTION IF EXISTS grant_monthly_free_points(UUID) CASCADE;
DROP FUNCTION IF EXISTS cleanup_expired_free_points() CASCADE;
DROP FUNCTION IF EXISTS get_monthly_free_points_stats(UUID) CASCADE;

-- Recreate grant_monthly_free_points function with correct column names
CREATE OR REPLACE FUNCTION grant_monthly_free_points(p_user_id UUID)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    points_granted INTEGER,
    expires_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_month INTEGER := EXTRACT(MONTH FROM NOW());
    v_current_year INTEGER := EXTRACT(YEAR FROM NOW());
    v_points_amount INTEGER := 1000;
    v_expires_at TIMESTAMPTZ := (DATE_TRUNC('MONTH', NOW()) + INTERVAL '2 MONTH' - INTERVAL '1 DAY')::TIMESTAMPTZ;
    v_existing_record RECORD;
BEGIN
    -- Check if user already received free points this month
    SELECT * INTO v_existing_record
    FROM monthly_free_points
    WHERE user_id = p_user_id 
    AND year = v_current_year 
    AND month = v_current_month;
    
    IF FOUND THEN
        RETURN QUERY SELECT FALSE, '이번 달 무료 포인트를 이미 받으셨습니다.'::TEXT, 0, v_existing_record.expires_at;
        RETURN;
    END IF;
    
    -- Insert into monthly_free_points tracking table
    INSERT INTO monthly_free_points (
        user_id, year, month, points_granted, expires_at, granted_at
    ) VALUES (
        p_user_id, v_current_year, v_current_month, v_points_amount, v_expires_at, NOW()
    );
    
    -- Insert into point_transactions using correct column names
    INSERT INTO point_transactions (user_id, type, amount, source_amount_krw, expires_at, created_at)
    VALUES (p_user_id, 'bonus', v_points_amount, 0, v_expires_at, NOW());
    
    RETURN QUERY SELECT TRUE, '월간 무료 포인트가 성공적으로 지급되었습니다.'::TEXT, v_points_amount, v_expires_at;
END;
$$;

-- Recreate check_and_grant_monthly_free_points function
CREATE OR REPLACE FUNCTION check_and_grant_monthly_free_points(p_user_id UUID)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    points_granted INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY 
    SELECT 
        result.success,
        result.message,
        result.points_granted
    FROM grant_monthly_free_points(p_user_id) AS result;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION grant_monthly_free_points(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_and_grant_monthly_free_points(UUID) TO authenticated;