const { createClient } = require('@supabase/supabase-js');

// 환경변수 로드
require('dotenv').config();

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
let supabase = null;

try {
  if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('✅ [users/stats.js] Supabase 클라이언트 초기화 성공');
  } else {
    console.warn('⚠️ [users/stats.js] Supabase 환경변수 누락:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseKey
    });
  }
} catch (error) {
  console.error('❌ [users/stats.js] Supabase 클라이언트 초기화 실패:', error.message);
  supabase = null;
}

// 빈 데이터 구조 생성 함수 (실제 데이터가 없을 때 사용)
function createEmptyDataStructure(isNewUser = false) {
  const baseData = {
    summary: {
      search_count: 0,
      detail_view_count: 0,
      total_login_count: 0,
      ai_analysis_count: 0,
      total_usage_cost: 0,
      average_search_results: 0
    },
    recent_searches: [],
    recent_reports: [],
    top_keywords: [],
    field_distribution: [],
    weekly_activities: Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return {
        day: date.toLocaleDateString('ko-KR', { weekday: 'short' }),
        date: date.toISOString().split('T')[0],
        count: 0
      };
    }),
    hourly_activities: Array.from({ length: 24 }, (_, hour) => ({
      hour,
      count: 0
    })),
    daily_activities: Array.from({ length: 100 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (99 - i));
      return {
        date: date.toISOString().split('T')[0],
        count: 0
      };
    }),
    daily_activities_100days: Array.from({ length: 100 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (99 - i));
      return {
        date: date.toISOString().split('T')[0],
        count: 0
      };
    })
  };

  // 새 사용자인 경우 환영 메시지 추가
  if (isNewUser) {
    baseData.message = "환영합니다! 첫 번째 특허 검색을 시작해보세요.";
    baseData.isNewUser = true;
  }

  return baseData;
}

module.exports = async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // OPTIONS 요청 처리
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET 요청만 허용
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed',
      message: 'Only GET method is allowed'
    });
  }

  try {
    // URL에서 userId 추출
    const { searchParams } = new URL(req.url, `http://${req.headers.host}`);
    let userId = searchParams.get('userId');

    console.log('🔍 [users/stats.js] 요청 URL:', req.url);
    console.log('🔍 [users/stats.js] 추출된 userId:', userId);
    console.log('🔍 [users/stats.js] userId 타입:', typeof userId);
    console.log('🔍 [users/stats.js] userId 길이:', userId?.length);
    console.log('🔍 [users/stats.js] 모든 쿼리 파라미터:', Object.fromEntries(searchParams.entries()));

    // 기본 테스트 사용자 ID (실제 데이터가 있는 사용자)
    const defaultTestUserId = '276975db-635b-4c77-87a0-548f91b14231';

    if (!userId) {
      console.warn('⚠️ [users/stats.js] userId가 제공되지 않음, 기본 테스트 사용자 ID 사용');
      userId = defaultTestUserId;
    }

    console.log(`📊 [users/stats.js] 사용자 통계 요청: ${userId}`);

    // Supabase 연결 확인
    if (!supabase) {
      console.error('❌ Supabase 클라이언트가 초기화되지 않음');
      return res.status(500).json({
        success: false,
        error: 'Database connection failed',
        message: 'Supabase 연결에 실패했습니다.'
      });
    }

    // 사용자 통계 데이터 수집
    let dashboardData;
    try {
      dashboardData = await getUserStats(userId);
      console.log('📊 [users/stats.js] 실제 사용자 데이터 반환:', userId);
    } catch (dbError) {
      console.error('❌ 데이터베이스 쿼리 실패:', dbError);
      return res.status(500).json({
        success: false,
        error: 'Database query failed',
        message: '데이터베이스 쿼리에 실패했습니다.'
      });
    }

    return res.status(200).json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    console.error('❌ [users/stats.js] API 오류:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
};

// 사용자 통계 데이터 수집 (Dashboard.tsx가 기대하는 응답 구조로 변환)
async function getUserStats(userId) {
  try {
    console.log(`📊 사용자 통계 수집 시작: ${userId}`);
    console.log(`🔗 Supabase 연결 상태:`, !!supabase);
    console.log(`🔗 Supabase URL:`, supabaseUrl);
    console.log(`🔗 Service Key 존재:`, !!supabaseKey);

    // Supabase가 초기화되지 않았거나 연결에 문제가 있는 경우 에러 발생
    if (!supabase) {
      console.error('❌ Supabase 클라이언트가 없음');
      throw new Error('Database connection not available');
    }

    // 테이블 존재 여부 확인을 위한 안전한 쿼리
    console.log('🔍 테이블 존재 여부 확인 중...');
    const tableChecks = await Promise.allSettled([
      supabase.from('users').select('id').limit(1),
      supabase.from('search_history').select('id').limit(1),
      supabase.from('patent_detail_views').select('id').limit(1),
      supabase.from('ai_analysis_reports').select('id').limit(1),
      supabase.from('user_login_logs').select('id').limit(1),
      supabase.from('usage_cost_tracking').select('id').limit(1)
    ]);

    console.log('📋 테이블 체크 결과:', tableChecks.map((result, index) => ({
      table: ['users', 'search_history', 'patent_detail_views', 'ai_analysis_reports', 'user_login_logs', 'usage_cost_tracking'][index],
      status: result.status,
      error: result.status === 'rejected' ? result.reason?.message : null
    })));

    // 실패한 테이블이 있으면 에러 발생
    const failedTables = tableChecks.filter(result => result.status === 'rejected');
    if (failedTables.length > 0) {
      console.error('❌ 일부 테이블에 접근할 수 없음');
      console.error('❌ 실패한 테이블:', failedTables.map(f => f.reason?.message));
      throw new Error('Database tables not accessible');
    }

    // 1. 사용자 존재 여부 확인
    const { data: existingUser, error: userCheckError } = await supabase
      .from('users')
      .select('id, email, name, created_at')
      .eq('id', userId)
      .single();

    let isNewUser = false;
    
    if (userCheckError && userCheckError.code === 'PGRST116') {
      // 사용자가 존재하지 않음 - 새 사용자로 간주
      console.log('👤 새 사용자 감지:', userId);
      isNewUser = true;
    } else if (userCheckError) {
      console.error('❌ 사용자 확인 중 오류:', userCheckError);
      throw new Error('User verification failed');
    }

    // 2. 새로운 테이블에서 기본 통계 수집
    const [userStatsResult, searchHistoryResult, patentDetailViewsResult, aiReportsResult, loginLogsResult, usageCostResult] = await Promise.allSettled([
      supabase
        .from('users')
        .select('total_searches, total_detail_views, total_logins, total_usage_cost')
        .eq('id', userId)
        .single(),
      supabase
        .from('search_history')
        .select('*')
        .eq('user_id', userId),
      supabase
        .from('patent_detail_views')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId),
      supabase
        .from('ai_analysis_reports')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId),
      supabase
        .from('user_login_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId),
      supabase
        .from('usage_cost_tracking')
        .select('cost_amount')
        .eq('user_id', userId)
    ]);

    // 안전하게 데이터 추출
    const userStats = userStatsResult.status === 'fulfilled' ? userStatsResult.value?.data || {} : {};
    const searchHistory = searchHistoryResult.status === 'fulfilled' ? searchHistoryResult.value?.data || [] : [];
    const patentDetailViewsCount = patentDetailViewsResult.status === 'fulfilled' ? patentDetailViewsResult.value?.count || 0 : 0;
    const aiAnalysisCount = aiReportsResult.status === 'fulfilled' ? aiReportsResult.value?.count || 0 : 0;
    const loginLogsCount = loginLogsResult.status === 'fulfilled' ? loginLogsResult.value?.count || 0 : 0;
    const usageCostData = usageCostResult.status === 'fulfilled' ? usageCostResult.value?.data || [] : [];

    // user_activities 테이블에서 실제 사용자 활동 데이터 조회
    console.log('📊 user_activities 테이블에서 실제 데이터 조회 중...');
    const { data: userActivities, error: activitiesError } = await supabase
      .from('user_activities')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (activitiesError) {
      console.error('❌ user_activities 조회 실패:', activitiesError);
    }

    const activities = userActivities || [];
    console.log(`📊 user_activities에서 ${activities.length}개의 활동 기록 발견`);

    // 검색 활동만 필터링
    const searchActivities = activities.filter(activity => activity.activity_type === 'search');
    console.log(`📊 검색 활동: ${searchActivities.length}개`);

    // user_activities에서 실제 활동 수를 우선적으로 사용
    console.log('🔍 totalSearches 계산 디버깅:', {
      'userStats.total_searches': userStats.total_searches,
      'searchActivities.length': searchActivities.length,
      'searchHistory.length': searchHistory.length
    });
    
    const totalSearches = (userStats.total_searches && userStats.total_searches > 0) 
      ? userStats.total_searches 
      : (searchActivities.length || searchHistory.length || 0);
      
    console.log('🔍 최종 totalSearches:', totalSearches);
    
    const totalDetailViews = userStats.total_detail_views || patentDetailViewsCount;
    const totalLogins = userStats.total_logins || loginLogsCount;
    
    // 총 사용비용 계산
    let totalUsageCost = userStats.total_usage_cost || 0;
    if (!totalUsageCost && usageCostData.length > 0) {
      totalUsageCost = usageCostData.reduce((sum, cost) => sum + (cost.cost_amount || 0), 0);
    }

    // 디버깅을 위한 상세 로그
    console.log('📊 데이터 확인:', {
      searchActivitiesLength: searchActivities.length,
      totalSearches,
      totalDetailViews,
      totalLogins,
      userActivitiesLength: activities.length
    });

    // 실제 데이터가 없는 경우 빈 데이터 구조 반환
    if (searchActivities.length === 0 && totalSearches === 0 && totalDetailViews === 0 && totalLogins === 0) {
      console.log('📊 실제 데이터가 없어 빈 데이터 구조 반환');
      return createEmptyDataStructure(isNewUser);
    }

    // 2. 최근 검색 및 리포트 (최근 20개) - user_activities에서 가져오기
    const recentSearches = searchActivities.slice(0, 20).map(activity => ({
      id: activity.id,
      keyword: activity.activity_data?.keyword || '',
      results_count: activity.activity_data?.results_count || 0,
      created_at: activity.created_at,
      technology_field: activity.activity_data?.technology_field || '',
      field_confidence: activity.activity_data?.field_confidence || 0
    }));

    const [recentReportsResult, recentAiReportsResult] = await Promise.allSettled([
      supabase
        .from('reports')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('ai_analysis_reports')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20)
    ]);

    const recentReports = recentReportsResult.status === 'fulfilled' ? recentReportsResult.value?.data || [] : [];
    const recentAiReports = recentAiReportsResult.status === 'fulfilled' ? recentAiReportsResult.value?.data || [] : [];
    
    // 두 종류의 리포트를 합치고 시간순으로 정렬
    let allRecentReports = [
      ...recentReports.map(report => ({
        ...report,
        type: 'business_report',
        title: report.patent_title || `${report.report_type} 분석 리포트`,
        patent_title: report.patent_title,
        patent_number: report.patent_number || report.application_number,
        report_type: report.report_type
      })),
      ...recentAiReports.map(report => ({
        ...report,
        type: 'ai_analysis',
        title: report.invention_title || '특허 분석 리포트',
        patent_title: report.invention_title,
        patent_number: report.application_number,
        report_type: 'AI 분석'
      }))
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 20);

    // 3. 인기 키워드 및 기술 분야 분석
    const keywordAnalysis = await getKeywordAnalysis(userId);

    // 4. 주간 및 시간별 활동 데이터
    const [weeklyActivity, hourlyActivity] = await Promise.all([
      getWeeklyActivity(userId),
      getHourlyActivity(userId)
    ]);

    // 5. 일별 활동 데이터 (최근 100일)
    const dailyActivity = await getDailyActivity(userId, 100);

    // 6. 평균 검색 결과 수 계산
    let averageSearchResults = 0;
    if (totalSearches > 0 && searchHistory.length > 0) {
      const totalResults = searchHistory.reduce((sum, search) => sum + (search.results_count || 0), 0);
      averageSearchResults = Math.round(totalResults / totalSearches);
    }

    // Dashboard.tsx에서 요구하는 형태로 데이터 구성
    const summary = {
      search_count: totalSearches,
      detail_view_count: totalDetailViews,
      total_login_count: totalLogins,
      ai_analysis_count: aiAnalysisCount,
      total_usage_cost: Math.round(totalUsageCost),
      average_search_results: averageSearchResults
    };

    const dashboardData = {
      summary,
      recent_searches: recentSearches.slice(0, 20).map(search => ({
        id: search.id,
        query: search.keyword || '검색어 없음',
        timestamp: search.created_at,
        results: search.results_count || 0
      })),
      recent_reports: allRecentReports.slice(0, 20).map(report => ({
        id: report.id,
        title: report.title || '리포트 제목 없음',
        patent_title: report.patent_title || '특허 제목 없음',
        patent_number: report.patent_number || '특허번호 없음',
        report_type: report.report_type || 'analysis',
        timestamp: report.created_at
      })),
      top_keywords: keywordAnalysis.topKeywords.slice(0, 20),
      field_distribution: keywordAnalysis.fieldDistribution,
      weekly_activities: weeklyActivity,
      hourly_activities: hourlyActivity,
      daily_activities: dailyActivity, // 최근 100일간 일별 검색 활동
      daily_activities_100days: dailyActivity // 호환성을 위해 유지
    };

    console.log(`✅ 사용자 통계 수집 완료: ${userId}`, {
      totalSearches,
      totalDetailViews,
      totalLogins,
      recentSearchesCount: recentSearches.length,
      recentReportsCount: allRecentReports.length
    });

    return dashboardData;

  } catch (error) {
    console.error('❌ 사용자 통계 수집 실패:', error);
    throw error;
  }
}

// 키워드 분석
// 키워드 분석 (최근 100일 기준)
async function getKeywordAnalysis(userId) {
  try {
    // 최근 100일 날짜 계산
    const hundredDaysAgo = new Date();
    hundredDaysAgo.setDate(hundredDaysAgo.getDate() - 100);

    // user_activities 테이블에서 검색 활동 데이터 가져오기
    const { data: userActivities, error: activitiesError } = await supabase
      .from('user_activities')
      .select('*')
      .eq('user_id', userId)
      .eq('activity_type', 'search')
      .gte('created_at', hundredDaysAgo.toISOString())
      .order('created_at', { ascending: false });

    if (activitiesError) {
      console.error('❌ user_activities 조회 실패:', activitiesError);
      return { topKeywords: [], fieldDistribution: [] };
    }

    const keywordCounts = {};
    const fieldCounts = {};

    // user_activities에서 키워드 추출
    if (userActivities && userActivities.length > 0) {
      userActivities.forEach(activity => {
        const keyword = activity.activity_data?.keyword;
        if (keyword) {
          keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
          
          // 기술 분야 분류
          const field = activity.activity_data?.technology_field || classifyTechField(keyword);
          if (field) {
            fieldCounts[field] = (fieldCounts[field] || 0) + 1;
          }
        }
      });
    }

    const topKeywords = Object.entries(keywordCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 20)
      .map(([keyword, count]) => ({ keyword, count }));

    const fieldDistribution = Object.entries(fieldCounts)
      .map(([field, count]) => ({ field, count }))
      .sort((a, b) => b.count - a.count);

    return { topKeywords, fieldDistribution };
  } catch (error) {
    console.error('키워드 분석 실패:', error);
    return { topKeywords: [], fieldDistribution: [] };
  }
}

// 주간 활동 데이터
async function getWeeklyActivity(userId) {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // user_activities 테이블에서 모든 활동 데이터 수집
    const { data: userActivities, error: activitiesError } = await supabase
      .from('user_activities')
      .select('created_at, activity_type')
      .eq('user_id', userId)
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: false });

    if (activitiesError) {
      console.error('❌ user_activities 조회 실패:', activitiesError);
    }

    const weeklyData = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return {
        day: date.toLocaleDateString('ko-KR', { weekday: 'short' }),
        date: date.toISOString().split('T')[0],
        count: 0
      };
    });

    // user_activities에서 활동 카운트
    const allActivities = userActivities || [];

    allActivities.forEach(activity => {
      const activityDate = new Date(activity.created_at).toISOString().split('T')[0];
      const dayData = weeklyData.find(d => d.date === activityDate);
      if (dayData) {
        dayData.count++;
      }
    });

    return weeklyData;
  } catch (error) {
    console.error('주간 활동 데이터 수집 실패:', error);
    return [];
  }
}

// 시간별 활동 데이터
async function getHourlyActivity(userId) {
  try {
    // user_activities 테이블에서 모든 활동 데이터 수집
    const { data: userActivities, error: activitiesError } = await supabase
      .from('user_activities')
      .select('created_at, activity_type')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (activitiesError) {
      console.error('❌ user_activities 조회 실패:', activitiesError);
    }

    const hourlyData = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      count: 0
    }));

    // user_activities에서 활동 카운트
    const allActivities = userActivities || [];

    allActivities.forEach(activity => {
      const hour = new Date(activity.created_at).getHours();
      hourlyData[hour].count++;
    });

    return hourlyData;
  } catch (error) {
    console.error('시간별 활동 데이터 수집 실패:', error);
    return [];
  }
}

// 일별 활동 데이터
async function getDailyActivity(userId, days = 100) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // user_activities 테이블에서 모든 활동 데이터 수집
    const { data: userActivities, error: activitiesError } = await supabase
      .from('user_activities')
      .select('created_at, activity_type')
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });

    if (activitiesError) {
      console.error('❌ user_activities 조회 실패:', activitiesError);
    }

    const dailyData = Array.from({ length: days }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - i));
      return {
        date: date.toISOString().split('T')[0],
        count: 0
      };
    });

    // user_activities에서 활동 카운트
    const allActivities = userActivities || [];

    allActivities.forEach(activity => {
      const activityDate = new Date(activity.created_at).toISOString().split('T')[0];
      const dayData = dailyData.find(d => d.date === activityDate);
      if (dayData) {
        dayData.count++;
      }
    });

    return dailyData;
  } catch (error) {
    console.error('일별 활동 데이터 수집 실패:', error);
    return [];
  }
}

// 저장된 특허 수
async function getSavedPatentsCount(userId) {
  try {
    const { count } = await supabase
      .from('saved_patents')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    return count || 0;
  } catch (error) {
    console.error('저장된 특허 수 조회 실패:', error);
    return 0;
  }
}

// 기술 분야 분류
function classifyTechField(keyword) {
  const fields = {
    'AI/머신러닝': ['ai', 'artificial intelligence', '인공지능', 'machine learning', '머신러닝', 'deep learning', '딥러닝', 'neural network', '신경망'],
    '바이오/의료': ['bio', '바이오', 'medical', '의료', 'healthcare', '헬스케어', 'pharmaceutical', '제약', 'diagnosis', '진단'],
    'IT/소프트웨어': ['software', '소프트웨어', 'algorithm', '알고리즘', 'database', '데이터베이스', 'network', '네트워크', 'security', '보안'],
    '전자/반도체': ['semiconductor', '반도체', 'electronic', '전자', 'chip', '칩', 'circuit', '회로', 'processor', '프로세서'],
    '통신': ['communication', '통신', 'wireless', '무선', '5g', '6g', 'antenna', '안테나', 'signal', '신호'],
    '자동차': ['automotive', '자동차', 'vehicle', '차량', 'autonomous', '자율주행', 'electric vehicle', '전기차'],
    '에너지': ['energy', '에너지', 'battery', '배터리', 'solar', '태양광', 'renewable', '재생에너지', 'fuel cell', '연료전지'],
    '기타': []
  };

  const lowerKeyword = keyword.toLowerCase();
  
  for (const [field, keywords] of Object.entries(fields)) {
    if (field === '기타') continue;
    if (keywords.some(k => lowerKeyword.includes(k.toLowerCase()))) {
      return field;
    }
  }
  
  return '기타';
}