-- 현재 사용자 정보 확인

SELECT 
    id,
    email,
    name,
    role,
    total_searches,
    total_reports,
    created_at
FROM users 
ORDER BY created_at DESC 
LIMIT 10;

-- 특정 사용자 ID의 검색 기록 수
SELECT 
    'Search History Count' as info,
    COUNT(*) as count
FROM search_history 
WHERE user_id = '51c66d4c-4a2f-4079-9173-a3d92b9702ed';

-- 특정 사용자 ID의 AI 리포트 수
SELECT 
    'AI Reports Count' as info,
    COUNT(*) as count
FROM ai_analysis_reports 
WHERE user_id = '51c66d4c-4a2f-4079-9173-a3d92b9702ed';

-- 특정 사용자 ID의 기술 분야 분석 데이터
SELECT 
    'Technology Field Analysis Count' as info,
    COUNT(*) as count
FROM technology_field_analysis 
WHERE user_id = '51c66d4c-4a2f-4079-9173-a3d92b9702ed';