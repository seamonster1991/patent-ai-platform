-- 올바른 컬럼명으로 테스트 데이터 생성
DO $$
DECLARE
    real_user_id UUID;
    auth_user_email TEXT;
    existing_public_user_id UUID;
BEGIN
    -- 첫 번째 실제 사용자 ID와 이메일 가져오기
    SELECT id, email INTO real_user_id, auth_user_email
    FROM auth.users 
    ORDER BY created_at DESC 
    LIMIT 1;
    
    -- public.users에서 기존 사용자 확인
    SELECT id INTO existing_public_user_id
    FROM public.users
    WHERE email = auth_user_email OR id = real_user_id
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
        
        -- public.users에 사용자가 없으면 생성, 있으면 업데이트
        IF existing_public_user_id IS NULL THEN
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
                auth_user_email,
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
        ELSE
            UPDATE public.users SET
                name = 'Test User',
                subscription_plan = 'premium',
                usage_count = 150,
                total_searches = 25,
                total_detail_views = 15,
                total_logins = 20,
                total_usage_cost = 45.50,
                updated_at = NOW(),
                last_login_at = NOW() - INTERVAL '1 day'
            WHERE id = real_user_id;
        END IF;
        
        -- 검색 기록 데이터 생성 (올바른 컬럼명 사용)
        INSERT INTO public.search_history (id, user_id, keyword, results_count, created_at)
        SELECT 
            gen_random_uuid(),
            real_user_id,
            'AI patent search ' || i,
            (RANDOM() * 100 + 10)::INTEGER,
            NOW() - (RANDOM() * INTERVAL '30 days')
        FROM generate_series(1, 25) i;
        
        -- 특허 상세 조회 데이터 생성 (올바른 컬럼명 사용)
        INSERT INTO public.patent_detail_views (id, user_id, patent_application_number, patent_title, view_duration_ms, created_at)
        SELECT 
            gen_random_uuid(),
            real_user_id,
            'US' || (10000000 + i)::TEXT,
            'Patent Title ' || i,
            (RANDOM() * 300000 + 30000)::INTEGER,
            NOW() - (RANDOM() * INTERVAL '30 days')
        FROM generate_series(1, 15) i;
        
        -- AI 분석 보고서 데이터 생성 (올바른 컬럼명 사용)
        INSERT INTO public.ai_analysis_reports (
            id, 
            user_id, 
            application_number, 
            invention_title, 
            market_penetration, 
            competitive_landscape,
            created_at, 
            updated_at
        )
        SELECT 
            gen_random_uuid(),
            real_user_id,
            'US' || (20000000 + i)::TEXT,
            'AI generated report title ' || i,
            'Market penetration analysis ' || i,
            'Competitive landscape analysis ' || i,
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
        
        -- 로그인 기록 데이터 생성 (올바른 컬럼명 사용)
        INSERT INTO public.user_login_logs (id, user_id, login_method, ip_address, user_agent, login_success, created_at)
        SELECT 
            gen_random_uuid(),
            real_user_id,
            'email',
            ('192.168.1.' || (RANDOM() * 255)::INTEGER)::inet,
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            true,
            NOW() - (RANDOM() * INTERVAL '30 days')
        FROM generate_series(1, 20) i;
        
        -- 사용량 비용 추적 데이터 생성 (올바른 컬럼명 사용)
        INSERT INTO public.usage_cost_tracking (id, user_id, service_type, cost_amount, currency, quantity, created_at)
        SELECT 
            gen_random_uuid(),
            real_user_id,
            CASE WHEN RANDOM() > 0.5 THEN 'search' ELSE 'analysis' END,
            (RANDOM() * 5000 + 1000)::NUMERIC,
            'KRW',
            (RANDOM() * 10 + 1)::INTEGER,
            NOW() - (RANDOM() * INTERVAL '30 days')
        FROM generate_series(1, 10) i;
        
        RAISE NOTICE 'Test data created successfully for user ID: % with email: %', real_user_id, auth_user_email;
    ELSE
        RAISE NOTICE 'No users found in auth.users table';
    END IF;
END $$;