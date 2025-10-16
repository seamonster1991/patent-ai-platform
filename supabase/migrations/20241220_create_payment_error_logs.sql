-- Create payment_error_logs table for comprehensive error tracking
CREATE TABLE IF NOT EXISTS payment_error_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    error_id VARCHAR(255) NOT NULL UNIQUE,
    error_type VARCHAR(100) NOT NULL CHECK (error_type IN (
        'VALIDATION_ERROR',
        'NETWORK_ERROR', 
        'GATEWAY_ERROR',
        'DATABASE_ERROR',
        'AUTHENTICATION_ERROR',
        'AUTHORIZATION_ERROR',
        'RATE_LIMIT_ERROR',
        'TIMEOUT_ERROR',
        'SIGNATURE_ERROR',
        'CONFIGURATION_ERROR',
        'SYSTEM_ERROR'
    )),
    error_severity VARCHAR(50) NOT NULL CHECK (error_severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    error_message TEXT NOT NULL,
    error_details JSONB,
    stack_trace TEXT,
    user_id UUID REFERENCES auth.users(id),
    payment_order_id UUID REFERENCES payment_orders(id),
    transaction_id VARCHAR(255),
    endpoint VARCHAR(255),
    request_method VARCHAR(10),
    request_data JSONB,
    response_data JSONB,
    user_agent TEXT,
    ip_address INET,
    session_id VARCHAR(255),
    retry_count INTEGER DEFAULT 0,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES auth.users(id),
    resolution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_payment_error_logs_error_type ON payment_error_logs(error_type);
CREATE INDEX IF NOT EXISTS idx_payment_error_logs_error_severity ON payment_error_logs(error_severity);
CREATE INDEX IF NOT EXISTS idx_payment_error_logs_user_id ON payment_error_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_error_logs_payment_order_id ON payment_error_logs(payment_order_id);
CREATE INDEX IF NOT EXISTS idx_payment_error_logs_transaction_id ON payment_error_logs(transaction_id);
CREATE INDEX IF NOT EXISTS idx_payment_error_logs_created_at ON payment_error_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_payment_error_logs_resolved ON payment_error_logs(resolved);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_payment_error_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_payment_error_logs_updated_at
    BEFORE UPDATE ON payment_error_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_error_logs_updated_at();

-- Enable RLS
ALTER TABLE payment_error_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own payment error logs" ON payment_error_logs
    FOR SELECT USING (auth.uid() = user_id);

-- Allow system to insert error logs
CREATE POLICY "System can insert payment error logs" ON payment_error_logs
    FOR INSERT WITH CHECK (true);

-- Allow authenticated users to view all error logs (for admin purposes)
CREATE POLICY "Authenticated users can view all payment error logs" ON payment_error_logs
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Allow authenticated users to update error logs (for admin purposes)
CREATE POLICY "Authenticated users can update payment error logs" ON payment_error_logs
    FOR UPDATE USING (auth.uid() IS NOT NULL);