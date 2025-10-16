-- NicePay 결제시스템 완전 통합 스키마
-- 결제 주문, 거래, 환불 테이블 및 관련 함수 생성

-- 1. 기존 payment_orders 테이블 확장
-- 새로운 컬럼 추가
ALTER TABLE payment_orders 
ADD COLUMN IF NOT EXISTS product_type VARCHAR(20) DEFAULT 'points' CHECK (product_type IN ('points', 'subscription')),
ADD COLUMN IF NOT EXISTS product_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS amount INTEGER,
ADD COLUMN IF NOT EXISTS pay_method VARCHAR(20) DEFAULT 'CARD',
ADD COLUMN IF NOT EXISTS signature VARCHAR(255),
ADD COLUMN IF NOT EXISTS client_data JSONB,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 기존 컬럼 매핑 및 업데이트
UPDATE payment_orders SET 
    amount = amount_krw,
    product_type = CASE 
        WHEN payment_type = 'monthly' THEN 'subscription'
        WHEN payment_type = 'addon' THEN 'points'
        ELSE 'points'
    END,
    product_id = CASE 
        WHEN payment_type = 'monthly' THEN 'subscription_basic'
        WHEN payment_type = 'addon' THEN 'points_' || amount_krw::text
        ELSE 'points_1000'
    END
WHERE amount IS NULL OR product_type IS NULL OR product_id IS NULL;

-- 기존 status 제약조건 업데이트
ALTER TABLE payment_orders DROP CONSTRAINT IF EXISTS payment_orders_status_check;
ALTER TABLE payment_orders ADD CONSTRAINT payment_orders_status_check 
    CHECK (status IN ('pending', 'completed', 'failed', 'cancelled', 'refunded'));

-- 2. 결제 거래 테이블 (payment_transactions)
CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES payment_orders(id) ON DELETE CASCADE,
    tid VARCHAR(50) UNIQUE NOT NULL,
    pay_method VARCHAR(20) NOT NULL,
    amount INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'failed', 'cancelled', 'refunded')),
    result_code VARCHAR(10),
    result_msg TEXT,
    card_name VARCHAR(50),
    card_num VARCHAR(20),
    bank_name VARCHAR(50),
    nicepay_response JSONB,
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 환불 테이블 (refunds)
CREATE TABLE IF NOT EXISTS refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES payment_transactions(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES payment_orders(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    refund_amount INTEGER NOT NULL CHECK (refund_amount > 0),
    reason TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'failed')),
    admin_id UUID REFERENCES auth.users(id),
    admin_note TEXT,
    nicepay_cancel_tid VARCHAR(50),
    nicepay_response JSONB,
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 4. 결제 상품 테이블 (payment_products)
CREATE TABLE IF NOT EXISTS payment_products (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('points', 'subscription')),
    price INTEGER NOT NULL CHECK (price > 0),
    points INTEGER DEFAULT 0,
    bonus_points INTEGER DEFAULT 0,
    duration_months INTEGER DEFAULT 0,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. 결제 로그 테이블 (payment_logs)
CREATE TABLE IF NOT EXISTS payment_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id VARCHAR(50),
    transaction_id UUID,
    event_type VARCHAR(50) NOT NULL,
    event_data JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_payment_orders_user_id ON payment_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_order_id ON payment_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_status ON payment_orders(status);
CREATE INDEX IF NOT EXISTS idx_payment_orders_created_at ON payment_orders(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_order_id ON payment_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_tid ON payment_transactions(tid);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_created_at ON payment_transactions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_refunds_transaction_id ON refunds(transaction_id);
CREATE INDEX IF NOT EXISTS idx_refunds_order_id ON refunds(order_id);
CREATE INDEX IF NOT EXISTS idx_refunds_user_id ON refunds(user_id);
CREATE INDEX IF NOT EXISTS idx_refunds_status ON refunds(status);
CREATE INDEX IF NOT EXISTS idx_refunds_requested_at ON refunds(requested_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_products_type ON payment_products(type);
CREATE INDEX IF NOT EXISTS idx_payment_products_is_active ON payment_products(is_active);
CREATE INDEX IF NOT EXISTS idx_payment_products_display_order ON payment_products(display_order);

CREATE INDEX IF NOT EXISTS idx_payment_logs_order_id ON payment_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_logs_event_type ON payment_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_payment_logs_created_at ON payment_logs(created_at DESC);

-- RLS 정책 설정
ALTER TABLE payment_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_logs ENABLE ROW LEVEL SECURITY;

-- payment_orders 정책
DROP POLICY IF EXISTS "Users can view own payment orders" ON payment_orders;
CREATE POLICY "Users can view own payment orders" ON payment_orders
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own payment orders" ON payment_orders;
CREATE POLICY "Users can insert own payment orders" ON payment_orders
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage all payment orders" ON payment_orders;
CREATE POLICY "Service role can manage all payment orders" ON payment_orders
    FOR ALL USING (auth.role() = 'service_role');

-- payment_transactions 정책
DROP POLICY IF EXISTS "Users can view own payment transactions" ON payment_transactions;
CREATE POLICY "Users can view own payment transactions" ON payment_transactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM payment_orders 
            WHERE payment_orders.id = payment_transactions.order_id 
            AND payment_orders.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Service role can manage all payment transactions" ON payment_transactions;
CREATE POLICY "Service role can manage all payment transactions" ON payment_transactions
    FOR ALL USING (auth.role() = 'service_role');

-- refunds 정책
DROP POLICY IF EXISTS "Users can view own refunds" ON refunds;
CREATE POLICY "Users can view own refunds" ON refunds
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can request refunds" ON refunds;
CREATE POLICY "Users can request refunds" ON refunds
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage all refunds" ON refunds;
CREATE POLICY "Service role can manage all refunds" ON refunds
    FOR ALL USING (auth.role() = 'service_role');

-- payment_products 정책 (모든 사용자가 조회 가능)
DROP POLICY IF EXISTS "Anyone can view active payment products" ON payment_products;
CREATE POLICY "Anyone can view active payment products" ON payment_products
    FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Service role can manage payment products" ON payment_products;
CREATE POLICY "Service role can manage payment products" ON payment_products
    FOR ALL USING (auth.role() = 'service_role');

-- payment_logs 정책 (서비스 역할만 접근)
DROP POLICY IF EXISTS "Service role can manage payment logs" ON payment_logs;
CREATE POLICY "Service role can manage payment logs" ON payment_logs
    FOR ALL USING (auth.role() = 'service_role');

-- 권한 부여
GRANT SELECT ON payment_orders TO anon;
GRANT ALL PRIVILEGES ON payment_orders TO authenticated;
GRANT SELECT ON payment_transactions TO anon;
GRANT ALL PRIVILEGES ON payment_transactions TO authenticated;
GRANT SELECT ON refunds TO anon;
GRANT ALL PRIVILEGES ON refunds TO authenticated;
GRANT SELECT ON payment_products TO anon;
GRANT ALL PRIVILEGES ON payment_products TO authenticated;
GRANT SELECT ON payment_logs TO anon;
GRANT ALL PRIVILEGES ON payment_logs TO authenticated;

-- 초기 상품 데이터 삽입
INSERT INTO payment_products (id, name, type, price, points, bonus_points, description, display_order) VALUES
('points_1000', '1,000 포인트', 'points', 1000, 1000, 100, '기본 포인트 패키지 (10% 보너스)', 1),
('points_5000', '5,000 포인트', 'points', 5000, 5000, 500, '인기 포인트 패키지 (10% 보너스)', 2),
('points_10000', '10,000 포인트', 'points', 10000, 10000, 1000, '대용량 포인트 패키지 (10% 보너스)', 3),
('points_30000', '30,000 포인트', 'points', 30000, 30000, 3000, '프리미엄 포인트 패키지 (10% 보너스)', 4),
('subscription_basic', '베이직 구독', 'subscription', 9900, 5000, 0, '월 베이직 구독 플랜 (5,000P 지급)', 5),
('subscription_premium', '프리미엄 구독', 'subscription', 19900, 15000, 0, '월 프리미엄 구독 플랜 (15,000P 지급)', 6),
('subscription_enterprise', '엔터프라이즈 구독', 'subscription', 39900, 30000, 0, '월 엔터프라이즈 구독 플랜 (30,000P 지급)', 7)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    price = EXCLUDED.price,
    points = EXCLUDED.points,
    bonus_points = EXCLUDED.bonus_points,
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order,
    updated_at = NOW();

-- 업데이트 트리거 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 업데이트 트리거 생성
DROP TRIGGER IF EXISTS update_payment_orders_updated_at ON payment_orders;
CREATE TRIGGER update_payment_orders_updated_at
    BEFORE UPDATE ON payment_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payment_transactions_updated_at ON payment_transactions;
CREATE TRIGGER update_payment_transactions_updated_at
    BEFORE UPDATE ON payment_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payment_products_updated_at ON payment_products;
CREATE TRIGGER update_payment_products_updated_at
    BEFORE UPDATE ON payment_products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();