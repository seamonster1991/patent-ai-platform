import React, { useEffect, useState } from 'react';
import { 
  Card, 
  Metric, 
  Text, 
  Flex, 
  BadgeDelta, 
  DeltaType,
  LineChart,
  ProgressBar,
  Badge
} from '@tremor/react';
import { 
  Users,
  FileText,
  Search,
  DollarSign, 
  Zap, 
  AlertTriangle, 
  TrendingUp,
  Server,
  Database,
  Activity
} from 'lucide-react';
import { toast } from 'sonner';
import { apiGet } from '../../lib/api';

interface AdminStats {
  summary: {
    totalUsers: number;
    activeUsers: number;
    totalReports: number;
    totalSearches: number;
    newUsersToday: number;
    searchesToday: number;
    reportsToday: number;
    totalUsageCost: number;
    usersByRole: Record<string, number>;
    usersByPlan: Record<string, number>;
  };
  recentActivities: Array<{
    id: string;
    user_id: string;
    activity_type: string;
    activity_data: any;
    cost: number;
    created_at: string;
  }>;
  recentUsers: Array<{
    id: string;
    email: string;
    role: string;
    subscription_plan: string;
    created_at: string;
  }>;
  topKeywords: Array<{
    keyword: string;
    count: number;
  }>;
  fieldDistribution: Array<{
    field: string;
    count: number;
    percentage: number;
  }>;
  dailyStats: Array<{
    date: string;
    newUsers: number;
    searches: number;
    reports: number;
    activities: number;
    totalActivity: number;
  }>;
  systemMetrics: {
    totalRevenue: number;
    averageCostPerUser: number;
    averageSearchesPerUser: number;
    averageReportsPerUser: number;
    systemHealth: string;
    uptime: string;
  };
}

const AdminHome: React.FC = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAdminStats = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('[DATA] [AdminHome] 관리자 통계 로드 시작');

        // 개선된 API 함수 사용
        const response = await apiGet('/api/admin?resource=dashboard', {
          timeout: 30000,
          retries: 2,
          requireAuth: true
        });

        console.log('[DATA] [AdminHome] API 응답:', response);

        if (!response.success) {
          throw new Error(response.error || '관리자 통계를 가져오는데 실패했습니다.');
        }

        if (response.data) {
          const data = response.data;

          // API 응답을 AdminStats 형식으로 매핑
          const mappedStats: AdminStats = {
            summary: {
              totalUsers: data.total_users || 0,
              activeUsers: data.active_users || 0,
              totalReports: data.total_reports || 0,
              totalSearches: data.total_searches || 0,
              newUsersToday: data.new_users_today || 0,
              searchesToday: data.searches_today || 0,
              reportsToday: data.reports_today || 0,
              totalUsageCost: data.total_usage_cost || 0,
              usersByRole: data.users_by_role || { user: 0, admin: 0 },
              usersByPlan: data.users_by_plan || { free: 0, premium: 0 }
            },
            recentActivities: data.recent_activities || [],
            recentUsers: data.recent_users || [],
            topKeywords: data.top_keywords || [],
            fieldDistribution: data.field_distribution || [],
            dailyStats: data.daily_stats || [],
            systemMetrics: {
              totalRevenue: data.system_metrics?.total_revenue || 0,
              averageCostPerUser: data.system_metrics?.average_cost_per_user || 0,
              averageSearchesPerUser: data.system_metrics?.average_searches_per_user || 0,
              averageReportsPerUser: data.system_metrics?.average_reports_per_user || 0,
              systemHealth: data.system_metrics?.system_health || 'Unknown',
              uptime: data.system_metrics?.uptime || 'Unknown'
            }
          };

          setStats(mappedStats);
          console.log('[DATA] [AdminHome] 통계 데이터 설정 완료:', mappedStats);
        }
      } catch (error) {
        console.error('[ERROR] [AdminHome] 관리자 통계 로드 실패:', error);
        const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
        setError(errorMessage);
        toast.error(`관리자 통계 로드 실패: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    };

    fetchAdminStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ms-olive mx-auto mb-4"></div>
          <p className="text-ms-text-muted">관리자 대시보드 데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-500 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-ms-olive text-white rounded-lg hover:bg-ms-olive/90"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  const { summary, dailyStats, systemMetrics, recentActivities, recentUsers } = stats;

  // 차트 데이터 준비
  const activityTrendData = dailyStats.slice(-7).map(day => ({
    date: new Date(day.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }),
    활동: day.totalActivity,
    사용자: day.newUsers,
    검색: day.searches,
    리포트: day.reports
  }));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-ms-text mb-2">관리자 대시보드</h1>
        <p className="text-gray-600">시스템 전체 현황과 주요 지표를 확인하세요</p>
      </div>

      {/* 핵심 지표 */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-ms-text">핵심 지표</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* 전체 사용자 */}
          <Card className="border-0 shadow-sm">
            <Flex alignItems="start">
              <div>
                <Text className="text-gray-600">전체 사용자</Text>
                <Metric className="text-ms-text">{summary.totalUsers.toLocaleString()}</Metric>
              </div>
              <Users className="h-8 w-8 text-ms-olive" />
            </Flex>
            <Flex className="mt-4">
              <Text className="text-sm text-gray-600">오늘 신규</Text>
              <BadgeDelta 
                deltaType={summary.newUsersToday > 0 ? "moderateIncrease" : "unchanged" as DeltaType}
                size="xs"
              >
                +{summary.newUsersToday}
              </BadgeDelta>
            </Flex>
          </Card>

          {/* 활성 사용자 */}
          <Card className="border-0 shadow-sm">
            <Flex alignItems="start">
              <div>
                <Text className="text-gray-600">활성 사용자</Text>
                <Metric className="text-ms-text">{summary.activeUsers.toLocaleString()}</Metric>
              </div>
              <Activity className="h-8 w-8 text-ms-olive" />
            </Flex>
            <Flex className="mt-4">
              <Text className="text-sm text-gray-600">활성률</Text>
              <Badge color="emerald" size="xs">
                {summary.totalUsers > 0 ? ((summary.activeUsers / summary.totalUsers) * 100).toFixed(1) : 0}%
              </Badge>
            </Flex>
          </Card>

          {/* 총 검색 수 */}
          <Card className="border-0 shadow-sm">
            <Flex alignItems="start">
              <div>
                <Text className="text-gray-600">총 검색 수</Text>
                <Metric className="text-ms-text">{summary.totalSearches.toLocaleString()}</Metric>
              </div>
              <Search className="h-8 w-8 text-ms-olive" />
            </Flex>
            <Flex className="mt-4">
              <Text className="text-sm text-gray-600">오늘</Text>
              <BadgeDelta 
                deltaType={summary.searchesToday > 0 ? "moderateIncrease" : "unchanged" as DeltaType}
                size="xs"
              >
                +{summary.searchesToday}
              </BadgeDelta>
            </Flex>
          </Card>

          {/* 총 보고서 수 */}
          <Card className="border-0 shadow-sm">
            <Flex alignItems="start">
              <div>
                <Text className="text-gray-600">총 보고서 수</Text>
                <Metric className="text-ms-text">{summary.totalReports.toLocaleString()}</Metric>
              </div>
              <FileText className="h-8 w-8 text-ms-olive" />
            </Flex>
            <Flex className="mt-4">
              <Text className="text-sm text-gray-600">오늘</Text>
              <BadgeDelta 
                deltaType={summary.reportsToday > 0 ? "moderateIncrease" : "unchanged" as DeltaType}
                size="xs"
              >
                +{summary.reportsToday}
              </BadgeDelta>
            </Flex>
          </Card>
        </div>
      </div>

      {/* 수익 및 성과 지표 */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-ms-text">수익 및 성과</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* 총 수익 */}
          <Card className="border-0 shadow-sm">
            <Flex alignItems="start">
              <div>
                <Text className="text-gray-600">총 수익</Text>
                <Metric className="text-ms-text">₩{systemMetrics.totalRevenue.toLocaleString()}</Metric>
              </div>
              <DollarSign className="h-8 w-8 text-ms-olive" />
            </Flex>
            <Flex className="mt-4">
              <Text className="text-sm text-gray-600">사용자당 평균</Text>
              <Badge color="emerald" size="xs">
                ₩{systemMetrics.averageCostPerUser.toFixed(0)}
              </Badge>
            </Flex>
          </Card>

          {/* 평균 검색/사용자 */}
          <Card className="border-0 shadow-sm">
            <Flex alignItems="start">
              <div>
                <Text className="text-gray-600">평균 검색/사용자</Text>
                <Metric className="text-ms-text">{systemMetrics.averageSearchesPerUser.toFixed(1)}</Metric>
              </div>
              <Search className="h-8 w-8 text-ms-olive" />
            </Flex>
          </Card>

          {/* 평균 리포트/사용자 */}
          <Card className="border-0 shadow-sm">
            <Flex alignItems="start">
              <div>
                <Text className="text-gray-600">평균 리포트/사용자</Text>
                <Metric className="text-ms-text">{systemMetrics.averageReportsPerUser.toFixed(1)}</Metric>
              </div>
              <FileText className="h-8 w-8 text-ms-olive" />
            </Flex>
          </Card>
        </div>
      </div>

      {/* 시스템 상태 */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-ms-text">시스템 상태</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 시스템 건강도 */}
          <Card className="border-0 shadow-sm">
            <Flex alignItems="start">
              <div>
                <Text className="text-gray-600">시스템 건강도</Text>
                <Metric className="text-ms-text">{systemMetrics.systemHealth}</Metric>
              </div>
              <Server className="h-8 w-8 text-ms-olive" />
            </Flex>
            <div className="mt-4">
              <ProgressBar 
                value={systemMetrics.systemHealth === 'Good' ? 95 : systemMetrics.systemHealth === 'Fair' ? 70 : 40}
                color="emerald"
                className="mt-2"
              />
            </div>
          </Card>

          {/* 시스템 가동률 */}
          <Card className="border-0 shadow-sm">
            <Flex alignItems="start">
              <div>
                <Text className="text-gray-600">시스템 가동률</Text>
                <Metric className="text-ms-text">{systemMetrics.uptime}</Metric>
              </div>
              <Database className="h-8 w-8 text-ms-olive" />
            </Flex>
            <div className="mt-4">
              <ProgressBar 
                value={parseFloat(systemMetrics.uptime.replace('%', ''))}
                color="emerald"
                className="mt-2"
              />
            </div>
          </Card>
        </div>
      </div>

      {/* 활동 트렌드 차트 */}
      {activityTrendData.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-ms-text">주간 활동 트렌드</h2>
          
          <Card className="border-0 shadow-sm">
            <div className="mb-4">
              <Text className="text-lg font-semibold text-ms-text">최근 7일 활동</Text>
              <Text className="text-gray-600">일별 사용자 활동 현황</Text>
            </div>
            <LineChart
              className="h-72"
              data={activityTrendData}
              index="date"
              categories={["활동", "사용자", "검색", "리포트"]}
              colors={["blue", "emerald", "amber", "rose"]}
              valueFormatter={(number: number) => number.toLocaleString()}
              yAxisWidth={60}
            />
          </Card>
        </div>
      )}

      {/* 최근 활동 및 사용자 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 최근 활동 */}
        <Card className="border-0 shadow-sm">
          <div className="mb-4">
            <Text className="text-lg font-semibold text-ms-text">최근 활동</Text>
            <Text className="text-gray-600">실시간 사용자 활동</Text>
          </div>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {recentActivities.length > 0 ? (
              recentActivities.slice(0, 10).map((activity, index) => (
                <div key={activity.id || index} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-ms-text">
                      {activity.activity_type === 'search' ? '검색 활동' :
                       activity.activity_type === 'report' ? '보고서 생성' :
                       activity.activity_type === 'login' ? '로그인' : activity.activity_type}
                    </p>
                    <p className="text-xs text-gray-600">
                      사용자: {activity.user_id.substring(0, 8)}... • 비용: ₩{activity.cost}
                    </p>
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(activity.created_at).toLocaleDateString('ko-KR')}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">최근 활동이 없습니다.</p>
              </div>
            )}
          </div>
        </Card>

        {/* 최근 가입 사용자 */}
        <Card className="border-0 shadow-sm">
          <div className="mb-4">
            <Text className="text-lg font-semibold text-ms-text">최근 가입 사용자</Text>
            <Text className="text-gray-600">신규 사용자 현황</Text>
          </div>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {recentUsers.length > 0 ? (
              recentUsers.slice(0, 10).map((user, index) => (
                <div key={user.id || index} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-ms-text">
                      {user.email}
                    </p>
                    <p className="text-xs text-gray-600">
                      {user.role} • {user.subscription_plan}
                    </p>
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(user.created_at).toLocaleDateString('ko-KR')}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">최근 가입 사용자가 없습니다.</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AdminHome;