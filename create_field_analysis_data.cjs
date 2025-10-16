require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// 서비스 역할 키 사용 (RLS 우회)
const supabase = createClient(
  process.env.VITE_SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function createTestData() {
  console.log('=== 분야 분석 테스트 데이터 생성 ===');
  
  try {
    // 현재 사용자 확인
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .limit(1);
      
    if (!users || users.length === 0) {
      console.log('사용자가 없습니다. 먼저 회원가입을 해주세요.');
      return;
    }
    
    const userId = users[0].id;
    console.log('사용자 ID:', userId);
    
    // 1. 검색 기록 테스트 데이터 생성
    const searchData = [
      {
        user_id: userId,
        keyword: 'AI 인공지능 기술',
        technology_field: '인공지능',
        ipc_codes: ['G06N'],
        applicant: 'Google',
        search_results: { total: 150 },
        created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        user_id: userId,
        keyword: '자동차 전기차 배터리',
        technology_field: '자동차',
        ipc_codes: ['B60L'],
        applicant: 'Tesla',
        search_results: { total: 89 },
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        user_id: userId,
        keyword: '의료 진단 시스템',
        technology_field: '의료',
        ipc_codes: ['A61B'],
        applicant: 'Samsung',
        search_results: { total: 67 },
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        user_id: userId,
        keyword: '5G 통신 기술',
        technology_field: '통신',
        ipc_codes: ['H04B'],
        applicant: 'Qualcomm',
        search_results: { total: 234 },
        created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        user_id: userId,
        keyword: '반도체 칩 설계',
        technology_field: '반도체',
        ipc_codes: ['H01L'],
        applicant: 'Intel',
        search_results: { total: 178 },
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        user_id: userId,
        keyword: '태양광 에너지',
        technology_field: '에너지',
        ipc_codes: ['H01L31'],
        applicant: 'LG',
        search_results: { total: 95 },
        created_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        user_id: userId,
        keyword: '머신러닝 알고리즘',
        technology_field: '인공지능',
        ipc_codes: ['G06N'],
        applicant: 'Microsoft',
        search_results: { total: 123 },
        created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        user_id: userId,
        keyword: '스마트폰 앱 개발',
        technology_field: '소프트웨어',
        ipc_codes: ['G06F'],
        applicant: 'Apple',
        search_results: { total: 87 },
        created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];
    
    const { data: insertedSearches, error: searchError } = await supabase
      .from('search_history')
      .insert(searchData)
      .select();
      
    if (searchError) {
      console.error('검색 기록 생성 오류:', searchError);
    } else {
      console.log('검색 기록 생성 완료:', insertedSearches?.length || 0, '개');
    }
    
    // AI 분석 리포트 테스트 데이터
    const reportData = [
      {
        user_id: userId,
        application_number: 'KR20240001001',
        report_name: 'AI 기반 특허 분석 리포트',
        invention_title: '인공지능 기반 자동차 자율주행 시스템',
        analysis_type: 'technology_analysis',
        ipc_codes: ['G06N3/08', 'B60W30/00'],
        technology_field: 'AI/머신러닝',
        technology_fields: ['Artificial Intelligence', 'Autonomous Vehicles'],
        market_penetration: 'AI 자율주행 기술의 시장 침투율 분석',
        competitive_landscape: '테슬라, 구글, 우버 등 주요 경쟁사 분석',
        market_growth_drivers: 'AI 기술 발전, 자율주행 규제 완화',
        risk_factors: '기술적 한계, 법적 규제, 사회적 수용성',
        created_at: new Date().toISOString()
      },
      {
        user_id: userId,
        application_number: 'KR20240001002',
        report_name: '바이오 기술 특허 동향 분석',
        invention_title: 'CRISPR 기반 유전자 편집 기술',
        analysis_type: 'market_analysis',
        ipc_codes: ['C12N15/10', 'A61K48/00'],
        technology_field: '바이오/의료',
        technology_fields: ['Biotechnology', 'Gene Editing'],
        market_penetration: 'CRISPR 기술의 의료 분야 적용 현황',
        competitive_landscape: '에디타스, 크리스퍼 테라퓨틱스 등 주요 업체',
        market_growth_drivers: '유전자 치료 수요 증가, 기술 발전',
        risk_factors: '윤리적 문제, 규제 리스크, 기술적 부작용',
        created_at: new Date().toISOString()
      },
      {
        user_id: userId,
        application_number: 'KR20240001003',
        report_name: '5G 통신 기술 분석',
        invention_title: '5G 네트워크 최적화 시스템',
        analysis_type: 'technical_analysis',
        ipc_codes: ['H04B7/26', 'H04W24/02'],
        technology_field: '통신/네트워크',
        technology_fields: ['5G Technology', 'Network Optimization'],
        market_penetration: '5G 기술의 글로벌 확산 현황',
        competitive_landscape: '삼성, 화웨이, 에릭슨 등 주요 장비업체',
        market_growth_drivers: 'IoT 확산, 스마트시티 구축',
        risk_factors: '표준화 지연, 인프라 투자 부담',
        created_at: new Date().toISOString()
      }
    ];
    
    const { data: insertedReports, error: reportError } = await supabase
      .from('ai_analysis_reports')
      .insert(reportData)
      .select();
      
    if (reportError) {
      console.error('AI 리포트 생성 오류:', reportError);
    } else {
      console.log('AI 리포트 생성 완료:', insertedReports?.length || 0, '개');
    }
    
    console.log('\n=== 데이터 생성 완료 ===');
    console.log('이제 대시보드에서 분야 분석 차트가 표시됩니다.');
    
  } catch (error) {
    console.error('데이터 생성 중 오류:', error);
  }
}

createTestData();