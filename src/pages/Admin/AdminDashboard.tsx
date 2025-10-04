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
  Calendar,
  Clock,
  Star,
  Target,
  Zap
} from 'lucide-react';
import { useAdminStore } from '../../store/adminStore';
import LineChart from '../../components/Charts/LineChart';
import PieChart from '../../components/Charts/PieChart';
import BarChart from '../../components/Charts/BarChart';

const AdminDashboard: React.FC = () => {
  const { 
    stats, 
    systemHealth, 
    recentActivities, 
    loading, 
    error, 
    fetchStats, 
    fetchSystemHealth, 
    fetchRecentActivities
  } = useAdminStore();

  const [refreshing, setRefreshing] = useState(false);

  // 더미 차트 데이터 생성
  const generateDummyData = () => {
    const days = 30;
    const dailySignups = [];
    const dailyReports = [];
    const dailySearches = [];
    const revenueData = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      dailySignups.push({
        date: dateStr,
        value: Math.floor(Math.random() * 20) + 5
      });

      dailyReports.push({
        date: dateStr,
        value: Math.floor(Math.random() * 50) + 10
      });

      dailySearches.push({
        date: dateStr,
        value: Math.floor(Math.random() * 100) + 20
      });

      revenueData.push({
        date: dateStr,
        value: Math.floor(Math.random() * 500000) + 100000
      });
    }

    const popularKeywords = [
      { keyword: '인공지능', count: 245 },
      { keyword: '블록체인', count: 189 },
      { keyword: '바이오', count: 156 },
      { keyword: '반도체', count: 134 },
      { keyword: '자율주행', count: 112 },
      { keyword: '5G', count: 98 },
      { keyword: '메타버스', count: 87 },
      { keyword: '로봇', count: 76 }
    ];

    const activityByType = [
      { type: '검색', count: 1245 },
      { type: '리포트 생성', count: 567 },
      { type: '로그인', count: 2134 },
      { type: '다운로드', count: 345 }
    ];

    const activityByHour = [];
    for (let hour = 0; hour < 24; hour++) {
      activityByHour.push({
        hour: `${hour}:00`,
        count: Math.floor(Math.random() * 100) + 20
      });
    }

    const reportTypes = [
      { type: '시장분석', count: 234 },
      { type: '비즈니스인사이트', count: 189 },
      { type: '기술동향', count: 156 },
      { type: '경쟁분석', count: 123 }
    ];

    return { 
      dailySignups, 
      dailyReports, 
      dailySearches, 
      revenueData, 
      popularKeywords, 
      activityByType, 
      activityByHour, 
      reportTypes 
    };
  };

  const chartData = generateDummyData();

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([
        fetchStats(),
        fetchSystemHealth(),
        fetchRecentActivities()
      ]);
    };
    
    loadData();

    // 30초마다 자동 새로고침
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [fetchStats, fetchSystemHealth, fetchRecentActivities]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchStats(),
      fetchSystemHealth(),
      fetchRecentActivities()
    ]);
    setRefreshing(false);
  };

  if (loading.stats) {
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
      value: stats?.totalUsers || 0,
        average: Math.floor((stats?.totalUsers || 0) / 30),
      icon: Users,
      color: 'bg-blue-500',
      trend: '+12%'
    },
    {
      title: '총 리포트 (100일)',
      value: stats?.totalReports || 0,
        average: Math.floor((stats?.totalReports || 0) / 30),
      icon: FileText,
      color: 'bg-green-500',
      trend: '+8%'
    },
    {
      title: '총 검색 (100일)',
      value: stats?.totalSearches || 0,
        average: Math.floor((stats?.totalSearches || 0) / 30),
      icon: Search,
      color: 'bg-purple-500',
      trend: '+15%'
    },
    {
      title: '총 수익 (100일)',
      value: `₩${((stats?.totalUsers || 0) * 10000).toLocaleString()}`,
        average: `₩${Math.floor(((stats?.totalUsers || 0) * 10000) / 30).toLocaleString()}`,
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
            data={chartData.dailySignups}
            title="일별 사용자 가입 추이"
            color="#3B82F6"
            height={250}
          />
        </div>

        {/* 일별 리포트 생성 추이 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <LineChart
            data={chartData.dailyReports}
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
            data={chartData.dailySearches}
            title="일별 검색 활동 추이"
            color="#8B5CF6"
            height={250}
          />
        </div>

        {/* 인기 검색 키워드 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <BarChart
            data={chartData.popularKeywords.map(keyword => ({
              name: keyword.keyword,
              value: keyword.count
            }))}
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
            data={chartData.activityByType.map(activity => ({
              name: activity.type,
              value: activity.count
            }))}
            title="활동 유형별 분석"
            height={300}
          />
        </div>

        {/* 시간대별 활동 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <BarChart
            data={chartData.activityByHour.map(hourData => ({
              name: hourData.hour,
              value: hourData.count
            }))}
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
            data={chartData.reportTypes.map(reportType => ({
              name: reportType.type,
              value: reportType.count
            }))}
            title="리포트 유형별 분포 (100일)"
            height={300}
          />
        </div>

        {/* 수익 추이 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <LineChart
            data={chartData.revenueData}
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
                <span className={`text-sm font-medium ${getColorByValue(systemHealth.server?.cpuUsage || 0, 'percentage')}`}>
                  {systemHealth.server?.cpuUsage || 0}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${(systemHealth.server?.cpuUsage || 0) >= 80 ? 'bg-red-500' : (systemHealth.server?.cpuUsage || 0) >= 60 ? 'bg-yellow-500' : 'bg-green-500'}`}
                  style={{ width: `${systemHealth.server?.cpuUsage || 0}%` }}
                ></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">메모리 사용률</span>
                <span className={`text-sm font-medium ${getColorByValue(systemHealth.server?.memoryUsage || 0, 'percentage')}`}>
                  {systemHealth.server?.memoryUsage || 0}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${(systemHealth.server?.memoryUsage || 0) >= 80 ? 'bg-red-500' : (systemHealth.server?.memoryUsage || 0) >= 60 ? 'bg-yellow-500' : 'bg-green-500'}`}
                  style={{ width: `${systemHealth.server?.memoryUsage || 0}%` }}
                ></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">디스크 사용률</span>
                <span className={`text-sm font-medium ${getColorByValue(systemHealth.storage?.usedSpace || 0, 'percentage')}`}>
                  {Math.round((systemHealth.storage?.usedSpace || 0) / (systemHealth.storage?.totalSpace || 1) * 100)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${(systemHealth.storage?.usedSpace || 0) / (systemHealth.storage?.totalSpace || 1) * 100 >= 80 ? 'bg-red-500' : (systemHealth.storage?.usedSpace || 0) / (systemHealth.storage?.totalSpace || 1) * 100 >= 60 ? 'bg-yellow-500' : 'bg-green-500'}`}
                  style={{ width: `${Math.round((systemHealth.storage?.usedSpace || 0) / (systemHealth.storage?.totalSpace || 1) * 100)}%` }}
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
                activity.type === 'system_event' ? 'bg-red-100 text-red-800' :
                activity.type === 'search_performed' ? 'bg-yellow-100 text-yellow-800' :
                activity.type === 'report_generated' ? 'bg-blue-100 text-blue-800' :
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