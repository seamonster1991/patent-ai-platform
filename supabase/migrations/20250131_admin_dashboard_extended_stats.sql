-- 관리자 대시보드 확장 통계 시스템
-- 확장된 통계 뷰, 인기 검색어/특허 순위, 안전한 사용자 삭제 함수 생성

-- 1. users 테이블에 deleted_at 컬럼 추가 (소프트 삭제용)
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- 2. 확장된 대시보드 통계 뷰 생성
CREATE OR REPLACE VIEW dashboard_extended_stats AS
SELECT 
    COUNT(DISTINCT u.id) as total_users,
    COALESCE(COUNT(ll.id), 0) as total_logins,
    COALESCE(COUNT(sh.id), 0) as total_searches,
    COALESCE(COUNT(r.id), 0) as total_reports,
    CASE 
        WHEN COUNT(DISTINCT u.id) > 0 
        THEN ROUND(COUNT(ll.id)::numeric / COUNT(DISTINCT u.id), 2)
        ELSE 0 
    END as avg_logins_per_user,
    CASE 
        WHEN COUNT(DISTINCT u.id) > 0 
        THEN ROUND(COUNT(sh.id)::numeric / COUNT(DISTINCT u.id), 2)
        ELSE 0 
    END as avg_searches_per_user,
    CASE 
        WHEN COUNT(DISTINCT u.id) > 0 
        THEN ROUND(COUNT(r.id)::numeric / COUNT(DISTINCT u.id), 2)
        ELSE 0 
    END as avg_reports_per_user,
    CASE 
        WHEN COUNT(ll.id) > 0 
        THEN ROUND((COUNT(r.id)::numeric / COUNT(ll.id)) * 100, 2)
        ELSE 0 
    END as login_to_report_conversion,
    CASE 
        WHEN COUNT(sh.id) > 0 
        THEN ROUND((COUNT(r.id)::numeric / COUNT(sh.id)) * 100, 2)
        ELSE 0 
    END as search_to_report_conversion
FROM users u
LEFT JOIN user_login_logs ll ON u.id = ll.user_id AND ll.created_at >= NOW() - INTERVAL '30 days'
LEFT JOIN search_history sh ON u.id = sh.user_id AND sh.created_at >= NOW() - INTERVAL '30 days'
LEFT JOIN ai_analysis_reports r ON u.id = r.user_id AND r.created_at >= NOW() - INTERVAL '30 days'
WHERE u.deleted_at IS NULL;

-- 3. 인기 검색어 뷰 생성 (상위 10개)
CREATE OR REPLACE VIEW popular_keywords AS
SELECT 
    keyword,
    COUNT(*) as search_count
FROM search_history
WHERE created_at >= NOW() - INTERVAL '30 days'
  AND keyword IS NOT NULL 
  AND TRIM(keyword) != ''
GROUP BY keyword
ORDER BY search_count DESC
LIMIT 10;

-- 4. 인기 특허 뷰 생성 (상위 10개) - application_number와 invention_title 사용
CREATE OR REPLACE VIEW popular_patents AS
SELECT 
    application_number,
    invention_title,
    COUNT(*) as analysis_count
FROM ai_analysis_reports
WHERE created_at >= NOW() - INTERVAL '30 days'
  AND application_number IS NOT NULL 
  AND TRIM(application_number) != ''
GROUP BY application_number, invention_title
ORDER BY analysis_count DESC
LIMIT 10;

-- 5. 기간별 확장된 통계 함수 생성
CREATE OR REPLACE FUNCTION get_dashboard_extended_stats(period_days INTEGER DEFAULT 30)
RETURNS TABLE(
    total_users BIGINT,
    total_logins BIGINT,
    total_searches BIGINT,
    total_reports BIGINT,
    avg_logins_per_user NUMERIC,
    avg_searches_per_user NUMERIC,
    avg_reports_per_user NUMERIC,
    login_to_report_conversion NUMERIC,
    search_to_report_conversion NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT u.id) as total_users,
        COALESCE(COUNT(ll.id), 0) as total_logins,
        COALESCE(COUNT(sh.id), 0) as total_searches,
        COALESCE(COUNT(r.id), 0) as total_reports,
        CASE 
            WHEN COUNT(DISTINCT u.id) > 0 
            THEN ROUND(COUNT(ll.id)::numeric / COUNT(DISTINCT u.id), 2)
            ELSE 0 
        END as avg_logins_per_user,
        CASE 
            WHEN COUNT(DISTINCT u.id) > 0 
            THEN ROUND(COUNT(sh.id)::numeric / COUNT(DISTINCT u.id), 2)
            ELSE 0 
        END as avg_searches_per_user,
        CASE 
            WHEN COUNT(DISTINCT u.id) > 0 
            THEN ROUND(COUNT(r.id)::numeric / COUNT(DISTINCT u.id), 2)
            ELSE 0 
        END as avg_reports_per_user,
        CASE 
            WHEN COUNT(ll.id) > 0 
            THEN ROUND((COUNT(r.id)::numeric / COUNT(ll.id)) * 100, 2)
            ELSE 0 
        END as login_to_report_conversion,
        CASE 
            WHEN COUNT(sh.id) > 0 
            THEN ROUND((COUNT(r.id)::numeric / COUNT(sh.id)) * 100, 2)
            ELSE 0 
        END as search_to_report_conversion
    FROM users u
    LEFT JOIN user_login_logs ll ON u.id = ll.user_id AND ll.created_at >= NOW() - INTERVAL '1 day' * period_days
    LEFT JOIN search_history sh ON u.id = sh.user_id AND sh.created_at >= NOW() - INTERVAL '1 day' * period_days
    LEFT JOIN ai_analysis_reports r ON u.id = r.user_id AND r.created_at >= NOW() - INTERVAL '1 day' * period_days
    WHERE u.deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- 6. 기간별 인기 검색어 함수
CREATE OR REPLACE FUNCTION get_popular_keywords(period_days INTEGER DEFAULT 30, limit_count INTEGER DEFAULT 10)
RETURNS TABLE(
    keyword TEXT,
    search_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sh.keyword,
        COUNT(*) as search_count
    FROM search_history sh
    WHERE sh.created_at >= NOW() - INTERVAL '1 day' * period_days
      AND sh.keyword IS NOT NULL 
      AND TRIM(sh.keyword) != ''
    GROUP BY sh.keyword
    ORDER BY search_count DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- 7. 기간별 인기 특허 함수 - application_number와 invention_title 사용
CREATE OR REPLACE FUNCTION get_popular_patents(period_days INTEGER DEFAULT 30, limit_count INTEGER DEFAULT 10)
RETURNS TABLE(
    application_number TEXT,
    invention_title TEXT,
    analysis_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.application_number,
        r.invention_title,
        COUNT(*) as analysis_count
    FROM ai_analysis_reports r
    WHERE r.created_at >= NOW() - INTERVAL '1 day' * period_days
      AND r.application_number IS NOT NULL 
      AND TRIM(r.application_number) != ''
    GROUP BY r.application_number, r.invention_title
    ORDER BY analysis_count DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- 8. 안전한 사용자 삭제 함수 (소프트 삭제)
CREATE OR REPLACE FUNCTION safe_delete_user(user_id_param UUID)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT
) AS $$
DECLARE
    user_exists BOOLEAN;
    user_email TEXT;
BEGIN
    -- 사용자 존재 확인
    SELECT EXISTS(
        SELECT 1 FROM users 
        WHERE id = user_id_param AND deleted_at IS NULL
    ), email INTO user_exists, user_email
    FROM users 
    WHERE id = user_id_param;
    
    IF NOT user_exists THEN
        RETURN QUERY SELECT FALSE, '사용자를 찾을 수 없거나 이미 삭제되었습니다.';
        RETURN;
    END IF;
    
    -- 소프트 삭제 (deleted_at 설정)
    UPDATE users 
    SET deleted_at = NOW(), 
        updated_at = NOW()
    WHERE id = user_id_param;
    
    -- 관련 데이터도 소프트 삭제 처리 (필요한 경우)
    -- 예: 사용자의 활성 세션 무효화, 포인트 만료 등
    
    RETURN QUERY SELECT TRUE, format('사용자 %s가 성공적으로 삭제되었습니다.', user_email);
END;
$$ LANGUAGE plpgsql;

-- 9. 사용자 복구 함수 (삭제 취소)
CREATE OR REPLACE FUNCTION restore_deleted_user(user_id_param UUID)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT
) AS $$
DECLARE
    user_exists BOOLEAN;
    user_email TEXT;
BEGIN
    -- 삭제된 사용자 존재 확인
    SELECT EXISTS(
        SELECT 1 FROM users 
        WHERE id = user_id_param AND deleted_at IS NOT NULL
    ), email INTO user_exists, user_email
    FROM users 
    WHERE id = user_id_param;
    
    IF NOT user_exists THEN
        RETURN QUERY SELECT FALSE, '삭제된 사용자를 찾을 수 없습니다.';
        RETURN;
    END IF;
    
    -- 사용자 복구 (deleted_at 제거)
    UPDATE users 
    SET deleted_at = NULL, 
        updated_at = NOW()
    WHERE id = user_id_param;
    
    RETURN QUERY SELECT TRUE, format('사용자 %s가 성공적으로 복구되었습니다.', user_email);
END;
$$ LANGUAGE plpgsql;

-- 10. 권한 설정
GRANT SELECT ON dashboard_extended_stats TO authenticated;
GRANT SELECT ON popular_keywords TO authenticated;
GRANT SELECT ON popular_patents TO authenticated;
GRANT EXECUTE ON FUNCTION get_dashboard_extended_stats(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_popular_keywords(INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_popular_patents(INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION safe_delete_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION restore_deleted_user(UUID) TO authenticated;

-- 11. 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_user_login_logs_user_id_created_at ON user_login_logs(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_search_history_user_id_created_at ON search_history(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_search_history_keyword_created_at ON search_history(keyword, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_reports_user_id_created_at ON ai_analysis_reports(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_reports_application_number_created_at ON ai_analysis_reports(application_number, created_at);
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at);

-- 12. 테스트 데이터 확인 쿼리 (개발용)
-- SELECT * FROM dashboard_extended_stats;
-- SELECT * FROM popular_keywords;
-- SELECT * FROM popular_patents;
-- SELECT * FROM get_dashboard_extended_stats(7);
-- SELECT * FROM get_popular_keywords(7, 5);
-- SELECT * FROM get_popular_patents(7, 5);