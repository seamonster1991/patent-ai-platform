import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabaseKey = supabaseServiceKey || supabaseAnonKey;
const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔧 [Admin API] Supabase 초기화:', {
  url: supabaseUrl ? 'Set' : 'Missing',
  serviceKey: supabaseServiceKey ? 'Service Role Key' : 'Anon Key',
  keyLength: supabaseKey ? supabaseKey.length : 0
});

// 관리자 권한 확인
async function checkAdminPermission(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'No authorization token provided', status: 401 };
  }

  const token = authHeader.substring(7);
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      console.error('❌ [Admin API] 인증 실패:', error);
      return { error: 'Invalid token', status: 401 };
    }

    // 사용자 역할 확인
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role, email, name')
      .eq('id', user.id)
      .single();

    if (userError) {
      console.error('❌ [Admin API] 사용자 정보 조회 실패:', userError);
      return { error: 'User data fetch failed', status: 500 };
    }

    if (!userData || userData.role !== 'admin') {
      console.error('❌ [Admin API] 관리자 권한 없음:', { userId: user.id, role: userData?.role });
      return { error: 'Admin access required', status: 403 };
    }

    console.log('✅ [Admin API] 관리자 인증 성공:', userData.email);
    return { user, userData };
  } catch (error) {
    console.error('❌ [Admin API] 인증 오류:', error);
    return { error: 'Authentication failed', status: 401 };
  }
}

// 전체 통계 조회
async function getAdminStats() {
  try {
    console.log('📊 [Admin API] 전체 통계 조회 시작');

    // 1. 기본 통계 조회
    const [
      usersResult,
      activitiesResult,
      reportsResult,
      searchHistoryResult,
      usageCostResult,
      loginLogsResult
    ] = await Promise.all([
      // 전체 사용자
      supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false }),
      
      // 사용자 활동
      supabase
        .from('user_activities')
        .select('*')
        .order('created_at', { ascending: false }),
      
      // AI 분석 리포트
      supabase
        .from('ai_analysis_reports')
        .select('*')
        .order('created_at', { ascending: false }),
      
      // 검색 기록
      supabase
        .from('search_history')
        .select('*')
        .order('created_at', { ascending: false }),
      
      // 사용 비용
      supabase
        .from('usage_cost_tracking')
        .select('*')
        .order('created_at', { ascending: false }),
      
      // 로그인 로그
      supabase
        .from('user_login_logs')
        .select('*')
        .order('created_at', { ascending: false })
    ]);

    // 오류 체크
    if (usersResult.error) {
      console.error('❌ [Admin API] 사용자 조회 오류:', usersResult.error);
    }
    if (activitiesResult.error) {
      console.error('❌ [Admin API] 활동 조회 오류:', activitiesResult.error);
    }
    if (reportsResult.error) {
      console.error('❌ [Admin API] 리포트 조회 오류:', reportsResult.error);
    }

    const users = usersResult.data || [];
    const activities = activitiesResult.data || [];
    const reports = reportsResult.data || [];
    const searchHistory = searchHistoryResult.data || [];
    const usageCosts = usageCostResult.data || [];
    const loginLogs = loginLogsResult.data || [];

    console.log('📊 [Admin API] 데이터 조회 완료:', {
      users: users.length,
      activities: activities.length,
      reports: reports.length,
      searchHistory: searchHistory.length,
      usageCosts: usageCosts.length,
      loginLogs: loginLogs.length
    });

    // 2. 통계 계산
    const totalUsers = users.length;
    const totalReports = reports.length;
    const totalSearches = searchHistory.length;
    const totalUsageCost = usageCosts.reduce((sum, cost) => sum + (cost.cost || 0), 0);

    // 활성 사용자 (최근 7일)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const activeUsers = activities.filter(activity => 
      new Date(activity.created_at) >= sevenDaysAgo
    ).reduce((acc, activity) => {
      if (!acc.includes(activity.user_id)) {
        acc.push(activity.user_id);
      }
      return acc;
    }, []).length;

    // 오늘 통계
    const today = new Date().toISOString().split('T')[0];
    const newUsersToday = users.filter(user => 
      user.created_at && user.created_at.startsWith(today)
    ).length;
    const searchesToday = searchHistory.filter(search => 
      search.created_at && search.created_at.startsWith(today)
    ).length;
    const reportsToday = reports.filter(report => 
      report.created_at && report.created_at.startsWith(today)
    ).length;

    // 사용자 역할별 분포
    const usersByRole = users.reduce((acc, user) => {
      const role = user.role || 'user';
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    }, {});

    // 구독 플랜별 분포
    const usersByPlan = users.reduce((acc, user) => {
      const plan = user.subscription_plan || 'free';
      acc[plan] = (acc[plan] || 0) + 1;
      return acc;
    }, {});

    // 3. 최근 활동 (최대 50개)
    const recentActivities = activities.slice(0, 50).map(activity => {
      const user = users.find(u => u.id === activity.user_id);
      return {
        id: activity.id,
        userId: activity.user_id,
        userEmail: user?.email || '알 수 없음',
        activityType: activity.activity_type,
        activityData: activity.activity_data,
        cost: activity.cost || 0,
        createdAt: activity.created_at
      };
    });

    // 4. 최근 사용자 (최대 20명)
    const recentUsers = users.slice(0, 20).map(user => ({
      id: user.id,
      email: user.email,
      name: user.name || '이름 없음',
      role: user.role || 'user',
      subscriptionPlan: user.subscription_plan || 'free',
      createdAt: user.created_at,
      lastSignInAt: user.last_sign_in_at
    }));

    // 5. 인기 키워드 (최대 20개)
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
    }, []).sort((a, b) => b.count - a.count).slice(0, 20);

    // 6. 기술 분야별 분포
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

    // 7. 일별 활동 데이터 (최근 30일)
    const dailyStats = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayUsers = users.filter(user => 
        user.created_at && user.created_at.startsWith(dateStr)
      ).length;
      
      const daySearches = searchHistory.filter(search => 
        search.created_at && search.created_at.startsWith(dateStr)
      ).length;
      
      const dayReports = reports.filter(report => 
        report.created_at && report.created_at.startsWith(dateStr)
      ).length;

      const dayActivities = activities.filter(activity => 
        activity.created_at && activity.created_at.startsWith(dateStr)
      ).length;

      dailyStats.push({
        date: dateStr,
        newUsers: dayUsers,
        searches: daySearches,
        reports: dayReports,
        activities: dayActivities,
        totalActivity: dayUsers + daySearches + dayReports + dayActivities
      });
    }

    // 8. 시스템 메트릭
    const systemMetrics = {
      totalRevenue: totalUsageCost,
      averageCostPerUser: totalUsers > 0 ? totalUsageCost / totalUsers : 0,
      averageSearchesPerUser: totalUsers > 0 ? totalSearches / totalUsers : 0,
      averageReportsPerUser: totalUsers > 0 ? totalReports / totalUsers : 0,
      systemHealth: 'healthy', // 임시값
      uptime: '99.9%' // 임시값
    };

    const statsData = {
      // 기본 통계 (snake_case로 변경)
      total_users: totalUsers,
      active_users: activeUsers,
      total_reports: totalReports,
      total_searches: totalSearches,
      new_users_today: newUsersToday,
      searches_today: searchesToday,
      reports_today: reportsToday,
      total_usage_cost: totalUsageCost,
      users_by_role: usersByRole,
      users_by_plan: usersByPlan,
      
      // 최근 활동 (API 응답 형식에 맞게 변경)
      recent_activities: recentActivities.map(activity => ({
        id: activity.id,
        user_id: activity.userId,
        activity_type: activity.activityType,
        activity_data: activity.activityData,
        cost: activity.cost,
        created_at: activity.createdAt
      })),
      
      // 최근 사용자
      recent_users: recentUsers.map(user => ({
        id: user.id,
        email: user.email,
        role: user.role,
        subscription_plan: user.subscriptionPlan,
        created_at: user.createdAt
      })),
      
      // 인기 키워드
      top_keywords: topKeywords,
      
      // 기술 분야 분포
      field_distribution: fieldDistribution,
      
      // 일별 통계
      daily_stats: dailyStats,
      
      // 시스템 메트릭 (snake_case로 변경)
      total_revenue: systemMetrics.totalRevenue,
      average_cost_per_user: systemMetrics.averageCostPerUser,
      average_searches_per_user: systemMetrics.averageSearchesPerUser,
      average_reports_per_user: systemMetrics.averageReportsPerUser,
      system_health: systemMetrics.systemHealth,
      uptime: systemMetrics.uptime
    };

    console.log('✅ [Admin API] 통계 계산 완료:', {
      totalUsers,
      activeUsers,
      totalReports,
      totalSearches,
      totalUsageCost
    });

    return { success: true, data: statsData };

  } catch (error) {
    console.error('❌ [Admin API] 통계 조회 오류:', error);
    return { success: false, error: error.message };
  }
}

// 빌링 통계
async function getBillingStats() {
  try {
    console.log('💰 [Admin API] 빌링 통계 조회 시작');

    // 1. 모든 사용자 활동 데이터 조회
    const { data: activities, error: activitiesError } = await supabase
      .from('user_activities')
      .select('*');

    if (activitiesError) {
      console.error('❌ [Admin API] 활동 데이터 조회 오류:', activitiesError);
      return { success: false, error: activitiesError.message };
    }

    // 2. 사용자 데이터 조회
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*');

    if (usersError) {
      console.error('❌ [Admin API] 사용자 데이터 조회 오류:', usersError);
      return { success: false, error: usersError.message };
    }

    // 3. 기본 수익 통계 계산
    const totalRevenue = activities.reduce((sum, activity) => sum + (activity.cost || 0), 0);
    const totalTransactions = activities.length;
    const totalUsers = users.length;
    const averageRevenuePerUser = totalUsers > 0 ? totalRevenue / totalUsers : 0;

    // 4. 월간 수익 계산 (현재 월)
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const monthlyRevenue = activities
      .filter(activity => activity.created_at && activity.created_at.startsWith(currentMonth))
      .reduce((sum, activity) => sum + (activity.cost || 0), 0);

    // 5. 플랜별 수익 분포
    const revenueByPlan = users.reduce((acc, user) => {
      const plan = user.subscription_plan || 'free';
      const userActivities = activities.filter(activity => activity.user_id === user.id);
      const userRevenue = userActivities.reduce((sum, activity) => sum + (activity.cost || 0), 0);
      
      const existing = acc.find(item => item.plan === plan);
      if (existing) {
        existing.revenue += userRevenue;
        existing.users++;
      } else {
        acc.push({
          plan,
          revenue: userRevenue,
          users: 1,
          percentage: 0
        });
      }
      return acc;
    }, []);

    // 백분율 계산
    revenueByPlan.forEach(plan => {
      plan.percentage = totalRevenue > 0 ? (plan.revenue / totalRevenue) * 100 : 0;
    });

    // 6. 월별 트렌드 (최근 12개월)
    const monthlyTrends = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStr = date.toISOString().slice(0, 7);
      
      const monthActivities = activities.filter(activity => 
        activity.created_at && activity.created_at.startsWith(monthStr)
      );
      
      const monthUsers = users.filter(user => 
        user.created_at && user.created_at.startsWith(monthStr)
      ).length;
      
      monthlyTrends.push({
        month: date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short' }),
        revenue: monthActivities.reduce((sum, activity) => sum + (activity.cost || 0), 0),
        users: monthUsers,
        transactions: monthActivities.length
      });
    }

    // 7. 고액 사용자 (TOP 10)
    const userSpending = users.map(user => {
      const userActivities = activities.filter(activity => activity.user_id === user.id);
      const totalSpent = userActivities.reduce((sum, activity) => sum + (activity.cost || 0), 0);
      const lastActivity = userActivities.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
      
      return {
        userId: user.id,
        email: user.email,
        totalSpent,
        lastPayment: lastActivity ? lastActivity.created_at : user.created_at,
        plan: user.subscription_plan || 'free'
      };
    }).sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 10);

    // 8. 결제 위험 사용자 (예시 로직)
    const paymentRisks = users.filter(user => {
      const userActivities = activities.filter(activity => activity.user_id === user.id);
      const lastActivity = userActivities.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
      const daysSinceLastActivity = lastActivity ? 
        Math.floor((new Date() - new Date(lastActivity.created_at)) / (1000 * 60 * 60 * 24)) : 
        Math.floor((new Date() - new Date(user.created_at)) / (1000 * 60 * 60 * 24));
      
      return daysSinceLastActivity > 30; // 30일 이상 비활성
    }).slice(0, 10).map(user => {
      const userActivities = activities.filter(activity => activity.user_id === user.id);
      const lastActivity = userActivities.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
      const daysSinceLastActivity = lastActivity ? 
        Math.floor((new Date() - new Date(lastActivity.created_at)) / (1000 * 60 * 60 * 24)) : 
        Math.floor((new Date() - new Date(user.created_at)) / (1000 * 60 * 60 * 24));
      
      return {
        userId: user.id,
        email: user.email,
        riskLevel: daysSinceLastActivity > 60 ? 'high' : daysSinceLastActivity > 30 ? 'medium' : 'low',
        reason: `${daysSinceLastActivity}일간 비활성`,
        lastActivity: lastActivity ? lastActivity.created_at : user.created_at
      };
    });

    const billingData = {
      summary: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        monthlyRevenue: Math.round(monthlyRevenue * 100) / 100,
        averageRevenuePerUser: Math.round(averageRevenuePerUser * 100) / 100,
        totalTransactions,
        revenueGrowth: Math.random() * 20 - 5, // 임시 성장률
        userGrowth: Math.random() * 15,
        conversionRate: Math.random() * 10 + 5
      },
      revenueByPlan: revenueByPlan.sort((a, b) => b.revenue - a.revenue),
      monthlyTrends,
      topSpenders: userSpending,
      paymentRisks
    };

    console.log('✅ [Admin API] 빌링 통계 계산 완료:', {
      totalRevenue,
      monthlyRevenue,
      totalTransactions,
      totalUsers
    });

    return { success: true, data: billingData };

  } catch (error) {
    console.error('❌ [Admin API] 빌링 통계 조회 오류:', error);
    return { success: false, error: error.message };
  }
}

// 사용자 관리
async function getUsers(page = 1, limit = 20, search = '') {
  try {
    console.log('👥 [Admin API] 사용자 목록 조회:', { page, limit, search });

    const offset = (page - 1) * limit;
    
    let query = supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // 검색 필터
    if (search) {
      query = query.or(`email.ilike.%${search}%,name.ilike.%${search}%`);
    }

    const { data: users, error } = await query;

    if (error) {
      console.error('❌ [Admin API] 사용자 목록 조회 오류:', error);
      return { success: false, error: error.message };
    }

    // 총 사용자 수 조회
    let countQuery = supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    if (search) {
      countQuery = countQuery.or(`email.ilike.%${search}%,name.ilike.%${search}%`);
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
      console.error('❌ [Admin API] 사용자 수 조회 오류:', countError);
    }

    const userData = {
      users: users || [],
      pagination: {
        currentPage: page,
        limit,
        totalCount: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    };

    console.log('✅ [Admin API] 사용자 목록 조회 완료:', {
      count: users?.length || 0,
      totalCount: count || 0
    });

    return { success: true, data: userData };

  } catch (error) {
    console.error('❌ [Admin API] 사용자 조회 오류:', error);
    return { success: false, error: error.message };
  }
}

// 사용자 업데이트
async function updateUser(userId, updates) {
  try {
    console.log('✏️ [Admin API] 사용자 업데이트:', { userId, updates });

    const { data: user, error } = await supabase
      .from('users')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('❌ [Admin API] 사용자 업데이트 오류:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ [Admin API] 사용자 업데이트 완료:', user.email);
    return { success: true, data: user };

  } catch (error) {
    console.error('❌ [Admin API] 사용자 업데이트 오류:', error);
    return { success: false, error: error.message };
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
    const { resource, userId, page = 1, limit = 20, search = '' } = req.query;
    
    console.log(`🚀 [Admin API] ${req.method} 요청 시작:`, {
      resource,
      userId,
      timestamp: new Date().toISOString()
    });

    // 관리자 권한 확인
    const authResult = await checkAdminPermission(req);
    if (authResult.error) {
      console.error('❌ [Admin API] 권한 확인 실패:', authResult.error);
      return res.status(authResult.status).json({
        success: false,
        error: authResult.error
      });
    }

    // 리소스별 처리
    switch (resource) {
      case 'check-permission':
        const duration = Date.now() - startTime;
        console.log(`✅ [Admin API] 권한 확인 완료 (${duration}ms)`);
        
        return res.status(200).json({
          success: true,
          message: 'Admin permission verified',
          user: {
            id: authResult.user.id,
            email: authResult.user.email,
            role: authResult.userData.role
          },
          meta: {
            timestamp: new Date().toISOString(),
            duration: `${duration}ms`
          }
        });

      case 'stats':
      case 'dashboard':
        const statsResult = await getAdminStats();
        const statsDuration = Date.now() - startTime;
        
        console.log(`✅ [Admin API] 통계 조회 완료 (${statsDuration}ms)`);
        
        if (statsResult.success) {
          return res.status(200).json({
            success: true,
            data: statsResult.data,
            meta: {
              timestamp: new Date().toISOString(),
              duration: `${statsDuration}ms`
            }
          });
        } else {
          return res.status(500).json({
            success: false,
            error: statsResult.error
          });
        }

      case 'users':
        const { page = 1, limit = 20, search = '', userId } = req.query;
        
        if (req.method === 'GET' && !userId) {
          const usersResult = await getUsers(parseInt(page), parseInt(limit), search);
          const usersDuration = Date.now() - startTime;
          
          console.log(`✅ [Admin API] 사용자 목록 조회 완료 (${usersDuration}ms)`);
          
          if (usersResult.success) {
            return res.status(200).json({
              success: true,
              data: usersResult.data,
              meta: {
                timestamp: new Date().toISOString(),
                duration: `${usersDuration}ms`
              }
            });
          } else {
            return res.status(500).json({
              success: false,
              error: usersResult.error
            });
          }
        } else if (req.method === 'PUT' && userId) {
          const updateResult = await updateUser(userId, req.body);
          const updateDuration = Date.now() - startTime;
          
          console.log(`✅ [Admin API] 사용자 업데이트 완료 (${updateDuration}ms)`);
          
          if (updateResult.success) {
            return res.status(200).json({
              success: true,
              data: updateResult.data,
              meta: {
                timestamp: new Date().toISOString(),
                duration: `${updateDuration}ms`
              }
            });
          } else {
            return res.status(500).json({
              success: false,
              error: updateResult.error
            });
          }
        } else {
          return res.status(405).json({
            success: false,
            error: 'Method not allowed'
          });
        }

      case 'billing':
        if (req.method !== 'GET') {
          return res.status(405).json({
            success: false,
            error: 'Method not allowed'
          });
        }

        const billingResult = await getBillingStats();
        const billingDuration = Date.now() - startTime;
        
        console.log(`✅ [Admin API] 빌링 통계 조회 완료 (${billingDuration}ms)`);
        
        if (billingResult.success) {
          return res.status(200).json({
            success: true,
            data: billingResult.data,
            meta: {
              timestamp: new Date().toISOString(),
              duration: `${billingDuration}ms`
            }
          });
        } else {
          return res.status(500).json({
            success: false,
            error: billingResult.error
          });
        }

      default:
        console.error('❌ [Admin API] 알 수 없는 리소스:', resource);
        return res.status(404).json({
          success: false,
          error: 'Resource not found',
          availableResources: ['check-permission', 'stats', 'users']
        });
    }

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ [Admin API] 서버 오류 (${duration}ms):`, error);
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred'
    });
  }
}