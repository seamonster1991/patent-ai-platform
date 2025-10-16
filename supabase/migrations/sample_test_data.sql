-- Sample test data for IPC/CPC analysis dashboard testing
-- This script creates test users and realistic search history and report data with proper technology field classifications

-- Define test user UUIDs
-- Test user: 12345678-1234-1234-1234-123456789012
-- Market users: 87654321-4321-4321-4321-210987654321, 11111111-2222-3333-4444-555555555555, 22222222-3333-4444-5555-666666666666

-- First, create test users
INSERT INTO users (
    id,
    email,
    name,
    subscription_plan,
    role,
    company,
    created_at
) VALUES 
('12345678-1234-1234-1234-123456789012', 'test.user@example.com', 'Test User', 'premium', 'user', 'Test Company', NOW() - INTERVAL '30 days'),
('87654321-4321-4321-4321-210987654321', 'market.user1@example.com', 'Market User 1', 'free', 'user', 'Market Company 1', NOW() - INTERVAL '60 days'),
('11111111-2222-3333-4444-555555555555', 'market.user2@example.com', 'Market User 2', 'premium', 'user', 'Market Company 2', NOW() - INTERVAL '45 days'),
('22222222-3333-4444-5555-666666666666', 'market.user3@example.com', 'Market User 3', 'free', 'user', 'Market Company 3', NOW() - INTERVAL '20 days')
ON CONFLICT (id) DO NOTHING;

-- Insert sample search history data
INSERT INTO search_history (
    user_id, 
    keyword, 
    results_count, 
    technology_field, 
    field_confidence, 
    ipc_codes, 
    created_at
) VALUES 
-- AI/Machine Learning searches
('12345678-1234-1234-1234-123456789012', 'artificial intelligence patent search', 156, 'AI', 0.95, ARRAY['G06N3/02', 'G06N3/08', 'G06F17/30'], NOW() - INTERVAL '1 hour'),
('12345678-1234-1234-1234-123456789012', 'machine learning algorithm', 89, 'AI', 0.92, ARRAY['G06N20/00', 'G06N3/04'], NOW() - INTERVAL '3 hours'),
('12345678-1234-1234-1234-123456789012', 'neural network optimization', 67, 'AI', 0.88, ARRAY['G06N3/08', 'G06N3/04'], NOW() - INTERVAL '1 day'),

-- IoT/Communication searches  
('12345678-1234-1234-1234-123456789012', 'IoT sensor network', 134, 'IoT', 0.91, ARRAY['H04L12/28', 'H04W4/38', 'G08C17/02'], NOW() - INTERVAL '2 hours'),
('12345678-1234-1234-1234-123456789012', '5G wireless communication', 203, '통신', 0.94, ARRAY['H04W72/04', 'H04B7/26'], NOW() - INTERVAL '5 hours'),
('12345678-1234-1234-1234-123456789012', 'smart home automation', 78, 'IoT', 0.87, ARRAY['H04L12/28', 'G05B15/02'], NOW() - INTERVAL '2 days'),

-- Semiconductor searches
('12345678-1234-1234-1234-123456789012', 'semiconductor manufacturing process', 145, '반도체', 0.93, ARRAY['H01L21/02', 'H01L21/67'], NOW() - INTERVAL '4 hours'),
('12345678-1234-1234-1234-123456789012', 'CMOS image sensor', 92, '반도체', 0.89, ARRAY['H01L27/146', 'H04N5/374'], NOW() - INTERVAL '1 day'),

-- Biotechnology searches
('12345678-1234-1234-1234-123456789012', 'gene therapy delivery', 56, '바이오', 0.86, ARRAY['A61K48/00', 'C12N15/87'], NOW() - INTERVAL '6 hours'),
('12345678-1234-1234-1234-123456789012', 'protein folding prediction', 43, '바이오', 0.84, ARRAY['G16B15/30', 'C07K1/00'], NOW() - INTERVAL '3 days'),

-- Transportation searches
('12345678-1234-1234-1234-123456789012', 'autonomous vehicle navigation', 167, '교통', 0.92, ARRAY['B60W30/095', 'G05D1/02'], NOW() - INTERVAL '7 hours'),
('12345678-1234-1234-1234-123456789012', 'electric vehicle battery', 198, '에너지', 0.90, ARRAY['H01M10/0525', 'B60L50/64'], NOW() - INTERVAL '1 day'),

-- Blockchain searches
('12345678-1234-1234-1234-123456789012', 'blockchain consensus algorithm', 34, '블록체인', 0.85, ARRAY['H04L9/06', 'G06Q20/38'], NOW() - INTERVAL '8 hours'),

-- Materials science searches
('12345678-1234-1234-1234-123456789012', 'carbon nanotube synthesis', 76, '소재', 0.88, ARRAY['C01B32/158', 'B82Y30/00'], NOW() - INTERVAL '2 days');

-- Insert sample AI analysis reports data
INSERT INTO ai_analysis_reports (
    user_id,
    report_name,
    invention_title,
    application_number,
    technology_field,
    field_confidence,
    ipc_codes,
    created_at
) VALUES
-- AI/ML reports
('12345678-1234-1234-1234-123456789012', 'AI Patent Analysis Report - Deep Learning', 'Deep Learning Neural Network Architecture for Image Recognition', 'US20230123456A1', 'AI', 0.96, ARRAY['G06N3/08', 'G06T7/00', 'G06V10/82'], NOW() - INTERVAL '30 minutes'),
('12345678-1234-1234-1234-123456789012', 'Machine Learning Patent Landscape', 'Reinforcement Learning System for Autonomous Decision Making', 'US20230234567A1', 'AI', 0.94, ARRAY['G06N20/00', 'G06N3/04'], NOW() - INTERVAL '2 hours'),

-- IoT reports
('12345678-1234-1234-1234-123456789012', 'IoT Innovation Analysis', 'Smart Sensor Network for Industrial Monitoring', 'US20230345678A1', 'IoT', 0.93, ARRAY['H04L12/28', 'G08C17/02', 'H04W4/38'], NOW() - INTERVAL '1 hour'),
('12345678-1234-1234-1234-123456789012', 'Connected Device Patent Study', 'Wireless Communication Protocol for IoT Devices', 'US20230456789A1', 'IoT', 0.91, ARRAY['H04W4/70', 'H04L12/28'], NOW() - INTERVAL '4 hours'),

-- Semiconductor reports
('12345678-1234-1234-1234-123456789012', 'Semiconductor Technology Trends', 'Advanced CMOS Fabrication Process', 'US20230567890A1', '반도체', 0.95, ARRAY['H01L21/02', 'H01L21/67', 'H01L27/092'], NOW() - INTERVAL '3 hours'),
('12345678-1234-1234-1234-123456789012', 'Memory Device Innovation Report', 'Non-Volatile Memory Cell Structure', 'US20230678901A1', '반도체', 0.92, ARRAY['H01L27/115', 'H10B43/27'], NOW() - INTERVAL '1 day'),

-- Communication reports
('12345678-1234-1234-1234-123456789012', '5G Technology Patent Analysis', 'Millimeter Wave Antenna Array Design', 'US20230789012A1', '통신', 0.94, ARRAY['H01Q21/06', 'H04B7/26'], NOW() - INTERVAL '5 hours'),

-- Biotechnology reports
('12345678-1234-1234-1234-123456789012', 'Biotech Patent Landscape', 'CRISPR Gene Editing Enhancement Method', 'US20230890123A1', '바이오', 0.89, ARRAY['C12N15/10', 'A61K48/00'], NOW() - INTERVAL '6 hours'),
('12345678-1234-1234-1234-123456789012', 'Pharmaceutical Innovation Study', 'Novel Drug Delivery System Using Nanoparticles', 'US20230901234A1', '바이오', 0.87, ARRAY['A61K9/51', 'B82Y5/00'], NOW() - INTERVAL '2 days'),

-- Transportation reports
('12345678-1234-1234-1234-123456789012', 'Autonomous Vehicle Patent Analysis', 'LiDAR-Based Object Detection System', 'US20230012345A1', '교통', 0.93, ARRAY['G01S17/89', 'B60W30/095'], NOW() - INTERVAL '7 hours'),

-- Energy reports
('12345678-1234-1234-1234-123456789012', 'Energy Storage Innovation Report', 'Solid-State Battery Technology', 'US20230123457A1', '에너지', 0.91, ARRAY['H01M10/0562', 'H01M4/38'], NOW() - INTERVAL '1 day'),

-- Materials reports
('12345678-1234-1234-1234-123456789012', 'Advanced Materials Patent Study', 'Graphene-Based Composite Material', 'US20230234568A1', '소재', 0.90, ARRAY['C01B32/194', 'B82Y30/00'], NOW() - INTERVAL '3 days'),

-- Blockchain reports
('12345678-1234-1234-1234-123456789012', 'Blockchain Technology Analysis', 'Distributed Ledger Security Protocol', 'US20230345679A1', '블록체인', 0.86, ARRAY['H04L9/06', 'G06Q20/38'], NOW() - INTERVAL '8 hours');

-- Insert sample user activities for login tracking
INSERT INTO user_activities (
    user_id,
    activity_type,
    activity_data,
    created_at
) VALUES
('12345678-1234-1234-1234-123456789012', 'login', '{"ip": "192.168.1.100", "user_agent": "Mozilla/5.0"}', NOW() - INTERVAL '9 hours'),
('12345678-1234-1234-1234-123456789012', 'login', '{"ip": "192.168.1.100", "user_agent": "Mozilla/5.0"}', NOW() - INTERVAL '1 day'),
('12345678-1234-1234-1234-123456789012', 'login', '{"ip": "192.168.1.100", "user_agent": "Mozilla/5.0"}', NOW() - INTERVAL '2 days'),
('12345678-1234-1234-1234-123456789012', 'login', '{"ip": "192.168.1.100", "user_agent": "Mozilla/5.0"}', NOW() - INTERVAL '3 days'),
('12345678-1234-1234-1234-123456789012', 'login', '{"ip": "192.168.1.100", "user_agent": "Mozilla/5.0"}', NOW() - INTERVAL '4 days'),
('12345678-1234-1234-1234-123456789012', 'login', '{"ip": "192.168.1.100", "user_agent": "Mozilla/5.0"}', NOW() - INTERVAL '5 days'),
('12345678-1234-1234-1234-123456789012', 'login', '{"ip": "192.168.1.100", "user_agent": "Mozilla/5.0"}', NOW() - INTERVAL '6 days'),
('12345678-1234-1234-1234-123456789012', 'login', '{"ip": "192.168.1.100", "user_agent": "Mozilla/5.0"}', NOW() - INTERVAL '7 days');

-- Add some market data (simulating other users' activities for market comparison)
INSERT INTO search_history (
    user_id, 
    keyword, 
    results_count, 
    technology_field, 
    field_confidence, 
    ipc_codes, 
    created_at
) VALUES 
-- Market data for AI
('87654321-4321-4321-4321-210987654321', 'AI computer vision', 234, 'AI', 0.94, ARRAY['G06T7/00', 'G06V10/82'], NOW() - INTERVAL '2 hours'),
('11111111-2222-3333-4444-555555555555', 'deep learning framework', 189, 'AI', 0.91, ARRAY['G06N3/08', 'G06F9/50'], NOW() - INTERVAL '4 hours'),
('22222222-3333-4444-5555-666666666666', 'natural language processing', 156, 'AI', 0.89, ARRAY['G06F40/30', 'G06N3/04'], NOW() - INTERVAL '1 day'),

-- Market data for IoT
('87654321-4321-4321-4321-210987654321', 'smart city infrastructure', 298, 'IoT', 0.92, ARRAY['H04L12/28', 'G08G1/01'], NOW() - INTERVAL '3 hours'),
('11111111-2222-3333-4444-555555555555', 'industrial IoT sensors', 167, 'IoT', 0.90, ARRAY['G08C17/02', 'H04W4/38'], NOW() - INTERVAL '6 hours'),

-- Market data for semiconductors
('87654321-4321-4321-4321-210987654321', 'quantum computing chip', 145, '반도체', 0.88, ARRAY['G06N10/00', 'H01L29/06'], NOW() - INTERVAL '5 hours'),
('11111111-2222-3333-4444-555555555555', 'memory chip optimization', 203, '반도체', 0.93, ARRAY['H01L27/115', 'G11C11/4091'], NOW() - INTERVAL '1 day'),

-- Market data for communication
('87654321-4321-4321-4321-210987654321', '6G wireless technology', 178, '통신', 0.87, ARRAY['H04W72/04', 'H04B7/26'], NOW() - INTERVAL '7 hours'),

-- Market data for biotechnology
('87654321-4321-4321-4321-210987654321', 'personalized medicine', 134, '바이오', 0.85, ARRAY['G16H50/30', 'A61K31/00'], NOW() - INTERVAL '8 hours'),

-- Market data for transportation
('87654321-4321-4321-4321-210987654321', 'electric aircraft propulsion', 89, '교통', 0.86, ARRAY['B64D27/24', 'H02K7/18'], NOW() - INTERVAL '1 day');

-- Add market report data
INSERT INTO ai_analysis_reports (
    user_id,
    report_name,
    invention_title,
    application_number,
    technology_field,
    field_confidence,
    ipc_codes,
    created_at
) VALUES
-- Market AI reports
('87654321-4321-4321-4321-210987654321', 'AI Market Analysis', 'Transformer Architecture for Language Models', 'US20230111111A1', 'AI', 0.95, ARRAY['G06N3/04', 'G06F40/30'], NOW() - INTERVAL '1 hour'),
('11111111-2222-3333-4444-555555555555', 'Computer Vision Patent Study', 'Real-time Object Tracking Algorithm', 'US20230222222A1', 'AI', 0.92, ARRAY['G06T7/20', 'G06V20/52'], NOW() - INTERVAL '3 hours'),

-- Market IoT reports
('87654321-4321-4321-4321-210987654321', 'IoT Market Trends', 'Edge Computing for IoT Applications', 'US20230333333A1', 'IoT', 0.91, ARRAY['H04L67/10', 'G06F9/50'], NOW() - INTERVAL '2 hours'),

-- Market semiconductor reports
('87654321-4321-4321-4321-210987654321', 'Chip Industry Analysis', 'Advanced Packaging Technology', 'US20230444444A1', '반도체', 0.94, ARRAY['H01L23/00', 'H01L25/065'], NOW() - INTERVAL '4 hours'),

-- Market communication reports
('87654321-4321-4321-4321-210987654321', 'Telecom Innovation Report', 'Beamforming Antenna System', 'US20230555555A1', '통신', 0.93, ARRAY['H01Q3/26', 'H04B7/06'], NOW() - INTERVAL '5 hours'),

-- Market biotech reports
('87654321-4321-4321-4321-210987654321', 'Biotech Market Overview', 'Immunotherapy Enhancement Method', 'US20230666666A1', '바이오', 0.88, ARRAY['A61K39/395', 'C07K16/28'], NOW() - INTERVAL '6 hours'),

-- Market transportation reports
('87654321-4321-4321-4321-210987654321', 'Transportation Innovation', 'Hydrogen Fuel Cell Vehicle', 'US20230777777A1', '교통', 0.90, ARRAY['H01M8/04', 'B60L50/75'], NOW() - INTERVAL '7 hours'),

-- Market energy reports
('87654321-4321-4321-4321-210987654321', 'Energy Technology Trends', 'Solar Panel Efficiency Enhancement', 'US20230888888A1', '에너지', 0.89, ARRAY['H01L31/0352', 'H02S40/22'], NOW() - INTERVAL '1 day'),

-- Market materials reports
('87654321-4321-4321-4321-210987654321', 'Materials Science Innovation', 'Self-Healing Polymer Composite', 'US20230999999A1', '소재', 0.87, ARRAY['C08L101/00', 'C08K3/04'], NOW() - INTERVAL '2 days');

-- Note: user_quota table does not exist in current schema
-- Quota information is tracked through users table columns instead

COMMIT;