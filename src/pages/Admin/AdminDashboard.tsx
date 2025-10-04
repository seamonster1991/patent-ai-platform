import React, { useEffect } from 'react';
import { 
  Users, 
  FileText, 
  Search, 
  TrendingUp,
  Activity,
  Clock,
  AlertCircle,
  CheckCircle,
  BarChart3,
  PieChart,
  Calendar,
  RefreshCw
} from 'lucide-react';
import { useAdminStore } from '../../store/adminStore';
import AdminLayout from '../../components/Layout/AdminLayout';

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

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([
        fetchStats(),
        fetchSystemHealth(),
        fetchRecentActivities()
      ]);
    };

    loadData();
    
    // 30초마다 데이터 새로고침
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [fetchStats, fetchSystemHealth, fetchRecentActivities]);

  const handleRefresh = async () => {
    await Promise.all([
      fetchStats(),
      fetchSystemHealth(),
      fetchRecentActivities()
    ]);
  };

  if (loading && !stats) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center space-x-2">
            <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
            <span className="text-slate-600 dark:text-slate-400">데이터를 불러오는 중...</span>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
              데이터 로드 실패
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-4">{error}</p>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              다시 시도
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const statCards = [
    {
      title: '총 사용자',
      value: stats?.totalUsers || 0,
      icon: Users,
      color: 'blue',
      change: '+12%',
      changeType: 'increase'
    },
    {
      title: '총 리포트',
      value: stats?.totalReports || 0,
      icon: FileText,
      color: 'green',
      change: '+8%',
      changeType: 'increase'
    },
    {
      title: '총 검색',
      value: stats?.totalSearches || 0,
      icon: Search,
      color: 'purple',
      change: '+15%',
      changeType: 'increase'
    },
    {
      title: '활성 사용자',
      value: stats?.activeUsers || 0,
      icon: Activity,
      color: 'orange',
      change: '+5%',
      changeType: 'increase'
    }
  ];

  const getColorClasses = (color: string) => {
    const colors = {
      blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
      green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
      purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
      orange: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400'
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  const getSystemHealthColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 dark:text-green-400';
      case 'warning':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'critical':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-slate-600 dark:text-slate-400';
    }
  };

  const getSystemHealthIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return CheckCircle;
      case 'warning':
      case 'critical':
        return AlertCircle;
      default:
        return Activity;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              관리자 대시보드
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              시스템 현황과 주요 지표를 확인하세요
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={loading.stats}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>새로고침</span>
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={index}
                className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
                      {stat.value.toLocaleString()}
                    </p>
                    <div className="flex items-center mt-2">
                      <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                      <span className="text-sm text-green-600 dark:text-green-400">
                        {stat.change}
                      </span>
                      <span className="text-sm text-slate-500 dark:text-slate-400 ml-1">
                        지난 달 대비
                      </span>
                    </div>
                  </div>
                  <div className={`p-3 rounded-lg ${getColorClasses(stat.color)}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* System Health */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                시스템 상태
              </h2>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  systemHealth?.status === 'healthy' ? 'bg-green-500' :
                  systemHealth?.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                }`} />
                <span className={`text-sm font-medium ${getSystemHealthColor(systemHealth?.status || 'unknown')}`}>
                  {systemHealth?.status === 'healthy' ? '정상' :
                   systemHealth?.status === 'warning' ? '주의' :
                   systemHealth?.status === 'critical' ? '위험' : '알 수 없음'}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-400">CPU 사용률</span>
                <span className="text-sm font-medium text-slate-900 dark:text-white">
                  {systemHealth?.serverMetrics?.cpuUsage || 0}%
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${systemHealth?.serverMetrics?.cpuUsage || 0}%` }}
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-400">메모리 사용률</span>
                <span className="text-sm font-medium text-slate-900 dark:text-white">
                  {systemHealth?.serverMetrics?.memoryUsage || 0}%
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${systemHealth?.serverMetrics?.memoryUsage || 0}%` }}
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-400">디스크 사용률</span>
                <span className="text-sm font-medium text-slate-900 dark:text-white">
                  {systemHealth?.serverMetrics?.diskUsage || 0}%
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                <div 
                  className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${systemHealth?.serverMetrics?.diskUsage || 0}%` }}
                />
              </div>
            </div>
          </div>

          {/* Recent Activities */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                최근 활동
              </h2>
              <Clock className="w-5 h-5 text-slate-400" />
            </div>

            <div className="space-y-4">
              {recentActivities && recentActivities.length > 0 ? (
                recentActivities.slice(0, 5).map((activity, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                        <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-900 dark:text-white">
                        {activity.description}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {new Date(activity.timestamp).toLocaleString('ko-KR')}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Activity className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-500 dark:text-slate-400">
                    최근 활동이 없습니다
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            빠른 작업
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="flex items-center space-x-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                사용자 관리
              </span>
            </button>
            <button className="flex items-center space-x-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors">
              <FileText className="w-5 h-5 text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium text-green-700 dark:text-green-300">
                리포트 관리
              </span>
            </button>
            <button className="flex items-center space-x-3 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors">
              <BarChart3 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                통계 보기
              </span>
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;