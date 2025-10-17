import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Service Role Key 사용

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 캐시 방지 헤더 추가
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ 
      error: 'Database configuration error',
      details: 'Missing environment variables'
    });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 기간 파라미터 처리
    const { period = '30d' } = req.query;
    let periodDays = 30;
    
    switch (period) {
      case '7d':
        periodDays = 7;
        break;
      case '30d':
        periodDays = 30;
        break;
      case '90d':
        periodDays = 90;
        break;
      default:
        periodDays = 30;
    }

    // 날짜 계산
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayStart = today.toISOString();
    const todayEnd = new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString();
    
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const periodAgo = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000).toISOString();

    // 기본 메트릭 데이터 조회
    const [
      totalUsersResult,
      activeUsersResult,
      deletedUsersResult,
      paidUsersResult,
      totalSearchesResult,
      totalReportsResult,
      // 로그인 통계 - user_activity 테이블 사용 (로그인 기록이 없는 경우 대체)
      totalLoginsResult,
      todayLoginsResult,
      uniqueLoginUsersResult,
      weeklyLoginsResult,
      monthlyLoginsResult,
      // 검색 통계 (추가)
      searchUsersResult,
      // 리포트 통계 (추가)
      reportUsersResult,
      // 세션 시간 통계
      sessionTimeResult
    ] = await Promise.all([
      // 총 활성 사용자 수 (삭제되지 않은 사용자)
      supabase
        .from('users')
        .select('id', { count: 'exact' })
        .is('deleted_at', null),
      
      // 활성 사용자 수 (기간 내 활동) - user_activity 테이블 사용
      supabase
        .from('user_activity')
        .select('user_id')
        .gte('created_at', periodAgo)
        .not('user_id', 'is', null),

      // 삭제된 사용자 수
      supabase
        .from('users')
        .select('id', { count: 'exact' })
        .not('deleted_at', 'is', null),

      // 유료 사용자 수 (성공한 결제가 있는 사용자)
      supabase
        .from('payment_transactions')
        .select('user_id')
        .eq('status', 'success')
        .not('user_id', 'is', null),
      
      // 총 검색 수 (기간 필터 적용)
      supabase
        .from('search_history')
        .select('id', { count: 'exact' })
        .gte('created_at', periodAgo),
      
      // 총 리포트 수 - reports 테이블 사용 (기간 필터 적용)
      supabase
        .from('reports')
        .select('id', { count: 'exact' })
        .gte('created_at', periodAgo),

      // === 로그인 통계 - user_login_logs 테이블 사용 ===
      // 총 로그인 횟수 (기간 내)
      supabase
        .from('user_login_logs')
        .select('id', { count: 'exact' })
        .eq('login_success', true)
        .gte('created_at', periodAgo),
      
      // 오늘 로그인 횟수
      supabase
        .from('user_login_logs')
        .select('id', { count: 'exact' })
        .eq('login_success', true)
        .gte('created_at', todayStart)
        .lt('created_at', todayEnd),
      
      // 고유 로그인 사용자 (기간 내)
      supabase
        .from('user_login_logs')
        .select('user_id')
        .eq('login_success', true)
        .gte('created_at', periodAgo)
        .not('user_id', 'is', null),
      
      // 주간 로그인 (최근 7일)
      supabase
        .from('user_login_logs')
        .select('id', { count: 'exact' })
        .eq('login_success', true)
        .gte('created_at', weekAgo),
      
      // 월간 로그인 (최근 30일)
      supabase
        .from('user_login_logs')
        .select('id', { count: 'exact' })
        .eq('login_success', true)
        .gte('created_at', monthAgo),

      // === 검색 통계 (추가) ===
      // 검색한 사용자들 (기간 내)
      supabase
        .from('search_history')
        .select('user_id')
        .gte('created_at', periodAgo)
        .not('user_id', 'is', null),

      // === 리포트 통계 (추가) ===
      // 리포트 생성한 사용자들 (기간 내)
      supabase
        .from('reports')
        .select('user_id')
        .gte('created_at', periodAgo)
        .not('user_id', 'is', null),

      // === 세션 시간 통계 ===
      // 평균 세션 시간 - user_activity에서 세션 시간 계산
      supabase
        .from('user_activity')
        .select('activity_data')
        .eq('activity_type', 'session')
        .not('activity_data', 'is', null)
        .gte('created_at', periodAgo)
    ]);

    // 오늘의 데이터 조회
    const [
      todaySearchesResult,
      todayReportsResult,
      todayUsersResult
    ] = await Promise.all([
      // 오늘 검색 수
      supabase
        .from('search_history')
        .select('id', { count: 'exact' })
        .gte('created_at', todayStart)
        .lt('created_at', todayEnd),
      
      // 오늘 리포트 수 - reports 테이블 사용
      supabase
        .from('reports')
        .select('id', { count: 'exact' })
        .gte('created_at', todayStart)
        .lt('created_at', todayEnd),
      
      // 오늘 신규 사용자 수
      supabase
        .from('users')
        .select('id', { count: 'exact' })
        .gte('created_at', todayStart)
        .lt('created_at', todayEnd)
        .is('deleted_at', null)
    ]);

    // 데이터 처리 및 계산
    const uniqueActivityUsers = new Set(activeUsersResult.data?.map(item => item.user_id) || []);
    const uniqueLoginUsers = new Set(uniqueLoginUsersResult.data?.map(item => item.user_id) || []);
    const uniqueSearchUsers = new Set(searchUsersResult.data?.map(item => item.user_id) || []);
    const uniqueReportUsers = new Set(reportUsersResult.data?.map(item => item.user_id) || []);
    const uniquePaidUsers = new Set(paidUsersResult.data?.map(item => item.user_id) || []);
    
    // 실제 활성 사용자 = 검색하거나 리포트를 생성한 사용자들의 합집합
    const uniqueActiveUsers = new Set([...uniqueSearchUsers, ...uniqueReportUsers]);
    
    // 활성 사용자 수 계산 - 검색 또는 리포트 생성한 사용자 수 사용 (실제 활동 기반)
    // unique_search_users와 unique_report_users가 이미 올바르게 계산되고 있으므로 이를 활용
    const activeUserCount = Math.max(uniqueSearchUsers.size, uniqueReportUsers.size);

    // 통계 계산 - 사용자 요구사항에 맞게 정확히 계산
    const totalActiveUsers = totalUsersResult.count || 0; // 삭제되지 않은 사용자 (실제 활동중인 계정)
    const totalDeletedUsers = deletedUsersResult.count || 0; // 삭제된 사용자
    const totalAllUsers = totalActiveUsers + totalDeletedUsers; // 총 사용자수 (삭제된 계정 포함)
    
    // 유료/무료 회원 구분 - 결제 성공 여부로 판단
    const totalPaidUsers = uniquePaidUsers.size; // 유료 회원 (구독결제 완료한 회원)
    const totalFreeUsers = Math.max(0, totalActiveUsers - totalPaidUsers); // 무료 회원 (구독결제 안된 회원)
    const totalMembers = totalFreeUsers + totalPaidUsers; // 총 회원수 (실제 활동중인 계정의 합)
    
    const totalSearches = totalSearchesResult.count || 0;
    const totalReports = totalReportsResult.count || 0;
    const totalLogins = totalLoginsResult.count || 0;
    
    // 평균 계산
    const avgDailySearches = periodDays > 0 ? Math.round((totalSearches / periodDays) * 100) / 100 : 0;
    const avgSearchesPerUser = totalActiveUsers > 0 ? Math.round((totalSearches / totalActiveUsers) * 100) / 100 : 0;
    const avgDailyReports = periodDays > 0 ? Math.round((totalReports / periodDays) * 100) / 100 : 0;
    const avgReportsPerUser = totalActiveUsers > 0 ? Math.round((totalReports / totalActiveUsers) * 100) / 100 : 0;

    // 전환율 계산
    const searchToReportConversion = totalSearches > 0 ? Math.round((totalReports / totalSearches) * 10000) / 100 : 0;
    const loginToSearchConversion = uniqueLoginUsers.size > 0 ? Math.round((uniqueSearchUsers.size / uniqueLoginUsers.size) * 10000) / 100 : 0;
    const newToActiveUserConversion = totalActiveUsers > 0 ? Math.round((uniqueActiveUsers.size / totalActiveUsers) * 10000) / 100 : 0;

    // 사용자 활동률
    const userActivityRate = totalActiveUsers > 0 ? Math.round((uniqueActiveUsers.size / totalActiveUsers) * 10000) / 100 : 0;

    // 평균 세션 시간 계산 - user_activity에서 세션 데이터 추출
    const sessionTimes = [];
    if (sessionTimeResult.data) {
      sessionTimeResult.data.forEach(item => {
        try {
          const activityData = typeof item.activity_data === 'string' ? JSON.parse(item.activity_data) : item.activity_data;
          if (activityData && activityData.session_duration_ms && activityData.session_duration_ms > 0) {
            sessionTimes.push(activityData.session_duration_ms);
          }
        } catch (e) {
          // JSON 파싱 오류 무시
        }
      });
    }
    const avgSessionTime = sessionTimes.length > 0 ? 
      Math.round((sessionTimes.reduce((sum, time) => sum + time, 0) / sessionTimes.length) / 1000) : 0; // 초 단위

    // 재방문율 (로그인한 사용자 중 검색도 한 사용자 비율)
    const returnUserRate = uniqueLoginUsers.size > 0 ? 
      Math.round((uniqueSearchUsers.size / uniqueLoginUsers.size) * 10000) / 100 : 0;

    const metrics = {
      // 사용자 통계 (정확한 구분)
      total_all_users: totalAllUsers, // 총 사용자수 (삭제된 계정 포함)
      total_users: totalActiveUsers, // 총 회원수 (실제 활동중인 계정)
      free_members: Math.max(0, totalFreeUsers), // 무료 회원 (구독결제 안된 회원)
      paid_members: totalPaidUsers, // 유료 회원 (구독결제 완료한 회원)
      deleted_users: totalDeletedUsers, // 삭제된 사용자
      active_users: activeUserCount, // 기간 내 활동한 사용자
      
      // 기존 호환성 필드들
      total_revenue: 0,
      monthly_revenue: 0,
      total_patents: 0,
      pending_patents: 0,
      user_growth_rate: 0,
      revenue_growth_rate: 0,
      total_analyses: totalReports,
      analysis_growth_rate: 0,
      system_health: {
        status: 'healthy',
        cpu_usage: 0,
        memory_usage: 0,
        disk_usage: 0
      },
      recent_activities: [],

      // === 로그인 통계 ===
      login_stats: {
        total_logins: totalLogins,
        today_logins: todayLoginsResult.count || 0,
        weekly_logins: weeklyLoginsResult.count || 0,
        monthly_logins: monthlyLoginsResult.count || 0,
        unique_login_users: uniqueLoginUsers.size,
        unique_login_users_30d: uniqueLoginUsers.size
      },

      // === 검색 통계 ===
      search_stats: {
        total_searches: totalSearches,
        today_searches: todaySearchesResult.count || 0,
        avg_daily_searches: avgDailySearches,
        avg_searches_per_user: avgSearchesPerUser,
        unique_search_users: uniqueSearchUsers.size
      },

      // === 리포트 생성 통계 ===
      report_stats: {
        total_reports: totalReports,
        today_reports: todayReportsResult.count || 0,
        avg_daily_reports: avgDailyReports,
        avg_reports_per_user: avgReportsPerUser,
        unique_report_users: uniqueReportUsers.size
      },

      // === 전환율 통계 ===
      conversion_rates: {
        search_to_report: searchToReportConversion, // %
        login_to_search: loginToSearchConversion, // %
        new_to_active_user: newToActiveUserConversion, // %
        user_activity_rate: userActivityRate // %
      },

      // === 추가 유용한 통계 ===
      additional_stats: {
        avg_session_time_seconds: avgSessionTime,
        return_user_rate: returnUserRate, // %
        total_unique_active_users: activeUserCount,
        engagement_score: Math.round(((searchToReportConversion + userActivityRate + returnUserRate) / 3) * 100) / 100
      },

      // 프론트엔드 호환성을 위한 기존 필드들
      totalUsers: totalActiveUsers, // 활성 사용자 수로 변경
      totalSearches: totalSearches,
      totalReports: totalReports,
      activeUsers: activeUserCount,
      todaySearches: todaySearchesResult.count || 0,
      todayReports: todayReportsResult.count || 0,
      todayNewUsers: todayUsersResult.count || 0,

      // 기간 정보 추가
      period: period,
      period_days: periodDays,
      
      // 타임스탬프 추가 (캐시 무효화용)
      timestamp: Date.now(),
      lastUpdated: new Date().toISOString()
    };

    res.status(200).json({
      success: true,
      data: metrics
    });

  } catch (error) {
    console.error('Dashboard metrics error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch dashboard metrics',
      details: error.message 
    });
  }
}