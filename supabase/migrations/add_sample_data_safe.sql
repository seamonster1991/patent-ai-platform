-- Add sample search analytics data safely (without foreign key constraints)

-- Clear existing sample data first
DELETE FROM search_analytics WHERE session_id LIKE 'sess_%';
DELETE FROM user_activity_logs WHERE ip_address::text LIKE '192.168.1.%';
DELETE FROM patent_views WHERE session_id LIKE 'sess_%';
DELETE FROM report_analytics WHERE report_data::text LIKE '%"technology"%';
DELETE FROM technology_trends WHERE technology_field IN ('Artificial Intelligence', 'Machine Learning', 'Blockchain');
DELETE FROM user_login_logs WHERE ip_address::text LIKE '192.168.1.%';

-- Insert sample search analytics data (using NULL for user_id to avoid foreign key issues)
INSERT INTO search_analytics (user_id, search_query, search_type, results_count, clicked_result_position, session_id, ip_address, created_at) VALUES
-- Recent searches (last 7 days)
(NULL, 'artificial intelligence patent', 'keyword', 150, 1, 'sess_001', '192.168.1.100', NOW() - INTERVAL '1 day'),
(NULL, 'machine learning algorithm', 'keyword', 89, 2, 'sess_002', '192.168.1.101', NOW() - INTERVAL '1 day'),
(NULL, 'blockchain technology', 'keyword', 234, 1, 'sess_003', '192.168.1.102', NOW() - INTERVAL '2 days'),
(NULL, 'quantum computing', 'keyword', 67, 3, 'sess_004', '192.168.1.103', NOW() - INTERVAL '2 days'),
(NULL, 'neural network', 'keyword', 178, 1, 'sess_005', '192.168.1.104', NOW() - INTERVAL '3 days'),
(NULL, 'autonomous vehicle', 'keyword', 145, 2, 'sess_006', '192.168.1.105', NOW() - INTERVAL '3 days'),
(NULL, 'renewable energy', 'keyword', 203, 1, 'sess_007', '192.168.1.106', NOW() - INTERVAL '4 days'),
(NULL, 'biotechnology', 'keyword', 112, 4, 'sess_008', '192.168.1.107', NOW() - INTERVAL '4 days'),
(NULL, 'IoT sensor', 'keyword', 98, 2, 'sess_009', '192.168.1.108', NOW() - INTERVAL '5 days'),
(NULL, '5G technology', 'keyword', 156, 1, 'sess_010', '192.168.1.109', NOW() - INTERVAL '5 days'),

-- More searches for trend analysis
(NULL, 'artificial intelligence', 'keyword', 134, 1, 'sess_011', '192.168.1.110', NOW() - INTERVAL '6 days'),
(NULL, 'machine learning', 'keyword', 167, 2, 'sess_012', '192.168.1.111', NOW() - INTERVAL '6 days'),
(NULL, 'deep learning', 'keyword', 89, 1, 'sess_013', '192.168.1.112', NOW() - INTERVAL '7 days'),
(NULL, 'computer vision', 'keyword', 123, 3, 'sess_014', '192.168.1.113', NOW() - INTERVAL '7 days'),
(NULL, 'natural language processing', 'keyword', 78, 2, 'sess_015', '192.168.1.114', NOW() - INTERVAL '1 week'),

-- Popular searches with multiple occurrences
(NULL, 'artificial intelligence', 'keyword', 145, 1, 'sess_025', '192.168.1.124', NOW() - INTERVAL '1 hour'),
(NULL, 'artificial intelligence', 'keyword', 156, 2, 'sess_026', '192.168.1.125', NOW() - INTERVAL '2 hours'),
(NULL, 'machine learning', 'keyword', 134, 1, 'sess_027', '192.168.1.126', NOW() - INTERVAL '3 hours'),
(NULL, 'machine learning', 'keyword', 167, 3, 'sess_028', '192.168.1.127', NOW() - INTERVAL '4 hours'),
(NULL, 'blockchain', 'keyword', 189, 1, 'sess_029', '192.168.1.128', NOW() - INTERVAL '5 hours'),
(NULL, 'blockchain', 'keyword', 198, 2, 'sess_030', '192.168.1.129', NOW() - INTERVAL '6 hours');

-- Add some user activity logs for user behavior analysis
INSERT INTO user_activity_logs (user_id, activity_type, activity_data, ip_address, created_at) VALUES
(NULL, 'search', '{"query": "artificial intelligence", "results": 150}', '192.168.1.100', NOW() - INTERVAL '1 day'),
(NULL, 'report_view', '{"report_id": "rpt_001", "duration": 300}', '192.168.1.101', NOW() - INTERVAL '1 day'),
(NULL, 'patent_view', '{"patent_id": "US20230123456", "duration": 180}', '192.168.1.102', NOW() - INTERVAL '2 days'),
(NULL, 'download', '{"file_type": "pdf", "patent_id": "US20230123456"}', '192.168.1.103', NOW() - INTERVAL '2 days'),
(NULL, 'search', '{"query": "machine learning", "results": 89}', '192.168.1.104', NOW() - INTERVAL '3 days'),
(NULL, 'report_generate', '{"report_type": "technology_analysis", "duration": 45}', '192.168.1.105', NOW() - INTERVAL '3 days'),
(NULL, 'search', '{"query": "blockchain", "results": 234}', '192.168.1.106', NOW() - INTERVAL '4 days'),
(NULL, 'patent_bookmark', '{"patent_id": "US20230123457"}', '192.168.1.107', NOW() - INTERVAL '4 days'),
(NULL, 'search', '{"query": "quantum computing", "results": 67}', '192.168.1.108', NOW() - INTERVAL '5 days'),
(NULL, 'report_share', '{"report_id": "rpt_002", "share_method": "email"}', '192.168.1.109', NOW() - INTERVAL '5 days');

-- Add patent views data
INSERT INTO patent_views (user_id, patent_id, view_duration, session_id, ip_address, created_at) VALUES
(NULL, 'US20230123456', 180, 'sess_001', '192.168.1.100', NOW() - INTERVAL '1 day'),
(NULL, 'US20230123457', 240, 'sess_002', '192.168.1.101', NOW() - INTERVAL '1 day'),
(NULL, 'US20230123458', 120, 'sess_003', '192.168.1.102', NOW() - INTERVAL '2 days'),
(NULL, 'US20230123459', 300, 'sess_004', '192.168.1.103', NOW() - INTERVAL '2 days'),
(NULL, 'US20230123460', 90, 'sess_005', '192.168.1.104', NOW() - INTERVAL '3 days');

-- Add report analytics data
INSERT INTO report_analytics (user_id, report_type, report_data, generation_time, status, created_at) VALUES
(NULL, 'technology_analysis', '{"technology": "AI", "patents": 150}', 45, 'completed', NOW() - INTERVAL '1 day'),
(NULL, 'patent_landscape', '{"field": "blockchain", "patents": 234}', 67, 'completed', NOW() - INTERVAL '2 days'),
(NULL, 'competitor_analysis', '{"company": "Samsung", "patents": 89}', 34, 'completed', NOW() - INTERVAL '3 days'),
(NULL, 'trend_analysis', '{"period": "2023", "patents": 456}', 78, 'completed', NOW() - INTERVAL '4 days'),
(NULL, 'innovation_report', '{"sector": "automotive", "patents": 123}', 56, 'completed', NOW() - INTERVAL '5 days');

-- Add technology trends data
INSERT INTO technology_trends (technology_field, trend_score, patent_count, growth_rate, period_start, period_end, created_at) VALUES
('Artificial Intelligence', 95.5, 1250, 23.4, '2023-01-01', '2023-12-31', NOW() - INTERVAL '1 day'),
('Machine Learning', 92.3, 980, 19.8, '2023-01-01', '2023-12-31', NOW() - INTERVAL '1 day'),
('Blockchain', 88.7, 756, 15.6, '2023-01-01', '2023-12-31', NOW() - INTERVAL '1 day'),
('Quantum Computing', 85.2, 234, 45.7, '2023-01-01', '2023-12-31', NOW() - INTERVAL '1 day'),
('IoT', 82.1, 1456, 12.3, '2023-01-01', '2023-12-31', NOW() - INTERVAL '1 day'),
('5G Technology', 79.8, 567, 18.9, '2023-01-01', '2023-12-31', NOW() - INTERVAL '1 day'),
('Autonomous Vehicles', 77.5, 890, 21.2, '2023-01-01', '2023-12-31', NOW() - INTERVAL '1 day'),
('Renewable Energy', 75.3, 1123, 14.7, '2023-01-01', '2023-12-31', NOW() - INTERVAL '1 day');

-- Add user login logs (using NULL for user_id)
INSERT INTO user_login_logs (user_id, login_method, ip_address, user_agent, success, created_at) VALUES
(NULL, 'email', '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', true, NOW() - INTERVAL '1 hour'),
(NULL, 'google', '192.168.1.101', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', true, NOW() - INTERVAL '2 hours'),
(NULL, 'email', '192.168.1.102', 'Mozilla/5.0 (X11; Linux x86_64)', true, NOW() - INTERVAL '3 hours'),
(NULL, 'email', '192.168.1.103', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', false, NOW() - INTERVAL '4 hours'),
(NULL, 'google', '192.168.1.104', 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)', true, NOW() - INTERVAL '5 hours');

-- Verify the data was inserted
SELECT 
    'search_analytics' as table_name,
    COUNT(*) as record_count
FROM search_analytics
UNION ALL
SELECT 
    'user_activity_logs' as table_name,
    COUNT(*) as record_count
FROM user_activity_logs
UNION ALL
SELECT 
    'patent_views' as table_name,
    COUNT(*) as record_count
FROM patent_views
UNION ALL
SELECT 
    'report_analytics' as table_name,
    COUNT(*) as record_count
FROM report_analytics
UNION ALL
SELECT 
    'technology_trends' as table_name,
    COUNT(*) as record_count
FROM technology_trends
UNION ALL
SELECT 
    'user_login_logs' as table_name,
    COUNT(*) as record_count
FROM user_login_logs;