-- NicePay 결제시스템 통합 데이터베이스 스키마 (Enhanced Version)
-- 생성일: 2024-01-15
-- 업데이트: 2024-01-15
-- 설명: 결제 주문, 거래, 환불 관리를 위한 포괄적인 테이블 구조

-- 1. 결제 주문 테이블 (payment_orders) - Enhanced
-- 결제 요청 시 생성되는 주문 정보를 저장
CREATE TABLE IF NOT EXISTS payment_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id VARCHAR(100) UNIQUE NOT NULL, -- NicePay 주문 ID
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- 상품 정보
    product_type VARCHAR(20) NOT NULL CHECK (product_type IN ('points', 'subscription')),
    product_id VARCHAR(50), -- 상품 식별자 (예: points_1000, premium_monthly)
    goods_name VARCHAR(200) NOT NULL, -- 상품명
    
    -- 금액 정보
    amount INTEGER NOT NULL CHECK (amount > 0), -- 결제 금액 (원)
    currency VARCHAR(3) DEFAULT 'KRW',
    
    -- 결제 수단
    pay_method VARCHAR(20) NOT NULL CHECK (pay_method IN ('CARD', 'BANK', 'VBANK', 'MOBILE')),
    
    -- 주문 상태
    status VARCHAR(20) NOT NULL DEFAULT 'pending' 
        CHECK (status IN ('pending', 'approved', 'failed', 'cancelled', 'refunded')),
    
    -- NicePay 관련 정보
    transaction_id VARCHAR(100), -- NicePay 거래 ID (tid)
    client_id VARCHAR(100), -- NicePay 클라이언트 ID
    signature VARCHAR(500), -- 결제 서명
    
    -- 메타데이터
    payment_data JSONB, -- NicePay 응답 데이터
    user_agent TEXT, -- 사용자 브라우저 정보
    ip_address INET, -- 결제 요청 IP
    
    -- 타임스탬프
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 결제 거래 테이블 (payment_transactions) - Enhanced
-- 실제 결제 승인/실패 내역을 저장
CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id VARCHAR(100) NOT NULL REFERENCES payment_orders(order_id) ON DELETE CASCADE,
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

-- 3. 환불 테이블 (refunds)
-- 환불 요청 및 처리 내역을 저장
CREATE TABLE IF NOT EXISTS refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    refund_id VARCHAR(100) UNIQUE NOT NULL, -- 환불 고유 ID
    
    -- 원본 거래 정보
    original_transaction_id VARCHAR(100) NOT NULL REFERENCES payment_transactions(transaction_id),
    original_order_id VARCHAR(100) NOT NULL,
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

-- 4. 결제 설정 테이블 (payment_settings)
-- 시스템 결제 설정을 저장
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

-- 5. 결제 로그 테이블 (payment_logs)
-- 결제 관련 모든 이벤트를 로깅
CREATE TABLE IF NOT EXISTS payment_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id VARCHAR(100),
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

-- 인덱스 생성
-- payment_orders 인덱스
CREATE INDEX IF NOT EXISTS idx_payment_orders_user_id ON payment_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_status ON payment_orders(status);
CREATE INDEX IF NOT EXISTS idx_payment_orders_created_at ON payment_orders(created_at);
CREATE INDEX IF NOT EXISTS idx_payment_orders_order_id ON payment_orders(order_id);

-- payment_transactions 인덱스
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_order_id ON payment_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_created_at ON payment_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_transaction_id ON payment_transactions(transaction_id);

-- refunds 인덱스
CREATE INDEX IF NOT EXISTS idx_refunds_user_id ON refunds(user_id);
CREATE INDEX IF NOT EXISTS idx_refunds_original_transaction_id ON refunds(original_transaction_id);
CREATE INDEX IF NOT EXISTS idx_refunds_status ON refunds(status);
CREATE INDEX IF NOT EXISTS idx_refunds_created_at ON refunds(created_at);

-- payment_logs 인덱스
CREATE INDEX IF NOT EXISTS idx_payment_logs_order_id ON payment_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_logs_transaction_id ON payment_logs(transaction_id);
CREATE INDEX IF NOT EXISTS idx_payment_logs_user_id ON payment_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_logs_event_type ON payment_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_payment_logs_created_at ON payment_logs(created_at);

-- 트리거 함수: updated_at 자동 업데이트
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 트리거 생성
CREATE TRIGGER update_payment_orders_updated_at BEFORE UPDATE ON payment_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payment_transactions_updated_at BEFORE UPDATE ON payment_transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_refunds_updated_at BEFORE UPDATE ON refunds FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payment_settings_updated_at BEFORE UPDATE ON payment_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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
ALTER TABLE payment_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 결제 정보만 조회 가능
CREATE POLICY "Users can view own payment orders" ON payment_orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own payment transactions" ON payment_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own refunds" ON refunds FOR SELECT USING (auth.uid() = user_id);

-- 관리자는 모든 결제 정보 조회 가능 (별도 관리자 정책 필요)
-- 서비스 역할은 모든 작업 가능
CREATE POLICY "Service role can manage payment orders" ON payment_orders FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role can manage payment transactions" ON payment_transactions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role can manage refunds" ON refunds FOR ALL USING (auth.role() = 'service_role');

-- 결제 통계를 위한 뷰 생성
CREATE OR REPLACE VIEW payment_statistics AS
SELECT 
    DATE_TRUNC('day', created_at) as date,
    COUNT(*) as total_orders,
    COUNT(CASE WHEN status = 'approved' THEN 1 END) as successful_orders,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_orders,
    SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END) as total_revenue,
    AVG(CASE WHEN status = 'approved' THEN amount END) as avg_order_value
FROM payment_orders
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date DESC;

-- 사용자별 결제 요약을 위한 뷰 생성
CREATE OR REPLACE VIEW user_payment_summary AS
SELECT 
    user_id,
    COUNT(*) as total_orders,
    COUNT(CASE WHEN status = 'approved' THEN 1 END) as successful_orders,
    SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END) as total_spent,
    MAX(created_at) as last_payment_date,
    MIN(created_at) as first_payment_date
FROM payment_orders
GROUP BY user_id;

COMMENT ON TABLE payment_orders IS 'NicePay 결제 주문 정보를 저장하는 테이블';
COMMENT ON TABLE payment_transactions IS 'NicePay 결제 거래 내역을 저장하는 테이블';
COMMENT ON TABLE refunds IS '환불 요청 및 처리 내역을 저장하는 테이블';
COMMENT ON TABLE payment_settings IS '결제 시스템 설정을 저장하는 테이블';
COMMENT ON TABLE payment_logs IS '결제 관련 모든 이벤트 로그를 저장하는 테이블';