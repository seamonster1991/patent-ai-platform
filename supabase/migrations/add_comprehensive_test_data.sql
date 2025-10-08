-- Add comprehensive test data for dashboard testing - Updated
-- This migration adds more realistic test data for the test user
-- This migration adds more realistic test data for the test user

-- First, ensure we have the test user
INSERT INTO users (id, email, name, subscription_plan, last_login_at, created_at, updated_at)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'test@example.com',
  'Test User',
  'premium',
  NOW() - INTERVAL '1 hour',
  NOW() - INTERVAL '30 days',
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  subscription_plan = EXCLUDED.subscription_plan,
  last_login_at = EXCLUDED.last_login_at,
  updated_at = EXCLUDED.updated_at;

-- Add search history data
INSERT INTO search_history (id, user_id, keyword, technology_field, ipc_codes, results_count, created_at) VALUES
-- Recent searches (last 7 days)
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'artificial intelligence patent', 'Artificial Intelligence', ARRAY['G06N'], 45, NOW() - INTERVAL '1 day'),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'machine learning algorithm', 'Machine Learning', ARRAY['G06N'], 32, NOW() - INTERVAL '2 days'),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'neural network architecture', 'AI/ML', ARRAY['G06N'], 28, NOW() - INTERVAL '3 days'),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'blockchain technology', 'Blockchain', ARRAY['H04L'], 19, NOW() - INTERVAL '4 days'),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'renewable energy storage', 'Energy', ARRAY['H02S'], 41, NOW() - INTERVAL '5 days'),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'quantum computing', 'Quantum Technology', ARRAY['G06N'], 15, NOW() - INTERVAL '6 days'),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'autonomous vehicle', 'Transportation', ARRAY['B60W'], 37, NOW() - INTERVAL '7 days'),

-- Older searches (last 30 days)
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'biotechnology innovation', 'Biotechnology', ARRAY['C12N'], 23, NOW() - INTERVAL '10 days'),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'semiconductor device', 'Electronics', ARRAY['H01L'], 52, NOW() - INTERVAL '12 days'),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'medical device patent', 'Medical Technology', ARRAY['A61B'], 34, NOW() - INTERVAL '15 days'),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'wireless communication', 'Telecommunications', ARRAY['H04W'], 29, NOW() - INTERVAL '18 days'),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'pharmaceutical composition', 'Pharmaceuticals', ARRAY['A61K'], 46, NOW() - INTERVAL '20 days'),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'solar panel efficiency', 'Energy', ARRAY['H02S'], 31, NOW() - INTERVAL '22 days'),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'data encryption method', 'Cybersecurity', ARRAY['H04L'], 18, NOW() - INTERVAL '25 days'),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'robotic automation', 'Robotics', ARRAY['B25J'], 26, NOW() - INTERVAL '28 days');

-- Add AI analysis reports
INSERT INTO ai_analysis_reports (id, user_id, application_number, invention_title, report_name, analysis_type, created_at) VALUES
-- Recent reports (last 7 days)
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'US20240001234', 'Advanced Neural Network Architecture for Image Recognition', 'AI Patent Analysis Report', 'novelty_analysis', NOW() - INTERVAL '1 day'),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'US20240001235', 'Blockchain-Based Supply Chain Management System', 'Blockchain Technology Report', 'prior_art_search', NOW() - INTERVAL '2 days'),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'US20240001236', 'Quantum Computing Algorithm for Optimization', 'Quantum Tech Analysis', 'patentability_analysis', NOW() - INTERVAL '3 days'),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'US20240001237', 'Autonomous Vehicle Navigation System', 'Transportation Innovation Report', 'freedom_to_operate', NOW() - INTERVAL '4 days'),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'US20240001238', 'Renewable Energy Storage Device', 'Energy Technology Report', 'novelty_analysis', NOW() - INTERVAL '5 days'),

-- Older reports (last 30 days)
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'US20240001239', 'Medical Diagnostic AI System', 'Medical AI Analysis', 'prior_art_search', NOW() - INTERVAL '8 days'),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'US20240001240', 'Semiconductor Manufacturing Process', 'Electronics Patent Report', 'patentability_analysis', NOW() - INTERVAL '11 days'),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'US20240001241', 'Biotechnology Gene Therapy Method', 'Biotech Innovation Report', 'freedom_to_operate', NOW() - INTERVAL '14 days'),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'US20240001242', 'Wireless 5G Communication Protocol', 'Telecom Technology Report', 'novelty_analysis', NOW() - INTERVAL '17 days'),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'US20240001243', 'Pharmaceutical Drug Delivery System', 'Pharma Patent Analysis', 'prior_art_search', NOW() - INTERVAL '19 days'),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'US20240001244', 'Robotic Assembly Line System', 'Robotics Innovation Report', 'patentability_analysis', NOW() - INTERVAL '23 days'),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'US20240001245', 'Cybersecurity Threat Detection', 'Security Technology Report', 'freedom_to_operate', NOW() - INTERVAL '26 days');

-- Add user activities (login records)
INSERT INTO user_activities (id, user_id, activity_type, activity_data, created_at) VALUES
-- Recent logins (last 7 days)
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'login', '{"ip_address": "192.168.1.100", "user_agent": "Mozilla/5.0"}', NOW() - INTERVAL '1 hour'),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'login', '{"ip_address": "192.168.1.100", "user_agent": "Mozilla/5.0"}', NOW() - INTERVAL '1 day'),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'login', '{"ip_address": "192.168.1.100", "user_agent": "Mozilla/5.0"}', NOW() - INTERVAL '2 days'),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'login', '{"ip_address": "192.168.1.100", "user_agent": "Mozilla/5.0"}', NOW() - INTERVAL '3 days'),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'login', '{"ip_address": "192.168.1.100", "user_agent": "Mozilla/5.0"}', NOW() - INTERVAL '4 days'),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'login', '{"ip_address": "192.168.1.100", "user_agent": "Mozilla/5.0"}', NOW() - INTERVAL '5 days'),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'login', '{"ip_address": "192.168.1.100", "user_agent": "Mozilla/5.0"}', NOW() - INTERVAL '6 days'),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'login', '{"ip_address": "192.168.1.100", "user_agent": "Mozilla/5.0"}', NOW() - INTERVAL '7 days'),

-- Older logins (last 30 days)
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'login', '{"ip_address": "192.168.1.100", "user_agent": "Mozilla/5.0"}', NOW() - INTERVAL '10 days'),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'login', '{"ip_address": "192.168.1.100", "user_agent": "Mozilla/5.0"}', NOW() - INTERVAL '12 days'),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'login', '{"ip_address": "192.168.1.100", "user_agent": "Mozilla/5.0"}', NOW() - INTERVAL '15 days'),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'login', '{"ip_address": "192.168.1.100", "user_agent": "Mozilla/5.0"}', NOW() - INTERVAL '18 days'),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'login', '{"ip_address": "192.168.1.100", "user_agent": "Mozilla/5.0"}', NOW() - INTERVAL '20 days'),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'login', '{"ip_address": "192.168.1.100", "user_agent": "Mozilla/5.0"}', NOW() - INTERVAL '22 days'),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'login', '{"ip_address": "192.168.1.100", "user_agent": "Mozilla/5.0"}', NOW() - INTERVAL '25 days'),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'login', '{"ip_address": "192.168.1.100", "user_agent": "Mozilla/5.0"}', NOW() - INTERVAL '28 days');

-- Add some additional activities for variety
INSERT INTO user_activities (id, user_id, activity_type, activity_data, created_at) VALUES
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'search', '{"query": "artificial intelligence", "results": 45}', NOW() - INTERVAL '1 day'),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'report_generated', '{"report_id": "US20240001234", "type": "novelty_analysis"}', NOW() - INTERVAL '1 day'),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'search', '{"query": "machine learning", "results": 32}', NOW() - INTERVAL '2 days'),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'report_generated', '{"report_id": "US20240001235", "type": "prior_art_search"}', NOW() - INTERVAL '2 days');