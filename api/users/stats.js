const { createClient } = require('@supabase/supabase-js');

// Supabase 클라이언트 초기화 (안전한 초기화)
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
let supabase = null;

try {
  if (supabaseUrl && supabaseServiceKey) {
    supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log('✅ [stats.js] Supabase 클라이언트 초기화 성공');
  } else {
    console.warn('⚠️ [stats.js] Supabase 환경변수 누락:', {
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey
    });
  }
} catch (error) {
  console.error('❌ [stats.js] Supabase 클라이언트 초기화 실패:', error.message);
  supabase = null;
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
    console.log('=== 사용자 통계 조회 요청 ===');
    console.log('req.params:', req.params);
    console.log('req.query:', req.query);
    console.log('req.url:', req.url);
    console.log('req.originalUrl:', req.originalUrl);
    
    // Supabase 연결 확인
    if (!supabase) {
      console.error('❌ Supabase 클라이언트가 초기화되지 않음');
      return res.status(500).json({
        success: false,
        error: 'Database connection error',
        message: 'Database connection is not available'
      });
    }
    
    // URL 파라미터와 쿼리 파라미터에서 사용자 ID 가져오기
    const userId = req.params?.userId || req.query?.userId;
    const { period = '30' } = req.query;
    
    console.log('추출된 userId:', userId);
    
    // userId가 없는 경우에도 전체(집계) 통계를 제공하도록 변경
    // (게스트/집계 모드 지원)

    // UUID 형식 검증 (완화된 버전 - 임시 사용자 허용)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const isValidUuid = uuidRegex.test(userId);
    
    // 임시 사용자 ID 패턴 허용 (guest_, temp_, test_ 등)
    const isTempUser = /^(guest|temp|test|demo)_/.test(userId);
    
    if (!isValidUuid && !isTempUser && userId !== 'anonymous') {
      console.log('잘못된 사용자 ID 형식:', userId);
      // UUID가 아니더라도 기본 사용자로 처리
      console.log('기본 사용자 ID로 fallback 처리');
    }

    console.log('사용자 ID:', userId, '기간:', period + '일');

    // 실제 사용자 ID 사용 (guest_user나 임시 사용자도 포함)
    const actualUserId = userId;
    console.log('실제 사용할 사용자 ID:', actualUserId);

    // 기간 계산 (일 단위)
    const periodDays = parseInt(period) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    // 1. 전체 활동 통계
    // guest_user나 임시 사용자의 경우 전체 데이터 조회, 그 외에는 특정 사용자 데이터 조회
    let activitiesQuery = supabase
      .from('user_activities')
      .select('activity_type, created_at, activity_data')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });

    // 실제 UUID 사용자가 아닌 경우 전체 데이터 조회 (guest, temp 사용자 등)
    if (isValidUuid && actualUserId !== 'anonymous') {
      activitiesQuery = activitiesQuery.eq('user_id', actualUserId);
    }

    const { data: activities, error: activitiesError } = await activitiesQuery;

    if (activitiesError) {
      console.error('활동 데이터 조회 오류:', activitiesError);
      throw activitiesError;
    }

    console.log('조회된 활동 수:', activities?.length || 0);

    // 활동 데이터가 없는 경우 빈 배열로 초기화
    const safeActivities = activities || [];

    // 2. 활동 타입별 집계
    const activityBreakdown = safeActivities.reduce((acc, activity) => {
      const type = activity.activity_type;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    // 3. 일별 활동 통계 (최근 7일)
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayActivities = safeActivities.filter(activity => 
        activity.created_at.startsWith(dateStr)
      );
      
      last7Days.push({
        date: dateStr,
        count: dayActivities.length,
        breakdown: dayActivities.reduce((acc, activity) => {
          const type = activity.activity_type;
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        }, {})
      });
    }

    // 3-1. 100일간 일별 활동 통계 (그래프용)
    const last100Days = [];
    for (let i = 99; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayActivities = safeActivities.filter(activity => 
        activity.created_at.startsWith(dateStr)
      );
      
      last100Days.push({
        date: dateStr,
        count: dayActivities.length,
        searchCount: dayActivities.filter(a => a.activity_type === 'search').length
      });
    }

    // 3-2. 시간대별 활동 통계 (24시간)
    const hourlyStats = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      count: 0,
      searchCount: 0,
      aiAnalysisCount: 0
    }));

    safeActivities.forEach(activity => {
      const hour = new Date(activity.created_at).getHours();
      hourlyStats[hour].count++;
      if (activity.activity_type === 'search') {
        hourlyStats[hour].searchCount++;
      } else if (activity.activity_type === 'ai_analysis') {
        hourlyStats[hour].aiAnalysisCount++;
      }
    });

    // 3-3. 요일별 활동 통계 - Mon(월) ~ Sun(일) 순서로 정렬
    // Date.getDay() 기준: 0=일,1=월,2=화,3=수,4=목,5=금,6=토
    const weekOrder = [1, 2, 3, 4, 5, 6, 0]; // 월~일 순서
    const weekNames = {
      0: '일요일',
      1: '월요일',
      2: '화요일',
      3: '수요일',
      4: '목요일',
      5: '금요일',
      6: '토요일'
    };

    const weeklyBuckets = Array.from({ length: 7 }, () => ({
      count: 0,
      searchCount: 0,
      aiAnalysisCount: 0
    }));

    safeActivities.forEach(activity => {
      const dow = new Date(activity.created_at).getDay();
      weeklyBuckets[dow].count++;
      if (activity.activity_type === 'search') {
        weeklyBuckets[dow].searchCount++;
      } else if (activity.activity_type === 'ai_analysis') {
        weeklyBuckets[dow].aiAnalysisCount++;
      }
    });

    const weeklyStats = weekOrder.map((dow, idx) => ({
      day: weekNames[dow],
      dayIndex: dow, // 주말 색상 표시를 위해 JS 요일 인덱스를 유지 (0=일,6=토)
      count: weeklyBuckets[dow].count,
      searchCount: weeklyBuckets[dow].searchCount,
      aiAnalysisCount: weeklyBuckets[dow].aiAnalysisCount
    }));

    // 4. 검색 키워드 통계 및 평균 검색 결과 계산
    const searchActivities = safeActivities.filter(activity => 
      activity.activity_type === 'search' && activity.activity_data?.keyword
    );
    
    const keywordStats = searchActivities.reduce((acc, activity) => {
      const keyword = activity.activity_data.keyword;
      acc[keyword] = (acc[keyword] || 0) + 1;
      return acc;
    }, {});

    const topKeywords = Object.entries(keywordStats)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([keyword, count]) => ({ keyword, count }));

    // 평균 검색 결과 계산
    let totalSearchResults = 0;
    let totalSearchCount = 0;
    
    searchActivities.forEach(activity => {
      const resultsCount = activity.activity_data?.results_count;
      if (typeof resultsCount === 'number' && resultsCount >= 0) {
        totalSearchResults += resultsCount;
        totalSearchCount++;
      }
    });
    
    const averageSearchResults = totalSearchCount > 0 ? 
      Math.round((totalSearchResults / totalSearchCount) * 10) / 10 : 0;
    
    console.log('검색 결과 통계:', {
      totalSearchResults,
      totalSearchCount,
      averageSearchResults
    });

    // 4-1. 검색 분야 분포 통계
    const fieldDistribution = {};
    searchActivities.forEach(activity => {
      const keyword = activity.activity_data.keyword;
      const field = classifyKeywordField(keyword);
      fieldDistribution[field] = (fieldDistribution[field] || 0) + 1;
    });

    const fieldStats = Object.entries(fieldDistribution)
      .map(([field, count]) => ({ field, count }))
      .sort((a, b) => b.count - a.count);

    // 5. AI 분석 통계
    const aiAnalysisActivities = safeActivities.filter(activity => 
      activity.activity_type === 'ai_analysis'
    );

    const analysisTypeStats = aiAnalysisActivities.reduce((acc, activity) => {
      const type = activity.activity_data?.analysis_type || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    // 6. 문서 다운로드 통계
    const downloadActivities = safeActivities.filter(activity => 
      activity.activity_type === 'document_download'
    );

    const documentTypeStats = downloadActivities.reduce((acc, activity) => {
      const type = activity.activity_data?.document_type || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    // 7. 최근 검색 기록 (실제 DB에서 조회)
    console.log('검색 활동 수:', searchActivities.length);
    const recentSearches = searchActivities.slice(0, 5).map(activity => ({
      keyword: activity.activity_data?.keyword || '',
      searchDate: activity.created_at,
      resultsCount: activity.activity_data?.results_count || 0,
      field: classifyKeywordField(activity.activity_data?.keyword)
    }));
    console.log('최근 검색 기록:', recentSearches.length);

    // 8. 최근 리포트 목록 (실제 DB에서 조회)
    let reportsQuery = supabase
      .from('ai_analysis_reports')
      .select('id, invention_title, application_number, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    // 실제 UUID 사용자가 아닌 경우 전체 데이터 조회 (guest, temp 사용자 등)
    if (isValidUuid && actualUserId !== 'anonymous') {
      reportsQuery = reportsQuery.eq('user_id', actualUserId);
    } else {
      // guest_user나 임시 사용자의 경우 user_id가 null인 보고서들 조회
      reportsQuery = reportsQuery.is('user_id', null);
    }

    const { data: reports, error: reportsError } = await reportsQuery;

    if (reportsError) {
      console.error('리포트 데이터 조회 오류:', reportsError);
    }

    console.log('조회된 보고서 수:', reports?.length || 0);
    const recentReports = (reports || []).map(report => ({
      id: report.id,
      title: report.invention_title,
      applicationNumber: report.application_number,
      createdAt: report.created_at,
      downloadUrl: `/api/generate-report?reportId=${report.id}&format=pdf`
    }));
    console.log('최근 보고서:', recentReports.length);

    // 9. 최근 활동 내역 (최대 30개 - 각 타입별로 10개씩 필터링하기 위해 여유분 확보)
    const recentActivities = safeActivities.slice(0, 30).map(activity => ({
      type: activity.activity_type,
      data: activity.activity_data,
      timestamp: activity.created_at,
      description: generateActivityDescription(activity)
    }));

    // 응답 데이터 구성
    const statsResponse = {
      success: true,
      data: {
        period: `${periodDays}일`,
        summary: {
          total_activities: safeActivities.length,
          search_count: activityBreakdown.search || 0,
          patent_view_count: activityBreakdown.patent_view || 0,
          ai_analysis_count: activityBreakdown.ai_analysis || 0,
          document_download_count: activityBreakdown.document_download || 0,
          report_generate_count: activityBreakdown.report_generate || 0,
          average_search_results: averageSearchResults,
          total_search_results: totalSearchResults
        },
        activity_breakdown: activityBreakdown,
        daily_activities: last7Days,
        daily_activities_100days: last100Days,
        hourly_activities: hourlyStats,
        weekly_activities: weeklyStats,
        top_keywords: topKeywords,
        field_distribution: fieldStats,
        analysis_type_stats: analysisTypeStats,
        document_type_stats: documentTypeStats,
        recent_activities: recentActivities,
        recent_searches: recentSearches,
        recent_reports: recentReports
      }
    };

    console.log('✅ 사용자 통계 조회 완료');
    return res.status(200).json(statsResponse);

  } catch (error) {
    console.error('❌ 사용자 통계 조회 오류:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Stats retrieval error',
      message: error.message || 'Failed to retrieve user statistics'
    });
  }
};

// 키워드 분야 분류 함수
function classifyKeywordField(keyword) {
  if (!keyword) return '기타';
  
  const keywordLower = keyword.toLowerCase();
  
  // AI/머신러닝 분야
  if (keywordLower.includes('인공지능') || keywordLower.includes('ai') || 
      keywordLower.includes('머신러닝') || keywordLower.includes('딥러닝') ||
      keywordLower.includes('neural') || keywordLower.includes('machine learning')) {
    return 'AI/머신러닝';
  }
  
  // 바이오/의료 분야
  if (keywordLower.includes('바이오') || keywordLower.includes('의료') ||
      keywordLower.includes('bio') || keywordLower.includes('medical') ||
      keywordLower.includes('약물') || keywordLower.includes('치료')) {
    return '바이오/의료';
  }
  
  // 전자/반도체 분야
  if (keywordLower.includes('반도체') || keywordLower.includes('전자') ||
      keywordLower.includes('semiconductor') || keywordLower.includes('chip') ||
      keywordLower.includes('회로') || keywordLower.includes('디스플레이')) {
    return '전자/반도체';
  }
  
  // 통신/네트워크 분야
  if (keywordLower.includes('5g') || keywordLower.includes('통신') ||
      keywordLower.includes('네트워크') || keywordLower.includes('iot') ||
      keywordLower.includes('블록체인') || keywordLower.includes('blockchain')) {
    return '통신/네트워크';
  }
  
  // 자동차/모빌리티 분야
  if (keywordLower.includes('자율주행') || keywordLower.includes('자동차') ||
      keywordLower.includes('autonomous') || keywordLower.includes('vehicle') ||
      keywordLower.includes('모빌리티') || keywordLower.includes('배터리')) {
    return '자동차/모빌리티';
  }
  
  // 에너지/환경 분야
  if (keywordLower.includes('에너지') || keywordLower.includes('태양광') ||
      keywordLower.includes('풍력') || keywordLower.includes('환경') ||
      keywordLower.includes('친환경') || keywordLower.includes('재생에너지')) {
    return '에너지/환경';
  }
  
  // 기계/제조 분야
  if (keywordLower.includes('기계') || keywordLower.includes('제조') ||
      keywordLower.includes('로봇') || keywordLower.includes('automation') ||
      keywordLower.includes('3d프린팅') || keywordLower.includes('센서')) {
    return '기계/제조';
  }
  
  // 소프트웨어/IT 분야
  if (keywordLower.includes('소프트웨어') || keywordLower.includes('앱') ||
      keywordLower.includes('플랫폼') || keywordLower.includes('클라우드') ||
      keywordLower.includes('메타버스') || keywordLower.includes('vr')) {
    return '소프트웨어/IT';
  }
  
  return '기타';
}

// 활동 설명 생성 함수
function generateActivityDescription(activity) {
  const { activity_type, activity_data } = activity;
  
  switch (activity_type) {
    case 'search':
      return `"${activity_data?.keyword || '알 수 없음'}" 검색`;
    
    case 'patent_view':
      return `특허 조회: ${activity_data?.application_number || '알 수 없음'}`;
    
    case 'ai_analysis':
      return `AI 분석 생성: ${activity_data?.analysis_type || '종합분석'}`;
    
    case 'document_download':
      return `문서 다운로드: ${activity_data?.document_type || '알 수 없음'}`;
    
    case 'report_generate':
      return `리포트 생성: ${activity_data?.report_type || '알 수 없음'}`;
    
    case 'login':
      return '로그인';
    
    case 'logout':
      return '로그아웃';
    
    case 'profile_update':
      return '프로필 업데이트';
    
    default:
      return activity_type;
  }
}