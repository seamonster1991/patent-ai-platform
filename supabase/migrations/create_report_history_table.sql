-- 리포트 생성 기록을 위한 테이블 생성
CREATE TABLE IF NOT EXISTS public.report_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id),
    patent_application_number TEXT NOT NULL,
    patent_title TEXT NOT NULL,
    report_type VARCHAR(20) NOT NULL CHECK (report_type IN ('market', 'business')),
    report_type_display TEXT NOT NULL, -- '시장분석' 또는 '비즈니스 인사이트'
    word_count INTEGER DEFAULT 0,
    generation_time_ms INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 활성화
ALTER TABLE public.report_history ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 리포트 기록만 볼 수 있도록 정책 설정
CREATE POLICY "Users can view their own report history" ON public.report_history
    FOR SELECT USING (auth.uid() = user_id);

-- 사용자는 자신의 리포트 기록만 삽입할 수 있도록 정책 설정
CREATE POLICY "Users can insert their own report history" ON public.report_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_report_history_user_id ON public.report_history(user_id);
CREATE INDEX IF NOT EXISTS idx_report_history_created_at ON public.report_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_report_history_report_type ON public.report_history(report_type);

-- 업데이트 시간 자동 갱신을 위한 트리거 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 트리거 생성
CREATE TRIGGER update_report_history_updated_at 
    BEFORE UPDATE ON public.report_history 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();