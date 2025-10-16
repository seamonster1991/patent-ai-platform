-- 기존 검색 기록에 technology_field 업데이트

DO $$
DECLARE
    current_user_id UUID := '51c66d4c-4a2f-4079-9173-a3d92b9702ed';
    search_record RECORD;
    tech_field TEXT;
    ipc_codes_array TEXT[];
BEGIN
    RAISE NOTICE '=== 검색 기록 technology_field 업데이트 시작 ===';
    RAISE NOTICE 'User ID: %', current_user_id;
    
    -- 현재 사용자의 검색 기록 조회 및 업데이트
    FOR search_record IN 
        SELECT id, keyword, technology_field, ipc_codes
        FROM search_history 
        WHERE user_id = current_user_id 
        ORDER BY created_at DESC
    LOOP
        -- 키워드에 따른 기술 분야 분류
        CASE 
            WHEN search_record.keyword ILIKE '%블록체인%' OR search_record.keyword ILIKE '%blockchain%' THEN 
                tech_field := 'H04L';
                ipc_codes_array := ARRAY['H04L9/00', 'H04L9/32'];
            WHEN search_record.keyword ILIKE '%가방%' OR search_record.keyword ILIKE '%bag%' THEN 
                tech_field := 'A45C';
                ipc_codes_array := ARRAY['A45C5/00', 'A45C13/00'];
            WHEN search_record.keyword ILIKE '%가족%' OR search_record.keyword ILIKE '%family%' THEN 
                tech_field := 'G06Q';
                ipc_codes_array := ARRAY['G06Q50/00', 'A63F13/00'];
            WHEN search_record.keyword ILIKE '%스마트%' OR search_record.keyword ILIKE '%smart%' THEN 
                tech_field := 'G06F';
                ipc_codes_array := ARRAY['G06F21/00', 'G06K19/00'];
            WHEN search_record.keyword ILIKE '%보안%' OR search_record.keyword ILIKE '%security%' THEN 
                tech_field := 'H04L';
                ipc_codes_array := ARRAY['H04L9/00', 'G06F21/00'];
            WHEN search_record.keyword ILIKE '%AI%' OR search_record.keyword ILIKE '%인공지능%' THEN 
                tech_field := 'G06N';
                ipc_codes_array := ARRAY['G06N3/00', 'G06N20/00'];
            WHEN search_record.keyword ILIKE '%IoT%' OR search_record.keyword ILIKE '%사물인터넷%' THEN 
                tech_field := 'H04W';
                ipc_codes_array := ARRAY['H04W4/00', 'H04L12/00'];
            ELSE 
                tech_field := 'G06F';
                ipc_codes_array := ARRAY['G06F3/00', 'G06F9/00'];
        END CASE;
        
        -- technology_field와 ipc_codes 업데이트
        UPDATE search_history 
        SET 
            technology_field = tech_field,
            ipc_codes = ipc_codes_array,
            field_confidence = (random() * 0.3 + 0.7)::numeric
        WHERE id = search_record.id;
        
        RAISE NOTICE '검색 기록 업데이트: % -> % (IPC: %)', 
            search_record.keyword, tech_field, ipc_codes_array;
    END LOOP;
    
    -- 업데이트 결과 확인
    RAISE NOTICE '=== 업데이트 완료 ===';
    
    FOR search_record IN 
        SELECT keyword, technology_field, ipc_codes, field_confidence, created_at
        FROM search_history 
        WHERE user_id = current_user_id 
        ORDER BY created_at DESC
        LIMIT 10
    LOOP
        RAISE NOTICE '검색어: %, 기술분야: %, IPC: %, 신뢰도: %, 날짜: %', 
            search_record.keyword, 
            search_record.technology_field,
            search_record.ipc_codes,
            search_record.field_confidence,
            search_record.created_at;
    END LOOP;
    
END $$;