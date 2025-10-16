-- Create new payment system tables only
-- 생성일: 2024-01-15

-- 1. 결제 거래 테이블 (payment_transactions) 생성
CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_order_id UUID NOT NULL REFERENCES payment_orders(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- 거래 정보
    transaction_id VARCHAR(100) UNIQUE NOT NULL, -- NicePay tid
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('payment', 'refund', 'cancel')),
    
    -- 금액 정보
    amount INTEGER NOT NULL,
    currency VARCHAR(3) DEFAULT 'KRW',
    
    -- 결제 수단 상세
    pay_method VARCHAR(20) NOT NULL,
    card_company VARCHAR(50), -- 카드사명
    card_number VARCHAR(20), -- 마스킹된 카드번호
    installment INTEGER DEFAULT 0, -- 할부개월
    
    -- 거래 상태
    status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'failed', 'cancelled')),
    result_code VARCHAR(10), -- NicePay 결과 코드
    result_message TEXT, -- NicePay 결과 메시지
    
    -- 승인 정보
    auth_code VARCHAR(20), -- 승인번호
    auth_date TIMESTAMP WITH TIME ZONE, -- 승인일시
    
    -- NicePay 원본 데이터
    nicepay_response JSONB, -- 전체 응답 데이터
    
    -- 포인트 지급 정보
    points_granted INTEGER DEFAULT 0, -- 지급된 포인트
    points_transaction_id UUID, -- point_transactions 테이블 참조
    
    -- 타임스탬프
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 환불 테이블 (refunds) 생성
CREATE TABLE IF NOT EXISTS refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    refund_id VARCHAR(100) UNIQUE NOT NULL, -- 환불 고유 ID
    
    -- 원본 거래 정보
    original_transaction_id VARCHAR(100) NOT NULL,
    payment_order_id UUID NOT NULL REFERENCES payment_orders(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- 환불 정보
    refund_type VARCHAR(20) NOT NULL CHECK (refund_type IN ('full', 'partial')),
    refund_amount INTEGER NOT NULL CHECK (refund_amount > 0),
    original_amount INTEGER NOT NULL,
    
    -- 환불 사유
    reason_code VARCHAR(20) NOT NULL CHECK (reason_code IN ('user_request', 'admin_decision', 'system_error', 'fraud')),
    reason_description TEXT,
    
    -- 환불 상태
    status VARCHAR(20) NOT NULL DEFAULT 'requested' 
        CHECK (status IN ('requested', 'approved', 'rejected', 'processing', 'completed', 'failed')),
    
    -- 승인 정보
    approved_by UUID REFERENCES auth.users(id), -- 승인한 관리자
    approved_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    
    -- NicePay 환불 정보
    nicepay_refund_tid VARCHAR(100), -- NicePay 환불 거래 ID
    nicepay_response JSONB, -- NicePay 환불 응답
    
    -- 포인트 회수 정보
    points_deducted INTEGER DEFAULT 0, -- 회수된 포인트
    points_refund_transaction_id UUID, -- point_transactions 테이블 참조
    
    -- 타임스탬프
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 결제 설정 테이블 (payment_settings) 생성
CREATE TABLE IF NOT EXISTS payment_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    setting_type VARCHAR(20) NOT NULL CHECK (setting_type IN ('string', 'number', 'boolean', 'json')),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 결제 로그 테이블 (payment_logs) 생성
CREATE TABLE IF NOT EXISTS payment_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_order_id UUID REFERENCES payment_orders(id) ON DELETE SET NULL,
    transaction_id VARCHAR(100),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- 로그 정보
    event_type VARCHAR(50) NOT NULL, -- 이벤트 타입 (order_created, payment_approved, etc.)
    event_data JSONB, -- 이벤트 상세 데이터
    
    -- 요청/응답 정보
    request_data JSONB, -- 요청 데이터
    response_data JSONB, -- 응답 데이터
    
    -- 메타데이터
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(100),
    
    -- 타임스탬프
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 기본 결제 설정 데이터 삽입
INSERT INTO payment_settings (setting_key, setting_value, setting_type, description) VALUES
('nicepay_client_id', 'R2_6496fd66ebc242b58ab7ef1722c9a92b', 'string', 'NicePay 클라이언트 ID'),
('nicepay_secret_key', '101d2ae924fa4ae398c3b76a7ba62226', 'string', 'NicePay 시크릿 키'),
('nicepay_api_url', 'https://sandbox-api.nicepay.co.kr/v1/payments', 'string', 'NicePay API URL'),
('nicepay_js_url', 'https://pay.nicepay.co.kr/v1/js/', 'string', 'NicePay JS SDK URL'),
('payment_timeout_minutes', '30', 'number', '결제 타임아웃 시간 (분)'),
('auto_refund_enabled', 'true', 'boolean', '자동 환불 처리 활성화'),
('max_refund_days', '7', 'number', '환불 가능 기간 (일)'),
('point_bonus_rate', '0.1', 'number', '추가 충전 시 보너스 포인트 비율'),
('subscription_points', '{"basic": 5000, "premium": 15000, "enterprise": 30000}', 'json', '구독별 지급 포인트'),
('addon_point_rate', '1', 'number', '추가 충전 포인트 비율 (원당 포인트)')
ON CONFLICT (setting_key) DO NOTHING;

-- RLS (Row Level Security) 정책 설정
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_logs ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 결제 정보만 조회 가능
CREATE POLICY "Users can view own payment transactions" ON payment_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own refunds" ON refunds FOR SELECT USING (auth.uid() = user_id);

-- 관리자는 결제 설정 조회 가능
CREATE POLICY "Admins can view payment settings" ON payment_settings FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM auth.users 
        WHERE auth.uid() = id 
        AND raw_user_meta_data->>'role' = 'admin'
    )
);

-- 서비스 역할은 모든 작업 가능
CREATE POLICY "Service role can manage payment transactions" ON payment_transactions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role can manage refunds" ON refunds FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role can manage payment settings" ON payment_settings FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role can manage payment logs" ON payment_logs FOR ALL USING (auth.role() = 'service_role');