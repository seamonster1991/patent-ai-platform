-- 실제 사용자 ID를 가져와서 올바른 컬럼명으로 테스트 데이터 생성
DO $$
DECLARE
    real_user_id UUID;
BEGIN
    -- 첫 번째 실제 사용자 ID 가져오기
    SELECT id INTO real_user_id 
    FROM auth.users 
    ORDER BY created_at DESC 
    LIMIT 1;
    
    -- 사용자 ID가 있는지 확인
    IF real_user_id IS NOT NULL THEN
        -- 기존 테스트 데이터 삭제 (해당 사용자의 데이터만)
        DELETE FROM public.usage_cost_tracking WHERE user_id = real_user_id;
        DELETE FROM public.user_login_logs WHERE user_id = real_user_id;
        DELETE FROM public.user_activities WHERE user_id = real_user_id;
        DELETE FROM public.ai_analysis_reports WHERE user_id = real_user_id;
        DELETE FROM public.patent_detail_views WHERE user_id = real_user_id;
        DELETE FROM public.search_history WHERE user_id = real_user_id;
        DELETE FROM public.users WHERE id = real_user_id;
        
        -- public.users 테이블에 사용자 정보 추가 (올바른 컬럼명 사용)
        INSERT INTO public.users (
            id, 
            email, 
            name, 
            subscription_plan, 
            usage_count, 
            total_searches, 
            total_detail_views, 
            total_logins, 
            total_usage_cost,
            created_at, 
            updated_at,
            last_login_at
        )
        VALUES (
            real_user_id,
            'test@example.com',
            'Test User',
            'premium',
            150,
            25,
            15,
            20,
            45.50,
            NOW() - INTERVAL '30 days',
            NOW(),
            NOW() - INTERVAL '1 day'
        );
        
        -- 검색 기록 데이터 생성 (최근 30일)
        INSERT INTO public.search_history (id, user_id, query, results_count, search_type, created_at, updated_at)
        SELECT 
            gen_random_uuid(),
            real_user_id,
            'AI patent search ' || i,
            (RANDOM() * 100 + 10)::INTEGER,
            CASE WHEN RANDOM() > 0.5 THEN 'keyword' ELSE 'semantic' END,
            NOW() - (RANDOM() * INTERVAL '30 days'),
            NOW()
        FROM generate_series(1, 25) i;
        
        -- 특허 상세 조회 데이터 생성
        INSERT INTO public.patent_detail_views (id, user_id, patent_id, patent_title, view_duration, created_at)
        SELECT 
            gen_random_uuid(),
            real_user_id,
            'US' || (10000000 + i)::TEXT,
            'Patent Title ' || i,
            (RANDOM() * 300 + 30)::INTEGER,
            NOW() - (RANDOM() * INTERVAL '30 days')
        FROM generate_series(1, 15) i;
        
        -- AI 분석 보고서 데이터 생성
        INSERT INTO public.ai_analysis_reports (id, user_id, report_type, content, tokens_used, cost, created_at, updated_at)
        SELECT 
            gen_random_uuid(),
            real_user_id,
            CASE WHEN RANDOM() > 0.5 THEN 'summary' ELSE 'analysis' END,
            'AI generated report content ' || i,
            (RANDOM() * 2000 + 500)::INTEGER,
            (RANDOM() * 0.5 + 0.1)::DECIMAL(10,4),
            NOW() - (RANDOM() * INTERVAL '30 days'),
            NOW()
        FROM generate_series(1, 12) i;
        
        -- 사용자 활동 데이터 생성
        INSERT INTO public.user_activities (id, user_id, activity_type, activity_data, created_at)
        SELECT 
            gen_random_uuid(),
            real_user_id,
            CASE 
                WHEN i % 3 = 0 THEN 'search'
                WHEN i % 3 = 1 THEN 'view_patent'
                ELSE 'generate_report'
            END,
            '{"action": "user_activity_' || i || '"}',
            NOW() - (RANDOM() * INTERVAL '30 days')
        FROM generate_series(1, 50) i;
        
        -- 로그인 기록 데이터 생성
        INSERT INTO public.user_login_logs (id, user_id, login_time, ip_address, user_agent, success)
        SELECT 
            gen_random_uuid(),
            real_user_id,
            NOW() - (RANDOM() * INTERVAL '30 days'),
            '192.168.1.' || (RANDOM() * 255)::INTEGER,
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            true
        FROM generate_series(1, 20) i;
        
        -- 사용량 비용 추적 데이터 생성
        INSERT INTO public.usage_cost_tracking (id, user_id, service_type, usage_amount, cost, billing_period, created_at, updated_at)
        SELECT 
            gen_random_uuid(),
            real_user_id,
            CASE WHEN RANDOM() > 0.5 THEN 'search' ELSE 'analysis' END,
            (RANDOM() * 100 + 10)::INTEGER,
            (RANDOM() * 5.0 + 1.0)::DECIMAL(10,2),
            DATE_TRUNC('month', NOW() - (RANDOM() * INTERVAL '30 days')),
            NOW() - (RANDOM() * INTERVAL '30 days'),
            NOW()
        FROM generate_series(1, 10) i;
        
        RAISE NOTICE 'Test data created successfully for user ID: %', real_user_id;
    ELSE
        RAISE NOTICE 'No users found in auth.users table';
    END IF;
END $$;

-- 데이터 생성 결과 확인
SELECT 
  'auth.users' as table_name, 
  COUNT(*) as count 
FROM auth.users
UNION ALL
SELECT 
  'public.users' as table_name, 
  COUNT(*) as count 
FROM public.users
UNION ALL
SELECT 
  'search_history' as table_name, 
  COUNT(*) as count 
FROM public.search_history
UNION ALL
SELECT 
  'patent_detail_views' as table_name, 
  COUNT(*) as count 
FROM public.patent_detail_views
UNION ALL
SELECT 
  'ai_analysis_reports' as table_name, 
  COUNT(*) as count 
FROM public.ai_analysis_reports
UNION ALL
SELECT 
  'user_activities' as table_name, 
  COUNT(*) as count 
FROM public.user_activities
UNION ALL
SELECT 
  'user_login_logs' as table_name, 
  COUNT(*) as count 
FROM public.user_login_logs
UNION ALL
SELECT 
  'usage_cost_tracking' as table_name, 
  COUNT(*) as count 
FROM public.usage_cost_tracking;