-- Add pay_method column to payment_orders table
-- This column will store the payment method used for each order

ALTER TABLE payment_orders 
ADD COLUMN pay_method TEXT DEFAULT 'card' CHECK (pay_method IN ('card', 'kakaopay', 'naverpay', 'bank'));

-- Add comment for documentation
COMMENT ON COLUMN payment_orders.pay_method IS 'Payment method used for the order (card, kakaopay, naverpay, bank)';

-- Update existing records to have default payment method
UPDATE payment_orders 
SET pay_method = 'card' 
WHERE pay_method IS NULL;

-- Make the column NOT NULL after setting default values
ALTER TABLE payment_orders 
ALTER COLUMN pay_method SET NOT NULL;