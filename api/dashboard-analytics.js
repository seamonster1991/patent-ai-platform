import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// 환경 변수 검증
if (!supabaseUrl || !supabaseKey) {
  console.error('Missing required environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

// Supabase 클라이언트 초기화
const supabase = createClient(supabaseUrl, supabaseKey);

// 공통 헤더 설정 함수
function setCommonHeaders(res) {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// 공통 에러 처리 함수
function handleError(res, error, context = '') {
  console.error(`Dashboard Analytics API Error ${context}:`, error);
  return res.status(500).json({ 
    error: 'Internal server error',
    details: context,
    message: error.message 
  });
}

// 전체 회원 시장평균 데이터 조회 함수
async function getMarketAverageData() {
  try {
    console.log('📊 [Market Average] 전체 회원 시장평균 데이터 조회 시작');
    
    // 전체 활성 사용자 수 조회 (삭제되지 않은 사용자)
    const { data: allUsers, error: usersError } = await supabase
      .from('users')
      .select('id')
      .is('deleted_at', null);
    
    if (usersError) {
      console.error('❌ [Market Average] 사용자 조회 실패:', usersError);
      return { searchAverage: 0, reportAverage: 0, totalUsers: 0 };
    }
    
    const totalUsers = allUsers?.length || 0;
    console.log(`📊 [Market Average] 전체 활성 사용자 수: ${totalUsers}`);
    
    if (totalUsers === 0) {
      return { searchAverage: 0, reportAverage: 0, totalUsers: 0 };
    }
    
    // 최근 30일 전체 검색 수 조회
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: allSearches, error: searchError } = await supabase
      .from('search_history')
      .select('id')
      .gte('created_at', thirtyDaysAgo.toISOString());
    
    if (searchError) {
      console.error('❌ [Market Average] 검색 데이터 조회 실패:', searchError);
    }
    
    // 최근 30일 전체 리포트 수 조회
    const { data: allReports, error: reportError } = await supabase
      .from('ai_analysis_reports')
      .select('id')
      .gte('created_at', thirtyDaysAgo.toISOString());
    
    if (reportError) {
      console.error('❌ [Market Average] 리포트 데이터 조회 실패:', reportError);
    }
    
    const totalSearches = allSearches?.length || 0;
    const totalReports = allReports?.length || 0;
    
    // 사용자당 평균 계산
    const searchAverage = Math.round(totalSearches / totalUsers);
    const reportAverage = Math.round(totalReports / totalUsers);
    
    console.log(`📊 [Market Average] 계산 완료 - 검색 평균: ${searchAverage}, 리포트 평균: ${reportAverage}`);
    
    return {
      searchAverage,
      reportAverage,
      totalUsers,
      totalSearches,
      totalReports
    };
    
  } catch (error) {
    console.error('❌ [Market Average] 시장평균 데이터 조회 실패:', error);
    return { searchAverage: 0, reportAverage: 0, totalUsers: 0 };
  }
}

// 사용자 정보 조회
async function getUserInfo(userId) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    return data || {};
  } catch (error) {
    console.error('getUserInfo error:', error);
    return {};
  }
}

// 검색 기록 조회
async function getSearchHistory(userId) {
  try {
    const { data, error } = await supabase
      .from('search_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('getSearchHistory error:', error);
    return [];
  }
}

// 리포트 기록 조회
async function getReportHistory(userId) {
  try {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('getReportHistory error:', error);
    return [];
  }
}

// 포인트 거래 내역 조회
async function getPointTransactions(userId) {
  try {
    const { data, error } = await supabase
      .from('point_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('getPointTransactions error:', error);
    return [];
  }
}

// 결제 내역 조회
async function getPaymentHistory(userId) {
  try {
    const { data, error } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('getPaymentHistory error:', error);
    return [];
  }
}

// 로그인 로그 조회
async function getLoginLogs(userId) {
  try {
    const { data, error } = await supabase
      .from('user_activities')
      .select('*')
      .eq('user_id', userId)
      .eq('activity_type', 'login')
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('getLoginLogs error:', error);
    return [];
  }
}

// 일별 트렌드 생성
const generateDailyTrends = (data, startDate, endDate, type) => {
  const trends = [];
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split('T')[0];
    const dayData = data.filter(item => 
      item.created_at && item.created_at.startsWith(dateStr)
    );
    
    trends.push({
      date: dateStr,
      count: dayData.length,
      type
    });
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return trends;
};

// 검색 분야 분석
const analyzeSearchFields = (searches) => {
  const fieldCounts = {};
  
  searches.forEach(search => {
    if (search.keyword) {
      // 키워드를 기반으로 분야 추정 (간단한 로직)
      const field = estimateField(search.keyword);
      fieldCounts[field] = (fieldCounts[field] || 0) + 1;
    }
  });
  
  return Object.entries(fieldCounts)
    .map(([field, count]) => ({ field, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
};

// 리포트 분야 분석
const analyzeReportFields = (reports) => {
  const fieldCounts = {};
  
  reports.forEach(report => {
    if (report.analysis_type) {
      fieldCounts[report.analysis_type] = (fieldCounts[report.analysis_type] || 0) + 1;
    }
  });
  
  return Object.entries(fieldCounts)
    .map(([field, count]) => ({ field, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
};

// 분야 추정 함수 (간단한 키워드 매칭)
function estimateField(keyword) {
  const fieldKeywords = {
    'IT/소프트웨어': ['소프트웨어', '앱', '프로그램', '시스템', '네트워크', '데이터베이스', 'AI', '인공지능'],
    '바이오/의료': ['의료', '바이오', '약물', '치료', '진단', '병원', '의학'],
    '기계/자동차': ['기계', '자동차', '엔진', '모터', '기어', '부품'],
    '화학/소재': ['화학', '소재', '재료', '합성', '촉매', '폴리머'],
    '전자/반도체': ['전자', '반도체', '칩', '회로', '센서', '디스플레이'],
    '에너지/환경': ['에너지', '환경', '태양광', '풍력', '배터리', '친환경']
  };
  
  for (const [field, keywords] of Object.entries(fieldKeywords)) {
    if (keywords.some(k => keyword.toLowerCase().includes(k.toLowerCase()))) {
      return field;
    }
  }
  
  return '기타';
}

// 사용자 대시보드 데이터 조회
async function getUserDashboardData(userId) {
  try {
    console.log(`📊 [Analytics] 사용자 대시보드 데이터 조회 시작: ${userId}`);
    
    // 병렬로 모든 데이터 조회
    const [
      userInfo,
      searchHistory,
      reportHistory,
      pointTransactions,
      paymentHistory,
      loginLogs,
      marketData
    ] = await Promise.all([
      getUserInfo(userId),
      getSearchHistory(userId),
      getReportHistory(userId),
      getPointTransactions(userId),
      getPaymentHistory(userId),
      getLoginLogs(userId),
      getMarketAverageData()
    ]);

    // 통계 계산
    const stats = {
      totalSearches: searchHistory.length,
      totalReports: reportHistory.length,
      totalPoints: pointTransactions.reduce((sum, t) => sum + (t.amount || 0), 0),
      totalPayments: paymentHistory.filter(p => p.status === 'approved').length,
      totalLogins: loginLogs.length
    };

    // 최근 활동 (최근 30일)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentSearches = searchHistory.filter(s => new Date(s.created_at) >= thirtyDaysAgo);
    const recentReports = reportHistory.filter(r => new Date(r.created_at) >= thirtyDaysAgo);
    const recentPayments = paymentHistory.filter(p => new Date(p.created_at) >= thirtyDaysAgo);

    // 일별 트렌드 생성
    const searchTrends = generateDailyTrends(recentSearches, thirtyDaysAgo, new Date(), 'search');
    const reportTrends = generateDailyTrends(recentReports, thirtyDaysAgo, new Date(), 'report');

    // 검색 분야 분석
    const searchFieldAnalysis = analyzeSearchFields(searchHistory);
    
    // 리포트 분야 분석
    const reportFieldAnalysis = analyzeReportFields(reportHistory);

    console.log(`✅ [Analytics] 사용자 대시보드 데이터 조회 완료: ${userId}`);

    return {
      user: userInfo,
      stats,
      marketAverage: {
        searchAverage: marketData.searchAverage,
        reportAverage: marketData.reportAverage,
        totalUsers: marketData.totalUsers
      },
      trends: {
        searches: searchTrends,
        reports: reportTrends
      },
      analysis: {
        searchFields: searchFieldAnalysis,
        reportFields: reportFieldAnalysis
      },
      recent: {
        searches: recentSearches.slice(0, 10),
        reports: recentReports.slice(0, 10),
        payments: recentPayments.slice(0, 5)
      }
    };

  } catch (error) {
    console.error('❌ [Analytics] 사용자 대시보드 데이터 조회 실패:', error);
    throw error;
  }
}

export default async function handler(req, res) {
  setCommonHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 환경 변수 검증
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ 
      error: 'Server configuration error',
      details: 'Missing required environment variables'
    });
  }

  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ 
        error: 'Bad request',
        details: 'userId parameter is required'
      });
    }

    const analyticsData = await getUserDashboardData(userId);
    
    return res.status(200).json({
      success: true,
      data: analyticsData
    });

  } catch (error) {
    console.error('Dashboard Analytics API error:', error);
    return handleError(res, error, 'Dashboard Analytics API');
  }
}