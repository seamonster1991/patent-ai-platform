import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ 
      error: 'Database configuration error',
      details: 'Missing environment variables'
    });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { period = '30d' } = req.query;

    // 기간 계산
    const now = new Date();
    let periodStart;
    let previousPeriodStart;
    let previousPeriodEnd;
    
    switch (period) {
      case '7d':
        periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        previousPeriodStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();
        previousPeriodEnd = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        break;
      case '30d':
        periodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
        previousPeriodStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString();
        previousPeriodEnd = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
        break;
      case '90d':
        periodStart = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
        previousPeriodStart = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000).toISOString();
        previousPeriodEnd = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
        break;
      default:
        periodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
        previousPeriodStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString();
        previousPeriodEnd = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    }

    // 1. 기본 KPI 통계 (현재 기간)
    const [
      totalUsersResult,
      currentPeriodLoginsResult,
      currentPeriodSearchesResult,
      totalMarketReportsResult,
      totalBusinessReportsResult,
      currentPeriodRevenueResult,
      uniqueLoginUsersResult
    ] = await Promise.all([
      // 총 사용자 수 (활성 사용자만)
      supabase
        .from('users')
        .select('id', { count: 'exact' })
        .is('deleted_at', null),
      
      // 현재 기간 로그인 수
      supabase
        .from('user_login_logs')
        .select('id', { count: 'exact' })
        .eq('login_success', true)
        .gte('created_at', periodStart),
      
      // 현재 기간 검색 수
      supabase
        .from('search_history')
        .select('id', { count: 'exact' })
        .gte('created_at', periodStart),
      
      // 전체 시장분석 리포트 수
      supabase
        .from('reports')
        .select('id', { count: 'exact' })
        .eq('report_type', 'market'),
      
      // 전체 비즈니스인사이트 리포트 수
      supabase
        .from('reports')
        .select('id', { count: 'exact' })
        .eq('report_type', 'business'),
      
      // 현재 기간 총 수익
      supabase
        .from('payment_transactions')
        .select('amount')
        .eq('status', 'success')
        .gte('created_at', periodStart),

      // 현재 기간 고유 로그인 사용자 수
      supabase
        .from('user_login_logs')
        .select('user_id')
        .eq('login_success', true)
        .gte('created_at', periodStart)
    ]);

    // 결제한 사용자 ID 목록을 가져와서 무료/유료 회원 수 계산
    const paidUserIdsResult = await supabase
      .from('payment_transactions')
      .select('user_id')
      .eq('status', 'success');
    
    const paidUserIds = [...new Set(paidUserIdsResult.data?.map(item => item.user_id) || [])];
    
    // 전체 사용자 목록 가져오기
    const allUsersResult = await supabase
      .from('users')
      .select('id')
      .is('deleted_at', null);
    
    const allUserIds = allUsersResult.data?.map(user => user.id) || [];
    const freeUserIds = allUserIds.filter(id => !paidUserIds.includes(id));
    
    const freeUsersResult = { count: freeUserIds.length };
    const paidUsersResult = { count: paidUserIds.length };

    // 2. 이전 기간 비교 데이터
    const [
      previousPeriodLoginsResult,
      previousPeriodSearchesResult,
      previousPeriodMarketReportsResult,
      previousPeriodBusinessReportsResult,
      previousPeriodRevenueResult
    ] = await Promise.all([
      // 이전 기간 로그인 수
      supabase
        .from('user_login_logs')
        .select('id', { count: 'exact' })
        .eq('login_success', true)
        .gte('created_at', previousPeriodStart)
        .lt('created_at', previousPeriodEnd),
      
      // 이전 기간 검색 수
      supabase
        .from('search_history')
        .select('id', { count: 'exact' })
        .gte('created_at', previousPeriodStart)
        .lt('created_at', previousPeriodEnd),
      
      // 이전 기간 시장분석 리포트 수
      supabase
        .from('reports')
        .select('id', { count: 'exact' })
        .eq('report_type', 'market')
        .gte('created_at', previousPeriodStart)
        .lt('created_at', previousPeriodEnd),
      
      // 이전 기간 비즈니스인사이트 리포트 수
      supabase
        .from('reports')
        .select('id', { count: 'exact' })
        .eq('report_type', 'business')
        .gte('created_at', previousPeriodStart)
        .lt('created_at', previousPeriodEnd),
      
      // 이전 기간 총 수익
      supabase
        .from('payment_transactions')
        .select('amount')
        .eq('status', 'success')
        .gte('created_at', previousPeriodStart)
        .lt('created_at', previousPeriodEnd)
    ]);

    // 수익 계산
    const currentRevenue = currentPeriodRevenueResult.data?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;
    const previousRevenue = previousPeriodRevenueResult.data?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;

    // 고유 사용자 수 계산
    const uniqueLoginUsers = new Set(uniqueLoginUsersResult.data?.map(item => item.user_id) || []).size;

    // 증감률 계산 함수
    const calculateChangeRate = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 10000) / 100;
    };

    // 총 리포트 수 계산
    const totalCurrentReports = (totalMarketReportsResult.count || 0) + (totalBusinessReportsResult.count || 0);
    const totalPreviousReports = (previousPeriodMarketReportsResult.count || 0) + (previousPeriodBusinessReportsResult.count || 0);

    // KPI 데이터 구성
    const kpiStats = {
      total_users: {
        value: totalUsersResult.count || 0,
        change_rate: 0 // 사용자 수는 누적이므로 증감률 계산 안함
      },
      free_members: {
        value: freeUsersResult.count || 0,
        change_rate: 0
      },
      paid_members: {
        value: paidUsersResult.count || 0,
        change_rate: 0
      },
      total_members: {
        value: (freeUsersResult.count || 0) + (paidUsersResult.count || 0),
        change_rate: 0
      },
      total_logins: {
        value: currentPeriodLoginsResult.count || 0,
        change_rate: calculateChangeRate(
          currentPeriodLoginsResult.count || 0,
          previousPeriodLoginsResult.count || 0
        )
      },
      total_searches: {
        value: currentPeriodSearchesResult.count || 0,
        change_rate: calculateChangeRate(
          currentPeriodSearchesResult.count || 0,
          previousPeriodSearchesResult.count || 0
        )
      },
      market_reports: {
        value: totalMarketReportsResult.count || 0,
        change_rate: calculateChangeRate(
          totalMarketReportsResult.count || 0,
          previousPeriodMarketReportsResult.count || 0
        )
      },
      business_reports: {
        value: totalBusinessReportsResult.count || 0,
        change_rate: calculateChangeRate(
          totalBusinessReportsResult.count || 0,
          previousPeriodBusinessReportsResult.count || 0
        )
      },
      total_reports: {
        value: totalCurrentReports,
        change_rate: calculateChangeRate(totalCurrentReports, totalPreviousReports)
      },
      total_revenue: {
        value: currentRevenue,
        change_rate: calculateChangeRate(currentRevenue, previousRevenue)
      }
    };

    // 3. 효율성 지표 계산
    const totalUsers = totalUsersResult.count || 0;
    const efficiencyMetrics = {
      avg_logins_per_user: totalUsers > 0 ? Math.round(((currentPeriodLoginsResult.count || 0) / totalUsers) * 100) / 100 : 0,
      avg_searches_per_user: totalUsers > 0 ? Math.round(((currentPeriodSearchesResult.count || 0) / totalUsers) * 100) / 100 : 0,
      avg_market_reports_per_user: totalUsers > 0 ? Math.round(((totalMarketReportsResult.count || 0) / totalUsers) * 100) / 100 : 0,
      avg_business_reports_per_user: totalUsers > 0 ? Math.round(((totalBusinessReportsResult.count || 0) / totalUsers) * 100) / 100 : 0,
      avg_total_reports_per_user: totalUsers > 0 ? Math.round((totalCurrentReports / totalUsers) * 100) / 100 : 0
    };

    // 4. 전환율 계산
    // 로그인 → 리포트 전환율: 총 리포트 생성 수 / 총 로그인 수 × 100
    const totalLoginsResult = await supabase
      .from('user_activities')
      .select('id', { count: 'exact' })
      .eq('activity_type', 'login')
      .gte('created_at', periodStart);

    const totalLogins = totalLoginsResult.count || 0;
    const totalReports = totalCurrentReports;
    const loginToReportRate = totalLogins > 0 ? Math.round((totalReports / totalLogins) * 10000) / 100 : 0;

    // 검색 → 리포트 전환율: 총 리포트 생성 수 / 총 검색 수 × 100
    const totalSearches = currentPeriodSearchesResult.count || 0;

    const searchToReportRate = totalSearches > 0 ? Math.round((totalReports / totalSearches) * 10000) / 100 : 0;

    const conversionRates = {
      login_to_report: loginToReportRate,
      search_to_report: searchToReportRate
    };

    return res.status(200).json({
      success: true,
      data: {
        period,
        kpi_stats: kpiStats,
        efficiency_metrics: efficiencyMetrics,
        conversion_rates: conversionRates,
        generated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Admin comprehensive stats error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
}