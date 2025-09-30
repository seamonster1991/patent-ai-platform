-- AI 분석 리포트 테이블 생성
CREATE TABLE IF NOT EXISTS ai_analysis_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  application_number VARCHAR NOT NULL,
  invention_title TEXT NOT NULL,
  
  -- 시장분석 리포트 필드
  market_penetration TEXT,
  competitive_landscape TEXT,
  market_growth_drivers TEXT,
  risk_factors TEXT,
  
  -- 비즈니스 인사이트 리포트 필드
  revenue_model TEXT,
  royalty_margin TEXT,
  new_business_opportunities TEXT,
  competitor_response_strategy TEXT,
  
  -- 메타데이터
  user_id UUID REFERENCES users(id),
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_ai_analysis_reports_application_number ON ai_analysis_reports(application_number);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_reports_user_id ON ai_analysis_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_reports_created_at ON ai_analysis_reports(created_at);

-- RLS (Row Level Security) 활성화
ALTER TABLE ai_analysis_reports ENABLE ROW LEVEL SECURITY;

-- RLS 정책 생성 (사용자는 자신의 리포트만 볼 수 있음)
CREATE POLICY "Users can view their own AI analysis reports" ON ai_analysis_reports
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own AI analysis reports" ON ai_analysis_reports
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own AI analysis reports" ON ai_analysis_reports
  FOR UPDATE USING (auth.uid() = user_id);

-- 업데이트 시간 자동 갱신을 위한 트리거 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 트리거 생성
CREATE TRIGGER update_ai_analysis_reports_updated_at 
  BEFORE UPDATE ON ai_analysis_reports 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();