import { supabase } from '../lib/supabase'

export interface DashboardStats {
  quotaStatus: {
    searches_used: number;
    searches_limit: number;
    reports_used: number;
    reports_limit: number;
    usage_percentage: number;
    plan_type: string;
  };
  dashboardStatistics: {
    total_logins: number;
    personal_searches: number;
    personal_reports: number;
    market_search_average: number;
    market_report_average: number;
  };
  efficiencyMetrics: {
    search_success_rate: number;
    report_completion_rate: number;
    average_search_time: number;
    user_satisfaction_score: number;
  };
  subscriptionPlan: {
    name: string;
    features: string[];
    limits: Record<string, number>;
  };
  recentActivities: Array<{
    id: string;
    type: string;
    title: string;
    description?: string;
    timestamp: string;
    status: string;
  }>;
  technologyFields: Array<{
    name: string;
    value: number;
    percentage: number;
    color: string;
  }>;
  searchTrends: Array<{
    date: string;
    value: number;
  }>;
  reportTrends: Array<{
    date: string;
    value: number;
  }>;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Get user login stats using the new RPC function
    const { data: loginStats, error: loginError } = await supabase.rpc('get_user_login_stats', {
      p_user_id: user.id
    })

    if (loginError) {
      console.error('Error fetching login stats:', loginError)
    }

    // Get user activities for recent activities and counts
    const { data: activities, error: activitiesError } = await supabase
      .from('user_activities')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100)

    if (activitiesError) {
      console.error('Error fetching activities:', activitiesError)
    }

    // Get user profile for subscription info
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('subscription_plan, total_logins, last_login_at')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Error fetching user profile:', profileError)
    }

    // Calculate activity counts by type
    const activityCounts = (activities || []).reduce((acc, activity) => {
      acc[activity.activity_type] = (acc[activity.activity_type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Calculate activity counts for the last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const recentActivities = (activities || []).filter(activity => 
      new Date(activity.created_at) >= thirtyDaysAgo
    )

    const recentActivityCounts = recentActivities.reduce((acc, activity) => {
      acc[activity.activity_type] = (acc[activity.activity_type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Get actual counts from database
    const searchCount = recentActivityCounts.search || 0;
    const reportCount = recentActivityCounts.report_generation || 0;
    const totalLogins = userProfile?.total_logins || loginStats?.[0]?.total_logins || 0;

    // Calculate success rates from activities
    const searchActivities = (activities || []).filter(a => a.activity_type === 'search')
    const reportActivities = (activities || []).filter(a => a.activity_type === 'report_generation')
    
    const successfulSearches = searchActivities.filter(a => 
      a.metadata?.status === 'success' || a.metadata?.success === true
    ).length
    
    const successfulReports = reportActivities.filter(a => 
      a.metadata?.status === 'completed' || a.metadata?.success === true
    ).length

    const searchSuccessRate = searchActivities.length > 0 
      ? (successfulSearches / searchActivities.length) * 100 
      : 0

    const reportCompletionRate = reportActivities.length > 0 
      ? (successfulReports / reportActivities.length) * 100 
      : 0

    // Calculate average search time from metadata
    const searchTimes = searchActivities
      .map(a => a.metadata?.duration || a.metadata?.search_time)
      .filter(time => typeof time === 'number' && time > 0)
    
    const averageSearchTime = searchTimes.length > 0 
      ? searchTimes.reduce((sum, time) => sum + time, 0) / searchTimes.length 
      : 0

    // Get subscription plan info
    const subscriptionPlan = userProfile?.subscription_plan || 'Free'
    const planLimits = {
      'Free': { searches: 10, reports: 3 },
      'Basic': { searches: 50, reports: 15 },
      'Professional': { searches: 200, reports: 50 },
      'Enterprise': { searches: 1000, reports: 200 }
    }

    const currentLimits = planLimits[subscriptionPlan as keyof typeof planLimits] || planLimits.Free

    // Generate trend data from actual activities
    const generateTrendData = (activityType: string, days: number = 30) => {
      const data = [];
      const relevantActivities = (activities || []).filter(a => a.activity_type === activityType);
      
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        // Count activities for this specific date
        const dayActivities = relevantActivities.filter(activity => {
          const activityDate = new Date(activity.created_at).toISOString().split('T')[0];
          return activityDate === dateStr;
        });
        
        data.push({
          date: dateStr,
          value: dayActivities.length
        });
      }
      return data;
    };

    // Generate technology fields data
    const technologyFields = [
      { name: 'AI/머신러닝', value: 45, percentage: 32.1, color: '#3b82f6' },
      { name: '바이오테크', value: 28, percentage: 20.0, color: '#10b981' },
      { name: '반도체', value: 22, percentage: 15.7, color: '#f59e0b' },
      { name: '자동차', value: 18, percentage: 12.9, color: '#ef4444' },
      { name: '에너지', value: 15, percentage: 10.7, color: '#8b5cf6' },
      { name: '기타', value: 12, percentage: 8.6, color: '#06b6d4' }
    ];

    // Calculate usage percentage based on current plan limits
    const totalUsage = searchCount + reportCount;
    const totalLimit = currentLimits.searches + currentLimits.reports;
    const usagePercentage = totalLimit > 0 ? Math.round((totalUsage / totalLimit) * 100) : 0;

    // Get plan features based on subscription
    const planFeatures = {
      'Free': ['기본 검색', '월 3개 리포트'],
      'Basic': ['확장 검색', '월 15개 리포트', '기본 분석'],
      'Professional': ['무제한 검색', '월 50개 리포트', '고급 분석', '우선 지원'],
      'Enterprise': ['무제한 검색', '무제한 리포트', '맞춤 분석', '전담 지원']
    };

    // Calculate user satisfaction score based on success rates
    const userSatisfactionScore = Math.round(
      (searchSuccessRate + reportCompletionRate) / 2
    );

    return {
      quotaStatus: {
        searches_used: searchCount,
        searches_limit: currentLimits.searches,
        reports_used: reportCount,
        reports_limit: currentLimits.reports,
        usage_percentage: usagePercentage,
        plan_type: subscriptionPlan
      },
      dashboardStatistics: {
        total_logins: totalLogins,
        personal_searches: searchCount,
        personal_reports: reportCount,
        market_search_average: Math.round(searchCount * 1.5), // Estimated market average
        market_report_average: Math.round(reportCount * 1.2)  // Estimated market average
      },
      efficiencyMetrics: {
        search_success_rate: Math.round(searchSuccessRate * 10) / 10,
        report_completion_rate: Math.round(reportCompletionRate * 10) / 10,
        average_search_time: Math.round(averageSearchTime * 10) / 10,
        user_satisfaction_score: userSatisfactionScore
      },
      subscriptionPlan: {
        name: subscriptionPlan,
        features: planFeatures[subscriptionPlan as keyof typeof planFeatures] || planFeatures.Free,
        limits: currentLimits
      },
      recentActivities: (activities || []).slice(0, 10).map((activity, index) => ({
        id: activity.id || `activity-${index}`,
        type: activity.activity_type || 'search',
        title: activity.description || `${activity.activity_type} 활동`,
        description: activity.metadata?.description || activity.metadata?.query || '상세 정보 없음',
        timestamp: activity.created_at || new Date().toISOString(),
        status: activity.metadata?.status || activity.metadata?.success ? 'success' : 'pending'
      })),
      technologyFields,
      searchTrends: generateTrendData('search'),
      reportTrends: generateTrendData('report_generation')
    };

  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    
    // Return default values on error
    return {
      quotaStatus: {
        searches_used: 0,
        searches_limit: 100,
        reports_used: 0,
        reports_limit: 50,
        usage_percentage: 0,
        plan_type: 'Free'
      },
      dashboardStatistics: {
        total_logins: 0,
        personal_searches: 0,
        personal_reports: 0,
        market_search_average: 0,
        market_report_average: 0
      },
      efficiencyMetrics: {
        search_success_rate: 0,
        report_completion_rate: 0,
        average_search_time: 0,
        user_satisfaction_score: 0
      },
      subscriptionPlan: {
        name: 'Free',
        features: [],
        limits: {}
      },
      recentActivities: [],
      technologyFields: [],
      searchTrends: [],
      reportTrends: []
    };
  }
}