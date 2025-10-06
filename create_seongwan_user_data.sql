-- seongwankim@gmail.com 사용자 및 관련 데이터 생성

-- 1. 사용자 생성 또는 업데이트
INSERT INTO users (id, email, name, subscription_plan, total_searches, total_detail_views, total_logins, total_usage_cost, last_login_at, created_at, updated_at)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'seongwankim@gmail.com',
  '김성완',
  'premium',
  25,
  15,
  12,
  150.50,
  NOW(),
  NOW() - INTERVAL '30 days',
  NOW()
)
ON CONFLICT (email) 
DO UPDATE SET 
  total_searches = 25,
  total_detail_views = 15,
  total_logins = 12,
  total_usage_cost = 150.50,
  last_login_at = NOW(),
  updated_at = NOW();

-- 2. 검색 기록 데이터 생성
INSERT INTO search_history (id, user_id, keyword, applicant, search_results, results_count, technology_field, created_at)
SELECT 
  gen_random_uuid(),
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  queries.keyword,
  queries.applicant,
  '[]'::jsonb,
  queries.results_count,
  queries.technology_field,
  NOW() - INTERVAL '1 day' * queries.days_ago
FROM (VALUES 
  ('인공지능', '삼성전자', 45, 'AI/ML', 1),
  ('블록체인', 'LG전자', 32, '블록체인', 2),
  ('IoT 센서', 'SK하이닉스', 28, 'IoT', 3),
  ('자율주행', '현대자동차', 55, '자동차', 4),
  ('5G 통신', 'KT', 38, '통신', 5),
  ('배터리 기술', 'LG화학', 42, '에너지', 7),
  ('반도체', '삼성전자', 67, '반도체', 10),
  ('로봇공학', '현대로보틱스', 29, '로봇', 12),
  ('바이오', '셀트리온', 33, '바이오', 15),
  ('VR/AR', '네이버', 24, 'VR/AR', 18)
) AS queries(keyword, applicant, results_count, technology_field, days_ago)
ON CONFLICT DO NOTHING;

-- 3. 특허 상세 조회 기록 생성
INSERT INTO patent_detail_views (id, user_id, patent_application_number, patent_title, applicant_name, view_duration_ms, referrer_page, created_at)
SELECT 
  gen_random_uuid(),
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  patents.application_number,
  patents.title,
  patents.applicant,
  patents.duration,
  'search_results',
  NOW() - INTERVAL '1 day' * patents.days_ago
FROM (VALUES 
  ('1020230001234', 'AI 기반 자율주행 시스템', '삼성전자', 120000, 1),
  ('1020230005678', '딥러닝을 이용한 영상 인식 방법', 'LG전자', 95000, 2),
  ('1020230009876', '블록체인 기반 보안 시스템', 'SK텔레콤', 180000, 3),
  ('1020230011111', '5G 통신을 위한 안테나 설계', 'KT', 75000, 4),
  ('1020230022222', 'IoT 센서 네트워크 구성 방법', 'SK하이닉스', 110000, 5),
  ('1020230033333', '양자 암호화 통신 시스템', '삼성전자', 200000, 6),
  ('1020230044444', '바이오 센서를 이용한 진단 장치', '셀트리온', 85000, 7),
  ('1020230055555', '태양광 발전 효율 개선 방법', 'LG화학', 130000, 8),
  ('1020180028044', '인공지능 기반 데이터 처리 시스템', '네이버', 160000, 9),
  ('1020230115700', '전자 장치 및 음악 컨텐츠 시각화', '삼성전자', 140000, 10)
) AS patents(application_number, title, applicant, duration, days_ago)
ON CONFLICT DO NOTHING;

-- 4. AI 분석 보고서 데이터 생성
INSERT INTO ai_analysis_reports (
  id, user_id, application_number, invention_title, analysis_type, 
  market_penetration, competitive_landscape, market_growth_drivers, 
  risk_factors, revenue_model, royalty_margin, new_business_opportunities, 
  competitor_response_strategy, report_name, created_at, updated_at
)
SELECT 
  gen_random_uuid(),
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  reports.application_number,
  reports.invention_title,
  'market',
  reports.market_penetration,
  reports.competitive_landscape,
  reports.market_growth_drivers,
  reports.risk_factors,
  reports.revenue_model,
  reports.royalty_margin,
  reports.new_business_opportunities,
  reports.competitor_response_strategy,
  reports.report_name,
  NOW() - INTERVAL '1 day' * reports.days_ago,
  NOW() - INTERVAL '1 day' * reports.days_ago
FROM (VALUES 
  ('1020230001234', 'AI 기반 자율주행 시스템', 'AI 자율주행 시장 분석', '높은 시장 침투율 예상', '경쟁이 치열한 시장', '자율주행 기술 발전', '규제 리스크', '라이선싱 모델', '15-25%', '모빌리티 서비스 확장', '기술 차별화 전략', 1),
  ('1020230005678', '딥러닝 영상 인식', '딥러닝 영상 인식 시장 분석', '중간 수준의 시장 침투율', '기술 리더들의 경쟁', 'AI 기술 발전', '기술 변화 속도', '제품 판매 모델', '20-30%', 'B2B 솔루션 확장', '특허 포트폴리오 강화', 2),
  ('1020230009876', '블록체인 보안 시스템', '블록체인 보안 시장 분석', '초기 단계의 시장 침투', '보안 전문 업체들의 경쟁', '디지털 보안 수요 증가', '규제 불확실성', '구독 모델', '25-35%', '금융 서비스 확장', '표준화 선도 전략', 3),
  ('1020230011111', '5G 안테나 설계', '5G 통신 시장 분석', '높은 시장 성장률', '통신 장비 업체들의 경쟁', '5G 인프라 확산', '기술 표준 변화', '하드웨어 판매', '10-20%', '6G 기술 선점', '특허 라이선싱 전략', 4),
  ('1020230022222', 'IoT 센서 네트워크', 'IoT 센서 시장 분석', '빠른 시장 성장', 'IoT 플랫폼 업체들의 경쟁', 'IoT 생태계 확산', '보안 취약성', '플랫폼 모델', '15-25%', '스마트시티 확장', '생태계 구축 전략', 5)
) AS reports(application_number, invention_title, report_name, market_penetration, competitive_landscape, market_growth_drivers, risk_factors, revenue_model, royalty_margin, new_business_opportunities, competitor_response_strategy, days_ago)
ON CONFLICT DO NOTHING;

-- 5. 사용자 로그인 기록 생성
INSERT INTO user_login_logs (id, user_id, login_method, login_success, session_duration_ms, created_at)
SELECT 
  gen_random_uuid(),
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  logins.method,
  logins.success,
  logins.duration,
  NOW() - INTERVAL '1 day' * logins.days_ago
FROM (VALUES 
  ('email', true, 3600000, 1),
  ('email', true, 2400000, 2),
  ('email', true, 4200000, 3),
  ('email', true, 1800000, 5),
  ('email', true, 5400000, 7),
  ('email', true, 3000000, 10),
  ('email', true, 2700000, 12),
  ('email', true, 3900000, 15),
  ('email', true, 2100000, 18),
  ('email', true, 4800000, 20),
  ('email', true, 3300000, 25),
  ('email', true, 2850000, 28)
) AS logins(method, success, duration, days_ago)
ON CONFLICT DO NOTHING;

-- 6. 사용량 비용 추적 데이터 생성
INSERT INTO usage_cost_tracking (id, user_id, service_type, cost, currency, billing_unit, quantity, metadata, created_at)
SELECT 
  gen_random_uuid(),
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  costs.service_type,
  costs.cost,
  'KRW',
  costs.billing_unit,
  costs.quantity,
  costs.metadata,
  NOW() - INTERVAL '1 day' * costs.days_ago
FROM (VALUES 
  ('search', 5.50, 'per_search', 5, '{"search_type": "patent", "results_count": 45}', 1),
  ('ai_analysis', 25.00, 'per_report', 1, '{"report_type": "market", "pages": 15}', 2),
  ('search', 8.25, 'per_search', 7, '{"search_type": "patent", "results_count": 67}', 3),
  ('ai_analysis', 25.00, 'per_report', 1, '{"report_type": "market", "pages": 12}', 4),
  ('search', 6.75, 'per_search', 6, '{"search_type": "patent", "results_count": 55}', 5),
  ('ai_analysis', 25.00, 'per_report', 1, '{"report_type": "market", "pages": 18}', 7),
  ('search', 4.50, 'per_search', 4, '{"search_type": "patent", "results_count": 38}', 10),
  ('ai_analysis', 25.00, 'per_report', 1, '{"report_type": "market", "pages": 14}', 12),
  ('search', 7.00, 'per_search', 6, '{"search_type": "patent", "results_count": 42}', 15),
  ('ai_analysis', 25.00, 'per_report', 1, '{"report_type": "market", "pages": 16}', 18)
) AS costs(service_type, cost, billing_unit, quantity, metadata, days_ago)
ON CONFLICT DO NOTHING;

-- 7. 사용자 활동 데이터 생성
INSERT INTO user_activities (id, user_id, activity_type, activity_data, created_at)
SELECT 
  gen_random_uuid(),
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  activities.activity_type,
  activities.activity_data,
  NOW() - INTERVAL '1 day' * activities.days_ago
FROM (VALUES 
  ('search', '{"keyword": "인공지능", "results_count": 45, "technology_field": "AI/ML"}', 1),
  ('patent_view', '{"application_number": "1020230001234", "patent_title": "AI 기반 자율주행 시스템"}', 1),
  ('ai_analysis', '{"application_number": "1020230001234", "report_type": "market"}', 1),
  ('search', '{"keyword": "블록체인", "results_count": 32, "technology_field": "블록체인"}', 2),
  ('patent_view', '{"application_number": "1020230005678", "patent_title": "딥러닝 영상 인식"}', 2),
  ('search', '{"keyword": "IoT 센서", "results_count": 28, "technology_field": "IoT"}', 3),
  ('patent_view', '{"application_number": "1020230009876", "patent_title": "블록체인 보안 시스템"}', 3),
  ('ai_analysis', '{"application_number": "1020230005678", "report_type": "market"}', 3),
  ('search', '{"keyword": "자율주행", "results_count": 55, "technology_field": "자동차"}', 4),
  ('patent_view', '{"application_number": "1020230011111", "patent_title": "5G 안테나 설계"}', 4),
  ('search', '{"keyword": "5G 통신", "results_count": 38, "technology_field": "통신"}', 5),
  ('patent_view', '{"application_number": "1020230022222", "patent_title": "IoT 센서 네트워크"}', 5),
  ('ai_analysis', '{"application_number": "1020230009876", "report_type": "market"}', 5),
  ('search', '{"keyword": "배터리 기술", "results_count": 42, "technology_field": "에너지"}', 7),
  ('patent_view', '{"application_number": "1020230033333", "patent_title": "양자 암호화 통신"}', 7),
  ('search', '{"keyword": "반도체", "results_count": 67, "technology_field": "반도체"}', 10),
  ('patent_view', '{"application_number": "1020230044444", "patent_title": "바이오 센서 진단 장치"}', 10),
  ('ai_analysis', '{"application_number": "1020230011111", "report_type": "market"}', 10),
  ('search', '{"keyword": "로봇공학", "results_count": 29, "technology_field": "로봇"}', 12),
  ('patent_view', '{"application_number": "1020230055555", "patent_title": "태양광 발전 효율 개선"}', 12),
  ('search', '{"keyword": "바이오", "results_count": 33, "technology_field": "바이오"}', 15),
  ('patent_view', '{"application_number": "1020180028044", "patent_title": "인공지능 기반 데이터 처리"}', 15),
  ('ai_analysis', '{"application_number": "1020230022222", "report_type": "market"}', 15),
  ('search', '{"keyword": "VR/AR", "results_count": 24, "technology_field": "VR/AR"}', 18),
  ('patent_view', '{"application_number": "1020230115700", "patent_title": "전자 장치 음악 컨텐츠 시각화"}', 18)
) AS activities(activity_type, activity_data, days_ago)
ON CONFLICT DO NOTHING;