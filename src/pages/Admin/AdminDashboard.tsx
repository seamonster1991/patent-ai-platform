import React, { useEffect, useState } from 'react';
import { 
  Users, 
  FileText, 
  Search, 
  Activity, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  BarChart3,
  PieChart,
  Calendar,
  Clock,
  Star,
  Target,
  Zap
} from 'lucide-react';
import { useAdminStore } from '../../store/adminStore';
import LineChart from '../../components/Charts/LineChart';
import BarChart from '../../components/Charts/BarChart';
import PieChart from '../../components/Charts/PieChart';

const AdminDashboard: React.FC = () => {
  const { 
    stats, 
    systemHealth, 
    recentActivities, 
    dashboardData,
    loading, 
    error, 
    fetchStats, 
    fetchSystemHealth, 
    fetchRecentActivities,
    fetchDashboardData
  } = useAdminStore();

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([
        fetchStats(),
        fetchSystemHealth(),
        fetchRecentActivities(),
        fetchDashboardData()
      ]);
    };
    
    loadData();

    // 30초마다 자동 새로고침
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [fetchStats, fetchSystemHealth, fetchRecentActivities, fetchDashboardData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchStats(),
      fetchSystemHealth(),
      fetchRecentActivities(),
      fetchDashboardData()
    ]);
    setRefreshing(false);
  };

  if (loading.stats || loading.dashboard) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">대시보드 데이터를 불러오는 중...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  const getColorByValue = (value: number, type: 'percentage' | 'count' = 'count') => {
    if (type === 'percentage') {
      if (value >= 80) return 'text-red-600';
      if (value >= 60) return 'text-yellow-600';
      return 'text-green-600';
    }
    return 'text-blue-600';
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  // 100일간 통계 카드 데이터
  const dashboardStats = [
    {
      title: '총 사용자 (100일)',
      value: dashboardData?.totalStats.totalUsers || 0,
      average: dashboardData?.totalStats.averageDailyUsers || 0,
      icon: Users,
      color: 'bg-blue-500',
      trend: '+12%'
    },
    {
      title: '총 리포트 (100일)',
      value: dashboardData?.totalStats.totalReports || 0,
      average: dashboardData?.totalStats.averageDailyReports || 0,
      icon: FileText,
      color: 'bg-green-500',
      trend: '+8%'
    },
    {
      title: '총 검색 (100일)',
      value: dashboardData?.totalStats.totalSearches || 0,
      average: dashboardData?.totalStats.averageDailySearches || 0,
      icon: Search,
      color: 'bg-purple-500',
      trend: '+15%'
    },
    {
      title: '총 수익 (100일)',
      value: `₩${(dashboardData?.totalStats.totalRevenue || 0).toLocaleString()}`,
      average: `₩${(dashboardData?.totalStats.averageDailyRevenue || 0).toLocaleString()}`,
      icon: DollarSign,
      color: 'bg-yellow-500',
      trend: '+22%'
    }
  ];

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">관리자 대시보드</h1>
          <p className="text-gray-600">최근 100일간의 시스템 현황 및 통계</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          새로고침
        </button>
      </div>

      {/* 100일간 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {dashboardStats.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm text-gray-500">일평균: {stat.average}</p>
              </div>
              <div className={`p-3 rounded-full ${stat.color}`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-sm text-green-600">{stat.trend}</span>
              <span className="text-sm text-gray-500 ml-1">vs 이전 100일</span>
            </div>
          </div>
        ))}
      </div>

      {/* 차트 섹션 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 일별 사용자 가입 추이 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <LineChart
            data={dashboardData?.dailySignups.map(item => ({
              date: item.date,
              value: item.count
            })) || []}
            title="일별 사용자 가입 추이"
            color="#3B82F6"
            height={250}
          />
        </div>

        {/* 일별 리포트 생성 추이 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <LineChart
            data={dashboardData?.dailyReports.map(item => ({
              date: item.date,
              value: item.count
            })) || []}
            title="일별 리포트 생성 추이"
            color="#10B981"
            height={250}
          />
        </div>
      </div>

      {/* 추가 차트 섹션 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 일별 검색 활동 추이 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <LineChart
            data={dashboardData?.dailySearches.map(item => ({
              date: item.date,
              value: item.count
            })) || []}
            title="일별 검색 활동 추이"
            color="#8B5CF6"
            height={250}
          />
        </div>

        {/* 인기 검색 키워드 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <BarChart
            data={dashboardData?.popularKeywords.slice(0, 8).map(keyword => ({
              name: keyword.keyword,
              value: keyword.count
            })) || []}
            title="인기 검색 키워드 TOP 8"
            color="#F59E0B"
            height={250}
          />
        </div>
      </div>

      {/* 활동 패턴 분석 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 활동 유형별 분석 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <PieChart
            data={dashboardData?.activityAnalysis.byType.map(activity => ({
              name: activity.type,
              value: activity.count
            })) || []}
            title="활동 유형별 분석"
            height={300}
          />
        </div>

        {/* 시간대별 활동 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <BarChart
            data={dashboardData?.activityAnalysis.byHour.map(hourData => ({
              name: `${hourData.hour}시`,
              value: hourData.count
            })) || []}
            title="시간대별 활동 분포"
            color="#8B5CF6"
            height={300}
          />
        </div>
      </div>

      {/* 리포트 유형 분석 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <PieChart
            data={dashboardData?.reportTypes.map(reportType => ({
              name: reportType.type,
              value: reportType.count
            })) || []}
            title="리포트 유형별 분포 (100일)"
            height={300}
          />
        </div>

        {/* 수익 추이 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <LineChart
            data={dashboardData?.revenueData.map(item => ({
              date: item.date,
              value: item.revenue
            })) || []}
            title="일별 수익 추이 (100일)"
            color="#F59E0B"
            height={300}
          />
        </div>
      </div>

      {/* 시스템 상태 */}
      {systemHealth && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">시스템 상태</h3>
            <Activity className="h-5 w-5 text-gray-400" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">CPU 사용률</span>
                <span className={`text-sm font-medium ${getColorByValue(systemHealth.cpu, 'percentage')}`}>
                  {systemHealth.cpu}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${systemHealth.cpu >= 80 ? 'bg-red-500' : systemHealth.cpu >= 60 ? 'bg-yellow-500' : 'bg-green-500'}`}
                  style={{ width: `${systemHealth.cpu}%` }}
                ></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">메모리 사용률</span>
                <span className={`text-sm font-medium ${getColorByValue(systemHealth.memory, 'percentage')}`}>
                  {systemHealth.memory}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${systemHealth.memory >= 80 ? 'bg-red-500' : systemHealth.memory >= 60 ? 'bg-yellow-500' : 'bg-green-500'}`}
                  style={{ width: `${systemHealth.memory}%` }}
                ></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">디스크 사용률</span>
                <span className={`text-sm font-medium ${getColorByValue(systemHealth.disk, 'percentage')}`}>
                  {systemHealth.disk}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${systemHealth.disk >= 80 ? 'bg-red-500' : systemHealth.disk >= 60 ? 'bg-yellow-500' : 'bg-green-500'}`}
                  style={{ width: `${systemHealth.disk}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 최근 활동 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">최근 활동</h3>
          <Activity className="h-5 w-5 text-gray-400" />
        </div>
        <div className="space-y-3">
          {recentActivities.slice(0, 5).map((activity, index) => (
            <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
              <div>
                <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                <p className="text-xs text-gray-500">{new Date(activity.timestamp).toLocaleString()}</p>
              </div>
              <span className={`px-2 py-1 text-xs rounded-full ${
                activity.type === 'error' ? 'bg-red-100 text-red-800' :
                activity.type === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                'bg-green-100 text-green-800'
              }`}>
                {activity.type}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 빠른 액션 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">빠른 액션</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="flex items-center justify-center p-4 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors">
            <Users className="h-5 w-5 mr-2" />
            사용자 관리
          </button>
          <button className="flex items-center justify-center p-4 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors">
            <FileText className="h-5 w-5 mr-2" />
            리포트 관리
          </button>
          <button className="flex items-center justify-center p-4 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors">
            <BarChart3 className="h-5 w-5 mr-2" />
            통계 보기
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;