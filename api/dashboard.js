import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// 환경 변수 검증
if (!supabaseUrl || !supabaseKey) {
  console.error('Missing required environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

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
    supabase.from('search_logs')
      .select('id', { count: 'exact' })
      .gte('created_at', startDateStr),
    supabase.from('reports')
      .select('id', { count: 'exact' })
      .gte('created_at', startDateStr),
    supabase.from('payments')
      .select('amount')
      .eq('status', 'completed')
      .gte('created_at', startDateStr),
    supabase.from('user_activities')
      .select('session_duration')
      .gte('created_at', startDateStr)
      .not('session_duration', 'is', null),
    supabase.from('search_logs')
      .select('keyword')
      .gte('created_at', startDateStr)
      .not('keyword', 'is', null)
      .limit(1000),
    supabase.from('search_logs')
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
      .from('search_logs')
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
    .from('search_logs')
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
    supabase.from('search_logs').select('id', { count: 'exact' }),
    supabase.from('search_logs')
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
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    usersResult,
    paymentsResult,
    searchesResult,
    reportsResult
  ] = await Promise.all([
    supabase.from('users')
      .select('id, created_at, last_sign_in_at')
      .order('created_at', { ascending: false }),
    supabase.from('payments')
      .select('amount, status, created_at')
      .gte('created_at', thirtyDaysAgo.toISOString()),
    supabase.from('search_logs')
      .select('id, created_at')
      .gte('created_at', thirtyDaysAgo.toISOString()),
    supabase.from('reports')
      .select('id, created_at')
      .gte('created_at', thirtyDaysAgo.toISOString())
  ]);

  const totalRevenue = paymentsResult.data
    ?.filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

  return {
    totalUsers: usersResult.count || 0,
    newUsersThisMonth: usersResult.data?.filter(u => 
      new Date(u.created_at) >= thirtyDaysAgo
    ).length || 0,
    totalRevenue,
    monthlySearches: searchesResult.count || 0,
    monthlyReports: reportsResult.count || 0,
    users: usersResult.data || [],
    payments: paymentsResult.data || []
  };
}

export default async function handler(req, res) {
  setCommonHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ 
      error: 'Database configuration error',
      details: 'Missing environment variables'
    });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { type, period, limit } = req.query;

    switch (type) {
      case 'metrics':
        const metrics = await getMetrics(supabase, period);
        return res.status(200).json({ success: true, data: metrics });

      case 'user-stats':
        const userStats = await getUserStats(supabase);
        return res.status(200).json({ success: true, data: userStats });

      case 'popular-keywords':
        const keywords = await getPopularKeywords(supabase, parseInt(limit) || 10);
        return res.status(200).json({ success: true, data: keywords });

      case 'popular-patents':
        const patents = await getPopularPatents(supabase, parseInt(limit) || 10);
        return res.status(200).json({ success: true, data: patents });

      case 'recent-activities':
        const activities = await getRecentActivities(supabase, parseInt(limit) || 20);
        return res.status(200).json({ success: true, data: activities });

      case 'system-metrics':
        const systemMetrics = await getSystemMetrics(supabase);
        return res.status(200).json({ success: true, data: systemMetrics });

      case 'admin-stats':
        const adminStats = await getAdminStats(supabase);
        return res.status(200).json({ success: true, data: adminStats });

      case 'comprehensive-stats':
        const [metricsData, userStatsData, systemMetricsData] = await Promise.all([
          getMetrics(supabase, period),
          getUserStats(supabase),
          getSystemMetrics(supabase)
        ]);
        return res.status(200).json({ 
          success: true, 
          data: {
            metrics: metricsData,
            userStats: userStatsData,
            systemMetrics: systemMetricsData
          }
        });

      default:
        // 기본적으로 메트릭스 반환
        const defaultMetrics = await getMetrics(supabase, period);
        return res.status(200).json({ success: true, data: defaultMetrics });
    }

  } catch (error) {
    return handleError(res, error, 'Dashboard API');
  }
}