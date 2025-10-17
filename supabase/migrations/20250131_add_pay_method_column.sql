-- payment_orders 테이블에 pay_method 컬럼 추가
-- 생성일: 2025-01-31
-- 설명: 결제 방법 정보를 저장하기 위한 컬럼 추가

-- pay_method 컬럼 추가 (이미 존재하는 경우 무시)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'payment_orders' 
        AND column_name = 'pay_method'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE payment_orders 
        ADD COLUMN pay_method VARCHAR(50) DEFAULT 'card' 
        CHECK (pay_method IN ('card', 'kakaopay', 'naverpay', 'bank', 'phone'));
        
        -- 기존 레코드에 기본값 설정
        UPDATE payment_orders SET pay_method = 'card' WHERE pay_method IS NULL;
    END IF;
END $$;