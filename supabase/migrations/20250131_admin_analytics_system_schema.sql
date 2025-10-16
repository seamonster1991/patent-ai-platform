-- 관리자 페이지 고급 분석 시스템 데이터베이스 스키마
-- 2025-01-31: 전체 분석 시스템 구축

-- 사용자 활동 로그 테이블
CREATE TABLE IF NOT EXISTS user_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL,
    activity_data JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 검색 로그 테이블
CREATE TABLE IF NOT EXISTS search_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    keyword VARCHAR(255) NOT NULL,
    search_params JSONB DEFAULT '{}',
    results_count INTEGER DEFAULT 0,
    search_duration_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 리포트 생성 로그 테이블
CREATE TABLE IF NOT EXISTS report_generations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    report_type VARCHAR(50) NOT NULL,
    report_data JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'pending',
    generation_time_ms INTEGER,
    quality_score DECIMAL(3,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 키워드 분석 집계 테이블
CREATE TABLE IF NOT EXISTS keyword_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    keyword VARCHAR(255) NOT NULL,
    search_count INTEGER DEFAULT 0,
    report_conversion INTEGER DEFAULT 0,
    avg_results_count DECIMAL(8,2),
    analytics_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(keyword, analytics_date)
);

-- 리포트 분석 집계 테이블
CREATE TABLE IF NOT EXISTS report_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(100) NOT NULL,
    generation_count INTEGER DEFAULT 0,
    avg_quality_score DECIMAL(3,2),
    avg_generation_time_ms INTEGER,
    success_rate DECIMAL(5,2),
    analytics_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(category, analytics_date)
);

-- 결제 거래 테이블 (기존 테이블이 있다면 확장)
CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    pg_provider VARCHAR(50) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'KRW',
    status VARCHAR(20) DEFAULT 'pending',
    transaction_id VARCHAR(255),
    payment_method VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 구독 관리 테이블
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_type VARCHAR(50) NOT NULL,
    plan_name VARCHAR(100),
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    auto_renewal BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 환불 요청 테이블
CREATE TABLE IF NOT EXISTS refund_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES payment_transactions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    refund_amount DECIMAL(10,2) NOT NULL,
    reason TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    admin_notes TEXT,
    processed_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

-- PG 설정 테이블
CREATE TABLE IF NOT EXISTS pg_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_name VARCHAR(50) UNIQUE NOT NULL,
    config_data JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    test_mode BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON user_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_type_date ON user_activities(activity_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activities_date ON user_activities(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_search_logs_user_id ON search_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_search_logs_keyword ON search_logs(keyword);
CREATE INDEX IF NOT EXISTS idx_search_logs_date ON search_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_report_generations_user_id ON report_generations(user_id);
CREATE INDEX IF NOT EXISTS idx_report_generations_status ON report_generations(status);
CREATE INDEX IF NOT EXISTS idx_report_generations_date ON report_generations(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_keyword_analytics_date ON keyword_analytics(analytics_date DESC);
CREATE INDEX IF NOT EXISTS idx_keyword_analytics_keyword ON keyword_analytics(keyword);

CREATE INDEX IF NOT EXISTS idx_report_analytics_date ON report_analytics(analytics_date DESC);
CREATE INDEX IF NOT EXISTS idx_report_analytics_category ON report_analytics(category);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_date ON payment_transactions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_active ON subscriptions(is_active);

CREATE INDEX IF NOT EXISTS idx_refund_requests_transaction_id ON refund_requests(transaction_id);
CREATE INDEX IF NOT EXISTS idx_refund_requests_status ON refund_requests(status);

-- RLS 정책 설정
ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE keyword_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE refund_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE pg_configurations ENABLE ROW LEVEL SECURITY;

-- 관리자 전용 정책 (service_role만 접근 가능)
CREATE POLICY "Admin only access" ON user_activities FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Admin only access" ON search_logs FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Admin only access" ON report_generations FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Admin only access" ON keyword_analytics FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Admin only access" ON report_analytics FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Admin only access" ON payment_transactions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Admin only access" ON subscriptions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Admin only access" ON refund_requests FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Admin only access" ON pg_configurations FOR ALL USING (auth.role() = 'service_role');

-- 권한 설정
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT SELECT ON user_activities TO authenticated;
GRANT SELECT ON search_logs TO authenticated;
GRANT SELECT ON report_generations TO authenticated;

-- 분석 함수 생성
CREATE OR REPLACE FUNCTION get_admin_analytics_overview()
RETURNS JSON AS $$
DECLARE
    result JSON;
    total_users_count INTEGER;
    total_logins_count INTEGER;
    total_searches_count INTEGER;
    total_reports_count INTEGER;
    free_users_count INTEGER;
    premium_users_count INTEGER;
BEGIN
    -- 기본 카운트 계산
    SELECT COUNT(*) INTO total_users_count FROM auth.users;
    
    SELECT COUNT(*) INTO total_logins_count 
    FROM user_activities 
    WHERE activity_type = 'login';
    
    SELECT COUNT(*) INTO total_searches_count FROM search_logs;
    
    SELECT COUNT(*) INTO total_reports_count FROM report_generations;
    
    -- 사용자 분포 계산 (구독 테이블 기반)
    SELECT COUNT(DISTINCT s.user_id) INTO premium_users_count
    FROM subscriptions s
    WHERE s.is_active = true;
    
    SELECT total_users_count - premium_users_count INTO free_users_count;
    
    -- JSON 결과 생성
    SELECT json_build_object(
        'totalUsers', total_users_count,
        'avgLogins', CASE 
            WHEN total_users_count > 0 THEN ROUND(total_logins_count::DECIMAL / total_users_count, 2)
            ELSE 0 
        END,
        'avgSearches', CASE 
            WHEN total_users_count > 0 THEN ROUND(total_searches_count::DECIMAL / total_users_count, 2)
            ELSE 0 
        END,
        'avgReports', CASE 
            WHEN total_users_count > 0 THEN ROUND(total_reports_count::DECIMAL / total_users_count, 2)
            ELSE 0 
        END,
        'loginToReportRate', CASE 
            WHEN total_logins_count > 0 THEN ROUND(total_reports_count::DECIMAL * 100 / total_logins_count, 2)
            ELSE 0 
        END,
        'searchToReportRate', CASE 
            WHEN total_searches_count > 0 THEN ROUND(total_reports_count::DECIMAL * 100 / total_searches_count, 2)
            ELSE 0 
        END,
        'userDistribution', json_build_object(
            'free', free_users_count,
            'premium', premium_users_count,
            'freePercentage', CASE 
                WHEN total_users_count > 0 THEN ROUND(free_users_count::DECIMAL * 100 / total_users_count, 1)
                ELSE 0 
            END,
            'premiumPercentage', CASE 
                WHEN total_users_count > 0 THEN ROUND(premium_users_count::DECIMAL * 100 / total_users_count, 1)
                ELSE 0 
            END
        ),
        'totalLogins', total_logins_count,
        'totalSearches', total_searches_count,
        'totalReports', total_reports_count
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 키워드 분석 함수
CREATE OR REPLACE FUNCTION get_keyword_analytics(days_limit INTEGER DEFAULT 30)
RETURNS JSON AS $$
DECLARE
    result JSON;
    interval_text TEXT;
BEGIN
    interval_text := days_limit || ' days';
    
    SELECT json_build_object(
        'topKeywords', (
            SELECT json_agg(
                json_build_object(
                    'keyword', keyword,
                    'searchCount', COUNT(*),
                    'reportConversions', (
                        SELECT COUNT(*) 
                        FROM report_generations rg 
                        WHERE rg.user_id IN (
                            SELECT DISTINCT sl2.user_id 
                            FROM search_logs sl2 
                            WHERE sl2.keyword = sl.keyword
                        )
                    )
                ) ORDER BY COUNT(*) DESC
            )
            FROM search_logs sl
            WHERE created_at >= NOW() - interval_text::INTERVAL
            GROUP BY keyword
            LIMIT 20
        ),
        'searchTrends', (
            SELECT json_agg(
                json_build_object(
                    'date', DATE(created_at),
                    'searchCount', COUNT(*)
                ) ORDER BY DATE(created_at) DESC
            )
            FROM search_logs
            WHERE created_at >= NOW() - interval_text::INTERVAL
            GROUP BY DATE(created_at)
            LIMIT 30
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 리포트 분석 함수
CREATE OR REPLACE FUNCTION get_report_analytics(days_limit INTEGER DEFAULT 30)
RETURNS JSON AS $$
DECLARE
    result JSON;
    interval_text TEXT;
BEGIN
    interval_text := days_limit || ' days';
    
    SELECT json_build_object(
        'generationPatterns', (
            SELECT json_agg(
                json_build_object(
                    'date', DATE(created_at),
                    'count', COUNT(*),
                    'avgQuality', ROUND(AVG(quality_score), 2)
                ) ORDER BY DATE(created_at) DESC
            )
            FROM report_generations
            WHERE created_at >= NOW() - interval_text::INTERVAL
            GROUP BY DATE(created_at)
            LIMIT 30
        ),
        'categoryAnalysis', (
            SELECT json_agg(
                json_build_object(
                    'category', report_type,
                    'count', COUNT(*),
                    'successRate', ROUND(
                        COUNT(CASE WHEN status = 'completed' THEN 1 END)::DECIMAL * 100 / COUNT(*), 2
                    )
                ) ORDER BY COUNT(*) DESC
            )
            FROM report_generations
            WHERE created_at >= NOW() - interval_text::INTERVAL
            GROUP BY report_type
        ),
        'qualityMetrics', (
            SELECT json_build_object(
                'avgQuality', ROUND(AVG(quality_score), 2),
                'totalReports', COUNT(*),
                'successRate', ROUND(
                    COUNT(CASE WHEN status = 'completed' THEN 1 END)::DECIMAL * 100 / COUNT(*), 2
                )
            )
            FROM report_generations
            WHERE created_at >= NOW() - interval_text::INTERVAL
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 사용자 행동 패턴 분석 함수
CREATE OR REPLACE FUNCTION get_user_behavior_patterns(days_limit INTEGER DEFAULT 30)
RETURNS JSON AS $$
DECLARE
    result JSON;
    interval_text TEXT;
BEGIN
    interval_text := days_limit || ' days';
    
    SELECT json_build_object(
        'hourlyActivity', (
            SELECT json_agg(
                json_build_object(
                    'hour', EXTRACT(HOUR FROM created_at),
                    'activityCount', COUNT(*)
                ) ORDER BY EXTRACT(HOUR FROM created_at)
            )
            FROM user_activities
            WHERE created_at >= NOW() - interval_text::INTERVAL
            GROUP BY EXTRACT(HOUR FROM created_at)
        ),
        'dailyActivity', (
            SELECT json_agg(
                json_build_object(
                    'dayOfWeek', EXTRACT(DOW FROM created_at),
                    'activityCount', COUNT(*)
                ) ORDER BY EXTRACT(DOW FROM created_at)
            )
            FROM user_activities
            WHERE created_at >= NOW() - interval_text::INTERVAL
            GROUP BY EXTRACT(DOW FROM created_at)
        ),
        'userJourney', (
            SELECT json_agg(
                json_build_object(
                    'step', activity_type,
                    'userCount', COUNT(DISTINCT user_id),
                    'totalCount', COUNT(*)
                ) ORDER BY COUNT(*) DESC
            )
            FROM user_activities
            WHERE created_at >= NOW() - interval_text::INTERVAL
            GROUP BY activity_type
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 샘플 데이터 삽입 (테스트용)
INSERT INTO user_activities (user_id, activity_type, activity_data) 
SELECT 
    (SELECT id FROM auth.users LIMIT 1),
    'login',
    '{"ip": "127.0.0.1", "browser": "Chrome"}'
FROM generate_series(1, 50)
ON CONFLICT DO NOTHING;

INSERT INTO search_logs (user_id, keyword, search_params, results_count)
SELECT 
    (SELECT id FROM auth.users LIMIT 1),
    keywords.keyword,
    '{"filters": {}}',
    floor(random() * 100 + 1)::INTEGER
FROM (VALUES 
    ('특허 검색'), ('AI 기술'), ('블록체인'), ('IoT 센서'), ('머신러닝'),
    ('자율주행'), ('바이오 기술'), ('반도체'), ('5G 통신'), ('로봇 기술')
) AS keywords(keyword),
generate_series(1, 10)
ON CONFLICT DO NOTHING;

INSERT INTO report_generations (user_id, report_type, status, quality_score)
SELECT 
    (SELECT id FROM auth.users LIMIT 1),
    report_types.type,
    CASE WHEN random() > 0.1 THEN 'completed' ELSE 'failed' END,
    (random() * 2 + 3)::DECIMAL(3,2)
FROM (VALUES 
    ('patent_analysis'), ('market_research'), ('technology_trend'), ('competitor_analysis')
) AS report_types(type),
generate_series(1, 30)
ON CONFLICT DO NOTHING;

COMMENT ON TABLE user_activities IS '사용자 활동 로그 - 로그인, 페이지 방문 등 모든 사용자 행동 추적';
COMMENT ON TABLE search_logs IS '검색 로그 - 사용자의 모든 검색 활동 기록';
COMMENT ON TABLE report_generations IS '리포트 생성 로그 - 리포트 생성 요청 및 결과 추적';
COMMENT ON TABLE keyword_analytics IS '키워드 분석 집계 - 일별 키워드 성과 데이터';
COMMENT ON TABLE report_analytics IS '리포트 분석 집계 - 일별 리포트 생성 통계';
COMMENT ON TABLE payment_transactions IS '결제 거래 - 모든 결제 관련 거래 기록';
COMMENT ON TABLE subscriptions IS '구독 관리 - 사용자 구독 상태 및 플랜 정보';
COMMENT ON TABLE refund_requests IS '환불 요청 - 환불 신청 및 처리 상태';
COMMENT ON TABLE pg_configurations IS 'PG 설정 - 결제 게이트웨이 연동 설정';