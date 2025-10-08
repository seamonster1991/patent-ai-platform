-- 실제 데이터 확인
-- 1. 사용자 확인
SELECT 'Users:' as table_name, id, email, name FROM public.users LIMIT 3;

-- 2. 사용자 활동 확인
SELECT 'User Activities:' as table_name, user_id, activity_type, created_at 
FROM user_activities 
ORDER BY created_at DESC 
LIMIT 5;

-- 3. AI 분석 리포트 확인
SELECT 'AI Reports:' as table_name, user_id, application_number, report_name, created_at 
FROM ai_analysis_reports 
ORDER BY created_at DESC 
LIMIT 3;
-- 1. 사용자 확인
SELECT 'Users:' as table_name, id, email, name FROM public.users LIMIT 3;

-- 2. 사용자 활동 확인
SELECT 'User Activities:' as table_name, user_id, activity_type, created_at 
FROM user_activities 
ORDER BY created_at DESC 
LIMIT 5;

-- 3. AI 분석 리포트 확인
SELECT 'AI Reports:' as table_name, user_id, application_number, report_name, created_at 
FROM ai_analysis_reports 
ORDER BY created_at DESC 
LIMIT 3;