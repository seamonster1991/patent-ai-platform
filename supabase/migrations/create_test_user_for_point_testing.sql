-- Create test user for point deduction testing
INSERT INTO users (id, email, name, subscription_plan, role) 
VALUES (
  '12345678-90ab-cdef-1234-567890abcdef',
  'test@test.com',
  'Test User',
  'premium',
  'user'
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  subscription_plan = EXCLUDED.subscription_plan,
  role = EXCLUDED.role;

-- Create or update point balance for test user
INSERT INTO user_point_balances (user_id, current_balance) 
VALUES (
  '12345678-90ab-cdef-1234-567890abcdef',
  1000
) ON CONFLICT (user_id) DO UPDATE SET
  current_balance = 1000,
  last_updated = NOW();