-- Add missing currency column to payment_orders table
ALTER TABLE payment_orders 
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'KRW' CHECK (currency IN ('KRW', 'USD', 'EUR'));

-- Update existing records to have KRW currency
UPDATE payment_orders SET currency = 'KRW' WHERE currency IS NULL;