-- Add sample search analytics data for testing the dashboard

-- Insert sample search analytics data
INSERT INTO search_analytics (user_id, search_query, search_type, results_count, clicked_result_position, session_id, ip_address, created_at) VALUES
-- Recent searches (last 7 days)
(gen_random_uuid(), 'artificial intelligence patent', 'keyword', 150, 1, 'sess_001', '192.168.1.100', NOW() - INTERVAL '1 day'),
(gen_random_uuid(), 'machine learning algorithm', 'keyword', 89, 2, 'sess_002', '192.168.1.101', NOW() - INTERVAL '1 day'),
(gen_random_uuid(), 'blockchain technology', 'keyword', 234, 1, 'sess_003', '192.168.1.102', NOW() - INTERVAL '2 days'),
(gen_random_uuid(), 'quantum computing', 'keyword', 67, 3, 'sess_004', '192.168.1.103', NOW() - INTERVAL '2 days'),
(gen_random_uuid(), 'neural network', 'keyword', 178, 1, 'sess_005', '192.168.1.104', NOW() - INTERVAL '3 days'),
(gen_random_uuid(), 'autonomous vehicle', 'keyword', 145, 2, 'sess_006', '192.168.1.105', NOW() - INTERVAL '3 days'),
(gen_random_uuid(), 'renewable energy', 'keyword', 203, 1, 'sess_007', '192.168.1.106', NOW() - INTERVAL '4 days'),
(gen_random_uuid(), 'biotechnology', 'keyword', 112, 4, 'sess_008', '192.168.1.107', NOW() - INTERVAL '4 days'),
(gen_random_uuid(), 'IoT sensor', 'keyword', 98, 2, 'sess_009', '192.168.1.108', NOW() - INTERVAL '5 days'),
(gen_random_uuid(), '5G technology', 'keyword', 156, 1, 'sess_010', '192.168.1.109', NOW() - INTERVAL '5 days'),

-- More searches for trend analysis
(gen_random_uuid(), 'artificial intelligence', 'keyword', 134, 1, 'sess_011', '192.168.1.110', NOW() - INTERVAL '6 days'),
(gen_random_uuid(), 'machine learning', 'keyword', 167, 2, 'sess_012', '192.168.1.111', NOW() - INTERVAL '6 days'),
(gen_random_uuid(), 'deep learning', 'keyword', 89, 1, 'sess_013', '192.168.1.112', NOW() - INTERVAL '7 days'),
(gen_random_uuid(), 'computer vision', 'keyword', 123, 3, 'sess_014', '192.168.1.113', NOW() - INTERVAL '7 days'),
(gen_random_uuid(), 'natural language processing', 'keyword', 78, 2, 'sess_015', '192.168.1.114', NOW() - INTERVAL '1 week'),

-- Older data for comparison (last month)
(gen_random_uuid(), 'patent search', 'keyword', 245, 1, 'sess_016', '192.168.1.115', NOW() - INTERVAL '2 weeks'),
(gen_random_uuid(), 'intellectual property', 'keyword', 189, 2, 'sess_017', '192.168.1.116', NOW() - INTERVAL '2 weeks'),
(gen_random_uuid(), 'technology transfer', 'keyword', 134, 1, 'sess_018', '192.168.1.117', NOW() - INTERVAL '3 weeks'),
(gen_random_uuid(), 'innovation management', 'keyword', 167, 3, 'sess_019', '192.168.1.118', NOW() - INTERVAL '3 weeks'),
(gen_random_uuid(), 'research development', 'keyword', 98, 2, 'sess_020', '192.168.1.119', NOW() - INTERVAL '1 month'),

-- Advanced search types
(gen_random_uuid(), 'US20230123456', 'patent_number', 1, 1, 'sess_021', '192.168.1.120', NOW() - INTERVAL '1 day'),
(gen_random_uuid(), 'Samsung Electronics', 'assignee', 45, 1, 'sess_022', '192.168.1.121', NOW() - INTERVAL '2 days'),
(gen_random_uuid(), 'John Smith', 'inventor', 12, 2, 'sess_023', '192.168.1.122', NOW() - INTERVAL '3 days'),
(gen_random_uuid(), 'G06F', 'classification', 234, 1, 'sess_024', '192.168.1.123', NOW() - INTERVAL '4 days'),

-- Popular searches with multiple occurrences
(gen_random_uuid(), 'artificial intelligence', 'keyword', 145, 1, 'sess_025', '192.168.1.124', NOW() - INTERVAL '1 hour'),
(gen_random_uuid(), 'artificial intelligence', 'keyword', 156, 2, 'sess_026', '192.168.1.125', NOW() - INTERVAL '2 hours'),
(gen_random_uuid(), 'machine learning', 'keyword', 134, 1, 'sess_027', '192.168.1.126', NOW() - INTERVAL '3 hours'),
(gen_random_uuid(), 'machine learning', 'keyword', 167, 3, 'sess_028', '192.168.1.127', NOW() - INTERVAL '4 hours'),
(gen_random_uuid(), 'blockchain', 'keyword', 189, 1, 'sess_029', '192.168.1.128', NOW() - INTERVAL '5 hours'),
(gen_random_uuid(), 'blockchain', 'keyword', 198, 2, 'sess_030', '192.168.1.129', NOW() - INTERVAL '6 hours');

-- Add some user activity logs for user behavior analysis
INSERT INTO user_activity_logs (user_id, activity_type, activity_data, ip_address, created_at) VALUES
(gen_random_uuid(), 'search', '{"query": "artificial intelligence", "results": 150}', '192.168.1.100', NOW() - INTERVAL '1 day'),
(gen_random_uuid(), 'report_view', '{"report_id": "rpt_001", "duration": 300}', '192.168.1.101', NOW() - INTERVAL '1 day'),
(gen_random_uuid(), 'patent_view', '{"patent_id": "US20230123456", "duration": 180}', '192.168.1.102', NOW() - INTERVAL '2 days'),
(gen_random_uuid(), 'download', '{"file_type": "pdf", "patent_id": "US20230123456"}', '192.168.1.103', NOW() - INTERVAL '2 days'),
(gen_random_uuid(), 'search', '{"query": "machine learning", "results": 89}', '192.168.1.104', NOW() - INTERVAL '3 days'),
(gen_random_uuid(), 'report_generate', '{"report_type": "technology_analysis", "duration": 45}', '192.168.1.105', NOW() - INTERVAL '3 days'),
(gen_random_uuid(), 'search', '{"query": "blockchain", "results": 234}', '192.168.1.106', NOW() - INTERVAL '4 days'),
(gen_random_uuid(), 'patent_bookmark', '{"patent_id": "US20230123457"}', '192.168.1.107', NOW() - INTERVAL '4 days'),
(gen_random_uuid(), 'search', '{"query": "quantum computing", "results": 67}', '192.168.1.108', NOW() - INTERVAL '5 days'),
(gen_random_uuid(), 'report_share', '{"report_id": "rpt_002", "share_method": "email"}', '192.168.1.109', NOW() - INTERVAL '5 days');

-- Add patent views data
INSERT INTO patent_views (user_id, patent_id, view_duration, session_id, ip_address, created_at) VALUES
(gen_random_uuid(), 'US20230123456', 180, 'sess_001', '192.168.1.100', NOW() - INTERVAL '1 day'),
(gen_random_uuid(), 'US20230123457', 240, 'sess_002', '192.168.1.101', NOW() - INTERVAL '1 day'),
(gen_random_uuid(), 'US20230123458', 120, 'sess_003', '192.168.1.102', NOW() - INTERVAL '2 days'),
(gen_random_uuid(), 'US20230123459', 300, 'sess_004', '192.168.1.103', NOW() - INTERVAL '2 days'),
(gen_random_uuid(), 'US20230123460', 90, 'sess_005', '192.168.1.104', NOW() - INTERVAL '3 days');

-- Add report analytics data
INSERT INTO report_analytics (user_id, report_type, report_data, generation_time, status, created_at) VALUES
(gen_random_uuid(), 'technology_analysis', '{"technology": "AI", "patents": 150}', 45, 'completed', NOW() - INTERVAL '1 day'),
(gen_random_uuid(), 'patent_landscape', '{"field": "blockchain", "patents": 234}', 67, 'completed', NOW() - INTERVAL '2 days'),
(gen_random_uuid(), 'competitor_analysis', '{"company": "Samsung", "patents": 89}', 34, 'completed', NOW() - INTERVAL '3 days'),
(gen_random_uuid(), 'trend_analysis', '{"period": "2023", "patents": 456}', 78, 'completed', NOW() - INTERVAL '4 days'),
(gen_random_uuid(), 'innovation_report', '{"sector": "automotive", "patents": 123}', 56, 'completed', NOW() - INTERVAL '5 days');

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

-- Add user login logs
INSERT INTO user_login_logs (user_id, login_method, ip_address, user_agent, success, created_at) VALUES
(gen_random_uuid(), 'email', '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', true, NOW() - INTERVAL '1 hour'),
(gen_random_uuid(), 'google', '192.168.1.101', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', true, NOW() - INTERVAL '2 hours'),
(gen_random_uuid(), 'email', '192.168.1.102', 'Mozilla/5.0 (X11; Linux x86_64)', true, NOW() - INTERVAL '3 hours'),
(gen_random_uuid(), 'email', '192.168.1.103', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', false, NOW() - INTERVAL '4 hours'),
(gen_random_uuid(), 'google', '192.168.1.104', 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)', true, NOW() - INTERVAL '5 hours');

-- Verify the data was inserted
SELECT 
    COUNT(*) as total_searches,
    COUNT(DISTINCT search_query) as unique_queries,
    COUNT(DISTINCT search_type) as search_types,
    MIN(created_at) as earliest_search,
    MAX(created_at) as latest_search
FROM search_analytics;

-- Show top search queries
SELECT 
    search_query,
    COUNT(*) as search_count,
    AVG(results_count) as avg_results,
    AVG(clicked_result_position) as avg_click_position
FROM search_analytics 
GROUP BY search_query 
ORDER BY search_count DESC 
LIMIT 10;