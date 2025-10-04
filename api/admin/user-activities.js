const { createClient } = require('@supabase/supabase-js');

// Supabase 클라이언트 초기화 (안전한 초기화)
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
let supabase = null;

try {
  if (supabaseUrl && supabaseServiceKey) {
    supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log('✅ [user-activities.js] Supabase 클라이언트 초기화 성공');
  } else {
    console.warn('⚠️ [user-activities.js] Supabase 환경변수 누락:', {
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey
    });
  }
} catch (error) {
  console.error('❌ [user-activities.js] Supabase 클라이언트 초기화 실패:', error.message);
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
    console.log('=== 관리자 전체 통계 조회 요청 ===');
    
    // Supabase 연결 확인
    if (!supabase) {
      console.error('❌ Supabase 클라이언트가 초기화되지 않음');
      return res.status(500).json({
        success: false,
        error: 'Database connection error',
        message: 'Database connection is not available'
      });
    }
    
    // 쿼리 파라미터에서 기간 설정
    const { period = '30', limit = '100' } = req.query;
    
    // 기간 계산 (일 단위)
    const periodDays = parseInt(period) || 30;
    const limitNum = parseInt(limit) || 100;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    console.log('조회 기간:', periodDays + '일', '제한:', limitNum);

    // 1. 전체 활동 데이터 조회
    const { data: activities, error: activitiesError } = await supabase
      .from('user_activities')
      .select('user_id, activity_type, created_at, activity_data')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });

    if (activitiesError) {
      console.error('활동 데이터 조회 오류:', activitiesError);
      throw activitiesError;
    }

    // 2. 사용자 정보 조회 (auth.users 테이블)
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      console.error('사용자 데이터 조회 오류:', usersError);
      throw usersError;
    }

    // 사용자 ID를 키로 하는 맵 생성
    const userMap = users.users.reduce((acc, user) => {
      acc[user.id] = {
        email: user.email,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at
      };
      return acc;
    }, {});

    // 3. 전체 통계 계산
    const totalStats = {
      total_users: users.users.length,
      total_activities: activities.length,
      active_users: new Set(activities.map(a => a.user_id)).size,
      activity_breakdown: activities.reduce((acc, activity) => {
        const type = activity.activity_type;
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {})
    };

    // 4. 일별 활동 통계 (최근 30일)
    const dailyStats = [];
    for (let i = periodDays - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayActivities = activities.filter(activity => 
        activity.created_at.startsWith(dateStr)
      );
      
      dailyStats.push({
        date: dateStr,
        total_activities: dayActivities.length,
        unique_users: new Set(dayActivities.map(a => a.user_id)).size,
        breakdown: dayActivities.reduce((acc, activity) => {
          const type = activity.activity_type;
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        }, {})
      });
    }

    // 5. 사용자별 활동 순위
    const userActivityStats = activities.reduce((acc, activity) => {
      const userId = activity.user_id;
      if (!acc[userId]) {
        acc[userId] = {
          user_id: userId,
          email: userMap[userId]?.email || 'Unknown',
          total_activities: 0,
          breakdown: {}
        };
      }
      
      acc[userId].total_activities++;
      const type = activity.activity_type;
      acc[userId].breakdown[type] = (acc[userId].breakdown[type] || 0) + 1;
      
      return acc;
    }, {});

    const topUsers = Object.values(userActivityStats)
      .sort((a, b) => b.total_activities - a.total_activities)
      .slice(0, limitNum);

    // 6. 인기 검색 키워드
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
      .slice(0, 20)
      .map(([keyword, count]) => ({ keyword, count }));

    // 7. AI 분석 유형별 통계
    const aiAnalysisActivities = activities.filter(activity => 
      activity.activity_type === 'ai_analysis'
    );

    const analysisTypeStats = aiAnalysisActivities.reduce((acc, activity) => {
      const type = activity.activity_data?.analysis_type || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    // 8. 문서 다운로드 통계
    const downloadActivities = activities.filter(activity => 
      activity.activity_type === 'document_download'
    );

    const documentTypeStats = downloadActivities.reduce((acc, activity) => {
      const type = activity.activity_data?.document_type || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    // 9. 시간대별 활동 분포
    const hourlyStats = activities.reduce((acc, activity) => {
      const hour = new Date(activity.created_at).getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {});

    // 10. 최근 활동 내역
    const recentActivities = activities.slice(0, 50).map(activity => ({
      user_email: userMap[activity.user_id]?.email || 'Unknown',
      activity_type: activity.activity_type,
      activity_data: activity.activity_data,
      timestamp: activity.created_at,
      description: generateActivityDescription(activity)
    }));

    // 11. 사용자 가입 통계
    const userRegistrationStats = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const registrations = users.users.filter(user => 
        user.created_at.startsWith(dateStr)
      );
      
      userRegistrationStats.push({
        date: dateStr,
        new_users: registrations.length
      });
    }

    // 응답 데이터 구성
    const adminStatsResponse = {
      success: true,
      data: {
        period: `${periodDays}일`,
        overview: totalStats,
        daily_activities: dailyStats,
        user_rankings: topUsers,
        popular_keywords: topKeywords,
        analysis_type_stats: analysisTypeStats,
        document_type_stats: documentTypeStats,
        hourly_distribution: hourlyStats,
        user_registration_stats: userRegistrationStats,
        recent_activities: recentActivities,
        generated_at: new Date().toISOString()
      }
    };

    console.log('✅ 관리자 전체 통계 조회 완료');
    return res.status(200).json(adminStatsResponse);

  } catch (error) {
    console.error('❌ 관리자 통계 조회 오류:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Admin stats retrieval error',
      message: error.message || 'Failed to retrieve admin statistics'
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