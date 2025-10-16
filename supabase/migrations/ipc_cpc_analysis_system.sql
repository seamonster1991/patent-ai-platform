-- IPC/CPC Technology Field Analysis System Migration
-- This migration creates the complete system for IPC/CPC analysis in the dashboard

-- Drop existing function to allow recreation with new return type
DROP FUNCTION IF EXISTS get_dashboard_stats(UUID, TEXT);

-- Create the technology field classification function
CREATE OR REPLACE FUNCTION classify_technology_field(
    p_text TEXT,
    p_ipc_codes TEXT[] DEFAULT NULL
)
RETURNS VARCHAR(100) AS $$
DECLARE
    tech_field VARCHAR(100);
BEGIN
    -- IPC 코드 기반 분류 (우선순위)
    IF p_ipc_codes IS NOT NULL AND array_length(p_ipc_codes, 1) > 0 THEN
        CASE 
            WHEN p_ipc_codes && ARRAY['G06F', 'G06N', 'H04L', 'G06Q'] THEN
                tech_field := 'Information Technology';
            WHEN p_ipc_codes && ARRAY['A61K', 'A61P', 'C07D', 'A61B'] THEN
                tech_field := 'Biotechnology';
            WHEN p_ipc_codes && ARRAY['H01L', 'H01M', 'H02J', 'H01S'] THEN
                tech_field := 'Electronics';
            WHEN p_ipc_codes && ARRAY['B60W', 'B62D', 'G08G', 'B60L'] THEN
                tech_field := 'Automotive';
            WHEN p_ipc_codes && ARRAY['F03D', 'H02S', 'F24S', 'F03G'] THEN
                tech_field := 'Energy';
            WHEN p_ipc_codes && ARRAY['G06T', 'G06K', 'H04N', 'G02B'] THEN
                tech_field := 'Computer Vision';
            WHEN p_ipc_codes && ARRAY['H04W', 'H04B', 'H04M', 'H04Q'] THEN
                tech_field := 'Telecommunications';
            WHEN p_ipc_codes && ARRAY['C12N', 'C12Q', 'C12P', 'C12M'] THEN
                tech_field := 'Biotechnology';
            WHEN p_ipc_codes && ARRAY['F16H', 'F16D', 'F16C', 'B25J'] THEN
                tech_field := 'Mechanical Engineering';
            WHEN p_ipc_codes && ARRAY['C08F', 'C08G', 'C08L', 'C09D'] THEN
                tech_field := 'Materials Science';
            ELSE
                tech_field := 'General';
        END CASE;
    ELSE
        -- 텍스트 기반 분류 (IPC 코드가 없는 경우)
        CASE 
            WHEN p_text ILIKE ANY(ARRAY['%AI%', '%인공지능%', '%머신러닝%', '%딥러닝%', '%machine learning%', '%deep learning%', '%artificial intelligence%']) THEN
                tech_field := 'Artificial Intelligence';
            WHEN p_text ILIKE ANY(ARRAY['%IoT%', '%센서%', '%스마트%', '%sensor%', '%smart%', '%internet of things%']) THEN
                tech_field := 'IoT/Sensors';
            WHEN p_text ILIKE ANY(ARRAY['%블록체인%', '%blockchain%', '%암호화%', '%cryptocurrency%', '%crypto%']) THEN
                tech_field := 'Blockchain';
            WHEN p_text ILIKE ANY(ARRAY['%바이오%', '%의료%', '%제약%', '%bio%', '%medical%', '%pharmaceutical%', '%healthcare%']) THEN
                tech_field := 'Biotechnology';
            WHEN p_text ILIKE ANY(ARRAY['%자동차%', '%자율주행%', '%전기차%', '%automotive%', '%autonomous%', '%electric vehicle%']) THEN
                tech_field := 'Automotive';
            WHEN p_text ILIKE ANY(ARRAY['%에너지%', '%태양광%', '%배터리%', '%energy%', '%solar%', '%battery%', '%renewable%']) THEN
                tech_field := 'Energy';
            WHEN p_text ILIKE ANY(ARRAY['%반도체%', '%전자%', '%칩%', '%semiconductor%', '%electronics%', '%chip%']) THEN
                tech_field := 'Electronics';
            WHEN p_text ILIKE ANY(ARRAY['%통신%', '%네트워크%', '%5G%', '%telecommunication%', '%network%', '%wireless%']) THEN
                tech_field := 'Telecommunications';
            WHEN p_text ILIKE ANY(ARRAY['%컴퓨터비전%', '%이미지%', '%영상%', '%computer vision%', '%image processing%', '%video%']) THEN
                tech_field := 'Computer Vision';
            WHEN p_text ILIKE ANY(ARRAY['%기계%', '%로봇%', '%mechanical%', '%robot%', '%automation%']) THEN
                tech_field := 'Mechanical Engineering';
            ELSE
                tech_field := 'General';
        END CASE;
    END IF;
    
    RETURN tech_field;
END;
$$ LANGUAGE plpgsql;

-- Create the updated get_dashboard_stats function with IPC/CPC analysis
CREATE OR REPLACE FUNCTION get_dashboard_stats(
    p_user_id UUID,
    p_period TEXT DEFAULT '100d'
)
RETURNS JSON AS $$
DECLARE
    period_interval INTERVAL;
    result JSON;
    user_total_searches INTEGER;
    user_total_reports INTEGER;
    user_total_logins INTEGER;
    period_searches INTEGER;
    period_reports INTEGER;
    period_logins INTEGER;
BEGIN
    -- 기간 설정
    period_interval := (p_period || ' days')::INTERVAL;
    
    -- 사용자 총계 조회
    SELECT 
        COALESCE(total_searches, 0),
        COALESCE(total_reports, 0),
        COALESCE(total_logins, 0)
    INTO user_total_searches, user_total_reports, user_total_logins
    FROM users 
    WHERE id = p_user_id;
    
    -- 기간별 활동 조회
    SELECT 
        COALESCE(COUNT(CASE WHEN activity_type = 'search' THEN 1 END), 0),
        COALESCE(COUNT(CASE WHEN activity_type = 'login' THEN 1 END), 0)
    INTO period_searches, period_logins
    FROM user_activities
    WHERE user_id = p_user_id 
        AND created_at >= NOW() - period_interval;
    
    SELECT COUNT(*)
    INTO period_reports
    FROM ai_analysis_reports
    WHERE user_id = p_user_id 
        AND created_at >= NOW() - period_interval;
    
    -- 날짜 시리즈 생성 (최근 30일)
    WITH date_series AS (
        SELECT generate_series(
            (NOW() - INTERVAL '30 days')::date,
            NOW()::date,
            '1 day'::interval
        )::date AS d
    ),
    user_search_counts AS (
        SELECT created_at::date AS d, COUNT(*) AS cnt
        FROM user_activities
        WHERE user_id = p_user_id
          AND activity_type = 'search'
          AND created_at >= NOW() - INTERVAL '30 days'
        GROUP BY created_at::date
    ),
    user_report_counts AS (
        SELECT created_at::date AS d, COUNT(*) AS cnt
        FROM ai_analysis_reports
        WHERE user_id = p_user_id
          AND created_at >= NOW() - INTERVAL '30 days'
        GROUP BY created_at::date
    ),
    user_login_counts AS (
        SELECT created_at::date AS d, COUNT(*) AS cnt
        FROM user_activities
        WHERE user_id = p_user_id
          AND activity_type = 'login'
          AND created_at >= NOW() - INTERVAL '30 days'
        GROUP BY created_at::date
    ),
    market_search_counts AS (
        SELECT created_at::date AS d, COUNT(*) AS cnt
        FROM user_activities
        WHERE activity_type = 'search'
          AND created_at >= NOW() - INTERVAL '30 days'
        GROUP BY created_at::date
    ),
    market_report_counts AS (
        SELECT created_at::date AS d, COUNT(*) AS cnt
        FROM ai_analysis_reports
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY created_at::date
    ),
    daily_searches_json AS (
        SELECT json_agg(json_build_object('date', ds.d, 'count', COALESCE(usc.cnt, 0)) ORDER BY ds.d) AS j
        FROM date_series ds
        LEFT JOIN user_search_counts usc ON usc.d = ds.d
    ),
    daily_reports_json AS (
        SELECT json_agg(json_build_object('date', ds.d, 'count', COALESCE(urc.cnt, 0)) ORDER BY ds.d) AS j
        FROM date_series ds
        LEFT JOIN user_report_counts urc ON urc.d = ds.d
    ),
    daily_logins_json AS (
        SELECT json_agg(json_build_object('date', ds.d, 'count', COALESCE(ulc.cnt, 0)) ORDER BY ds.d) AS j
        FROM date_series ds
        LEFT JOIN user_login_counts ulc ON ulc.d = ds.d
    ),
    market_daily_searches_json AS (
        SELECT json_agg(json_build_object('date', ds.d, 'count', COALESCE(msc.cnt, 0)) ORDER BY ds.d) AS j
        FROM date_series ds
        LEFT JOIN market_search_counts msc ON msc.d = ds.d
    ),
    market_daily_reports_json AS (
        SELECT json_agg(json_build_object('date', ds.d, 'count', COALESCE(mrc.cnt, 0)) ORDER BY ds.d) AS j
        FROM date_series ds
        LEFT JOIN market_report_counts mrc ON mrc.d = ds.d
    )
    SELECT json_build_object(
        'quota_status', (
            SELECT json_build_object(
                'remaining_credits', COALESCE(15000 - u.total_usage_cost, 15000),
                'remaining_reports', GREATEST(50 - COALESCE(u.total_reports, 0), 0),
                'subscription_plan', COALESCE(u.subscription_plan, 'basic'),
                'last_login', u.last_login_at,
                'expiry_date', (NOW() + INTERVAL '30 days')::date,
                'days_until_expiry', 30
            )
            FROM users u WHERE u.id = p_user_id
        ),
        'efficiency_metrics', json_build_object(
            'login_to_report_rate', CASE 
                WHEN user_total_logins > 0 THEN ROUND((user_total_reports::float / user_total_logins * 100)::numeric, 1)
                ELSE 0 
            END,
            'search_to_report_rate', CASE 
                WHEN user_total_searches > 0 THEN ROUND((user_total_reports::float / user_total_searches * 100)::numeric, 1)
                ELSE 0 
            END,
            'total_logins', user_total_logins,
            'total_searches', user_total_searches,
            'total_reports', user_total_reports,
            'period_logins', period_logins,
            'period_searches', period_searches,
            'period_reports', period_reports
        ),
        'recentActivities', COALESCE(
            (SELECT json_agg(activity_json ORDER BY created_at DESC)
             FROM (
                 SELECT 
                     json_build_object(
                         'id', r.id,
                         'title', COALESCE(r.report_name, r.invention_title),
                         'type', 'report',
                         'timestamp', r.created_at,
                         'application_number', r.application_number,
                         'analysis_type', r.analysis_type,
                         'technology_field', COALESCE(r.technology_field, 'General')
                     ) as activity_json,
                     r.created_at
                 FROM ai_analysis_reports r
                 WHERE r.user_id = p_user_id 
                     AND r.created_at >= NOW() - period_interval
                 
                 UNION ALL
                 
                 SELECT 
                     json_build_object(
                         'id', sh.id,
                         'title', sh.keyword,
                         'type', 'search',
                         'timestamp', sh.created_at,
                         'technology_field', COALESCE(sh.technology_field, 'General')
                     ) as activity_json,
                     sh.created_at
                 FROM search_history sh
                 WHERE sh.user_id = p_user_id 
                     AND sh.created_at >= NOW() - period_interval
                 
                 ORDER BY created_at DESC 
                 LIMIT 20
             ) ordered_activities
            ), '[]'::json
        ),
        'daily_searches', (SELECT COALESCE(j, '[]'::json) FROM daily_searches_json),
        'daily_reports', (SELECT COALESCE(j, '[]'::json) FROM daily_reports_json),
        'daily_logins', (SELECT COALESCE(j, '[]'::json) FROM daily_logins_json),
        'market_daily_searches', (SELECT COALESCE(j, '[]'::json) FROM market_daily_searches_json),
        'market_daily_reports', (SELECT COALESCE(j, '[]'::json) FROM market_daily_reports_json),
        -- Individual Search IPC/CPC Analysis
        'search_fields_top10', (
            SELECT COALESCE(json_agg(
                json_build_object(
                    'field', technology_field,
                    'count', cnt,
                    'percentage', ROUND((cnt * 100.0 / SUM(cnt) OVER())::numeric, 1)
                )
                ORDER BY cnt DESC
            ), '[]'::json)
            FROM (
                SELECT 
                    COALESCE(technology_field, 'General') as technology_field,
                    COUNT(*) as cnt
                FROM search_history
                WHERE user_id = p_user_id
                    AND created_at >= NOW() - period_interval
                GROUP BY technology_field
                ORDER BY cnt DESC
                LIMIT 10
            ) search_stats
        ),
        -- Individual Report IPC/CPC Analysis
        'report_fields_top10', (
            SELECT COALESCE(json_agg(
                json_build_object(
                    'field', technology_field,
                    'count', cnt,
                    'percentage', ROUND((cnt * 100.0 / SUM(cnt) OVER())::numeric, 1)
                )
                ORDER BY cnt DESC
            ), '[]'::json)
            FROM (
                SELECT 
                    COALESCE(technology_field, 'General') as technology_field,
                    COUNT(*) as cnt
                FROM ai_analysis_reports
                WHERE user_id = p_user_id
                    AND created_at >= NOW() - period_interval
                GROUP BY technology_field
                ORDER BY cnt DESC
                LIMIT 10
            ) report_stats
        ),
        -- Market Search IPC/CPC Analysis
        'search_market_fields', (
            SELECT COALESCE(json_agg(
                json_build_object(
                    'field', technology_field,
                    'count', cnt,
                    'percentage', ROUND((cnt * 100.0 / SUM(cnt) OVER())::numeric, 1)
                )
                ORDER BY cnt DESC
            ), '[]'::json)
            FROM (
                SELECT 
                    COALESCE(technology_field, 'General') as technology_field,
                    COUNT(*) as cnt
                FROM search_history
                WHERE created_at >= NOW() - period_interval
                GROUP BY technology_field
                ORDER BY cnt DESC
                LIMIT 10
            ) market_search_stats
        ),
        -- Market Report IPC/CPC Analysis
        'report_market_fields', (
            SELECT COALESCE(json_agg(
                json_build_object(
                    'field', technology_field,
                    'count', cnt,
                    'percentage', ROUND((cnt * 100.0 / SUM(cnt) OVER())::numeric, 1)
                )
                ORDER BY cnt DESC
            ), '[]'::json)
            FROM (
                SELECT 
                    COALESCE(technology_field, 'General') as technology_field,
                    COUNT(*) as cnt
                FROM ai_analysis_reports
                WHERE created_at >= NOW() - period_interval
                GROUP BY technology_field
                ORDER BY cnt DESC
                LIMIT 10
            ) market_report_stats
        ),
        -- Recent Searches with Technology Fields
        'recent_searches', (
            SELECT COALESCE(json_agg(
                json_build_object(
                    'id', id,
                    'title', keyword,
                    'technology_field', COALESCE(technology_field, 'General'),
                    'created_at', created_at
                )
                ORDER BY created_at DESC
            ), '[]'::json)
            FROM (
                SELECT id, keyword, technology_field, created_at
                FROM search_history
                WHERE user_id = p_user_id
                ORDER BY created_at DESC
                LIMIT 10
            ) recent_search_data
        ),
        -- Recent Reports with Technology Fields
        'recent_reports', (
            SELECT COALESCE(json_agg(
                json_build_object(
                    'id', id,
                    'title', COALESCE(report_name, invention_title),
                    'technology_field', COALESCE(technology_field, 'General'),
                    'created_at', created_at
                )
                ORDER BY created_at DESC
            ), '[]'::json)
            FROM (
                SELECT id, report_name, invention_title, technology_field, created_at
                FROM ai_analysis_reports
                WHERE user_id = p_user_id
                ORDER BY created_at DESC
                LIMIT 10
            ) recent_report_data
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_search_history_technology_field ON search_history(technology_field);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_reports_technology_field ON ai_analysis_reports(technology_field);
CREATE INDEX IF NOT EXISTS idx_search_history_user_created ON search_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_reports_user_created ON ai_analysis_reports(user_id, created_at DESC);

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION classify_technology_field(TEXT, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION classify_technology_field(TEXT, TEXT[]) TO anon;
GRANT EXECUTE ON FUNCTION get_dashboard_stats(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_dashboard_stats(UUID, TEXT) TO anon;

-- Create a trigger to automatically classify technology fields for search_history
CREATE OR REPLACE FUNCTION auto_classify_search_technology()
RETURNS TRIGGER AS $$
BEGIN
    -- Only classify if technology_field is not already set
    IF NEW.technology_field IS NULL THEN
        NEW.technology_field := classify_technology_field(NEW.keyword, NEW.ipc_codes);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_classify_search_technology ON search_history;
CREATE TRIGGER trigger_auto_classify_search_technology
    BEFORE INSERT OR UPDATE ON search_history
    FOR EACH ROW
    EXECUTE FUNCTION auto_classify_search_technology();

-- Create a trigger to automatically classify technology fields for ai_analysis_reports
CREATE OR REPLACE FUNCTION auto_classify_report_technology()
RETURNS TRIGGER AS $$
BEGIN
    -- Only classify if technology_field is not already set
    IF NEW.technology_field IS NULL THEN
        NEW.technology_field := classify_technology_field(
            COALESCE(NEW.invention_title, '') || ' ' || COALESCE(NEW.report_name, ''),
            NEW.ipc_codes
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_classify_report_technology ON ai_analysis_reports;
CREATE TRIGGER trigger_auto_classify_report_technology
    BEFORE INSERT OR UPDATE ON ai_analysis_reports
    FOR EACH ROW
    EXECUTE FUNCTION auto_classify_report_technology();