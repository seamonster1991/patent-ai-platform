-- Delete user dak240228@gmail.com from all tables
-- This script will completely remove the user and all associated data

-- First, get the user ID from auth.users
DO $$
DECLARE
    target_user_id UUID;
BEGIN
    -- Get the user ID
    SELECT id INTO target_user_id 
    FROM auth.users 
    WHERE email = 'dak240228@gmail.com';
    
    IF target_user_id IS NULL THEN
        RAISE NOTICE 'User dak240228@gmail.com not found in auth.users';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Found user ID: %', target_user_id;
    
    -- Delete from all related tables (in order to respect foreign key constraints)
    DELETE FROM public.user_activities WHERE user_id = target_user_id;
    RAISE NOTICE 'Deleted from user_activities';
    
    DELETE FROM public.ai_analysis_reports WHERE user_id = target_user_id;
    RAISE NOTICE 'Deleted from ai_analysis_reports';
    
    DELETE FROM public.search_history WHERE user_id = target_user_id;
    RAISE NOTICE 'Deleted from search_history';
    
    DELETE FROM public.reports WHERE user_id = target_user_id;
    RAISE NOTICE 'Deleted from reports';
    
    DELETE FROM public.patent_search_analytics WHERE user_id = target_user_id;
    RAISE NOTICE 'Deleted from patent_search_analytics';
    
    DELETE FROM public.llm_analysis_logs WHERE user_id = target_user_id;
    RAISE NOTICE 'Deleted from llm_analysis_logs';
    
    DELETE FROM public.saved_patents WHERE user_id = target_user_id;
    RAISE NOTICE 'Deleted from saved_patents';
    
    DELETE FROM public.patent_detail_views WHERE user_id = target_user_id;
    RAISE NOTICE 'Deleted from patent_detail_views';
    
    DELETE FROM public.usage_cost_tracking WHERE user_id = target_user_id;
    RAISE NOTICE 'Deleted from usage_cost_tracking';
    
    DELETE FROM public.search_keyword_analytics WHERE user_id = target_user_id;
    RAISE NOTICE 'Deleted from search_keyword_analytics';
    
    DELETE FROM public.user_login_logs WHERE user_id = target_user_id;
    RAISE NOTICE 'Deleted from user_login_logs';
    
    DELETE FROM public.billing_events WHERE user_id = target_user_id;
    RAISE NOTICE 'Deleted from billing_events';
    
    DELETE FROM public.document_downloads WHERE user_id = target_user_id;
    RAISE NOTICE 'Deleted from document_downloads';
    
    DELETE FROM public.technology_field_analysis WHERE user_id = target_user_id;
    RAISE NOTICE 'Deleted from technology_field_analysis';
    
    DELETE FROM public.report_history WHERE user_id = target_user_id;
    RAISE NOTICE 'Deleted from report_history';
    
    -- Delete from point-related tables
    DELETE FROM public.user_point_balances WHERE user_id = target_user_id;
    RAISE NOTICE 'Deleted from user_point_balances';
    
    DELETE FROM public.point_transactions WHERE user_id = target_user_id;
    RAISE NOTICE 'Deleted from point_transactions';
    
    DELETE FROM public.monthly_free_points WHERE user_id = target_user_id;
    RAISE NOTICE 'Deleted from monthly_free_points';
    
    DELETE FROM public.monthly_point_grants WHERE user_id = target_user_id;
    RAISE NOTICE 'Deleted from monthly_point_grants';
    
    -- Delete from payment-related tables
    DELETE FROM public.payment_logs WHERE user_id = target_user_id;
    RAISE NOTICE 'Deleted from payment_logs';
    
    DELETE FROM public.payment_orders WHERE user_id = target_user_id;
    RAISE NOTICE 'Deleted from payment_orders';
    
    DELETE FROM public.payment_transactions WHERE user_id = target_user_id;
    RAISE NOTICE 'Deleted from payment_transactions';
    
    DELETE FROM public.payment_error_logs WHERE user_id = target_user_id;
    RAISE NOTICE 'Deleted from payment_error_logs';
    
    DELETE FROM public.refunds WHERE user_id = target_user_id;
    RAISE NOTICE 'Deleted from refunds';
    
    -- Finally, delete from public.users
    DELETE FROM public.users WHERE id = target_user_id;
    RAISE NOTICE 'Deleted from public.users';
    
    -- Finally, delete from auth.users
    DELETE FROM auth.users WHERE id = target_user_id;
    RAISE NOTICE 'Deleted from auth.users';
    
    RAISE NOTICE 'User dak240228@gmail.com has been completely deleted from all tables';
    
END $$;

-- Verification queries
SELECT 
    'auth.users' as table_name,
    COUNT(*) as remaining_records
FROM auth.users 
WHERE email = 'dak240228@gmail.com'

UNION ALL

SELECT 
    'public.users' as table_name,
    COUNT(*) as remaining_records
FROM public.users 
WHERE email = 'dak240228@gmail.com'

UNION ALL

SELECT 
    'public.deleted_users_history' as table_name,
    COUNT(*) as remaining_records
FROM public.deleted_users_history 
WHERE email = 'dak240228@gmail.com';

-- Final confirmation message
DO $$
BEGIN
    RAISE NOTICE '=== User dak240228@gmail.com deletion completed ===';
    RAISE NOTICE 'All user data has been removed from all related tables.';
END $$;