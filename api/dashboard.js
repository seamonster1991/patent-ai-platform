import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// 환경 변수 검증
if (!supabaseUrl || !supabaseKey) {
  console.error('Missing required environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  throw new Error('Missing required environment variables');
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
  console.error(`Dashboard API Error ${context}:`, error);
  return res.status(500).json({ 
    error: 'Internal server error',
    details: context,
    message: error.message 
  });
}

// 전체 회원 시장평균 데이터 조회 함수 (dashboard-analytics.js에서 통합)
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

// 메트릭스 조회 함수
async function getMetrics(supabase, period = '30d') {
  const now = new Date();
  let startDate;
  
  switch (period) {
    case '7d':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '90d':
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  const startDateStr = startDate.toISOString().split('T')[0];

  // 병렬로 모든 메트릭 조회
  const [
    totalUsersResult,
    activeUsersResult,
    totalSearchesResult,
    totalReportsResult,
    totalRevenueResult,
    avgSessionResult,
    topKeywordsResult,
    dailyStatsResult
  ] = await Promise.all([
    supabase.from('users').select('id', { count: 'exact' }),
    supabase.from('user_activities')
      .select('user_id', { count: 'exact' })
      .gte('created_at', startDateStr)
      .not('user_id', 'is', null),
    supabase.from('search_history')
      .select('id', { count: 'exact' })
      .gte('created_at', startDateStr),
    supabase.from('reports')
      .select('id', { count: 'exact' })
      .gte('created_at', startDateStr),
    supabase.from('payment_transactions')
      .select('amount')
      .eq('status', 'success')
      .gte('created_at', startDateStr),
    supabase.from('user_activities')
      .select('session_duration')
      .gte('created_at', startDateStr)
      .not('session_duration', 'is', null),
    supabase.from('search_history')
      .select('keyword')
      .gte('created_at', startDateStr)
      .not('keyword', 'is', null)
      .limit(1000),
    supabase.from('search_history')
      .select('created_at')
      .gte('created_at', startDateStr)
      .order('created_at', { ascending: true })
  ]);

  // 총 수익 계산
  const totalRevenue = totalRevenueResult.data?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;

  // 평균 세션 시간 계산
  const sessions = avgSessionResult.data?.filter(s => s.session_duration > 0) || [];
  const avgSessionTime = sessions.length > 0 
    ? sessions.reduce((sum, s) => sum + s.session_duration, 0) / sessions.length 
    : 0;

  // 인기 키워드 분석
  const keywordCounts = {};
  topKeywordsResult.data?.forEach(log => {
    if (log.keyword) {
      keywordCounts[log.keyword] = (keywordCounts[log.keyword] || 0) + 1;
    }
  });

  const topKeywords = Object.entries(keywordCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([keyword, count]) => ({ keyword, count }));

  // 일별 통계 계산
  const dailyStats = {};
  dailyStatsResult.data?.forEach(log => {
    const date = log.created_at.split('T')[0];
    dailyStats[date] = (dailyStats[date] || 0) + 1;
  });

  const chartData = Object.entries(dailyStats)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, searches]) => ({ date, searches }));

  return {
    totalUsers: totalUsersResult.count || 0,
    activeUsers: activeUsersResult.count || 0,
    totalSearches: totalSearchesResult.count || 0,
    totalReports: totalReportsResult.count || 0,
    totalRevenue,
    avgSessionTime: Math.round(avgSessionTime),
    topKeywords,
    chartData,
    period
  };
}

// 사용자 통계 조회 함수
async function getUserStats(supabase) {
  const [usersResult, activitiesResult] = await Promise.all([
    supabase.from('users')
      .select('id, email, created_at, last_sign_in_at')
      .order('created_at', { ascending: false })
      .limit(100),
    supabase.from('user_activities')
      .select('user_id, activity_type, created_at')
      .order('created_at', { ascending: false })
      .limit(100)
  ]);

  return {
    users: usersResult.data || [],
    activities: activitiesResult.data || []
  };
}

// 인기 키워드 조회 함수
async function getPopularKeywords(supabase, limit = 10) {
  try {
    const { data, error } = await supabase
      .from('search_history')
      .select('keyword')
      .not('keyword', 'is', null)
      .limit(1000);

    if (error) {
      console.error('Error fetching search logs:', error);
      return [];
    }

    const keywordCounts = {};
    data?.forEach(log => {
      if (log.keyword) {
        keywordCounts[log.keyword] = (keywordCounts[log.keyword] || 0) + 1;
      }
    });

    return Object.entries(keywordCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit)
      .map(([keyword, count]) => ({ keyword, count }));
  } catch (error) {
    console.error('Error in getPopularKeywords:', error);
    return [];
  }
}

// 인기 특허 조회 함수
async function getPopularPatents(supabase, limit = 10) {
  const { data } = await supabase
    .from('search_history')
    .select('patent_number, patent_title')
    .not('patent_number', 'is', null)
    .limit(1000);

  const patentCounts = {};
  data?.forEach(log => {
    if (log.patent_number) {
      const key = `${log.patent_number}|${log.patent_title || ''}`;
      patentCounts[key] = (patentCounts[key] || 0) + 1;
    }
  });

  return Object.entries(patentCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, limit)
    .map(([key, count]) => {
      const [patent_number, patent_title] = key.split('|');
      return { patent_number, patent_title, count };
    });
}

// 최근 활동 조회 함수
async function getRecentActivities(supabase, limit = 20) {
  const { data } = await supabase
    .from('user_activities')
    .select(`
      id,
      user_id,
      activity_type,
      activity_data,
      created_at,
      users!inner(email)
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  return data || [];
}

// 시스템 메트릭 조회 함수
async function getSystemMetrics(supabase) {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalUsersResult,
    dailyActiveUsersResult,
    weeklyActiveUsersResult,
    totalSearchesResult,
    dailySearchesResult,
    errorLogsResult
  ] = await Promise.all([
    supabase.from('users').select('id', { count: 'exact' }),
    supabase.from('user_activities')
      .select('user_id', { count: 'exact' })
      .gte('created_at', oneDayAgo.toISOString())
      .not('user_id', 'is', null),
    supabase.from('user_activities')
      .select('user_id', { count: 'exact' })
      .gte('created_at', oneWeekAgo.toISOString())
      .not('user_id', 'is', null),
    supabase.from('search_history').select('id', { count: 'exact' }),
    supabase.from('search_history')
      .select('id', { count: 'exact' })
      .gte('created_at', oneDayAgo.toISOString()),
    supabase.from('error_logs')
      .select('id', { count: 'exact' })
      .gte('created_at', oneDayAgo.toISOString())
  ]);

  return {
    totalUsers: totalUsersResult.count || 0,
    dailyActiveUsers: dailyActiveUsersResult.count || 0,
    weeklyActiveUsers: weeklyActiveUsersResult.count || 0,
    totalSearches: totalSearchesResult.count || 0,
    dailySearches: dailySearchesResult.count || 0,
    dailyErrors: errorLogsResult.count || 0,
    uptime: '99.9%', // 실제 구현 시 시스템 업타임 계산
    responseTime: '150ms' // 실제 구현 시 평균 응답 시간 계산
  };
}

// 관리자용 통합 통계 조회 함수
async function getAdminStats(supabase) {
  try {
    // 병렬로 모든 통계 조회
    const [
      usersResult,
      loginRecordsResult,
      searchHistoryResult,
      reportsResult,
      paymentTransactionsResult,
      paymentRecordsResult
    ] = await Promise.all([
      // 1. 사용자 통계 (삭제된 사용자 포함)
      supabase
        .from('users')
        .select('id, created_at, deleted_at, subscription_plan')
        .order('created_at', { ascending: false }),
      
      // 2. 로그인 기록 통계
      supabase
        .from('login_records')
        .select('id, user_id, created_at'),
      
      // 3. 검색 기록 통계
      supabase
        .from('search_history')
        .select('id, user_id, created_at'),
      
      // 4. 리포트 통계
      supabase
        .from('reports')
        .select('id, user_id, created_at, report_type'),
      
      // 5. 결제 트랜잭션 통계
      supabase
        .from('payment_transactions')
        .select('id, amount, status, created_at')
        .eq('status', 'success'),
      
      // 6. 결제 기록 통계 (추가)
      supabase
        .from('payment_records')
        .select('id, amount, status, created_at')
        .eq('status', 'completed')
    ]);

    if (usersResult.error) {
      console.error('Error fetching user stats:', usersResult.error);
      return { total_users: 0, active_users: 0, new_users_today: 0 };
    }

    const users = usersResult.data || [];
    const loginRecords = loginRecordsResult.data || [];
    const searchHistory = searchHistoryResult.data || [];
    const reports = reportsResult.data || [];
    const paymentTransactions = paymentTransactionsResult.data || [];
    const paymentRecords = paymentRecordsResult.data || [];

    // 사용자 통계 계산
    const totalAllUsers = users.length; // 삭제된 계정 포함 모든 사용자
    const activeUsers = users.filter(user => !user.deleted_at).length; // 실제 활동중인 계정
    const freeMembers = users.filter(user => !user.deleted_at && (!user.subscription_plan || user.subscription_plan === 'free')).length;
    const paidMembers = users.filter(user => !user.deleted_at && user.subscription_plan && user.subscription_plan !== 'free').length;

    // 오늘 신규 가입자
    const today = new Date().toISOString().split('T')[0];
    const newUsersToday = users.filter(user => 
      user.created_at && user.created_at.startsWith(today)
    ).length;

    // 로그인 통계
    const totalLogins = loginRecords.length;

    // 검색 통계
    const totalSearches = searchHistory.length;

    // 리포트 통계
    const totalReports = reports.length;
    const marketAnalysisReports = reports.filter(report => report.report_type === 'market_analysis').length;
    const businessInsightReports = reports.filter(report => report.report_type === 'business_insight').length;

    // 수익 통계 (두 테이블 모두 확인)
    const revenueFromTransactions = paymentTransactions.reduce((sum, payment) => sum + (payment.amount || 0), 0);
    const revenueFromRecords = paymentRecords.reduce((sum, payment) => sum + (payment.amount || 0), 0);
    const totalRevenue = revenueFromTransactions + revenueFromRecords;

    // 평균 계산
    const avgLoginsPerUser = activeUsers > 0 ? (totalLogins / activeUsers).toFixed(1) : 0;
    const avgSearchesPerUser = activeUsers > 0 ? (totalSearches / activeUsers).toFixed(1) : 0;
    const avgReportsPerUser = activeUsers > 0 ? (totalReports / activeUsers).toFixed(1) : 0;

    // 전환율 계산
    const loginToReportRate = totalLogins > 0 ? ((totalReports / totalLogins) * 100).toFixed(1) : 0;
    const searchToReportRate = totalSearches > 0 ? ((totalReports / totalSearches) * 100).toFixed(1) : 0;

    return {
      // 기본 사용자 통계
      total_all_users: totalAllUsers,
      total_users: activeUsers,
      free_members: freeMembers,
      paid_members: paidMembers,
      new_users_today: newUsersToday,
      
      // 활동 통계
      total_logins: totalLogins,
      total_searches: totalSearches,
      total_reports: totalReports,
      market_analysis_reports: marketAnalysisReports,
      business_insight_reports: businessInsightReports,
      
      // 수익 통계
      total_revenue: totalRevenue,
      
      // 평균 통계
      avg_logins_per_user: parseFloat(avgLoginsPerUser),
      avg_searches_per_user: parseFloat(avgSearchesPerUser),
      avg_reports_per_user: parseFloat(avgReportsPerUser),
      
      // 전환율
      login_to_report_rate: parseFloat(loginToReportRate),
      search_to_report_rate: parseFloat(searchToReportRate)
    };
  } catch (error) {
    console.error('Error in getAdminStats:', error);
    return { 
      total_all_users: 0, 
      total_users: 0, 
      free_members: 0,
      paid_members: 0,
      new_users_today: 0,
      total_logins: 0,
      total_searches: 0,
      total_reports: 0,
      market_analysis_reports: 0,
      business_insight_reports: 0,
      total_revenue: 0,
      avg_logins_per_user: 0,
      avg_searches_per_user: 0,
      avg_reports_per_user: 0,
      login_to_report_rate: 0,
      search_to_report_rate: 0
    };
  }
}

// 일일 활동 트렌드 데이터 조회 함수
async function getDailyActivityTrends(supabase, days = 30) {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);
    
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // 병렬로 일일 활동 데이터 조회
    const [
      dailyLogins,
      dailySearches,
      dailyReports,
      dailyNewUsers
    ] = await Promise.all([
      // 일일 로그인 수
      supabase
        .from('login_records')
        .select('created_at')
        .gte('created_at', startDateStr)
        .lte('created_at', endDateStr),
      
      // 일일 검색 수
      supabase
        .from('search_history')
        .select('created_at')
        .gte('created_at', startDateStr)
        .lte('created_at', endDateStr),
      
      // 일일 리포트 수
      supabase
        .from('reports')
        .select('created_at')
        .gte('created_at', startDateStr)
        .lte('created_at', endDateStr),
      
      // 일일 신규 사용자 수
      supabase
        .from('users')
        .select('created_at')
        .gte('created_at', startDateStr)
        .lte('created_at', endDateStr)
        .is('deleted_at', null)
    ]);

    // 날짜별 데이터 집계
    const dailyData = {};
    
    // 날짜 범위 초기화
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      dailyData[dateStr] = {
        date: dateStr,
        logins: 0,
        searches: 0,
        reports: 0,
        newUsers: 0
      };
    }

    // 로그인 데이터 집계
    (dailyLogins.data || []).forEach(record => {
      const date = record.created_at.split('T')[0];
      if (dailyData[date]) {
        dailyData[date].logins++;
      }
    });

    // 검색 데이터 집계
    (dailySearches.data || []).forEach(record => {
      const date = record.created_at.split('T')[0];
      if (dailyData[date]) {
        dailyData[date].searches++;
      }
    });

    // 리포트 데이터 집계
    (dailyReports.data || []).forEach(record => {
      const date = record.created_at.split('T')[0];
      if (dailyData[date]) {
        dailyData[date].reports++;
      }
    });

    // 신규 사용자 데이터 집계
    (dailyNewUsers.data || []).forEach(record => {
      const date = record.created_at.split('T')[0];
      if (dailyData[date]) {
        dailyData[date].newUsers++;
      }
    });

    // 배열로 변환하고 날짜순 정렬
    const trendsArray = Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date));

    return trendsArray;
  } catch (error) {
    console.error('Error in getDailyActivityTrends:', error);
    return [];
  }
}

// 특허 분야 분석 데이터 조회 함수
async function getPatentFieldAnalysis(supabase) {
  try {
    // 검색 활동 데이터에서 특허 분야 분석 (더 정확한 데이터)
    const { data: searches, error: searchError } = await supabase
      .from('user_activities')
      .select('activity_data, created_at')
      .eq('activity_type', 'search')
      .not('activity_data', 'is', null);



    if (searchError) {
      console.error('Error fetching searches for field analysis:', searchError);
      return {
        totalReports: 0,
        totalFields: 0,
        topFields: [],
        mostPopularField: 'N/A'
      };
    }

    // 리포트 수 조회
    const { count: reportCount } = await supabase
      .from('reports')
      .select('*', { count: 'exact', head: true });

    // 특허 분야 키워드 추출 및 집계
    const fieldCounts = {};
    const searches_data = searches || [];

    searches_data.forEach(search => {
      // 검색 활동 데이터에서 검색어 추출
      const searchQuery = search.activity_data?.search_query || search.activity_data?.query || '';
      const text = `${searchQuery}`.toLowerCase();
      
      // 주요 특허 분야 키워드들
      const patentFields = [
        '인공지능', 'ai', 'artificial intelligence',
        '바이오', 'bio', 'biotechnology', '생명공학',
        '반도체', 'semiconductor', '칩', 'chip',
        '자율주행', 'autonomous', 'self-driving',
        '5g', '통신', 'communication', 'wireless',
        '블록체인', 'blockchain', '암호화', 'crypto',
        '로봇', 'robot', '자동화', 'automation',
        '센서', 'sensor', 'iot', '사물인터넷',
        '인터넷', 'internet', 'web', '웹',
        '의료', 'medical', 'healthcare', '헬스케어'
      ];

      patentFields.forEach(field => {
        if (text.includes(field)) {
          fieldCounts[field] = (fieldCounts[field] || 0) + 1;
        }
      });
    });

    // 상위 분야 정렬
    const topFields = Object.entries(fieldCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([field, count], index) => ({
        rank: index + 1,
        field: field,
        count: count,
        percentage: searches_data.length > 0 ? ((count / searches_data.length) * 100).toFixed(1) : '0.0'
      }));

    const mostPopularField = topFields.length > 0 ? topFields[0].field : 'N/A';

    return {
      totalReports: reportCount || 0,
      totalFields: Object.keys(fieldCounts).length,
      topFields: topFields,
      mostPopularField: mostPopularField
    };
  } catch (error) {
    console.error('Error in getPatentFieldAnalysis:', error);
    return {
      totalReports: 0,
      totalFields: 0,
      topFields: [],
      mostPopularField: 'N/A'
    };
  }
}

// 관리자 사용자 데이터 조회 함수
async function getAdminUsers(supabase, params = {}) {
  try {
    const {
      page = 1,
      limit = 20,
      status = 'all',
      role = 'all',
      search = '',
      sortBy = 'created_at',
      sortOrder = 'desc',
      dateFrom = '',
      dateTo = ''
    } = params;

    let query = supabase
      .from('users')
      .select(`
        id, 
        email, 
        name, 
        role, 
        subscription_plan,
        created_at, 
        updated_at, 
        last_login_at,
        total_searches,
        total_detail_views,
        total_logins,
        total_reports,
        total_usage_cost,
        deleted_at,
        company,
        phone
      `, { count: 'exact' });

    // 상태 필터 (deleted_at 기준으로 활성/비활성 판단)
    if (status && status !== 'all') {
      if (status === 'active') {
        query = query.is('deleted_at', null);
      } else if (status === 'inactive') {
        query = query.not('deleted_at', 'is', null);
      }
    }

    // 역할 필터
    if (role && role !== 'all') {
      query = query.eq('role', role);
    }

    // 검색 필터
    if (search) {
      query = query.or(`email.ilike.%${search}%,name.ilike.%${search}%`);
    }

    // 날짜 범위 필터
    if (dateFrom) {
      query = query.gte('created_at', dateFrom);
    }
    if (dateTo) {
      query = query.lte('created_at', dateTo);
    }

    // 정렬
    const ascending = sortOrder === 'asc';
    query = query.order(sortBy, { ascending });

    // 페이지네이션
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data: users, error, count } = await query;

    if (error) {
      console.error('Error fetching admin users:', error);
      throw error;
    }

    // 사용자 데이터에 status 필드 추가 (deleted_at 기준)
    const processedUsers = (users || []).map(user => ({
      ...user,
      status: user.deleted_at ? 'inactive' : 'active',
      last_login: user.last_login_at,
      points: 0 // 포인트 시스템이 별도 테이블에 있을 수 있음
    }));

    return {
      users: processedUsers,
      totalUsers: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
      currentPage: parseInt(page),
      limit: parseInt(limit)
    };
  } catch (error) {
    console.error('Error in getAdminUsers:', error);
    throw error;
  }
}

// 관리자 결제 데이터 조회 함수
async function getAdminPayments(supabase, params = {}) {
  try {
    const {
      page = 1,
      limit = 20,
      status = 'all',
      method = 'all',
      search = '',
      sortBy = 'created_at',
      sortOrder = 'desc',
      dateFrom = '',
      dateTo = '',
      amountMin = '',
      amountMax = ''
    } = params;

    let query = supabase
      .from('payment_orders')
      .select(`
        id, 
        order_id,
        user_id, 
        amount_krw,
        status, 
        pay_method,
        payment_id,
        goods_name,
        payment_type,
        currency,
        created_at, 
        completed_at,
        cancelled_at
      `, { count: 'exact' });

    // 상태 필터
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    // 결제 방법 필터
    if (method && method !== 'all') {
      query = query.eq('pay_method', method);
    }

    // 검색 필터 (order_id, payment_id, goods_name)
    if (search) {
      query = query.or(`order_id.ilike.%${search}%,payment_id.ilike.%${search}%,goods_name.ilike.%${search}%`);
    }

    // 날짜 범위 필터
    if (dateFrom) {
      query = query.gte('created_at', dateFrom);
    }
    if (dateTo) {
      query = query.lte('created_at', dateTo);
    }

    // 금액 범위 필터
    if (amountMin) {
      query = query.gte('amount_krw', parseInt(amountMin));
    }
    if (amountMax) {
      query = query.lte('amount_krw', parseInt(amountMax));
    }

    // 정렬
    const ascending = sortOrder === 'asc';
    query = query.order(sortBy, { ascending });

    // 페이지네이션
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data: payments, error, count } = await query;

    if (error) {
      console.error('Error fetching admin payments:', error);
      throw error;
    }

    // 결제 데이터 변환 (프론트엔드에서 기대하는 형식으로)
    const processedPayments = (payments || []).map(payment => {
      return {
        id: payment.id,
        transaction_id: payment.order_id,
        user_id: payment.user_id,
        user_email: '', // 사용자 정보는 별도 API로 조회 필요
        user_name: '', // 사용자 정보는 별도 API로 조회 필요
        amount: payment.amount_krw,
        status: payment.status,
        payment_method: payment.pay_method,
        description: payment.goods_name,
        payment_type: payment.payment_type,
        currency: payment.currency,
        created_at: payment.created_at,
        updated_at: payment.completed_at || payment.cancelled_at || payment.created_at
      };
    });

    return {
      payments: processedPayments,
      totalPayments: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
      currentPage: parseInt(page),
      limit: parseInt(limit)
    };
  } catch (error) {
    console.error('Error in getAdminPayments:', error);
    throw error;
  }
}

// 사용자 정보 조회 함수
async function getUserInfo(userId) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, name, role, created_at, last_login_at')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('getUserInfo error:', error);
    return null;
  }
}

// 검색 기록 조회 함수
async function getSearchHistory(userId) {
  try {
    const { data, error } = await supabase
      .from('search_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('getSearchHistory error:', error);
    return [];
  }
}

// 리포트 기록 조회 함수
async function getReportHistory(userId) {
  try {
    const { data, error } = await supabase
      .from('ai_reports')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('getReportHistory error:', error);
    return [];
  }
}

// 포인트 거래 기록 조회 함수
async function getPointTransactions(userId) {
  try {
    const { data, error } = await supabase
      .from('point_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('getPointTransactions error:', error);
    return [];
  }
}

// 결제 기록 조회 함수
async function getPaymentHistory(userId) {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('getPaymentHistory error:', error);
    return [];
  }
}

// 로그인 기록 조회 함수
async function getLoginLogs(userId) {
  try {
    const { data, error } = await supabase
      .from('user_activities')
      .select('*')
      .eq('user_id', userId)
      .eq('activity_type', 'login')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('getLoginLogs error:', error);
    return [];
  }
}

// Analytics 기능 추가 (dashboard-analytics.js에서 이동)
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
      loginLogs
    ] = await Promise.all([
      getUserInfo(userId),
      getSearchHistory(userId),
      getReportHistory(userId),
      getPointTransactions(userId),
      getPaymentHistory(userId),
      getLoginLogs(userId)
    ]);

    // 통계 계산
    const stats = {
      totalSearches: searchHistory.length,
      totalReports: reportHistory.length,
      totalPoints: pointTransactions.reduce((sum, t) => sum + t.amount, 0),
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

// 일별 트렌드 생성
const generateDailyTrends = (data, startDate, endDate, type) => {
  const trends = [];
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split('T')[0];
    const dayData = data.filter(item => 
      item.created_at.startsWith(dateStr)
    );
    
    trends.push({
      date: dateStr,
      count: dayData.length,
      type: type
    });
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return trends;
};

// 검색 분야 분석
const analyzeSearchFields = (searches) => {
  const fieldCounts = {};
  const keywordCounts = {};
  
  searches.forEach(search => {
    // 기술 분야 분석
    if (search.technology_field) {
      fieldCounts[search.technology_field] = (fieldCounts[search.technology_field] || 0) + 1;
    }
    
    // 키워드 분석
    if (search.keyword) {
      keywordCounts[search.keyword] = (keywordCounts[search.keyword] || 0) + 1;
    }
  });
  
  return {
    topFields: Object.entries(fieldCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([field, count]) => ({ field, count })),
    topKeywords: Object.entries(keywordCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([keyword, count]) => ({ keyword, count }))
  };
};

// 리포트 분야 분석
const analyzeReportFields = (reports) => {
  const typeCounts = {};
  const statusCounts = {};
  
  reports.forEach(report => {
    // 리포트 타입 분석
    if (report.report_type) {
      typeCounts[report.report_type] = (typeCounts[report.report_type] || 0) + 1;
    }
    
    // 상태 분석
    if (report.status) {
      statusCounts[report.status] = (statusCounts[report.status] || 0) + 1;
    }
  });
  
  return {
    typeDistribution: Object.entries(typeCounts)
      .map(([type, count]) => ({ type, count })),
    statusDistribution: Object.entries(statusCounts)
      .map(([status, count]) => ({ status, count }))
  };
};

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
    const { action, userId } = req.query;

    // Analytics 액션 추가
    if (action === 'analytics' && userId) {
      const analyticsData = await getUserDashboardData(userId);
      return res.status(200).json({
        success: true,
        data: analyticsData
      });
    }

    // 기존 액션들...
    if (action === 'metrics') {
      const period = req.query.period || '30d';
      const metrics = await getMetrics(supabase, period);
      return res.status(200).json({ success: true, data: metrics });
    }

    if (action === 'user-stats') {
      const userStats = await getUserStats(supabase);
      return res.status(200).json({ success: true, data: userStats });
    }

    if (action === 'popular-keywords') {
      const limit = parseInt(req.query.limit) || 10;
      const keywords = await getPopularKeywords(supabase, limit);
      return res.status(200).json({ success: true, data: keywords });
    }

    if (action === 'popular-patents') {
      const limit = parseInt(req.query.limit) || 10;
      const patents = await getPopularPatents(supabase, limit);
      return res.status(200).json({ success: true, data: patents });
    }

    if (action === 'recent-activities') {
      const limit = parseInt(req.query.limit) || 20;
      const activities = await getRecentActivities(supabase, limit);
      return res.status(200).json({ success: true, data: activities });
    }

    if (action === 'system-metrics') {
      const systemMetrics = await getSystemMetrics(supabase);
      return res.status(200).json({ success: true, data: systemMetrics });
    }

    if (action === 'admin-stats') {
      const adminStats = await getAdminStats(supabase);
      return res.status(200).json({ success: true, data: adminStats });
    }

    if (action === 'daily-trends') {
      const days = parseInt(req.query.days) || 30;
      const trends = await getDailyActivityTrends(supabase, days);
      return res.status(200).json({ success: true, data: trends });
    }

    if (action === 'field-analysis') {
      const analysis = await getPatentFieldAnalysis(supabase);
      return res.status(200).json({ success: true, data: analysis });
    }

    if (action === 'admin-users') {
      const { page = 1, limit = 10, search, role, status } = req.query;
      const users = await getAdminUsers(supabase, { page, limit, search, role, status });
      return res.status(200).json({ success: true, data: users });
    }

    if (action === 'admin-payments') {
      const { page = 1, limit = 10, status, startDate, endDate } = req.query;
      const payments = await getAdminPayments(supabase, { page, limit, status, startDate, endDate });
      return res.status(200).json({ success: true, data: payments });
    }

    // 기본 대시보드 데이터
    const [metrics, userStats, keywords, patents, activities] = await Promise.all([
      getMetrics(supabase),
      getUserStats(supabase),
      getPopularKeywords(supabase, 5),
      getPopularPatents(supabase, 5),
      getRecentActivities(supabase, 10)
    ]);

    return res.status(200).json({
      success: true,
      data: {
        metrics,
        userStats,
        popularKeywords: keywords,
        popularPatents: patents,
        recentActivities: activities
      }
    });

  } catch (error) {
    console.error('Dashboard API error:', error);
    return handleError(res, error, 'Dashboard API');
  }
}