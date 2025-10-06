-- seongwankim@gmail.com 사용자만 생성
INSERT INTO users (id, email, name, subscription_plan, total_searches, total_detail_views, total_logins, total_usage_cost, last_login_at, created_at, updated_at)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'seongwankim@gmail.com',
  '김성완',
  'premium',
  25,
  15,
  12,
  150.50,
  NOW(),
  NOW() - INTERVAL '30 days',
  NOW()
)
ON CONFLICT (email) 
DO UPDATE SET 
  id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  total_searches = 25,
  total_detail_views = 15,
  total_logins = 12,
  total_usage_cost = 150.50,
  last_login_at = NOW(),
  updated_at = NOW()