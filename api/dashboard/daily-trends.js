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
    let days;
    
    switch (period) {
      case '7d':
        days = 7;
        periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        days = 30;
        periodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        days = 90;
        periodStart = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        days = 30;
        periodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // 날짜별 데이터 초기화
    const dailyData = {};
    for (let i = 0; i < days; i++) {
      const date = new Date(periodStart.getTime() + i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      dailyData[dateStr] = {
        date: dateStr,
        new_users: 0,
        total_logins: 0,
        total_searches: 0,
        market_reports: 0,
        business_reports: 0,
        total_reports: 0,
        revenue: 0,
        unique_active_users: new Set()
      };
    }

    // 1. 일별 신규 사용자 수
    const dailyNewUsersResult = await supabase
      .from('users')
      .select('created_at')
      .gte('created_at', periodStart.toISOString())
      .is('deleted_at', null);

    dailyNewUsersResult.data?.forEach(user => {
      const date = user.created_at.split('T')[0];
      if (dailyData[date]) {
        dailyData[date].new_users++;
      }
    });

    // 2. 일별 로그인 수
    const dailyLoginsResult = await supabase
      .from('user_login_logs')
      .select('created_at, user_id')
      .eq('login_success', true)
      .gte('created_at', periodStart.toISOString());

    dailyLoginsResult.data?.forEach(login => {
      const date = login.created_at.split('T')[0];
      if (dailyData[date]) {
        dailyData[date].total_logins++;
        if (login.user_id) {
          dailyData[date].unique_active_users.add(login.user_id);
        }
      }
    });

    // 3. 일별 검색 수
    const dailySearchesResult = await supabase
      .from('search_history')
      .select('created_at, user_id')
      .gte('created_at', periodStart.toISOString());

    dailySearchesResult.data?.forEach(search => {
      const date = search.created_at.split('T')[0];
      if (dailyData[date]) {
        dailyData[date].total_searches++;
        if (search.user_id) {
          dailyData[date].unique_active_users.add(search.user_id);
        }
      }
    });

    // 4. 일별 리포트 생성 수
    const dailyReportsResult = await supabase
      .from('reports')
      .select('created_at, report_type, user_id')
      .gte('created_at', periodStart.toISOString());

    dailyReportsResult.data?.forEach(report => {
      const date = report.created_at.split('T')[0];
      if (dailyData[date]) {
        if (report.report_type === 'market') {
          dailyData[date].market_reports++;
        } else if (report.report_type === 'business') {
          dailyData[date].business_reports++;
        }
        dailyData[date].total_reports++;
        if (report.user_id) {
          dailyData[date].unique_active_users.add(report.user_id);
        }
      }
    });

    // 5. 일별 수익
    const dailyRevenueResult = await supabase
      .from('payment_transactions')
      .select('created_at, amount')
      .eq('status', 'success')
      .gte('created_at', periodStart.toISOString());

    dailyRevenueResult.data?.forEach(payment => {
      const date = payment.created_at.split('T')[0];
      if (dailyData[date]) {
        dailyData[date].revenue += payment.amount || 0;
      }
    });

    // 6. 데이터 정리 및 변환
    const trendsData = Object.values(dailyData)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(day => ({
        date: day.date,
        new_users: day.new_users,
        total_logins: day.total_logins,
        total_searches: day.total_searches,
        market_reports: day.market_reports,
        business_reports: day.business_reports,
        total_reports: day.total_reports,
        revenue: day.revenue,
        unique_active_users: day.unique_active_users.size,
        // 추가 계산된 지표
        avg_searches_per_user: day.unique_active_users.size > 0 ? 
          Math.round((day.total_searches / day.unique_active_users.size) * 100) / 100 : 0,
        conversion_rate: day.total_searches > 0 ? 
          Math.round((day.total_reports / day.total_searches) * 10000) / 100 : 0
      }));

    // 7. 요약 통계
    const totalStats = trendsData.reduce((acc, day) => ({
      total_new_users: acc.total_new_users + day.new_users,
      total_logins: acc.total_logins + day.total_logins,
      total_searches: acc.total_searches + day.total_searches,
      total_market_reports: acc.total_market_reports + day.market_reports,
      total_business_reports: acc.total_business_reports + day.business_reports,
      total_reports: acc.total_reports + day.total_reports,
      total_revenue: acc.total_revenue + day.revenue,
      max_daily_users: Math.max(acc.max_daily_users, day.unique_active_users),
      max_daily_searches: Math.max(acc.max_daily_searches, day.total_searches),
      max_daily_reports: Math.max(acc.max_daily_reports, day.total_reports)
    }), {
      total_new_users: 0,
      total_logins: 0,
      total_searches: 0,
      total_market_reports: 0,
      total_business_reports: 0,
      total_reports: 0,
      total_revenue: 0,
      max_daily_users: 0,
      max_daily_searches: 0,
      max_daily_reports: 0
    });

    // 8. 평균 계산
    const averageStats = {
      avg_daily_new_users: Math.round((totalStats.total_new_users / days) * 100) / 100,
      avg_daily_logins: Math.round((totalStats.total_logins / days) * 100) / 100,
      avg_daily_searches: Math.round((totalStats.total_searches / days) * 100) / 100,
      avg_daily_reports: Math.round((totalStats.total_reports / days) * 100) / 100,
      avg_daily_revenue: Math.round((totalStats.total_revenue / days) * 100) / 100
    };

    // 9. 성장률 계산 (첫 주와 마지막 주 비교)
    const firstWeekData = trendsData.slice(0, Math.min(7, days));
    const lastWeekData = trendsData.slice(-Math.min(7, days));

    const firstWeekAvg = {
      searches: firstWeekData.reduce((sum, day) => sum + day.total_searches, 0) / firstWeekData.length,
      reports: firstWeekData.reduce((sum, day) => sum + day.total_reports, 0) / firstWeekData.length,
      users: firstWeekData.reduce((sum, day) => sum + day.unique_active_users, 0) / firstWeekData.length
    };

    const lastWeekAvg = {
      searches: lastWeekData.reduce((sum, day) => sum + day.total_searches, 0) / lastWeekData.length,
      reports: lastWeekData.reduce((sum, day) => sum + day.total_reports, 0) / lastWeekData.length,
      users: lastWeekData.reduce((sum, day) => sum + day.unique_active_users, 0) / lastWeekData.length
    };

    const growthRates = {
      searches_growth: firstWeekAvg.searches > 0 ? 
        Math.round(((lastWeekAvg.searches - firstWeekAvg.searches) / firstWeekAvg.searches) * 10000) / 100 : 0,
      reports_growth: firstWeekAvg.reports > 0 ? 
        Math.round(((lastWeekAvg.reports - firstWeekAvg.reports) / firstWeekAvg.reports) * 10000) / 100 : 0,
      users_growth: firstWeekAvg.users > 0 ? 
        Math.round(((lastWeekAvg.users - firstWeekAvg.users) / firstWeekAvg.users) * 10000) / 100 : 0
    };

    // 응답 데이터 구성
    const response = {
      period,
      period_start: periodStart.toISOString(),
      period_end: now.toISOString(),
      days_count: days,
      daily_trends: trendsData,
      summary_stats: totalStats,
      average_stats: averageStats,
      growth_rates: growthRates,
      generated_at: now.toISOString()
    };

    res.status(200).json(response);

  } catch (error) {
    console.error('Daily trends API error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}