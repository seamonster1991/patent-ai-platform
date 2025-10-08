import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabaseKey = supabaseServiceKey || supabaseAnonKey;
const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔧 [Users API] Supabase 초기화 (수정됨):', {
  url: supabaseUrl ? 'Set' : 'Missing',
  serviceKey: supabaseServiceKey ? 'Service Role Key' : 'Anon Key',
  keyLength: supabaseKey ? supabaseKey.length : 0
});

// 사용자 인증 확인
async function authenticateUser(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'No authorization token provided', status: 401 };
  }

  const token = authHeader.substring(7);
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      console.error('❌ [Users API] 인증 실패:', error);
      return { error: 'Invalid token', status: 401 };
    }

    console.log('✅ [Users API] 사용자 인증 성공:', user.email);
    return { user };
  } catch (error) {
    console.error('❌ [Users API] 인증 오류:', error);
    return { error: 'Authentication failed', status: 401 };
  }
}

// 사용자 통계 조회
async function getUserStats(userId) {
  try {
    console.log('📊 [Users API] 사용자 통계 조회 시작:', userId);

    // 1. 기본 통계 조회
    const [
      searchHistoryResult,
      userActivitiesResult,
      reportsResult,
      patentViewsResult,
      usageCostResult
    ] = await Promise.all([
      // 검색 기록
      supabase
        .from('search_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
      
      // 사용자 활동
      supabase
        .from('user_activities')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
      
      // AI 분석 리포트
      supabase
        .from('ai_analysis_reports')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
      
      // 특허 상세 조회
      supabase
        .from('patent_detail_views')
        .select('*')
        .eq('user_id', userId)
        .order('viewed_at', { ascending: false }),
      
      // 사용 비용 추적
      supabase
        .from('usage_cost_tracking')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
    ]);

    // 오류 체크
    if (searchHistoryResult.error) {
      console.error('❌ [Users API] 검색 기록 조회 오류:', searchHistoryResult.error);
    }
    if (userActivitiesResult.error) {
      console.error('❌ [Users API] 사용자 활동 조회 오류:', userActivitiesResult.error);
    }
    if (reportsResult.error) {
      console.error('❌ [Users API] 리포트 조회 오류:', reportsResult.error);
    }

    const searchHistory = searchHistoryResult.data || [];
    const userActivities = userActivitiesResult.data || [];
    const reports = reportsResult.data || [];
    const patentViews = patentViewsResult.data || [];
    const usageCosts = usageCostResult.data || [];

    console.log('📊 [Users API] 데이터 조회 완료:', {
      searchHistory: searchHistory.length,
      userActivities: userActivities.length,
      reports: reports.length,
      patentViews: patentViews.length,
      usageCosts: usageCosts.length
    });

    // 2. 통계 계산
    const totalSearches = searchHistory.length;
    const reportsGenerated = reports.length;
    const totalPatentViews = patentViews.length;
    const totalUsageCost = usageCosts.reduce((sum, cost) => sum + (cost.cost || 0), 0);

    // 활동 타입별 집계
    const activityCounts = userActivities.reduce((acc, activity) => {
      acc[activity.activity_type] = (acc[activity.activity_type] || 0) + 1;
      return acc;
    }, {});

    const totalLogins = activityCounts.login || 0;
    const aiAnalysisCount = activityCounts.ai_analysis || 0;

    // 3. 최근 검색 기록 (최대 20개)
    const recentSearches = searchHistory.slice(0, 20).map(search => ({
      keyword: search.keyword || '검색어 없음',
      searchDate: search.created_at,
      resultsCount: search.results_count || 0,
      field: search.technology_field || '기타'
    }));

    // 4. 최근 리포트 (최대 20개)
    const recentReports = reports.slice(0, 20).map(report => ({
      id: report.id,
      title: report.report_name || '리포트 제목 없음',
      patentTitle: report.invention_title || '특허 제목 없음',
      patentNumber: report.application_number || '특허번호 없음',
      reportType: report.analysis_type || 'analysis',
      createdAt: report.created_at
    }));

    // 5. 기술 분야별 분포
    const fieldDistribution = searchHistory.reduce((acc, search) => {
      const field = search.technology_field || '기타';
      const existing = acc.find(item => item.field === field);
      if (existing) {
        existing.count++;
      } else {
        acc.push({ field, count: 1 });
      }
      return acc;
    }, []).sort((a, b) => b.count - a.count);

    // 6. 일별 활동 데이터 (최근 100일)
    const dailyActivities = [];
    for (let i = 99; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const daySearches = searchHistory.filter(search => 
        search.created_at && search.created_at.startsWith(dateStr)
      ).length;
      
      const dayActivities = userActivities.filter(activity => 
        activity.created_at && activity.created_at.startsWith(dateStr)
      ).length;

      dailyActivities.push({
        date: dateStr,
        count: daySearches + dayActivities,
        searchCount: daySearches,
        activityCount: dayActivities
      });
    }

    // 7. 주간 활동 데이터
    const weeklyActivity = [
      { day: '월', dayIndex: 1, count: 0, searchCount: 0, aiAnalysisCount: 0 },
      { day: '화', dayIndex: 2, count: 0, searchCount: 0, aiAnalysisCount: 0 },
      { day: '수', dayIndex: 3, count: 0, searchCount: 0, aiAnalysisCount: 0 },
      { day: '목', dayIndex: 4, count: 0, searchCount: 0, aiAnalysisCount: 0 },
      { day: '금', dayIndex: 5, count: 0, searchCount: 0, aiAnalysisCount: 0 },
      { day: '토', dayIndex: 6, count: 0, searchCount: 0, aiAnalysisCount: 0 },
      { day: '일', dayIndex: 0, count: 0, searchCount: 0, aiAnalysisCount: 0 }
    ];

    // 최근 30일 데이터로 주간 활동 계산
    const recentActivities = userActivities.filter(activity => {
      const activityDate = new Date(activity.created_at);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return activityDate >= thirtyDaysAgo;
    });

    recentActivities.forEach(activity => {
      const dayOfWeek = new Date(activity.created_at).getDay();
      const weekDay = weeklyActivity.find(day => day.dayIndex === dayOfWeek);
      if (weekDay) {
        weekDay.count++;
        if (activity.activity_type === 'search') {
          weekDay.searchCount++;
        } else if (activity.activity_type === 'ai_analysis') {
          weekDay.aiAnalysisCount++;
        }
      }
    });

    // 8. 시간별 활동 데이터
    const hourlyActivity = Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 }));
    
    recentActivities.forEach(activity => {
      const hour = new Date(activity.created_at).getHours();
      hourlyActivity[hour].count++;
    });

    // 9. 키워드 분석
    const topKeywords = searchHistory.reduce((acc, search) => {
      const keyword = search.keyword;
      if (keyword) {
        const existing = acc.find(item => item.keyword === keyword);
        if (existing) {
          existing.count++;
        } else {
          acc.push({
            keyword,
            count: 1,
            field: search.technology_field || '기타'
          });
        }
      }
      return acc;
    }, []).sort((a, b) => b.count - a.count).slice(0, 10);

    const statsData = {
      summary: {
        total_searches: totalSearches,
        reports_generated: reportsGenerated,
        monthly_activity: Math.min(totalSearches + reportsGenerated, 100), // 임시 계산
        saved_patents: 0, // 북마크 기능 미구현
        total_logins: totalLogins,
        engagement_score: Math.min((totalSearches * 2 + reportsGenerated * 5 + totalLogins) / 10, 100),
        average_search_results: searchHistory.length > 0 ? 
          Math.round(searchHistory.reduce((sum, s) => sum + (s.results_count || 0), 0) / searchHistory.length) : 0,
        ai_analysis_count: aiAnalysisCount,
        total_usage_cost: totalUsageCost,
        patent_views: totalPatentViews
      },
      recent_searches: recentSearches,
      recent_reports: recentReports,
      field_distribution: fieldDistribution,
      daily_activities: dailyActivities,
      weekly_activities: weeklyActivity,
      hourly_activities: hourlyActivity,
      top_keywords: topKeywords
    };

    console.log('✅ [Users API] 통계 계산 완료:', {
      totalSearches,
      reportsGenerated,
      totalUsageCost,
      recentSearches: recentSearches.length,
      recentReports: recentReports.length
    });

    return { success: true, data: statsData };

  } catch (error) {
    console.error('❌ [Users API] 통계 조회 오류:', error);
    return { success: false, error: error.message };
  }
}

// 사용자 프로필 조회
async function getUserProfile(userId) {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId);

    if (error) {
      console.error('❌ [Users API] 프로필 조회 오류:', error);
      return { success: false, error: error.message };
    }

    // 사용자가 public.users 테이블에 없는 경우 auth.users에서 정보 가져오기
    if (!users || users.length === 0) {
      console.log('⚠️ [Users API] public.users에 레코드 없음, auth.users에서 조회');
      
      try {
        const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);
        
        if (authError || !authUser.user) {
          console.error('❌ [Users API] auth.users 조회 오류:', authError);
          return { success: false, error: 'User not found' };
        }

        // auth.users 정보를 기반으로 기본 프로필 생성
        const defaultProfile = {
          id: authUser.user.id,
          email: authUser.user.email,
          email_verified: authUser.user.email_confirmed_at ? true : false,
          created_at: authUser.user.created_at,
          last_login: authUser.user.last_sign_in_at,
          profile_image: null,
          display_name: authUser.user.email?.split('@')[0] || 'User',
          bio: null,
          company: null,
          position: null,
          location: null,
          website: null,
          phone: null,
          preferences: {},
          subscription_tier: 'free',
          subscription_status: 'active',
          trial_end_date: null,
          usage_limit: 100,
          current_usage: 0
        };

        return { success: true, data: defaultProfile };
      } catch (authError) {
        console.error('❌ [Users API] auth.users 조회 실패:', authError);
        return { success: false, error: 'Failed to fetch user profile' };
      }
    }

    return { success: true, data: users[0] };
  } catch (error) {
    console.error('❌ [Users API] 프로필 조회 오류:', error);
    return { success: false, error: error.message };
  }
}

// 사용자 프로필 업데이트
async function updateUserProfile(userId, profileData) {
  try {
    console.log('📝 [Users API] 프로필 업데이트 시작:', { userId, profileData });

    // 입력 데이터 검증
    if (!profileData || typeof profileData !== 'object') {
      return { success: false, error: 'Invalid profile data' };
    }

    // 허용된 필드만 업데이트
    const allowedFields = ['name', 'phone', 'company', 'bio'];
    const updateData = {};
    
    for (const field of allowedFields) {
      if (profileData.hasOwnProperty(field)) {
        updateData[field] = profileData[field];
      }
    }

    // 업데이트할 데이터가 없는 경우
    if (Object.keys(updateData).length === 0) {
      return { success: false, error: 'No valid fields to update' };
    }

    // updated_at 필드 추가
    updateData.updated_at = new Date().toISOString();

    console.log('📝 [Users API] 업데이트할 데이터:', updateData);

    // 데이터베이스 업데이트
    const { data: updatedUser, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select('*')
      .single();

    if (error) {
      console.error('❌ [Users API] 프로필 업데이트 DB 오류:', error);
      return { success: false, error: error.message };
    }

    if (!updatedUser) {
      console.error('❌ [Users API] 업데이트된 프로필 데이터 없음');
      return { success: false, error: 'Failed to retrieve updated profile' };
    }

    console.log('✅ [Users API] 프로필 업데이트 성공:', updatedUser.email);
    return { success: true, data: updatedUser };

  } catch (error) {
    console.error('❌ [Users API] 프로필 업데이트 오류:', error);
    return { success: false, error: error.message };
  }
}

// 사용자 활동 통계 조회
async function getUserActivityStats(userId) {
  try {
    console.log('📊 [Users API] 사용자 활동 통계 조회 시작:', userId);

    // 1. 전체 활동 조회
    const { data: allActivities, error: activitiesError } = await supabase
      .from('user_activities')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (activitiesError) {
      console.error('❌ [Users API] 활동 조회 오류:', activitiesError);
      return { success: false, error: activitiesError.message };
    }

    const activities = allActivities || [];
    console.log('📊 [Users API] 조회된 활동 수:', activities.length);

    // 2. 활동 유형별 집계
    const activityTypeCounts = activities.reduce((acc, activity) => {
      const type = activity.activity_type;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    const totalActivities = activities.length;
    const activityTypes = Object.entries(activityTypeCounts).map(([activity_type, count]) => ({
      activity_type,
      count,
      percentage: totalActivities > 0 ? (count / totalActivities) * 100 : 0
    })).sort((a, b) => b.count - a.count);

    // 3. 최근 활동 (최대 20개)
    const recentActivities = activities.slice(0, 20).map(activity => ({
      id: activity.id,
      activity_type: activity.activity_type,
      description: activity.description || getActivityDescription(activity),
      metadata: activity.activity_data || {},
      created_at: activity.created_at
    }));

    // 4. 시간대별 활동 패턴 (24시간)
    const hourlyActivityPattern = Array.from({ length: 24 }, (_, hour) => {
      const hourActivities = activities.filter(activity => {
        const activityHour = new Date(activity.created_at).getHours();
        return activityHour === hour;
      });
      return {
        hour,
        count: hourActivities.length
      };
    });

    // 5. 일별 활동 트렌드 (최근 30일)
    const dailyActivityTrend = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayActivities = activities.filter(activity => {
        const activityDate = new Date(activity.created_at).toISOString().split('T')[0];
        return activityDate === dateStr;
      });

      dailyActivityTrend.push({
        date: dateStr,
        count: dayActivities.length
      });
    }

    const activityStats = {
      totalActivities,
      activityTypes,
      recentActivities,
      hourlyActivityPattern,
      dailyActivityTrend
    };

    console.log('✅ [Users API] 활동 통계 계산 완료:', {
      totalActivities,
      activityTypesCount: activityTypes.length,
      recentActivitiesCount: recentActivities.length
    });

    return { success: true, data: activityStats };

  } catch (error) {
    console.error('❌ [Users API] 활동 통계 조회 오류:', error);
    return { success: false, error: error.message };
  }
}

// 활동 설명 생성 헬퍼 함수
function getActivityDescription(activity) {
  const { activity_type, activity_data } = activity;
  
  switch (activity_type) {
    case 'search':
      return `특허 검색: ${activity_data?.keyword || '키워드 없음'}`;
    case 'patent_view':
      return `특허 조회: ${activity_data?.patentNumber || activity_data?.applicationNumber || '번호 없음'}`;
    case 'report_generation':
      return `보고서 생성: ${activity_data?.reportType || 'AI 분석'}`;
    case 'bookmark':
      return `북마크 ${activity_data?.action || '추가'}: ${activity_data?.patentTitle || '특허'}`;
    case 'login':
      return '로그인';
    case 'logout':
      return '로그아웃';
    case 'page_navigation':
      return `페이지 이동: ${activity_data?.page || activity_data?.url || '페이지'}`;
    case 'filter_change':
      return `필터 변경: ${activity_data?.filterKey || '필터'} = ${activity_data?.newValue || '값'}`;
    case 'document_download':
      return `문서 다운로드: ${activity_data?.documentType || '문서'}`;
    case 'profile_update':
      return '프로필 수정';
    case 'settings_change':
      return `설정 변경: ${activity_data?.settingType || '설정'}`;
    case 'data_export':
      return `데이터 내보내기: ${activity_data?.exportType || '데이터'}`;
    default:
      return `${activity_type} 활동`;
  }
}

// 메인 핸들러
export default async function handler(req, res) {
  const startTime = Date.now();
  
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // OPTIONS 요청 처리
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { resource, userId } = req.query;
    
    console.log(`🚀 [Users API] ${req.method} 요청 시작:`, {
      resource,
      userId,
      timestamp: new Date().toISOString()
    });

    // 사용자 인증
    const authResult = await authenticateUser(req);
    if (authResult.error) {
      console.error('❌ [Users API] 인증 실패:', authResult.error);
      return res.status(authResult.status).json({
        success: false,
        error: authResult.error
      });
    }

    const user = authResult.user;
    const targetUserId = userId || user.id;

    // 리소스별 처리
    switch (resource) {
      case 'stats':
        const statsResult = await getUserStats(targetUserId);
        const duration = Date.now() - startTime;
        
        console.log(`✅ [Users API] 통계 조회 완료 (${duration}ms)`);
        
        if (statsResult.success) {
          return res.status(200).json({
            success: true,
            data: statsResult.data,
            meta: {
              userId: targetUserId,
              timestamp: new Date().toISOString(),
              duration: `${duration}ms`
            }
          });
        } else {
          return res.status(500).json({
            success: false,
            error: statsResult.error
          });
        }

      case 'profile':
        if (req.method === 'GET') {
          const profileResult = await getUserProfile(targetUserId);
          const profileDuration = Date.now() - startTime;
          
          console.log(`✅ [Users API] 프로필 조회 완료 (${profileDuration}ms)`);
          
          if (profileResult.success) {
            return res.status(200).json({
              success: true,
              data: profileResult.data,
              meta: {
                userId: targetUserId,
                timestamp: new Date().toISOString(),
                duration: `${profileDuration}ms`
              }
            });
          } else {
            console.error('❌ [Users API] 프로필 조회 실패:', profileResult.error);
            return res.status(500).json({
              success: false,
              error: 'Failed to fetch user profile',
              details: profileResult.error
            });
          }
        } else if (req.method === 'PUT') {
          const updateResult = await updateUserProfile(targetUserId, req.body);
          const updateDuration = Date.now() - startTime;
          
          console.log(`✅ [Users API] 프로필 업데이트 완료 (${updateDuration}ms)`);
          
          if (updateResult.success) {
            return res.status(200).json({
              success: true,
              data: updateResult.data,
              meta: {
                userId: targetUserId,
                timestamp: new Date().toISOString(),
                duration: `${updateDuration}ms`
              }
            });
          } else {
            console.error('❌ [Users API] 프로필 업데이트 실패:', updateResult.error);
            return res.status(500).json({
              success: false,
              error: 'Failed to update user profile',
              details: updateResult.error
            });
          }
        } else {
          return res.status(405).json({
            success: false,
            error: 'Method not allowed',
            allowedMethods: ['GET', 'PUT']
          });
        }

      case 'activities':
        const activitiesResult = await getUserActivityStats(targetUserId);
        const activitiesDuration = Date.now() - startTime;
        
        console.log(`✅ [Users API] 활동 통계 조회 완료 (${activitiesDuration}ms)`);
        
        if (activitiesResult.success) {
          return res.status(200).json({
            success: true,
            data: activitiesResult.data,
            meta: {
              userId: targetUserId,
              timestamp: new Date().toISOString(),
              duration: `${activitiesDuration}ms`
            }
          });
        } else {
          return res.status(500).json({
            success: false,
            error: activitiesResult.error
          });
        }

      default:
        console.error('❌ [Users API] 알 수 없는 리소스:', resource);
        return res.status(404).json({
          success: false,
          error: 'Resource not found',
          availableResources: ['stats', 'profile', 'activities']
        });
    }

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ [Users API] 서버 오류 (${duration}ms):`, error);
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred'
    });
  }
}