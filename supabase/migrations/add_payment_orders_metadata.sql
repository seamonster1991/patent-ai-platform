-- Add missing columns to payment_orders table for tracking request metadata
-- These columns are required by the NicePay API handler

ALTER TABLE payment_orders 
ADD COLUMN IF NOT EXISTS ip_address TEXT,
ADD COLUMN IF NOT EXISTS user_agent TEXT,
ADD COLUMN IF NOT EXISTS signature TEXT;

-- Add indexes for better performance on these new columns
CREATE INDEX IF NOT EXISTS idx_payment_orders_ip_address ON payment_orders(ip_address);
CREATE INDEX IF NOT EXISTS idx_payment_orders_created_at ON payment_orders(created_at);

-- Add comment to document the purpose of these columns
COMMENT ON COLUMN payment_orders.ip_address IS 'Client IP address for security tracking';
COMMENT ON COLUMN payment_orders.user_agent IS 'Client user agent for security tracking';
COMMENT ON COLUMN payment_orders.signature IS 'Payment signature for verification';