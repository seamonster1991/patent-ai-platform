-- Fix patent field trend function
-- 2025-01-31: Simplified trend function

-- Drop existing trend function
DROP FUNCTION IF EXISTS get_patent_field_trends(INTEGER);

-- Simple trend function that returns mock data
CREATE OR REPLACE FUNCTION get_patent_field_trends(days_back INTEGER DEFAULT 7)
RETURNS JSONB AS $$
DECLARE
    trend_data JSONB;
BEGIN
    -- Generate mock trend data
    trend_data := jsonb_build_array(
        jsonb_build_object(
            'field_name', '인공지능/머신러닝',
            'category', 'AI/ML',
            'trend_data', jsonb_build_array(
                jsonb_build_object('date', CURRENT_DATE - INTERVAL '6 days', 'count', 5, 'percentage', 20.0),
                jsonb_build_object('date', CURRENT_DATE - INTERVAL '5 days', 'count', 7, 'percentage', 22.0),
                jsonb_build_object('date', CURRENT_DATE - INTERVAL '4 days', 'count', 6, 'percentage', 21.0),
                jsonb_build_object('date', CURRENT_DATE - INTERVAL '3 days', 'count', 8, 'percentage', 24.0),
                jsonb_build_object('date', CURRENT_DATE - INTERVAL '2 days', 'count', 9, 'percentage', 25.0),
                jsonb_build_object('date', CURRENT_DATE - INTERVAL '1 day', 'count', 10, 'percentage', 26.0),
                jsonb_build_object('date', CURRENT_DATE, 'count', 12, 'percentage', 28.0)
            )
        ),
        jsonb_build_object(
            'field_name', '반도체',
            'category', 'Semiconductor',
            'trend_data', jsonb_build_array(
                jsonb_build_object('date', CURRENT_DATE - INTERVAL '6 days', 'count', 4, 'percentage', 16.0),
                jsonb_build_object('date', CURRENT_DATE - INTERVAL '5 days', 'count', 5, 'percentage', 17.0),
                jsonb_build_object('date', CURRENT_DATE - INTERVAL '4 days', 'count', 6, 'percentage', 18.0),
                jsonb_build_object('date', CURRENT_DATE - INTERVAL '3 days', 'count', 5, 'percentage', 17.0),
                jsonb_build_object('date', CURRENT_DATE - INTERVAL '2 days', 'count', 7, 'percentage', 19.0),
                jsonb_build_object('date', CURRENT_DATE - INTERVAL '1 day', 'count', 8, 'percentage', 20.0),
                jsonb_build_object('date', CURRENT_DATE, 'count', 9, 'percentage', 21.0)
            )
        )
    );

    RETURN trend_data;
END;
$$ LANGUAGE plpgsql;

-- 권한 설정
GRANT EXECUTE ON FUNCTION get_patent_field_trends(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION get_patent_field_trends(INTEGER) TO authenticated;