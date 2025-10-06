-- 기존 테이블 업데이트

-- 1. analytics_date 컬럼 추가
ALTER TABLE search_keyword_analytics 
ADD COLUMN IF NOT EXISTS analytics_date DATE DEFAULT CURRENT_DATE;

-- 2. updated_at 컬럼 추가
ALTER TABLE search_keyword_analytics 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 3. search_history 테이블에 기술 분야 컬럼 추가
ALTER TABLE search_history 
ADD COLUMN IF NOT EXISTS technology_field VARCHAR(50),
ADD COLUMN IF NOT EXISTS field_confidence DECIMAL(3,2);

-- 4. ai_analysis_reports 테이블에 리포트명 컬럼 추가
ALTER TABLE ai_analysis_reports 
ADD COLUMN IF NOT EXISTS report_name VARCHAR(500),
ADD COLUMN IF NOT EXISTS original_filename VARCHAR(500),
ADD COLUMN IF NOT EXISTS analysis_type VARCHAR(50) DEFAULT 'market';

-- 5. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_search_history_technology_field 
ON search_history(technology_field);

CREATE INDEX IF NOT EXISTS idx_search_history_user_field_date 
ON search_history(user_id, technology_field, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_search_keyword_analytics_user_field 
ON search_keyword_analytics(user_id, technology_field);

CREATE INDEX IF NOT EXISTS idx_search_keyword_analytics_date 
ON search_keyword_analytics(analytics_date DESC);

CREATE INDEX IF NOT EXISTS idx_search_keyword_analytics_count 
ON search_keyword_analytics(search_count DESC);

-- 6. 리포트명 생성 함수
CREATE OR REPLACE FUNCTION generate_report_name(
    p_invention_title TEXT,
    p_analysis_type TEXT,
    p_application_number TEXT,
    p_created_date DATE DEFAULT CURRENT_DATE
) RETURNS TEXT AS $$
DECLARE
    clean_title TEXT;
    type_suffix TEXT;
    date_suffix TEXT;
    final_name TEXT;
BEGIN
    -- 특허 제목 정리 (특수문자 제거, 길이 제한)
    clean_title := REGEXP_REPLACE(
        SUBSTRING(COALESCE(p_invention_title, '제목없음'), 1, 50), 
        '[^\w가-힣]', '_', 'g'
    );
    
    -- 분석 타입에 따른 접미사
    type_suffix := CASE 
        WHEN p_analysis_type = 'market' THEN '시장분석'
        WHEN p_analysis_type = 'business' THEN '인사이트'
        ELSE '분석'
    END;
    
    -- 날짜 형식 (YYYYMMDD)
    date_suffix := TO_CHAR(p_created_date, 'YYYYMMDD');
    
    -- 최종 리포트명 생성
    final_name := clean_title || '_' || type_suffix || '_' || 
                  COALESCE(p_application_number, 'NO_NUMBER') || '_' || date_suffix;
    
    RETURN final_name;
END;
$$ LANGUAGE plpgsql;

-- 7. 기존 리포트에 대한 리포트명 업데이트
UPDATE ai_analysis_reports 
SET report_name = generate_report_name(
    invention_title, 
    analysis_type, 
    application_number, 
    created_at::date
)
WHERE report_name IS NULL;

-- 8. 샘플 키워드 분석 데이터 (테스트용)
DO $$
DECLARE
    sample_user_id UUID;
BEGIN
    -- 첫 번째 사용자 ID 가져오기
    SELECT id INTO sample_user_id FROM auth.users WHERE email LIKE '%@%' LIMIT 1;
    
    IF sample_user_id IS NOT NULL THEN
        INSERT INTO search_keyword_analytics (user_id, technology_field, keyword, search_count, analytics_date)
        VALUES 
            (sample_user_id, 'AI', '딥러닝', 15, CURRENT_DATE - 1),
            (sample_user_id, 'AI', '머신러닝', 12, CURRENT_DATE - 1),
            (sample_user_id, 'AI', '신경망', 8, CURRENT_DATE - 2),
            (sample_user_id, 'IoT', '센서', 10, CURRENT_DATE - 2),
            (sample_user_id, 'IoT', '스마트홈', 6, CURRENT_DATE - 3),
            (sample_user_id, 'Bio', '유전자', 5, CURRENT_DATE - 3),
            (sample_user_id, 'Bio', '바이오센서', 7, CURRENT_DATE - 4),
            (sample_user_id, 'Auto', '자율주행', 10, CURRENT_DATE - 1),
            (sample_user_id, 'Auto', '전기차', 8, CURRENT_DATE - 2),
            (sample_user_id, 'Semiconductor', '반도체', 12, CURRENT_DATE - 1),
            (sample_user_id, 'Semiconductor', '칩셋', 9, CURRENT_DATE - 2)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;