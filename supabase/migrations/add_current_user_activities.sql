-- 현재 로그인된 사용자에게 활동 데이터 추가
-- 사용자 ID: 276975db-635b-4c77-87a0-548f91b14231

-- 1. 사용자 활동 데이터 추가
INSERT INTO user_activities (
  user_id,
  activity_type,
  activity_data,
  created_at
) VALUES 
  ('276975db-635b-4c77-87a0-548f91b14231', 'search', '{"keyword": "AI 특허", "filters": {"word": "AI 특허"}, "results_count": 15, "searchType": "patent_search"}'::jsonb, NOW() - INTERVAL '1 day'),
  ('276975db-635b-4c77-87a0-548f91b14231', 'search', '{"keyword": "반도체 기술", "filters": {"word": "반도체 기술"}, "results_count": 23, "searchType": "patent_search"}'::jsonb, NOW() - INTERVAL '2 days'),
  ('276975db-635b-4c77-87a0-548f91b14231', 'search', '{"keyword": "배터리 특허", "filters": {"word": "배터리 특허"}, "results_count": 8, "searchType": "patent_search"}'::jsonb, NOW() - INTERVAL '3 days'),
  ('276975db-635b-4c77-87a0-548f91b14231', 'search', '{"keyword": "머신러닝", "filters": {"word": "머신러닝"}, "results_count": 12, "searchType": "patent_search"}'::jsonb, NOW() - INTERVAL '4 days'),
  ('276975db-635b-4c77-87a0-548f91b14231', 'search', '{"keyword": "자율주행", "filters": {"word": "자율주행"}, "results_count": 19, "searchType": "patent_search"}'::jsonb, NOW() - INTERVAL '5 days'),
  ('276975db-635b-4c77-87a0-548f91b14231', 'patent_view', '{"application_number": "US123456", "patent_title": "AI 기반 의료진단 시스템"}'::jsonb, NOW() - INTERVAL '1 day'),
  ('276975db-635b-4c77-87a0-548f91b14231', 'patent_view', '{"application_number": "KR789012", "patent_title": "반도체 공정 최적화 기술"}'::jsonb, NOW() - INTERVAL '2 days'),
  ('276975db-635b-4c77-87a0-548f91b14231', 'report_generate', '{"report_id": "report_001", "report_type": "market_analysis", "application_number": "US123456", "title": "AI 기반 의료진단 시스템"}'::jsonb, NOW() - INTERVAL '1 day'),
  ('276975db-635b-4c77-87a0-548f91b14231', 'report_generate', '{"report_id": "report_002", "report_type": "patent_analysis", "application_number": "KR789012", "title": "반도체 공정 최적화 기술"}'::jsonb, NOW() - INTERVAL '2 days'),
  ('276975db-635b-4c77-87a0-548f91b14231', 'report_generate', '{"report_id": "report_003", "report_type": "competitive_analysis", "application_number": "JP456789", "title": "배터리 관리 시스템"}'::jsonb, NOW() - INTERVAL '3 days'),
  ('276975db-635b-4c77-87a0-548f91b14231', 'dashboard_view', '{"section": "main"}'::jsonb, NOW() - INTERVAL '1 hour'),
  ('276975db-635b-4c77-87a0-548f91b14231', 'login', '{"login_method": "email"}'::jsonb, NOW() - INTERVAL '2 hours'),
  ('276975db-635b-4c77-87a0-548f91b14231', 'login', '{"login_method": "email"}'::jsonb, NOW() - INTERVAL '1 day'),
  ('276975db-635b-4c77-87a0-548f91b14231', 'login', '{"login_method": "email"}'::jsonb, NOW() - INTERVAL '2 days'),
  ('276975db-635b-4c77-87a0-548f91b14231', 'login', '{"login_method": "email"}'::jsonb, NOW() - INTERVAL '3 days')
ON CONFLICT DO NOTHING;

-- 2. AI 분석 리포트 추가
INSERT INTO ai_analysis_reports (
  user_id,
  application_number,
  invention_title,
  report_name,
  analysis_type,
  market_penetration,
  competitive_landscape,
  market_growth_drivers,
  risk_factors,
  revenue_model,
  created_at
) VALUES 
  (
    '276975db-635b-4c77-87a0-548f91b14231',
    'US123456',
    'AI 기반 의료진단 시스템',
    'AI 의료진단 시장 분석 리포트',
    'market',
    '의료 AI 시장은 연평균 25% 성장하고 있으며, 특히 진단 분야에서 높은 수요를 보이고 있습니다.',
    '주요 경쟁사로는 IBM Watson Health, Google Health, Microsoft Healthcare Bot 등이 있습니다.',
    '고령화 사회, 의료비 절감 요구, 정확한 진단에 대한 니즈가 시장 성장을 이끌고 있습니다.',
    '의료 데이터 보안, 규제 승인, 의료진의 AI 수용성이 주요 리스크 요인입니다.',
    '라이선스 수익과 SaaS 모델을 통한 지속적인 수익 창출이 가능합니다.',
    NOW() - INTERVAL '1 day'
  ),
  (
    '276975db-635b-4c77-87a0-548f91b14231',
    'KR789012',
    '반도체 공정 최적화 기술',
    '반도체 공정 기술 분석 리포트',
    'market',
    '반도체 공정 최적화 기술은 제조 효율성 향상과 수율 개선에 핵심적인 역할을 합니다.',
    'TSMC, Samsung, Intel 등 주요 파운드리 업체들이 관련 기술을 적극 도입하고 있습니다.',
    '5G, AI 칩 수요 증가와 미세공정 기술 발전이 시장 성장을 견인하고 있습니다.',
    '높은 기술 진입장벽과 대규모 투자 필요성이 주요 리스크입니다.',
    '기술 라이선스와 장비 판매를 통한 수익 모델이 적합합니다.',
    NOW() - INTERVAL '2 days'
  ),
  (
    '276975db-635b-4c77-87a0-548f91b14231',
    'JP456789',
    '배터리 관리 시스템',
    '배터리 관리 기술 시장 분석',
    'market',
    '전기차 시장 확대와 함께 배터리 관리 시스템의 중요성이 급격히 증가하고 있습니다.',
    'Tesla, BYD, CATL 등이 주요 경쟁사이며, 각사마다 독자적인 BMS 기술을 보유하고 있습니다.',
    '전기차 보급 확산, 에너지 저장 시스템 수요 증가가 주요 성장 동력입니다.',
    '배터리 안전성 이슈와 표준화 부족이 주요 리스크 요인입니다.',
    '하드웨어 판매와 소프트웨어 라이선스를 결합한 수익 모델이 효과적입니다.',
    NOW() - INTERVAL '3 days'
  )
ON CONFLICT DO NOTHING;