import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    // 기간 제한 제거 - 100일치 모든 데이터 사용
    const days = 100;

    // 날짜 범위 계산 - 100일치 모든 데이터
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    // PRD 요구사항에 맞는 확장 통계 데이터 조회
    const [
      totalUsersResult,
      totalLoginsResult,
      totalSearchesResult,
      totalReportsResult,
      uniqueLoginUsersResult,
      uniqueSearchUsersResult,
      uniqueReportUsersResult,
      loginActivitiesResult,
      searchActivitiesResult,
      reportActivitiesResult
    ] = await Promise.all([
      // 총 사용자 수
      supabase
        .from('users')
        .select('id', { count: 'exact' })
        .is('deleted_at', null),

      // 총 로그인 수 (user_activity 테이블 사용)
      supabase
        .from('user_activity')
        .select('id', { count: 'exact' })
        .eq('activity_type', 'login')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString()),

      // 총 검색 수
      supabase
        .from('search_history')
        .select('id', { count: 'exact' })
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString()),

      // 총 리포트 생성 수 (reports 테이블 사용)
      supabase
        .from('reports')
        .select('id', { count: 'exact' })
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString()),

      // 고유 로그인 사용자
      supabase
        .from('user_activity')
        .select('user_id')
        .eq('activity_type', 'login')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .not('user_id', 'is', null),

      // 고유 검색 사용자
      supabase
        .from('search_history')
        .select('user_id')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .not('user_id', 'is', null),

      // 고유 리포트 생성 사용자
      supabase
        .from('reports')
        .select('user_id')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .not('user_id', 'is', null),

      // 로그인 활동 상세 (일별 분석용)
      supabase
        .from('user_activity')
        .select('created_at, user_id')
        .eq('activity_type', 'login')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString()),

      // 검색 활동 상세 (일별 분석용)
      supabase
        .from('search_history')
        .select('created_at, user_id')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString()),

      // 리포트 생성 활동 상세 (일별 분석용)
      supabase
        .from('reports')
        .select('created_at, user_id')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
    ]);

    // PRD 요구사항에 맞는 통계 계산
    const totalUsers = totalUsersResult.count || 0;
    const totalLogins = totalLoginsResult.count || 0;
    const totalSearches = totalSearchesResult.count || 0;
    const totalReports = totalReportsResult.count || 0;

    // 고유 사용자 수 계산
    const uniqueLoginUsers = new Set(uniqueLoginUsersResult.data?.map(item => item.user_id) || []).size;
    const uniqueSearchUsers = new Set(uniqueSearchUsersResult.data?.map(item => item.user_id) || []).size;
    const uniqueReportUsers = new Set(uniqueReportUsersResult.data?.map(item => item.user_id) || []).size;

    // PRD 요구사항: 기본 통계 카드
    const basicStats = {
      total_users: totalUsers,
      total_logins: totalLogins,
      total_searches: totalSearches,
      total_reports: totalReports
    };

    // PRD 요구사항: 평균 지표 카드
    const averageStats = {
      avg_logins_per_user: totalUsers > 0 ? Math.round((totalLogins / totalUsers) * 100) / 100 : 0,
      avg_searches_per_user: totalUsers > 0 ? Math.round((totalSearches / totalUsers) * 100) / 100 : 0,
      avg_reports_per_user: totalUsers > 0 ? Math.round((totalReports / totalUsers) * 100) / 100 : 0
    };

    // PRD 요구사항: 전환율 지표 카드
    const conversionStats = {
      login_to_report_conversion: totalLogins > 0 ? Math.round((totalReports / totalLogins) * 10000) / 100 : 0,
      search_to_report_conversion: totalSearches > 0 ? Math.round((totalReports / totalSearches) * 10000) / 100 : 0
    };

    // 일별 데이터 집계 (차트용)
    const dailyStats = [];
    for (let i = 0; i < parseInt(days); i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);
      
      const dayLogins = loginActivitiesResult.data?.filter(item => {
        const itemDate = new Date(item.created_at);
        return itemDate >= date && itemDate < nextDate;
      }).length || 0;

      const daySearches = searchActivitiesResult.data?.filter(item => {
        const itemDate = new Date(item.created_at);
        return itemDate >= date && itemDate < nextDate;
      }).length || 0;

      const dayReports = reportActivitiesResult.data?.filter(item => {
        const itemDate = new Date(item.created_at);
        return itemDate >= date && itemDate < nextDate;
      }).length || 0;

      dailyStats.push({
        date: date.toISOString().split('T')[0],
        logins: dayLogins,
        searches: daySearches,
        reports: dayReports,
        login_to_report_conversion: dayLogins > 0 ? Math.round((dayReports / dayLogins) * 10000) / 100 : 0,
        search_to_report_conversion: daySearches > 0 ? Math.round((dayReports / daySearches) * 10000) / 100 : 0
      });
    }

    const extendedStats = {
      period: {
        days: parseInt(days),
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      },
      // PRD 요구사항에 맞는 통계 구조
      basic_stats: basicStats,
      average_stats: averageStats,
      conversion_stats: conversionStats,
      daily_stats: dailyStats,
      unique_users: {
        login_users: uniqueLoginUsers,
        search_users: uniqueSearchUsers,
        report_users: uniqueReportUsers
      }
    };

    res.status(200).json({
      success: true,
      data: extendedStats
    });

  } catch (error) {
    console.error('Extended stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch extended statistics'
    });
  }
}