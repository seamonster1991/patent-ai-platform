import { createClient } from '@supabase/supabase-js';
import DashboardAnalytics from '../lib/dashboard-analytics.js';

// 카테고리 분석 함수들 (이전 api-backup/category-analyzer에서 이동)
function getCategoryStats(texts) {
  const categoryMap = {
    'IT/소프트웨어': [
       // 영어
       'AI', 'artificial intelligence', 'machine learning', 'deep learning', 'ML', 'software', 'app', 'platform',
       'quantum computing', 'blockchain', 'internet of things', 'IoT', 'VR/AR', 'virtual reality', 'augmented reality',
       // 한국어
       '인공지능', 'AI/머신러닝', 'AI/ML', '머신러닝', '딥러닝', '소프트웨어', '앱', '플랫폼', '소프트웨어/앱',
       '블록체인', '양자컴퓨팅', 'VR/AR', 'Blockchain', 'Quantum Computing', 'Internet of Things',
       // IPC 분류
       '물리학',
       // IPC 코드
       'G06N', 'G06Q', 'G06F'
     ],
    '통신/전자': [
       // 영어
       'communication', 'telecommunications', '5G', 'network', 'wireless', 'semiconductor', 'chip', 'processor',
       'Telecommunications',
       // 한국어
       '통신', '네트워크', '무선', '반도체', '칩', '프로세서', '통신/네트워크', '전자',
       // IPC 분류
       '전기',
       // IPC 코드
       'H04B', 'H04W', 'H01L', 'H04N', 'H04L'
     ],
    '자동차/교통': [
      // 영어
      'automotive', 'vehicle', 'electric vehicle', 'autonomous', 'transportation',
      // 한국어
      '자동차', '차량', '전기차', '자율주행', '교통', '운수',
      // IPC 분류
      '처리조작/운수',
      // IPC 코드
      'B60W', 'B60L', 'B62D', 'G01S'
    ],
    '바이오/의료': [
      // 영어
      'medical', 'healthcare', 'bio', 'biotechnology', 'pharmaceutical', 'gene', 'CRISPR',
      // 한국어
      '의료', '헬스케어', '바이오', '제약', '유전자', '바이오/의료',
      // IPC 분류
      '생활필수품',
      // IPC 코드
      'A61B', 'A61K', 'C12N', 'A61P'
    ],
    '에너지/환경': [
      // 영어
      'energy', 'battery', 'solar', 'wind', 'renewable', 'environment',
      'Energy',
      // 한국어
      '에너지', '배터리', '태양광', '풍력', '재생에너지', '환경',
      // IPC 코드
      'H01M', 'H02S', 'F03D'
    ],
    '화학/소재': [
      // 영어
      'chemical', 'material', 'polymer', 'nanotechnology',
      // 한국어
      '화학', '소재', '고분자', '나노기술',
      // IPC 분류
      '화학/야금',
      // IPC 코드
      'C01B', 'C08F', 'C23C'
    ],
    '기계/제조': [
      // 영어
      'mechanical', 'manufacturing', 'robotics', 'automation',
      // 한국어
      '기계', '제조', '로봇', '자동화',
      // IPC 분류
      '기계공학/조명/가열/무기/폭파', '고정구조물',
      // IPC 코드
      'B25J', 'F16H', 'E04B', 'A45C'
    ],
    '기타': []
  };

  const stats = {};
  Object.keys(categoryMap).forEach(category => {
    stats[category] = 0;
  });

  texts.forEach(text => {
    if (!text) return;
    const originalText = text.trim();
    const lowerText = originalText.toLowerCase();
    let categorized = false;

    // 정확한 매칭을 위한 우선순위 처리
    for (const [category, keywords] of Object.entries(categoryMap)) {
      if (category === '기타') continue;
      
      // 1. 정확한 일치 확인 (대소문자 무시)
      if (keywords.some(keyword => 
        lowerText === keyword.toLowerCase() || 
        originalText === keyword
      )) {
        stats[category]++;
        categorized = true;
        break;
      }
      
      // 2. 부분 문자열 포함 확인
      if (!categorized && keywords.some(keyword => 
        lowerText.includes(keyword.toLowerCase())
      )) {
        stats[category]++;
        categorized = true;
        break;
      }
    }

    if (!categorized) {
      stats['기타']++;
    }
  });

  return stats;
}

function formatForChart(categoryStats) {
  return Object.entries(categoryStats)
    .filter(([_, value]) => value > 0)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

export default async function handler(req, res) {
  try {
    // 강화된 CORS 헤더 설정 (Vercel 환경 최적화)
    const origin = req.headers.origin;
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:3005',
      'https://patent-ai-vercel.vercel.app',
      'https://patent-ai.vercel.app'
    ];
    
    // Vercel 환경에서 동적 도메인 허용 (보안 강화)
    const isVercelDomain = origin && (
      origin.includes('.vercel.app') && origin.includes('patent-ai')
    );
    
    const isLocalhost = origin && origin.includes('localhost');
    
    if (allowedOrigins.includes(origin) || isVercelDomain || isLocalhost) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else if (!origin) {
      // 서버 간 요청의 경우
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
    
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-User-ID');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    if (req.method !== 'GET') {
      return res.status(405).json({ 
        success: false, 
        error: 'Method not allowed',
        allowedMethods: ['GET', 'OPTIONS']
      });
    }

    console.log('📊 [Dashboard Analytics] API 요청:', {
      method: req.method,
      url: req.url,
      headers: {
        authorization: req.headers.authorization ? 'Bearer ***' : 'none',
        origin: req.headers.origin,
        userAgent: req.headers['user-agent']?.substring(0, 50) + '...'
      },
      query: req.query
    });

    // 차트 데이터 요청 처리
    if (req.query.type === 'chart-data') {
      return handleChartDataRequest(req, res);
    }

    // 단순화된 사용자 인증 확인
    const authHeader = req.headers.authorization;
    let userId = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        // Supabase JWT 토큰 검증 (단순화)
        if (token && token.includes('.') && token.split('.').length === 3) {
          const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
          userId = payload.sub || payload.user_id;
          console.log('🔐 [Dashboard Analytics] 토큰에서 사용자 ID 추출:', { userId });
        }
      } catch (error) {
        console.warn('⚠️ [Dashboard Analytics] JWT 토큰 파싱 실패:', error.message);
      }
    }

    // URL 쿼리에서 사용자 ID 확인 (개발/테스트용)
    if (!userId && req.query.userId) {
      userId = req.query.userId;
      console.log('🔧 [Dashboard Analytics] 쿼리 파라미터에서 사용자 ID 사용:', { userId });
    }

    // 환경변수 확인
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return res.status(500).json({ 
        success: false, 
        error: 'Server configuration error',
        details: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'
      });
    }

    // 대시보드 분석 클래스 초기화
    const analytics = new DashboardAnalytics(supabaseUrl, supabaseServiceKey);
    
    // Supabase 클라이언트 생성 (기존 코드와의 호환성을 위해 유지)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 100일 전 날짜 계산
    const hundredDaysAgo = new Date();
    hundredDaysAgo.setDate(hundredDaysAgo.getDate() - 100);
    const startDate = hundredDaysAgo.toISOString();

    console.log('📊 [Dashboard Analytics] 100일 데이터 분석 시작:', {
      startDate,
      endDate: new Date().toISOString()
    });

    // 사용자별 데이터와 시장 평균 데이터를 분리하여 조회
    const userQueries = [];
    const marketQueries = [];

    if (userId) {
      // 사용자별 데이터 쿼리
      userQueries.push(
        // 1. 사용자 검색 추이 데이터 (search_history 테이블에서 조회)
        supabase
          .from('search_history')
          .select('created_at, keyword, technology_field, ipc_codes')
          .eq('user_id', userId)
          .gte('created_at', startDate)
          .order('created_at', { ascending: true }),

        // 2. 사용자 리포트 추이 데이터 (ai_analysis_reports 테이블에서 조회)
        supabase
          .from('ai_analysis_reports')
          .select('created_at, invention_title, report_name, technology_field, ipc_codes')
          .eq('user_id', userId)
          .gte('created_at', startDate)
          .order('created_at', { ascending: true }),

        // 3. 사용자 로그인 데이터 (전환율 계산용)
        supabase
          .from('user_activities')
          .select('activity_type')
          .eq('user_id', userId)
          .gte('created_at', startDate)
          .eq('activity_type', 'login'),

        // 4. 사용자 검색 분야 분석 (search_history에서 technology_field 조회)
        supabase
          .from('search_history')
          .select('technology_field, ipc_codes')
          .eq('user_id', userId)
          .gte('created_at', startDate)
          .not('technology_field', 'is', null),

        // 5. 사용자 리포트 분야 분석 (ai_analysis_reports에서 technology_field 조회)
        supabase
          .from('ai_analysis_reports')
          .select('technology_field, ipc_codes')
          .eq('user_id', userId)
          .gte('created_at', startDate)
          .not('technology_field', 'is', null),

        // 6. 사용자 최근 검색 (search_history에서 keyword와 created_at 조회)
        supabase
          .from('search_history')
          .select('keyword, created_at, technology_field')
          .eq('user_id', userId)
          .gte('created_at', startDate)
          .order('created_at', { ascending: false })
          .limit(10),

        // 7. 사용자 최근 리포트 (ai_analysis_reports에서 제목과 created_at 조회)
        supabase
          .from('ai_analysis_reports')
          .select('invention_title, report_name, created_at, technology_field')
          .eq('user_id', userId)
          .gte('created_at', startDate)
          .order('created_at', { ascending: false })
          .limit(10)
      );
    }

    // 시장 평균 데이터 쿼리 (모든 사용자)
    marketQueries.push(
      // 1. 시장 검색 추이 데이터 (search_history에서 조회)
      supabase
        .from('search_history')
        .select('created_at')
        .gte('created_at', startDate)
        .order('created_at', { ascending: true }),

      // 2. 시장 리포트 추이 데이터 (ai_analysis_reports에서 조회)
      supabase
        .from('ai_analysis_reports')
        .select('created_at')
        .gte('created_at', startDate)
        .order('created_at', { ascending: true }),

      // 3. 시장 검색 분야 분석 (search_history에서 technology_field 조회)
      supabase
        .from('search_history')
        .select('technology_field, ipc_codes')
        .gte('created_at', startDate)
        .not('technology_field', 'is', null),

      // 4. 시장 리포트 분야 분석 (ai_analysis_reports에서 technology_field 조회)
      supabase
        .from('ai_analysis_reports')
        .select('technology_field, ipc_codes')
        .gte('created_at', startDate)
        .not('technology_field', 'is', null)
    );

    // 병렬로 데이터 조회 실행
    let userResults = [];
    let marketResults = [];

    try {
      if (userId && userQueries.length > 0) {
        userResults = await Promise.all(userQueries);
        console.log('👤 [Dashboard Analytics] 사용자별 데이터 조회 완료:', {
          userId,
          queriesCount: userQueries.length
        });
      }

      marketResults = await Promise.all(marketQueries);
      console.log('🌍 [Dashboard Analytics] 시장 평균 데이터 조회 완료:', {
        queriesCount: marketQueries.length
      });

      // 결과 데이터 구성
      const responseData = {
        success: true,
        userId: userId,
        hasUserData: userId && userResults.length > 0,
        data: {}
      };

      // 사용자별 데이터 처리
      let userSearchTrendsData = [];
      let userReportTrendsData = [];
      let userSearchFields = [];
      let userReportFields = [];
      let userRecentSearches = [];
      let userRecentReports = [];
      let searchToReportConversion = 0;
      let loginToReportConversion = 0;
      let totalLogins = 0;
      let totalSearches = 0;
      let totalReports = 0;

      if (userId && userResults.length > 0) {
        const [
          userSearchTrends,
          userReportTrends,
          userLoginData,
          userSearchFieldsData,
          userReportFieldsData,
          userRecentSearchesData,
          userRecentReportsData
        ] = userResults;

        // 전환율 계산
        const searchCount = userSearchTrends.data?.length || 0;
        const reportCount = userReportTrends.data?.length || 0;
        const loginCount = userLoginData.data?.length || 0;

        searchToReportConversion = searchCount > 0 ? parseFloat((reportCount / searchCount * 100).toFixed(2)) : 0;
        loginToReportConversion = loginCount > 0 ? parseFloat((reportCount / loginCount * 100).toFixed(2)) : 0;

        userSearchTrendsData = processDateTrends(userSearchTrends.data || []);
        userReportTrendsData = processDateTrends(userReportTrends.data || []);
        userSearchFields = processFieldAnalysis(userSearchFieldsData.data || []);
        userReportFields = processFieldAnalysis(userReportFieldsData.data || []);
        userRecentSearches = processRecentActivities(userRecentSearchesData.data || [], 'search');
        userRecentReports = processRecentActivities(userRecentReportsData.data || [], 'report');
        totalSearches = searchCount;
        totalReports = reportCount;
        totalLogins = loginCount;
      }

      // 시장 평균 데이터 처리
      const [
        marketSearchTrends,
        marketReportTrends,
        marketSearchFields,
        marketReportFields
      ] = marketResults;

      // 기존 분야 분석 데이터는 그대로 유지
      const marketSearchFieldsData = processFieldAnalysis(marketSearchFields.data || []);
      const marketReportFieldsData = processFieldAnalysis(marketReportFields.data || []);

      // 새로운 실제 시장평균 계산 (100일간 모든 사용자 데이터 / 총 사용자 수)
      console.log('📊 [Dashboard Analytics] 실제 시장평균 계산 시작...');
      const marketSearchTrendsData = await generateRealMarketAverage(supabase, startDate, 'search');
      const marketReportTrendsData = await generateRealMarketAverage(supabase, startDate, 'report');

      // 시장평균 총합 계산 (새로운 방식)
      const marketSearchTotal = marketSearchTrendsData.reduce((sum, item) => sum + item.count, 0);
      const marketReportTotal = marketReportTrendsData.reduce((sum, item) => sum + item.count, 0);

      // 프론트엔드가 기대하는 구조로 데이터 구성
      responseData.data = {
        searchTrends: {
          userSearches: userSearchTrendsData,
          marketAverage: marketSearchTrendsData,
          marketTotal: marketSearchTotal  // 100일 총합 추가
        },
        reportTrends: {
          userReports: userReportTrendsData,
          marketAverage: marketReportTrendsData,
          marketTotal: marketReportTotal  // 100일 총합 추가
        },
        conversionRates: {
          loginConversion: {
            totalLogins: totalLogins,
            totalReports: totalReports,
            conversionRate: loginToReportConversion
          },
          searchConversion: {
            totalSearches: totalSearches,
            totalReports: totalReports,
            conversionRate: searchToReportConversion
          }
        },
        fieldAnalysis: {
          userSearchFields: userSearchFields,
          marketSearchFields: marketSearchFieldsData,
          userReportFields: userReportFields,
          marketReportFields: marketReportFieldsData
        },
        recentActivities: {
          searches: userRecentSearches,
          reports: userRecentReports
        },
        period: {
          startDate: startDate,
          endDate: new Date().toISOString(),
          days: 100
        }
      };

      console.log('✅ [Dashboard Analytics] 데이터 처리 완료:', {
        userId: responseData.userId,
        hasUserData: responseData.hasUserData,
        userSearches: responseData.data.conversionRates.searchConversion.totalSearches,
        userReports: responseData.data.conversionRates.searchConversion.totalReports,
        marketSearches: responseData.data.searchTrends.marketAverage.length,
        marketReports: responseData.data.reportTrends.marketAverage.length
      });

      return res.json(responseData);

    } catch (error) {
      console.error('❌ [Dashboard Analytics] 데이터 조회 실패:', error);
      return res.status(500).json({
        success: false,
        error: 'Database query failed',
        details: error.message
      });
    }
  } catch (error) {
    console.error('❌ [Dashboard Analytics] API 오류:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
};

// 날짜별 트렌드 데이터 처리
function processDateTrends(data) {
  const dailyCount = {};
  
  data.forEach(item => {
    const date = new Date(item.created_at).toISOString().split('T')[0];
    dailyCount[date] = (dailyCount[date] || 0) + 1;
  });

  // 100일간의 모든 날짜 생성 (빈 날짜는 0으로)
  const trends = [];
  const today = new Date();
  
  for (let i = 99; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    trends.push({
      date: dateStr,
      count: dailyCount[dateStr] || 0
    });
  }

  return trends;
}

// 전환율 계산
function calculateConversionRates(data) {
  const searchCount = data.filter(item => item.activity_type === 'search').length;
  const reportCount = data.filter(item => item.activity_type === 'ai_analysis').length;

  const searchConversion = searchCount > 0 ? (reportCount / searchCount * 100).toFixed(2) : 0;

  return {
    searchConversion: {
      totalSearches: searchCount,
      totalReports: reportCount,
      conversionRate: parseFloat(searchConversion)
    }
  };
}

// 로그인 전환율 계산
function calculateLoginConversion(loginData, reportData) {
  const totalLogins = loginData.length;
  const totalReports = reportData.length;
  const conversionRate = totalLogins > 0 ? (totalReports / totalLogins * 100).toFixed(2) : 0;

  return {
    totalLogins,
    totalReports,
    conversionRate: parseFloat(conversionRate)
  };
}

// IPC/CPC 분야 분석
// IPC/CPC 코드를 자연어로 변환하는 함수
function convertToNaturalLanguage(code) {
  const ipcMapping = {
    'A01': '농업',
    'A21': '제빵',
    'A22': '도축',
    'A23': '식품',
    'A24': '담배',
    'A41': '의류',
    'A42': '모자',
    'A43': '신발',
    'A44': '재봉',
    'A45': '장신구',
    'A46': '가죽제품',
    'A47': '가구',
    'A61': '의학',
    'A62': '구명',
    'A63': '스포츠',
    'B01': '물리화학',
    'B02': '분쇄',
    'B03': '분리',
    'B04': '원심분리',
    'B05': '분무',
    'B06': '기계진동',
    'B07': '고체분리',
    'B08': '청소',
    'B09': '폐기물처리',
    'B21': '기계가공',
    'B22': '주조',
    'B23': '공작기계',
    'B24': '연삭',
    'B25': '수공구',
    'B26': '절단',
    'B27': '목재가공',
    'B28': '시멘트',
    'B29': '플라스틱',
    'B30': '프레스',
    'B31': '제지',
    'B32': '적층체',
    'B41': '인쇄',
    'B42': '제본',
    'B43': '필기용구',
    'B44': '장식예술',
    'B60': '차량',
    'B61': '철도',
    'B62': '무궤도차량',
    'B63': '선박',
    'B64': '항공기',
    'B65': '운반',
    'B66': '권상',
    'B67': '용기개폐',
    'B68': '안장',
    'C01': '무기화학',
    'C02': '수처리',
    'C03': '유리',
    'C04': '시멘트',
    'C05': '비료',
    'C06': '폭발물',
    'C07': '유기화학',
    'C08': '고분자',
    'C09': '염료',
    'C10': '석유',
    'C11': '동식물유',
    'C12': '생화학',
    'C13': '설탕',
    'C14': '가죽',
    'C21': '철야금',
    'C22': '야금',
    'C23': '금속피복',
    'C25': '전기분해',
    'C30': '결정성장',
    'D01': '천연섬유',
    'D02': '실',
    'D03': '직조',
    'D04': '편조',
    'D05': '재봉',
    'D06': '섬유처리',
    'D07': '로프',
    'D21': '제지',
    'E01': '도로건설',
    'E02': '수공학',
    'E03': '급배수',
    'E04': '건축',
    'E05': '자물쇠',
    'E06': '문창',
    'E21': '지구굴착',
    'F01': '기관',
    'F02': '연소기관',
    'F03': '액체기계',
    'F04': '액체기계',
    'F15': '유체압',
    'F16': '기계요소',
    'F17': '가스저장',
    'F21': '조명',
    'F22': '증기발생',
    'F23': '연소장치',
    'F24': '가열',
    'F25': '냉동',
    'F26': '건조',
    'F27': '노',
    'F28': '열교환',
    'F41': '무기',
    'F42': '탄약',
    'G01': '측정',
    'G02': '광학',
    'G03': '사진',
    'G04': '시계',
    'G05': '제어',
    'G06': '컴퓨팅',
    'G07': '검사장치',
    'G08': '신호',
    'G09': '교육',
    'G10': '악기',
    'G11': '정보저장',
    'G12': '기기세부',
    'G16': '정보통신기술',
    'G21': '핵물리',
    'H01': '기본전기소자',
    'H02': '전력발생',
    'H03': '전자회로',
    'H04': '통신기술',
    'H05': '기타전기기술'
  };

  // 코드가 4자리 이상인 경우 첫 3자리로 매핑 시도
  if (code && code.length >= 3) {
    const shortCode = code.substring(0, 3);
    if (ipcMapping[shortCode]) {
      return ipcMapping[shortCode];
    }
  }

  // 매핑되지 않은 경우 원본 코드에 "분야" 추가
  return code ? `${code} 분야` : '기타';
}

function processFieldAnalysis(data) {
  console.log('🔍 [processFieldAnalysis] 카테고리 분석 시작:', { dataLength: data.length });
  
  // 검색어와 리포트 제목 추출
  const texts = [];
  
  data.forEach(item => {
    try {
      // 검색어 추출 (keyword, query 등)
      if (item.keyword) {
        texts.push(item.keyword);
      } else if (item.query) {
        texts.push(item.query);
      }
      
      // 리포트 제목 추출 (invention_title, report_name 등)
      if (item.invention_title) {
        texts.push(item.invention_title);
      } else if (item.report_name) {
        texts.push(item.report_name);
      }
      
      // technology_field도 포함 (기존 호환성)
      if (item.technology_field) {
        texts.push(item.technology_field);
      }
    } catch (error) {
      console.warn('⚠️ [processFieldAnalysis] 데이터 처리 오류:', error.message);
    }
  });

  console.log('📝 [processFieldAnalysis] 추출된 텍스트:', { 
    count: texts.length, 
    samples: texts.slice(0, 5) 
  });

  // 카테고리 분석 수행
  const categoryStats = getCategoryStats(texts);
  console.log('📊 [processFieldAnalysis] 카테고리 통계:', categoryStats);

  // 차트 형식으로 변환
  const chartData = formatForChart(categoryStats);
  
  // 기존 형식에 맞게 변환 (percentage 추가)
  const totalCount = Object.values(categoryStats).reduce((sum, count) => sum + count, 0);
  const result = chartData.map(item => ({
    label: item.name,
    naturalLabel: item.name, // 카테고리명이 이미 자연어
    value: item.value,
    percentage: totalCount > 0 ? ((item.value / totalCount) * 100).toFixed(1) : '0.0'
  }));

  console.log('✅ [processFieldAnalysis] 최종 결과:', { 
    resultLength: result.length,
    totalCount,
    categories: result.map(r => `${r.label}: ${r.value}`)
  });

  return result;
}

// IPC/CPC 코드 추출
function extractIPCCodes(metadata) {
  const codes = [];
  
  if (metadata.searchQuery) {
    // 검색어에서 IPC/CPC 패턴 추출
    const ipcPattern = /[A-H]\d{2}[A-Z]\d+\/\d+/g;
    const matches = metadata.searchQuery.match(ipcPattern);
    if (matches) {
      codes.push(...matches);
    }
  }

  if (metadata.ipcCodes) {
    codes.push(...metadata.ipcCodes);
  }

  if (metadata.cpcCodes) {
    codes.push(...metadata.cpcCodes);
  }

  // 기본값으로 분야 추정
  if (codes.length === 0 && metadata.searchQuery) {
    const estimatedCode = estimateIPCFromQuery(metadata.searchQuery);
    if (estimatedCode) codes.push(estimatedCode);
  }

  return [...new Set(codes)]; // 중복 제거
}

// 검색어로부터 IPC 분야 추정
function estimateIPCFromQuery(query) {
  const lowerQuery = query.toLowerCase();
  
  const ipcMapping = {
    'ai': 'G06N',
    'artificial intelligence': 'G06N',
    'machine learning': 'G06N',
    'deep learning': 'G06N',
    'neural network': 'G06N',
    'battery': 'H01M',
    'semiconductor': 'H01L',
    'display': 'G09G',
    'communication': 'H04B',
    'wireless': 'H04W',
    'medical': 'A61B',
    'pharmaceutical': 'A61K',
    'automotive': 'B60R',
    'engine': 'F02B',
    'solar': 'H01L',
    'energy': 'H02J'
  };

  for (const [keyword, ipc] of Object.entries(ipcMapping)) {
    if (lowerQuery.includes(keyword)) {
      return ipc;
    }
  }

  return 'G06F'; // 기본값: 컴퓨터 기술
}

// 최근 활동 처리
function processRecentActivities(data, type) {
  return data.map(item => {
    try {
      return {
        id: item.id || Math.random().toString(36).substr(2, 9),
        title: type === 'search' 
          ? item.keyword || '검색어 없음'
          : item.report_name || item.invention_title || '제목 없음',
        date: item.created_at,
        type,
        technology_field: item.technology_field
      };
    } catch (error) {
      return {
        id: Math.random().toString(36).substr(2, 9),
        title: type === 'search' ? '검색어 없음' : '제목 없음',
        date: item.created_at,
        type
      };
    }
  });
}

// 시장 평균 생성 (트렌드 곡선용)
// 실제 시장평균 계산 함수 (100일간 모든 사용자 데이터 / 총 사용자 수)
async function generateRealMarketAverage(supabase, startDate, type = 'search') {
  try {
    // 테이블 선택 (검색 또는 리포트)
    const tableName = type === 'search' ? 'search_history' : 'ai_analysis_reports';
    
    // 1. 100일간 모든 사용자의 데이터를 날짜별로 집계
    const { data: allData, error: dataError } = await supabase
      .from(tableName)
      .select('created_at, user_id')
      .gte('created_at', startDate)
      .order('created_at', { ascending: true });

    if (dataError) {
      console.error(`❌ [Market Average] ${type} 데이터 조회 실패:`, dataError);
      return [];
    }

    // 2. 총 사용자 수 조회
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id');

    if (usersError) {
      console.error('❌ [Market Average] 사용자 수 조회 실패:', usersError);
      return [];
    }

    const totalUsers = usersData.length;
    console.log(`📊 [Market Average] ${type} - 총 사용자 수: ${totalUsers}, 총 데이터: ${allData.length}`);

    // 3. 날짜별로 데이터 그룹화
    const dateGroups = {};
    allData.forEach(item => {
      const date = item.created_at.split('T')[0]; // YYYY-MM-DD 형식으로 변환
      dateGroups[date] = (dateGroups[date] || 0) + 1;
    });

    // 4. 100일간의 모든 날짜 생성 (데이터가 없는 날짜도 포함)
    const result = [];
    const start = new Date(startDate);
    const end = new Date();
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const dailyCount = dateGroups[dateStr] || 0;
      
      // 시장평균 = 해당 날짜의 모든 사용자 데이터 수 / 총 사용자 수
      const marketAverage = totalUsers > 0 ? Math.round((dailyCount / totalUsers) * 100) / 100 : 0;
      
      result.push({
        date: dateStr,
        count: marketAverage
      });
    }

    console.log(`✅ [Market Average] ${type} 시장평균 계산 완료 - ${result.length}일 데이터`);
    return result;

  } catch (error) {
    console.error(`❌ [Market Average] ${type} 시장평균 계산 실패:`, error);
    return [];
  }
}

// 차트 데이터 처리 함수
function handleChartDataRequest(req, res) {
  const { chartType } = req.query;

  // 정적 차트 데이터
  const personalSearchData = {
    '물리학': 4,
    '전기': 3,
    '처리조작/운수': 2,
    '생활필수품': 1,
    '기계공학/조명/가열/무기/폭파': 1
  };

  const marketSearchData = {
    '물리학': 6,
    'AI': 6,
    'Artificial Intelligence': 4,
    'IoT': 4,
    '반도체': 4,
    '바이오': 4,
    'Blockchain': 3,
    '전기': 3,
    '통신': 3,
    '처리조작/운수': 2,
    '교통': 2,
    '블록체인': 2,
    'Machine Learning': 2,
    'Quantum Computing': 2,
    'Internet of Things': 2,
    'Telecommunications': 2,
    'Automotive': 2,
    'AI/ML': 1,
    'Energy': 1,
    '생활필수품': 1,
    '기계공학/조명/가열/무기/폭파': 1,
    '에너지': 1,
    '소재': 1,
    '화학/야금': 1,
    '인공지능': 1,
    '자동차': 1,
    '양자컴퓨팅': 1,
    'VR/AR': 1
  };

  const personalReportData = {
    '물리학': 3,
    '전기': 3,
    '생활필수품': 1,
    '처리조작/운수': 1,
    '기타': 1
  };

  const marketReportData = {
    'AI/머신러닝': 9,
    'AI': 4,
    '바이오': 4,
    '물리학': 3,
    '전기': 3,
    'IoT': 3,
    '반도체': 3,
    '통신': 3,
    'H04L': 2,
    'A45C': 2,
    '교통': 2,
    '에너지': 2,
    '소재': 2,
    '블록체인': 2,
    'G06Q': 1,
    '소프트웨어/앱': 1,
    '처리조작/운수': 1,
    '생활필수품': 1,
    'Artificial Intelligence': 1,
    'Blockchain': 1,
    'Quantum Computing': 1,
    'Internet of Things': 1,
    'Telecommunications': 1,
    '인공지능': 1,
    '자동차': 1,
    '기타': 1
  };

  // 차트 타입에 따른 데이터 반환
  const chartData = {
    personalSearch: processChartData(personalSearchData),
    marketSearch: processChartData(marketSearchData),
    personalReport: processChartData(personalReportData),
    marketReport: processChartData(marketReportData)
  };

  if (chartType && chartData[chartType]) {
    return res.json({
      success: true,
      data: chartData[chartType]
    });
  }

  return res.json({
    success: true,
    data: chartData
  });
}

// 도넛 차트 데이터 처리 함수
function processChartData(data, maxItems = 9) {
  const sortedData = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const topItems = sortedData.slice(0, maxItems);
  const remainingItems = sortedData.slice(maxItems);
  const otherSum = remainingItems.reduce((sum, [, value]) => sum + value, 0);
  const totalSum = sortedData.reduce((sum, [, value]) => sum + value, 0);

  const result = topItems.map(([label, value]) => ({
    label,
    value,
    percentage: ((value / totalSum) * 100).toFixed(1)
  }));

  if (otherSum > 0) {
    result.push({
      label: '기타',
      value: otherSum,
      percentage: ((otherSum / totalSum) * 100).toFixed(1)
    });
  }

  return result;
}