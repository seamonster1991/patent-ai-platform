import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { period = '1h' } = req.query;

    // 시간 범위 계산
    let timeRange;
    const now = new Date();
    
    switch (period) {
      case '1h':
        timeRange = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        timeRange = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        timeRange = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        timeRange = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        timeRange = new Date(now.getTime() - 60 * 60 * 1000);
    }

    // 시스템 메트릭 데이터 조회
    const [
      searchMetrics,
      reportMetrics,
      userMetrics,
      errorMetrics
    ] = await Promise.all([
      // 검색 메트릭
      supabase
        .from('search_history')
        .select('id, created_at, search_duration_ms')
        .gte('created_at', timeRange.toISOString()),

      // 리포트 생성 메트릭
      supabase
        .from('ai_analysis_reports')
        .select('id, created_at')
        .gte('created_at', timeRange.toISOString()),

      // 사용자 활동 메트릭
      supabase
        .from('users')
        .select('id, created_at, last_login')
        .gte('created_at', timeRange.toISOString()),

      // 에러 로그 (있다면)
      supabase
        .from('error_logs')
        .select('id, created_at, error_type')
        .gte('created_at', timeRange.toISOString())
        .limit(100)
    ]);

    // 메트릭 계산
    const searchCount = searchMetrics.data?.length || 0;
    const reportCount = reportMetrics.data?.length || 0;
    const newUserCount = userMetrics.data?.length || 0;
    const errorCount = errorMetrics.data?.length || 0;

    // 평균 응답 시간 계산
    const avgSearchResponseTime = searchMetrics.data?.length > 0
      ? searchMetrics.data.reduce((sum, item) => sum + (item.response_time || 0), 0) / searchMetrics.data.length
      : 0;

    const avgReportProcessingTime = 0; // processing_time 컬럼이 없으므로 0으로 설정

    // 시간별 분포 계산 (최근 24시간을 시간별로)
    const hourlyData = [];
    for (let i = 23; i >= 0; i--) {
      const hourStart = new Date(now.getTime() - i * 60 * 60 * 1000);
      const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);
      
      const hourSearches = searchMetrics.data?.filter(item => {
        const itemTime = new Date(item.created_at);
        return itemTime >= hourStart && itemTime < hourEnd;
      }).length || 0;

      const hourReports = reportMetrics.data?.filter(item => {
        const itemTime = new Date(item.created_at);
        return itemTime >= hourStart && itemTime < hourEnd;
      }).length || 0;

      hourlyData.push({
        hour: hourStart.getHours(),
        searches: hourSearches,
        reports: hourReports,
        timestamp: hourStart.toISOString()
      });
    }

    const systemMetrics = {
      period,
      timeRange: {
        start: timeRange.toISOString(),
        end: now.toISOString()
      },
      summary: {
        totalSearches: searchCount,
        totalReports: reportCount,
        newUsers: newUserCount,
        errors: errorCount,
        avgSearchResponseTime: Math.round(avgSearchResponseTime),
        avgReportProcessingTime: Math.round(avgReportProcessingTime)
      },
      hourlyData,
      performance: {
        searchThroughput: searchCount / (period === '1h' ? 1 : period === '24h' ? 24 : 1),
        reportThroughput: reportCount / (period === '1h' ? 1 : period === '24h' ? 24 : 1),
        errorRate: searchCount > 0 ? (errorCount / searchCount * 100).toFixed(2) : 0
      }
    };

    res.status(200).json({
      success: true,
      data: systemMetrics
    });

  } catch (error) {
    console.error('System metrics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch system metrics'
    });
  }
}