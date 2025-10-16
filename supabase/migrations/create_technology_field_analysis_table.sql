-- 기술 분야 분석 테이블 생성

CREATE TABLE IF NOT EXISTS technology_field_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    field_type VARCHAR(50) NOT NULL, -- 'search_individual', 'search_market', 'report_individual', 'report_market'
    technology_field VARCHAR(20) NOT NULL, -- IPC 코드 (예: 'H04L', 'G06F')
    count INTEGER NOT NULL DEFAULT 0,
    percentage NUMERIC(5,2) NOT NULL DEFAULT 0.0,
    analysis_type VARCHAR(20) NOT NULL DEFAULT 'individual', -- 'individual' or 'market'
    period_days INTEGER NOT NULL DEFAULT 100,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_technology_field_analysis_user_id ON technology_field_analysis(user_id);
CREATE INDEX IF NOT EXISTS idx_technology_field_analysis_field_type ON technology_field_analysis(field_type);
CREATE INDEX IF NOT EXISTS idx_technology_field_analysis_technology_field ON technology_field_analysis(technology_field);

-- RLS 정책 설정
ALTER TABLE technology_field_analysis ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 데이터만 조회 가능
CREATE POLICY "Users can view own technology field analysis" ON technology_field_analysis
    FOR SELECT USING (auth.uid() = user_id);

-- 사용자는 자신의 데이터만 삽입 가능
CREATE POLICY "Users can insert own technology field analysis" ON technology_field_analysis
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 사용자는 자신의 데이터만 업데이트 가능
CREATE POLICY "Users can update own technology field analysis" ON technology_field_analysis
    FOR UPDATE USING (auth.uid() = user_id);

-- 사용자는 자신의 데이터만 삭제 가능
CREATE POLICY "Users can delete own technology field analysis" ON technology_field_analysis
    FOR DELETE USING (auth.uid() = user_id);