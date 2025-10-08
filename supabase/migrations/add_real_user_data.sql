-- 실제 사용자 ID로 테스트 데이터 추가
-- 사용자 ID: 51c66d4c-4a2f-4079-9173-a3d92b9702ed

-- 1. 사용자 활동 데이터 추가
INSERT INTO user_activities (
  user_id,
  activity_type,
  activity_data,
  created_at
) VALUES 
  ('51c66d4c-4a2f-4079-9173-a3d92b9702ed', 'search', '{"query": "AI 특허", "results_count": 15}'::jsonb, NOW() - INTERVAL '1 day'),
  ('51c66d4c-4a2f-4079-9173-a3d92b9702ed', 'search', '{"query": "반도체 기술", "results_count": 23}'::jsonb, NOW() - INTERVAL '2 days'),
  ('51c66d4c-4a2f-4079-9173-a3d92b9702ed', 'search', '{"query": "배터리 특허", "results_count": 8}'::jsonb, NOW() - INTERVAL '3 days'),
  ('51c66d4c-4a2f-4079-9173-a3d92b9702ed', 'report_generation', '{"report_type": "market_analysis", "patent_id": "US123456"}'::jsonb, NOW() - INTERVAL '1 day'),
  ('51c66d4c-4a2f-4079-9173-a3d92b9702ed', 'report_generation', '{"report_type": "patent_analysis", "patent_id": "KR789012"}'::jsonb, NOW() - INTERVAL '5 days'),
  ('51c66d4c-4a2f-4079-9173-a3d92b9702ed', 'dashboard_view', '{"page": "main"}'::jsonb, NOW() - INTERVAL '1 hour'),
  ('51c66d4c-4a2f-4079-9173-a3d92b9702ed', 'login', '{}'::jsonb, NOW() - INTERVAL '2 hours')
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
    '51c66d4c-4a2f-4079-9173-a3d92b9702ed',
    'US123456-real',
    'AI 기반 의료진단 시스템 (실제 사용자)',
    'AI 의료진단 시장분석 리포트 (실제)',
    'market',
    'AI 의료진단 시장은 빠르게 성장하고 있으며, 특히 영상 진단 분야에서 높은 정확도를 보이고 있습니다.',
    'Google Health, IBM Watson Health, Philips Healthcare 등이 주요 경쟁사로 활동하고 있습니다.',
    '고령화 사회, 의료진 부족, 진단 정확도 향상 요구가 주요 성장 동력입니다.',
    '규제 승인 지연, 의료진 저항, 데이터 프라이버시 이슈가 주요 위험 요소입니다.',
    'SaaS 구독 모델과 라이선스 수익을 통한 안정적인 수익 창출이 가능합니다.',
    NOW() - INTERVAL '1 day'
  ),
  (
    '51c66d4c-4a2f-4079-9173-a3d92b9702ed',
    'KR789012-real',
    '반도체 공정 최적화 기술 (실제 사용자)',
    '반도체 기술 특허분석 리포트 (실제)',
    'market',
    '반도체 공정 최적화는 수율 향상과 비용 절감에 핵심적인 역할을 하고 있습니다.',
    'Samsung, TSMC, Intel 등이 주요 경쟁사이며, 각사는 독자적인 공정 기술을 보유하고 있습니다.',
    'AI/ML 반도체 수요 증가, 5G/6G 통신, 자율주행차 등이 주요 성장 동력입니다.',
    '지정학적 리스크, 공급망 불안정, 높은 R&D 투자 비용이 주요 위험 요소입니다.',
    '기술 라이선스와 장비 판매를 통한 수익 모델이 적합합니다.',
    NOW() - INTERVAL '5 days'
  )
ON CONFLICT DO NOTHING;
-- 사용자 ID: 51c66d4c-4a2f-4079-9173-a3d92b9702ed

-- 1. 사용자 활동 데이터 추가
INSERT INTO user_activities (
  user_id,
  activity_type,
  activity_data,
  created_at
) VALUES 
  ('51c66d4c-4a2f-4079-9173-a3d92b9702ed', 'search', '{"query": "AI 특허", "results_count": 15}'::jsonb, NOW() - INTERVAL '1 day'),
  ('51c66d4c-4a2f-4079-9173-a3d92b9702ed', 'search', '{"query": "반도체 기술", "results_count": 23}'::jsonb, NOW() - INTERVAL '2 days'),
  ('51c66d4c-4a2f-4079-9173-a3d92b9702ed', 'search', '{"query": "배터리 특허", "results_count": 8}'::jsonb, NOW() - INTERVAL '3 days'),
  ('51c66d4c-4a2f-4079-9173-a3d92b9702ed', 'report_generation', '{"report_type": "market_analysis", "patent_id": "US123456"}'::jsonb, NOW() - INTERVAL '1 day'),
  ('51c66d4c-4a2f-4079-9173-a3d92b9702ed', 'report_generation', '{"report_type": "patent_analysis", "patent_id": "KR789012"}'::jsonb, NOW() - INTERVAL '5 days'),
  ('51c66d4c-4a2f-4079-9173-a3d92b9702ed', 'dashboard_view', '{"page": "main"}'::jsonb, NOW() - INTERVAL '1 hour'),
  ('51c66d4c-4a2f-4079-9173-a3d92b9702ed', 'login', '{}'::jsonb, NOW() - INTERVAL '2 hours')
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
    '51c66d4c-4a2f-4079-9173-a3d92b9702ed',
    'US123456-real',
    'AI 기반 의료진단 시스템 (실제 사용자)',
    'AI 의료진단 시장분석 리포트 (실제)',
    'market',
    'AI 의료진단 시장은 빠르게 성장하고 있으며, 특히 영상 진단 분야에서 높은 정확도를 보이고 있습니다.',
    'Google Health, IBM Watson Health, Philips Healthcare 등이 주요 경쟁사로 활동하고 있습니다.',
    '고령화 사회, 의료진 부족, 진단 정확도 향상 요구가 주요 성장 동력입니다.',
    '규제 승인 지연, 의료진 저항, 데이터 프라이버시 이슈가 주요 위험 요소입니다.',
    'SaaS 구독 모델과 라이선스 수익을 통한 안정적인 수익 창출이 가능합니다.',
    NOW() - INTERVAL '1 day'
  ),
  (
    '51c66d4c-4a2f-4079-9173-a3d92b9702ed',
    'KR789012-real',
    '반도체 공정 최적화 기술 (실제 사용자)',
    '반도체 기술 특허분석 리포트 (실제)',
    'market',
    '반도체 공정 최적화는 수율 향상과 비용 절감에 핵심적인 역할을 하고 있습니다.',
    'Samsung, TSMC, Intel 등이 주요 경쟁사이며, 각사는 독자적인 공정 기술을 보유하고 있습니다.',
    'AI/ML 반도체 수요 증가, 5G/6G 통신, 자율주행차 등이 주요 성장 동력입니다.',
    '지정학적 리스크, 공급망 불안정, 높은 R&D 투자 비용이 주요 위험 요소입니다.',
    '기술 라이선스와 장비 판매를 통한 수익 모델이 적합합니다.',
    NOW() - INTERVAL '5 days'
  )
ON CONFLICT DO NOTHING;