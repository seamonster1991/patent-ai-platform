-- Insert initial data for admin dashboard
-- This migration creates initial admin user and sample data

-- Insert super admin user (password: admin123!)
-- Note: In production, this should be changed immediately
INSERT INTO admin_users (
    id,
    email,
    password_hash,
    name,
    role,
    is_active,
    two_fa_enabled,
    created_at
) VALUES (
    uuid_generate_v4(),
    'admin@patent-ai.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3bp.Gm.F5e', -- admin123!
    'Super Administrator',
    'super_admin',
    true,
    false,
    NOW()
) ON CONFLICT (email) DO NOTHING;

-- Insert sample regular admin user
INSERT INTO admin_users (
    id,
    email,
    password_hash,
    name,
    role,
    is_active,
    two_fa_enabled,
    created_at
) VALUES (
    uuid_generate_v4(),
    'operator@patent-ai.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3bp.Gm.F5e', -- admin123!
    'System Operator',
    'operator',
    true,
    false,
    NOW()
) ON CONFLICT (email) DO NOTHING;

-- Insert sample users for testing
INSERT INTO users (
    id,
    email,
    name,
    phone,
    company,
    job_title,
    country,
    is_active,
    is_verified,
    subscription_status,
    subscription_expires_at,
    api_calls_used,
    api_calls_limit,
    storage_used,
    storage_limit,
    created_at,
    last_login_at
) VALUES 
(
    uuid_generate_v4(),
    'john.doe@example.com',
    'John Doe',
    '+1-555-0123',
    'TechCorp Inc.',
    'Patent Attorney',
    'United States',
    true,
    true,
    'premium',
    NOW() + INTERVAL '30 days',
    450,
    1000,
    524288000, -- 500MB
    5368709120, -- 5GB
    NOW() - INTERVAL '15 days',
    NOW() - INTERVAL '2 hours'
),
(
    uuid_generate_v4(),
    'jane.smith@example.com',
    'Jane Smith',
    '+44-20-7946-0958',
    'Innovation Labs',
    'IP Manager',
    'United Kingdom',
    true,
    true,
    'enterprise',
    NOW() + INTERVAL '60 days',
    1250,
    5000,
    1073741824, -- 1GB
    10737418240, -- 10GB
    NOW() - INTERVAL '7 days',
    NOW() - INTERVAL '1 hour'
),
(
    uuid_generate_v4(),
    'mike.johnson@example.com',
    'Mike Johnson',
    '+49-30-12345678',
    'StartupXYZ',
    'Founder',
    'Germany',
    true,
    false,
    'trial',
    NOW() + INTERVAL '7 days',
    75,
    500,
    104857600, -- 100MB
    2147483648, -- 2GB
    NOW() - INTERVAL '3 days',
    NOW() - INTERVAL '30 minutes'
);

-- Insert sample payments
INSERT INTO payments (
    id,
    user_id,
    amount,
    currency,
    status,
    payment_method,
    stripe_payment_intent_id,
    description,
    created_at,
    completed_at
) VALUES 
(
    uuid_generate_v4(),
    (SELECT id FROM users WHERE email = 'john.doe@example.com'),
    29.99,
    'USD',
    'completed',
    'card',
    'pi_1234567890abcdef',
    'Premium Plan - Monthly Subscription',
    NOW() - INTERVAL '15 days',
    NOW() - INTERVAL '15 days'
),
(
    uuid_generate_v4(),
    (SELECT id FROM users WHERE email = 'jane.smith@example.com'),
    299.99,
    'USD',
    'completed',
    'card',
    'pi_abcdef1234567890',
    'Enterprise Plan - Yearly Subscription',
    NOW() - INTERVAL '7 days',
    NOW() - INTERVAL '7 days'
),
(
    uuid_generate_v4(),
    (SELECT id FROM users WHERE email = 'mike.johnson@example.com'),
    19.99,
    'USD',
    'pending',
    'card',
    'pi_pending123456789',
    'Premium Plan - Trial Upgrade',
    NOW() - INTERVAL '1 day',
    NULL
);

-- Insert sample subscriptions
INSERT INTO subscriptions (
    id,
    user_id,
    plan_name,
    status,
    current_period_start,
    current_period_end,
    cancel_at_period_end,
    stripe_subscription_id,
    api_calls_limit,
    storage_limit,
    price_per_month,
    billing_cycle,
    created_at
) VALUES 
(
    uuid_generate_v4(),
    (SELECT id FROM users WHERE email = 'john.doe@example.com'),
    'Premium',
    'active',
    NOW() - INTERVAL '15 days',
    NOW() + INTERVAL '15 days',
    false,
    'sub_premium123456789',
    1000,
    5368709120, -- 5GB
    29.99,
    'monthly',
    NOW() - INTERVAL '15 days'
),
(
    uuid_generate_v4(),
    (SELECT id FROM users WHERE email = 'jane.smith@example.com'),
    'Enterprise',
    'active',
    NOW() - INTERVAL '7 days',
    NOW() + INTERVAL '358 days',
    false,
    'sub_enterprise987654321',
    5000,
    10737418240, -- 10GB
    24.99,
    'yearly',
    NOW() - INTERVAL '7 days'
),
(
    uuid_generate_v4(),
    (SELECT id FROM users WHERE email = 'mike.johnson@example.com'),
    'Trial',
    'trialing',
    NOW() - INTERVAL '3 days',
    NOW() + INTERVAL '4 days',
    false,
    'sub_trial456789123',
    500,
    2147483648, -- 2GB
    0.00,
    'monthly',
    NOW() - INTERVAL '3 days'
);

-- Insert sample system metrics
INSERT INTO system_metrics (
    id,
    metric_type,
    metric_name,
    value,
    unit,
    tags,
    timestamp
) VALUES 
(
    uuid_generate_v4(),
    'performance',
    'cpu_usage',
    45.2,
    'percent',
    '{"server": "api-1", "region": "us-east-1"}',
    NOW() - INTERVAL '5 minutes'
),
(
    uuid_generate_v4(),
    'performance',
    'memory_usage',
    68.7,
    'percent',
    '{"server": "api-1", "region": "us-east-1"}',
    NOW() - INTERVAL '5 minutes'
),
(
    uuid_generate_v4(),
    'business',
    'active_users',
    1247,
    'count',
    '{"period": "daily"}',
    NOW() - INTERVAL '1 hour'
),
(
    uuid_generate_v4(),
    'business',
    'api_calls',
    15420,
    'count',
    '{"period": "hourly"}',
    NOW() - INTERVAL '1 hour'
);

-- Insert sample API logs
INSERT INTO api_logs (
    id,
    method,
    endpoint,
    status_code,
    response_time,
    user_id,
    ip_address,
    user_agent,
    request_size,
    response_size,
    timestamp
) VALUES 
(
    uuid_generate_v4(),
    'GET',
    '/api/patents/search',
    200,
    245.6,
    (SELECT id FROM users WHERE email = 'john.doe@example.com'),
    '192.168.1.100',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    1024,
    8192,
    NOW() - INTERVAL '10 minutes'
),
(
    uuid_generate_v4(),
    'POST',
    '/api/patents/analyze',
    200,
    1250.3,
    (SELECT id FROM users WHERE email = 'jane.smith@example.com'),
    '10.0.0.50',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    4096,
    16384,
    NOW() - INTERVAL '15 minutes'
),
(
    uuid_generate_v4(),
    'GET',
    '/api/user/profile',
    401,
    45.2,
    NULL,
    '203.0.113.42',
    'curl/7.68.0',
    512,
    256,
    NOW() - INTERVAL '5 minutes'
);

-- Insert sample admin logs
INSERT INTO admin_logs (
    id,
    admin_user_id,
    action,
    resource,
    resource_id,
    details,
    ip_address,
    user_agent,
    created_at
) VALUES 
(
    uuid_generate_v4(),
    (SELECT id FROM admin_users WHERE email = 'admin@patent-ai.com'),
    'user_created',
    'users',
    (SELECT id FROM users WHERE email = 'mike.johnson@example.com')::text,
    'Created new trial user account',
    '192.168.1.10',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    NOW() - INTERVAL '3 days'
),
(
    uuid_generate_v4(),
    (SELECT id FROM admin_users WHERE email = 'admin@patent-ai.com'),
    'subscription_updated',
    'subscriptions',
    (SELECT id FROM subscriptions WHERE plan_name = 'Enterprise')::text,
    'Updated enterprise subscription limits',
    '192.168.1.10',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    NOW() - INTERVAL '1 day'
),
(
    uuid_generate_v4(),
    (SELECT id FROM admin_users WHERE email = 'operator@patent-ai.com'),
    'system_maintenance',
    'system',
    NULL,
    'Performed routine system maintenance',
    '192.168.1.20',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
    NOW() - INTERVAL '6 hours'
);