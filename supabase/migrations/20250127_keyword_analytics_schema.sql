-- 검색 키워드 분석 및 AI 리포트 개선을 위한 데이터베이스 스키마 업데이트

-- 1. search_history 테이블에 기술 분야 컬럼 추가
ALTER TABLE search_history 
ADD COLUMN IF NOT EXISTS technology_field VARCHAR(50),
ADD COLUMN IF NOT EXISTS field_confidence DECIMAL(3,2);

-- 기술 분야별 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_search_history_technology_field 
ON search_history(technology_field);

CREATE INDEX IF NOT EXISTS idx_search_history_user_field_date 
ON search_history(user_id, technology_field, created_at DESC);

-- 2. search_keyword_analytics 테이블 생성
CREATE TABLE IF NOT EXISTS search_keyword_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    technology_field VARCHAR(50) NOT NULL,
    keyword VARCHAR(255) NOT NULL,
    search_count INTEGER DEFAULT 1,
    last_searched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    analytics_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, technology_field, keyword, analytics_date)
);

-- search_keyword_analytics 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_search_keyword_analytics_user_field 
ON search_keyword_analytics(user_id, technology_field);

CREATE INDEX IF NOT EXISTS idx_search_keyword_analytics_date 
ON search_keyword_analytics(analytics_date DESC);

CREATE INDEX IF NOT EXISTS idx_search_keyword_analytics_count 
ON search_keyword_analytics(search_count DESC);

-- 3. ai_analysis_reports 테이블에 리포트명 컬럼 추가
ALTER TABLE ai_analysis_reports 
ADD COLUMN IF NOT EXISTS report_name VARCHAR(500),
ADD COLUMN IF NOT EXISTS original_filename VARCHAR(500);

-- 4. 리포트명 생성 함수
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

-- 5. search_keyword_analytics 테이블 RLS 정책
ALTER TABLE search_keyword_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own keyword analytics" 
ON search_keyword_analytics FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own keyword analytics" 
ON search_keyword_analytics FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own keyword analytics" 
ON search_keyword_analytics FOR UPDATE 
USING (auth.uid() = user_id);

-- 6. 권한 부여
GRANT SELECT, INSERT, UPDATE ON search_keyword_analytics TO authenticated;
GRANT SELECT, INSERT, UPDATE ON search_keyword_analytics TO anon;

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
        ON CONFLICT (user_id, technology_field, keyword, analytics_date) DO NOTHING;
    END IF;
END $$;