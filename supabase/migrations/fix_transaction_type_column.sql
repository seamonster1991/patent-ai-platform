-- Fix transaction_type references to use 'type' column instead
-- This migration updates all functions that reference the non-existent 'transaction_type' column

-- Drop existing functions that use transaction_type
DROP FUNCTION IF EXISTS check_and_grant_monthly_free_points(UUID);
DROP FUNCTION IF EXISTS grant_monthly_free_points(UUID);
DROP FUNCTION IF EXISTS cleanup_expired_free_points();
DROP FUNCTION IF EXISTS get_monthly_free_points_stats(UUID);

-- Recreate grant_monthly_free_points function with correct column name
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
    v_points_amount INTEGER := 1000; -- 월간 무료 포인트 양
    v_expires_at TIMESTAMPTZ := (DATE_TRUNC('MONTH', NOW()) + INTERVAL '1 MONTH' + INTERVAL '1 MONTH' - INTERVAL '1 DAY')::TIMESTAMPTZ;
    v_existing_record RECORD;
BEGIN
    -- Check if user already received free points this month
    SELECT * INTO v_existing_record
    FROM monthly_free_points
    WHERE user_id = p_user_id 
    AND year = v_current_year 
    AND month = v_current_month;
    
    IF FOUND THEN
        RETURN QUERY SELECT FALSE, '이번 달 무료 포인트를 이미 받으셨습니다.', 0, v_existing_record.expires_at;
        RETURN;
    END IF;
    
    -- Insert into monthly_free_points tracking table
    INSERT INTO monthly_free_points (
        user_id, year, month, points_granted, expires_at, granted_at
    ) VALUES (
        p_user_id, v_current_year, v_current_month, v_points_amount, v_expires_at, NOW()
    );
    
    -- Insert into point_transactions with correct column names
    INSERT INTO point_transactions (user_id, type, amount, source_amount_krw, expires_at)
    VALUES (p_user_id, 'bonus', v_points_amount, 0, v_expires_at);
    
    RETURN QUERY SELECT TRUE, '월간 무료 포인트가 성공적으로 지급되었습니다.', v_points_amount, v_expires_at;
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

-- Recreate cleanup_expired_free_points function
CREATE OR REPLACE FUNCTION cleanup_expired_free_points()
RETURNS TABLE(
    cleaned_count INTEGER,
    message TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_cleaned_count INTEGER := 0;
BEGIN
    -- Delete expired point transactions that were monthly free points
    WITH deleted_transactions AS (
        DELETE FROM point_transactions pt
        USING monthly_free_points mfp
        WHERE pt.user_id = mfp.user_id
        AND pt.expires_at < NOW()
        AND pt.type = 'bonus'  -- Changed from 'monthly_free' to 'bonus'
        AND pt.created_at >= DATE_TRUNC('month', mfp.granted_at)
        AND pt.created_at < DATE_TRUNC('month', mfp.granted_at) + INTERVAL '1 month'
        RETURNING pt.id
    )
    SELECT COUNT(*) INTO v_cleaned_count FROM deleted_transactions;
    
    -- Also clean up the monthly_free_points tracking records
    DELETE FROM monthly_free_points WHERE expires_at < NOW();
    
    RETURN QUERY SELECT v_cleaned_count, format('정리된 만료 포인트 거래: %s개', v_cleaned_count);
END;
$$;

-- Recreate get_monthly_free_points_stats function
CREATE OR REPLACE FUNCTION get_monthly_free_points_stats(p_user_id UUID)
RETURNS TABLE(
    can_receive_this_month BOOLEAN,
    last_received_month INTEGER,
    last_received_year INTEGER,
    total_received_this_year INTEGER,
    next_eligible_date DATE
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_month INTEGER := EXTRACT(MONTH FROM NOW());
    v_current_year INTEGER := EXTRACT(YEAR FROM NOW());
    v_last_record RECORD;
    v_total_this_year INTEGER := 0;
BEGIN
    -- Check if already received this month
    SELECT 1 FROM monthly_free_points
    WHERE user_id = p_user_id 
    AND year = v_current_year 
    AND month = v_current_month
    INTO v_last_record;
    
    -- Get last received info
    SELECT year, month INTO v_last_record
    FROM monthly_free_points
    WHERE user_id = p_user_id
    ORDER BY year DESC, month DESC
    LIMIT 1;
    
    -- Get total received this year
    SELECT COALESCE(SUM(points_granted), 0) INTO v_total_this_year
    FROM monthly_free_points
    WHERE user_id = p_user_id AND year = v_current_year;
    
    RETURN QUERY SELECT 
        (v_last_record IS NULL OR v_last_record.year != v_current_year OR v_last_record.month != v_current_month),
        COALESCE(v_last_record.month, 0),
        COALESCE(v_last_record.year, 0),
        v_total_this_year,
        (DATE_TRUNC('MONTH', NOW()) + INTERVAL '1 MONTH')::DATE;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION grant_monthly_free_points(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_and_grant_monthly_free_points(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_free_points() TO authenticated;
GRANT EXECUTE ON FUNCTION get_monthly_free_points_stats(UUID) TO authenticated;