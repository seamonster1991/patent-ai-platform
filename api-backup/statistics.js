const { createClient } = require('@supabase/supabase-js');

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Supabase URL 또는 Service Role Key가 설정되지 않았습니다.');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// CORS 헤더 설정
const setCorsHeaders = (res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
};

module.exports = async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    const { type } = req.query;

    try {
      switch (type) {
        case 'search-keywords':
          return await getSearchKeywords(req, res);
        case 'tech-distribution':
          return await getTechDistribution(req, res);
        case 'top-patents':
          return await getTopPatents(req, res);
        case 'user-stats':
          return await getUserStats(req, res);
        case 'system-metrics':
          return await getSystemMetrics(req, res);
        case 'revenue-metrics':
          return await getRevenueMetrics(req, res);
        default:
          return res.status(400).json({
            success: false,
            error: '유효하지 않은 통계 타입입니다.'
          });
      }
    } catch (error) {
      console.error('관리자 통계 조회 오류:', error);
      return res.status(500).json({
        success: false,
        error: '통계 조회에 실패했습니다.',
        details: error.message
      });
    }
  }

  return res.status(405).json({
    success: false,
    error: 'Method not allowed'
  });
}

// 검색 키워드 통계
async function getSearchKeywords(req, res) {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // 사용자 활동에서 검색 키워드 추출
    const { data: searchActivities } = await supabase
      .from('user_activities')
      .select('activity_data, created_at')
      .eq('activity_type', 'search')
      .gte('created_at', thirtyDaysAgo);

    // 키워드별 카운트 계산
    const keywordCounts = {};
    const weeklyKeywordCounts = {};
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    searchActivities?.forEach(activity => {
      const searchData = activity.activity_data;
      if (searchData && searchData.searchQuery) {
        const keyword = searchData.searchQuery.toLowerCase().trim();
        if (keyword) {
          keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
          
          // 주간 데이터 (성장률 계산용)
          if (activity.created_at >= oneWeekAgo) {
            weeklyKeywordCounts[keyword] = (weeklyKeywordCounts[keyword] || 0) + 1;
          }
        }
      }
    });

    // 상위 20개 키워드 선택 및 성장률 계산
    const searchKeywords = Object.entries(keywordCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 20)
      .map(([keyword, count]) => {
        const weeklyCount = weeklyKeywordCounts[keyword] || 0;
        const previousWeekCount = count - weeklyCount;
        const growthRate = previousWeekCount > 0 
          ? ((weeklyCount - previousWeekCount) / previousWeekCount) * 100 
          : weeklyCount > 0 ? 100 : 0;

        return {
          keyword,
          count,
          growthRate: Math.round(growthRate * 10) / 10
        };
      });

    return res.status(200).json({
      success: true,
      data: searchKeywords
    });

  } catch (error) {
    console.error('검색 키워드 통계 조회 오류:', error);
    throw error;
  }
}

// 기술 분야별 분포
async function getTechDistribution(req, res) {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // AI 분석 리포트에서 IPC 코드 추출
    const { data: reports } = await supabase
      .from('ai_analysis_reports')
      .select('ipc_codes, created_at')
      .gte('created_at', thirtyDaysAgo)
      .not('ipc_codes', 'is', null);

    const categoryMapping = {
      'A': '생활필수품',
      'B': '처리조작; 운수',
      'C': '화학; 야금',
      'D': '섬유; 지류',
      'E': '고정구조물',
      'F': '기계공학; 조명; 가열; 무기; 폭파',
      'G': '물리학',
      'H': '전기'
    };

    const categoryCounts = {};
    let totalCount = 0;

    reports?.forEach(report => {
      if (report.ipc_codes && Array.isArray(report.ipc_codes)) {
        report.ipc_codes.forEach(code => {
          if (code && typeof code === 'string') {
            const mainCategory = code.charAt(0).toUpperCase();
            const categoryName = categoryMapping[mainCategory] || `기타 (${mainCategory})`;
            categoryCounts[categoryName] = (categoryCounts[categoryName] || 0) + 1;
            totalCount++;
          }
        });
      }
    });

    const techDistribution = Object.entries(categoryCounts)
      .sort(([,a], [,b]) => b - a)
      .map(([category, count]) => ({
        category,
        count,
        percentage: Math.round((count / Math.max(totalCount, 1)) * 100 * 10) / 10
      }));

    return res.status(200).json({
      success: true,
      data: techDistribution
    });

  } catch (error) {
    console.error('기술 분포 통계 조회 오류:', error);
    throw error;
  }
}

// 인기 특허 통계
async function getTopPatents(req, res) {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // AI 분석 리포트에서 특허별 분석 횟수 계산
    const { data: reports } = await supabase
      .from('ai_analysis_reports')
      .select('application_number, invention_title, applicant_name, created_at')
      .gte('created_at', thirtyDaysAgo)
      .not('application_number', 'is', null);

    const patentCounts = {};
    const patentDetails = {};

    reports?.forEach(report => {
      const appNumber = report.application_number;
      if (appNumber) {
        patentCounts[appNumber] = (patentCounts[appNumber] || 0) + 1;
        
        // 특허 상세 정보 저장 (첫 번째 발견된 것 사용)
        if (!patentDetails[appNumber]) {
          patentDetails[appNumber] = {
            title: report.invention_title || '제목 없음',
            applicant: report.applicant_name || '출원인 정보 없음'
          };
        }
      }
    });

    // 상위 15개 특허 선택
    const topPatents = Object.entries(patentCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 15)
      .map(([applicationNumber, analysisCount]) => ({
        applicationNumber,
        title: patentDetails[applicationNumber]?.title || '제목 없음',
        applicant: patentDetails[applicationNumber]?.applicant || '출원인 정보 없음',
        analysisCount
      }));

    return res.status(200).json({
      success: true,
      data: topPatents
    });

  } catch (error) {
    console.error('인기 특허 통계 조회 오류:', error);
    throw error;
  }
}

// 사용자 통계
async function getUserStats(req, res) {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // 전체 사용자 수
    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    // 프리미엄 사용자 수
    const { count: premiumUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('subscription_plan', 'premium');

    // 최근 30일 활성 사용자
    const { data: activeUserData } = await supabase
      .from('user_activities')
      .select('user_id')
      .gte('created_at', thirtyDaysAgo);

    const activeUsers = new Set(activeUserData?.map(a => a.user_id)).size;

    // 최근 7일 신규 가입자
    const { count: newSignups } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo);

    const userStats = {
      totalUsers: totalUsers || 0,
      activeUsers,
      newSignups: newSignups || 0,
      premiumUsers: premiumUsers || 0,
      freeUsers: (totalUsers || 0) - (premiumUsers || 0)
    };

    return res.status(200).json({
      success: true,
      data: userStats
    });

  } catch (error) {
    console.error('사용자 통계 조회 오류:', error);
    throw error;
  }
}

// 시스템 메트릭
async function getSystemMetrics(req, res) {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // LLM 분석 로그에서 비용 및 사용량 계산
    const { data: llmLogs } = await supabase
      .from('llm_analysis_logs')
      .select('total_tokens, cost_estimate, processing_time_ms, created_at')
      .gte('created_at', thirtyDaysAgo);

    const totalCost = llmLogs?.reduce((sum, log) => sum + (Number(log.cost_estimate) || 0), 0) || 0;
    const totalTokens = llmLogs?.reduce((sum, log) => sum + (log.total_tokens || 0), 0) || 0;
    const avgLatency = llmLogs?.length > 0 
      ? llmLogs.reduce((sum, log) => sum + (log.processing_time_ms || 0), 0) / llmLogs.length 
      : 0;

    // 시스템 메트릭에서 캐싱 데이터
    const { data: systemData } = await supabase
      .from('system_metrics')
      .select('*')
      .eq('metric_name', 'cache_hit_rate')
      .gte('recorded_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('recorded_at', { ascending: false })
      .limit(1);

    const cachingHitRate = systemData?.[0]?.value ? Number(systemData[0].value) : 75.0;

    // 에러율 계산 (실패한 분석 / 전체 분석)
    const { count: failedAnalyses } = await supabase
      .from('llm_analysis_logs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'failed')
      .gte('created_at', thirtyDaysAgo);

    const totalAnalyses = llmLogs?.length || 0;
    const errorRate = totalAnalyses > 0 ? (failedAnalyses / totalAnalyses) * 100 : 0;

    const systemMetrics = {
      llmCost: Math.round(totalCost * 100) / 100,
      llmUsage: totalTokens,
      cachingHitRate: Math.round(cachingHitRate * 10) / 10,
      estimatedSavings: Math.round(totalCost * (cachingHitRate / 100) * 100) / 100,
      apiLatency: Math.round(avgLatency),
      errorRate: Math.round(errorRate * 10) / 10,
      systemHealth: totalCost > 2000 ? 'warning' : errorRate > 5 ? 'critical' : 'healthy'
    };

    return res.status(200).json({
      success: true,
      data: systemMetrics
    });

  } catch (error) {
    console.error('시스템 메트릭 조회 오류:', error);
    throw error;
  }
}

// 수익 메트릭
async function getRevenueMetrics(req, res) {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // 결제 이벤트에서 수익 데이터 계산
    const { data: billingEvents } = await supabase
      .from('billing_events')
      .select('amount, event_type, processed_at')
      .in('event_type', ['subscription_created', 'invoice_paid']);

    const totalRevenue = billingEvents?.reduce((sum, event) => sum + (Number(event.amount) || 0), 0) || 0;
    
    // 월간 반복 수익 (MRR) - 최근 30일 구독 수익
    const recentRevenue = billingEvents?.filter(e => e.processed_at >= thirtyDaysAgo)
      .reduce((sum, event) => sum + (Number(event.amount) || 0), 0) || 0;

    // 사용자 수 조회
    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    // 구독 취소 이벤트에서 이탈률 계산
    const { count: cancelledSubscriptions } = await supabase
      .from('billing_events')
      .select('*', { count: 'exact', head: true })
      .eq('event_type', 'subscription_cancelled')
      .gte('processed_at', thirtyDaysAgo);

    const { count: activeSubscriptions } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('subscription_plan', 'premium');

    const churnRate = activeSubscriptions > 0 
      ? (cancelledSubscriptions / activeSubscriptions) * 100 
      : 0;

    const revenueMetrics = {
      mrr: Math.round(recentRevenue * 100) / 100,
      churnRate: Math.round(churnRate * 10) / 10,
      arr: Math.round(recentRevenue * 12 * 100) / 100,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      avgRevenuePerUser: totalUsers > 0 ? Math.round((totalRevenue / totalUsers) * 100) / 100 : 0
    };

    return res.status(200).json({
      success: true,
      data: revenueMetrics
    });

  } catch (error) {
    console.error('수익 메트릭 조회 오류:', error);
    throw error;
  }
}