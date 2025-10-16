-- 대시보드 통계 테이블 생성
CREATE TABLE IF NOT EXISTS dashboard_statistics (
    id SERIAL PRIMARY KEY,
    stat_date DATE DEFAULT CURRENT_DATE,
    total_logins INTEGER NOT NULL DEFAULT 0,
    personal_searches INTEGER NOT NULL DEFAULT 0,
    market_search_average DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    personal_reports INTEGER NOT NULL DEFAULT 0,
    market_report_average DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total_users INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 날짜별 유니크 제약 조건 추가 (하루에 하나의 통계만 저장)
CREATE UNIQUE INDEX IF NOT EXISTS idx_dashboard_statistics_stat_date 
ON dashboard_statistics(stat_date);

-- 통계 테이블에 대한 코멘트 추가
COMMENT ON TABLE dashboard_statistics IS '대시보드 통계 데이터를 저장하는 테이블';
COMMENT ON COLUMN dashboard_statistics.stat_date IS '통계 날짜';
COMMENT ON COLUMN dashboard_statistics.total_logins IS '총 로그인 횟수';
COMMENT ON COLUMN dashboard_statistics.personal_searches IS '개인 검색 총 횟수';
COMMENT ON COLUMN dashboard_statistics.market_search_average IS '사용자당 시장 검색 평균';
COMMENT ON COLUMN dashboard_statistics.personal_reports IS '개인 리포트 총 개수';
COMMENT ON COLUMN dashboard_statistics.market_report_average IS '사용자당 시장 리포트 평균';
COMMENT ON COLUMN dashboard_statistics.total_users IS '총 사용자 수';

-- 업데이트 시간 자동 갱신을 위한 트리거 함수
CREATE OR REPLACE FUNCTION update_dashboard_statistics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 업데이트 트리거 생성
CREATE TRIGGER trigger_update_dashboard_statistics_updated_at
    BEFORE UPDATE ON dashboard_statistics
    FOR EACH ROW
    EXECUTE FUNCTION update_dashboard_statistics_updated_at();