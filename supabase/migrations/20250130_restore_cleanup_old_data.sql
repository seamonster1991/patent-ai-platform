-- cleanup_old_data 함수 복원 (호환성을 위해)
-- Restore cleanup_old_data function for compatibility

CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS JSONB AS $$
BEGIN
    -- cleanup_old_data_enhanced 함수를 호출하여 호환성 유지
    RETURN cleanup_old_data_enhanced(100, 'auto');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 권한 부여
GRANT EXECUTE ON FUNCTION cleanup_old_data TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_data TO anon;

-- 함수 설명
COMMENT ON FUNCTION cleanup_old_data() IS '호환성을 위한 cleanup_old_data 함수 - cleanup_old_data_enhanced를 호출합니다.';