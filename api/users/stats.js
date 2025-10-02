const { createClient } = require('@supabase/supabase-js');

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
    
    // 쿼리 파라미터에서 사용자 ID 가져오기
    const { userId, period = '30' } = req.query;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter',
        message: 'userId is required'
      });
    }

    // UUID 형식 검증
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      console.log('잘못된 UUID 형식:', userId);
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID format',
        message: 'userId must be a valid UUID format'
      });
    }

    console.log('사용자 ID:', userId, '기간:', period + '일');

    // 기간 계산 (일 단위)
    const periodDays = parseInt(period) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    // 1. 전체 활동 통계
    const { data: activities, error: activitiesError } = await supabase
      .from('user_activities')
      .select('activity_type, created_at, activity_data')
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });

    if (activitiesError) {
      console.error('활동 데이터 조회 오류:', activitiesError);
      throw activitiesError;
    }

    // 2. 활동 타입별 집계
    const activityBreakdown = activities.reduce((acc, activity) => {
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
      
      const dayActivities = activities.filter(activity => 
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

    // 4. 검색 키워드 통계
    const searchActivities = activities.filter(activity => 
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

    // 5. AI 분석 통계
    const aiAnalysisActivities = activities.filter(activity => 
      activity.activity_type === 'ai_analysis'
    );

    const analysisTypeStats = aiAnalysisActivities.reduce((acc, activity) => {
      const type = activity.activity_data?.analysis_type || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    // 6. 문서 다운로드 통계
    const downloadActivities = activities.filter(activity => 
      activity.activity_type === 'document_download'
    );

    const documentTypeStats = downloadActivities.reduce((acc, activity) => {
      const type = activity.activity_data?.document_type || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    // 7. 최근 활동 내역 (최대 20개)
    const recentActivities = activities.slice(0, 20).map(activity => ({
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
          total_activities: activities.length,
          search_count: activityBreakdown.search || 0,
          patent_view_count: activityBreakdown.patent_view || 0,
          ai_analysis_count: activityBreakdown.ai_analysis || 0,
          document_download_count: activityBreakdown.document_download || 0,
          report_generate_count: activityBreakdown.report_generate || 0
        },
        activity_breakdown: activityBreakdown,
        daily_activities: last7Days,
        top_keywords: topKeywords,
        analysis_type_stats: analysisTypeStats,
        document_type_stats: documentTypeStats,
        recent_activities: recentActivities
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