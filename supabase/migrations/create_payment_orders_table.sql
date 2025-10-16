-- 나이스페이 결제 주문 테이블 생성
-- 결제 전 주문 정보를 저장하는 테이블

CREATE TABLE IF NOT EXISTS payment_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id TEXT NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount_krw INTEGER NOT NULL,
    payment_type TEXT NOT NULL CHECK (payment_type IN ('monthly', 'addon')),
    goods_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    payment_id TEXT, -- 나이스페이 TID
    nicepay_data JSONB, -- 나이스페이 응답 데이터
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_payment_orders_order_id ON payment_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_user_id ON payment_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_status ON payment_orders(status);
CREATE INDEX IF NOT EXISTS idx_payment_orders_payment_id ON payment_orders(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_created_at ON payment_orders(created_at DESC);

-- Row Level Security 활성화
ALTER TABLE payment_orders ENABLE ROW LEVEL SECURITY;

-- 정책: 사용자는 자신의 주문만 조회 가능
DROP POLICY IF EXISTS "Users can view own orders" ON payment_orders;
CREATE POLICY "Users can view own orders" ON payment_orders
    FOR SELECT USING (auth.uid() = user_id);

-- 정책: 사용자는 자신의 주문만 생성 가능
DROP POLICY IF EXISTS "Users can create own orders" ON payment_orders;
CREATE POLICY "Users can create own orders" ON payment_orders
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 정책: 서비스 역할은 모든 주문 관리 가능
DROP POLICY IF EXISTS "Service role can manage all orders" ON payment_orders;
CREATE POLICY "Service role can manage all orders" ON payment_orders
    FOR ALL USING (auth.role() = 'service_role');

-- 권한 부여
GRANT SELECT ON payment_orders TO anon;
GRANT ALL PRIVILEGES ON payment_orders TO authenticated;

-- 완료 메시지
DO $$
BEGIN
    RAISE NOTICE 'payment_orders 테이블이 성공적으로 생성되었습니다.';
END $$;