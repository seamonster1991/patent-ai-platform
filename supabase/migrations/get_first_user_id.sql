-- 첫 번째 사용자 ID만 가져오기
SELECT id FROM public.users ORDER BY created_at ASC LIMIT 1;