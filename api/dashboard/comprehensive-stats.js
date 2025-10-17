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
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayStart = today.toISOString();
    const todayEnd = new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString();
    
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
      currentPeriodMarketReportsResult,
      currentPeriodBusinessReportsResult,
      currentPeriodRevenueResult
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
      
      // 현재 기간 시장분석 리포트 수
      supabase
        .from('reports')
        .select('id', { count: 'exact' })
        .eq('report_type', 'market')
        .gte('created_at', periodStart),
      
      // 현재 기간 비즈니스인사이트 리포트 수
      supabase
        .from('reports')
        .select('id', { count: 'exact' })
        .eq('report_type', 'business')
        .gte('created_at', periodStart),
      
      // 현재 기간 총 수익
      supabase
        .from('payment_transactions')
        .select('amount')
        .eq('status', 'success')
        .gte('created_at', periodStart)
    ]);

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

    // 증감률 계산 함수
    const calculateChangeRate = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 10000) / 100;
    };

    // KPI 데이터 구성
    const kpiStats = {
      total_users: {
        value: totalUsersResult.count || 0,
        change_rate: 0 // 사용자 수는 누적이므로 증감률 계산 안함
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
        value: currentPeriodMarketReportsResult.count || 0,
        change_rate: calculateChangeRate(
          currentPeriodMarketReportsResult.count || 0,
          previousPeriodMarketReportsResult.count || 0
        )
      },
      business_reports: {
        value: currentPeriodBusinessReportsResult.count || 0,
        change_rate: calculateChangeRate(
          currentPeriodBusinessReportsResult.count || 0,
          previousPeriodBusinessReportsResult.count || 0
        )
      },
      total_revenue: {
        value: currentRevenue,
        change_rate: calculateChangeRate(currentRevenue, previousRevenue)
      }
    };

    // 3. 효율성 지표 계산
    const totalUsers = totalUsersResult.count || 0;
    const totalLogins = currentPeriodLoginsResult.count || 0;
    const totalSearches = currentPeriodSearchesResult.count || 0;
    const totalMarketReports = currentPeriodMarketReportsResult.count || 0;
    const totalBusinessReports = currentPeriodBusinessReportsResult.count || 0;
    const totalReports = totalMarketReports + totalBusinessReports;

    const efficiencyMetrics = {
      avg_logins_per_user: totalUsers > 0 ? Math.round((totalLogins / totalUsers) * 100) / 100 : 0,
      avg_searches_per_user: totalUsers > 0 ? Math.round((totalSearches / totalUsers) * 100) / 100 : 0,
      avg_market_reports_per_user: totalUsers > 0 ? Math.round((totalMarketReports / totalUsers) * 100) / 100 : 0,
      avg_business_reports_per_user: totalUsers > 0 ? Math.round((totalBusinessReports / totalUsers) * 100) / 100 : 0,
      avg_total_reports_per_user: totalUsers > 0 ? Math.round((totalReports / totalUsers) * 100) / 100 : 0
    };

    // 4. 전환율 계산
    const [
      uniqueLoginUsersResult,
      uniqueSearchUsersResult,
      uniqueReportUsersResult,
      searchToReportConversionResult
    ] = await Promise.all([
      // 로그인한 고유 사용자
      supabase
        .from('user_login_logs')
        .select('user_id')
        .eq('login_success', true)
        .gte('created_at', periodStart)
        .not('user_id', 'is', null),
      
      // 검색한 고유 사용자
      supabase
        .from('search_history')
        .select('user_id')
        .gte('created_at', periodStart)
        .not('user_id', 'is', null),
      
      // 리포트 생성한 고유 사용자
      supabase
        .from('reports')
        .select('user_id')
        .gte('created_at', periodStart)
        .not('user_id', 'is', null),
      
      // 검색 후 5분 이내 리포트 생성한 사용자 (간단화: 같은 날 검색 후 리포트 생성)
      supabase
        .rpc('get_search_to_report_conversion', {
          period_start: periodStart
        })
        .single()
    ]);

    const uniqueLoginUsers = new Set(uniqueLoginUsersResult.data?.map(item => item.user_id) || []);
    const uniqueSearchUsers = new Set(uniqueSearchUsersResult.data?.map(item => item.user_id) || []);
    const uniqueReportUsers = new Set(uniqueReportUsersResult.data?.map(item => item.user_id) || []);

    const conversionRates = {
      login_to_report: uniqueLoginUsers.size > 0 ? 
        Math.round((uniqueReportUsers.size / uniqueLoginUsers.size) * 10000) / 100 : 0,
      search_to_report: uniqueSearchUsers.size > 0 ? 
        Math.round((uniqueReportUsers.size / uniqueSearchUsers.size) * 10000) / 100 : 0,
      new_to_active_user: totalUsers > 0 ? 
        Math.round((uniqueLoginUsers.size / totalUsers) * 10000) / 100 : 0,
      user_activity_rate: totalUsers > 0 ? 
        Math.round((uniqueSearchUsers.size / totalUsers) * 10000) / 100 : 0
    };

    // 응답 데이터 구성
    const response = {
      period,
      period_start: periodStart,
      period_end: now.toISOString(),
      kpi_stats: kpiStats,
      efficiency_metrics: efficiencyMetrics,
      conversion_rates: conversionRates,
      generated_at: now.toISOString()
    };

    res.status(200).json(response);

  } catch (error) {
    console.error('Comprehensive stats API error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}