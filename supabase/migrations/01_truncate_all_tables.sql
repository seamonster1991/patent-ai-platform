-- 모든 테이블 데이터 삭제 및 시퀀스 리셋
-- 실행 순서: 외래키 제약조건을 고려하여 역순으로 삭제

-- 1. 종속 테이블들부터 삭제
TRUNCATE TABLE competitor_mentions CASCADE;
TRUNCATE TABLE document_downloads CASCADE;
TRUNCATE TABLE billing_events CASCADE;
TRUNCATE TABLE system_metrics CASCADE;
TRUNCATE TABLE llm_analysis_logs CASCADE;
TRUNCATE TABLE patent_search_analytics CASCADE;
TRUNCATE TABLE usage_cost_tracking CASCADE;
TRUNCATE TABLE saved_patents CASCADE;
TRUNCATE TABLE patent_detail_views CASCADE;
TRUNCATE TABLE search_keyword_analytics CASCADE;
TRUNCATE TABLE user_login_logs CASCADE;
TRUNCATE TABLE report_history CASCADE;
TRUNCATE TABLE reports CASCADE;
TRUNCATE TABLE ai_analysis_reports CASCADE;
TRUNCATE TABLE user_activities CASCADE;
TRUNCATE TABLE search_history CASCADE;

-- 2. 메인 테이블 삭제
TRUNCATE TABLE users CASCADE;

-- 3. 시퀀스 리셋 (UUID 기반이므로 별도 시퀀스 리셋 불필요)
-- UUID는 gen_random_uuid()로 자동 생성되므로 시퀀스 리셋이 필요하지 않음

-- 4. 확인용 메시지
SELECT 'All tables have been truncated successfully' as status;