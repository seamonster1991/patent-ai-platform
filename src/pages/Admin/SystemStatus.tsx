import React, { useEffect, useState } from 'react';
import { 
  Server, 
  Database, 
  Cpu, 
  HardDrive, 
  Wifi, 
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Monitor,
  Zap,
  Globe,
  Shield,
  Users,
  FileText,
  Search
} from 'lucide-react';
import { useAdminStore } from '../../store/adminStore';
import AdminLayout from '../../components/Layout/AdminLayout';

const SystemStatus: React.FC = () => {
  const { 
    systemHealth, 
    loading, 
    error,
    fetchSystemHealth 
  } = useAdminStore();

  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    fetchSystemHealth();
  }, [fetchSystemHealth]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchSystemHealth();
      }, 30000); // 30초마다 새로고침
      setRefreshInterval(interval);
    } else {
      if (refreshInterval) {
        clearInterval(refreshInterval);
        setRefreshInterval(null);
      }
    }

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [autoRefresh, fetchSystemHealth]);

  const handleRefresh = () => {
    fetchSystemHealth();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'online':
      case 'good':
        return 'text-green-600 dark:text-green-400';
      case 'warning':
      case 'degraded':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'error':
      case 'offline':
      case 'critical':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-slate-600 dark:text-slate-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'online':
      case 'good':
        return CheckCircle;
      case 'warning':
      case 'degraded':
        return AlertTriangle;
      case 'error':
      case 'offline':
      case 'critical':
        return AlertTriangle;
      default:
        return Clock;
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'online':
      case 'good':
        return 'bg-green-100 dark:bg-green-900/20';
      case 'warning':
      case 'degraded':
        return 'bg-yellow-100 dark:bg-yellow-900/20';
      case 'error':
      case 'offline':
      case 'critical':
        return 'bg-red-100 dark:bg-red-900/20';
      default:
        return 'bg-slate-100 dark:bg-slate-900/20';
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
      return `${days}일 ${hours}시간 ${minutes}분`;
    } else if (hours > 0) {
      return `${hours}시간 ${minutes}분`;
    } else {
      return `${minutes}분`;
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading && !systemHealth) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center space-x-2">
            <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
            <span className="text-slate-600 dark:text-slate-400">시스템 상태를 확인하는 중...</span>
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
            <Server className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
              시스템 상태 확인 실패
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

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              시스템 상태
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              실시간 시스템 모니터링 및 상태 확인
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="autoRefresh"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="autoRefresh" className="text-sm text-slate-700 dark:text-slate-300">
                자동 새로고침
              </label>
            </div>
            <button
              onClick={handleRefresh}
              disabled={loading.systemHealth}
              className="flex items-center space-x-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>새로고침</span>
            </button>
          </div>
        </div>

        {/* Overall System Status */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              전체 시스템 상태
            </h2>
            <div className="flex items-center space-x-2">
              {systemHealth?.overallStatus && (
                <>
                  {React.createElement(getStatusIcon(systemHealth.overallStatus), {
                    className: `w-5 h-5 ${getStatusColor(systemHealth.overallStatus)}`
                  })}
                  <span className={`font-medium ${getStatusColor(systemHealth.overallStatus)}`}>
                    {systemHealth.overallStatus === 'healthy' ? '정상' :
                     systemHealth.overallStatus === 'warning' ? '경고' :
                     systemHealth.overallStatus === 'error' ? '오류' : systemHealth.overallStatus}
                  </span>
                </>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {systemHealth?.uptime ? formatUptime(systemHealth.uptime) : '알 수 없음'}
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">시스템 가동 시간</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {systemHealth?.activeUsers || 0}
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">활성 사용자</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {systemHealth?.requestsPerMinute || 0}
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">분당 요청 수</div>
            </div>
          </div>
        </div>

        {/* Service Status */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            서비스 상태
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {systemHealth?.services?.map((service, index) => {
              const StatusIcon = getStatusIcon(service.status);
              return (
                <div key={index} className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${getStatusBgColor(service.status)}`}>
                      {service.name === 'API Server' && <Server className="w-5 h-5" />}
                      {service.name === 'Database' && <Database className="w-5 h-5" />}
                      {service.name === 'Search Engine' && <Search className="w-5 h-5" />}
                      {service.name === 'File Storage' && <HardDrive className="w-5 h-5" />}
                      {service.name === 'Authentication' && <Shield className="w-5 h-5" />}
                      {!['API Server', 'Database', 'Search Engine', 'File Storage', 'Authentication'].includes(service.name) && 
                        <Globe className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="font-medium text-slate-900 dark:text-white">
                        {service.name}
                      </div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        응답 시간: {service.responseTime}ms
                      </div>
                    </div>
                  </div>
                  <StatusIcon className={`w-5 h-5 ${getStatusColor(service.status)}`} />
                </div>
              );
            })}
          </div>
        </div>

        {/* System Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Server Metrics */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              서버 메트릭
            </h2>
            <div className="space-y-4">
              {/* CPU Usage */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Cpu className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">CPU 사용률</span>
                  </div>
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
              </div>

              {/* Memory Usage */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Monitor className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">메모리 사용률</span>
                  </div>
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
              </div>

              {/* Disk Usage */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <HardDrive className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">디스크 사용률</span>
                  </div>
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

              {/* Network */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Wifi className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">네트워크</span>
                  </div>
                  <span className="text-sm font-medium text-slate-900 dark:text-white">
                    {formatBytes(systemHealth?.serverMetrics?.networkIn || 0)}/s
                  </span>
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400">
                  입력: {formatBytes(systemHealth?.serverMetrics?.networkIn || 0)}/s | 
                  출력: {formatBytes(systemHealth?.serverMetrics?.networkOut || 0)}/s
                </div>
              </div>
            </div>
          </div>

          {/* Database Metrics */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              데이터베이스 메트릭
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">
                    {systemHealth?.databaseMetrics?.connections || 0}
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">활성 연결</div>
                </div>
                <div className="text-center p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">
                    {systemHealth?.databaseMetrics?.queries || 0}
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">초당 쿼리</div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    평균 응답 시간
                  </span>
                  <span className="text-sm font-medium text-slate-900 dark:text-white">
                    {systemHealth?.databaseMetrics?.avgResponseTime || 0}ms
                  </span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    데이터베이스 크기
                  </span>
                  <span className="text-sm font-medium text-slate-900 dark:text-white">
                    {formatBytes(systemHealth?.databaseMetrics?.size || 0)}
                  </span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    캐시 적중률
                  </span>
                  <span className="text-sm font-medium text-slate-900 dark:text-white">
                    {systemHealth?.databaseMetrics?.cacheHitRatio || 0}%
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${systemHealth?.databaseMetrics?.cacheHitRatio || 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Alerts */}
        {systemHealth?.recentAlerts && systemHealth.recentAlerts.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              최근 알림
            </h2>
            <div className="space-y-3">
              {systemHealth.recentAlerts.map((alert, index) => {
                const AlertIcon = getStatusIcon(alert.type);
                return (
                  <div key={index} className="flex items-start space-x-3 p-3 border border-slate-200 dark:border-slate-700 rounded-lg">
                    <AlertIcon className={`w-5 h-5 mt-0.5 ${getStatusColor(alert.type)}`} />
                    <div className="flex-1">
                      <div className="font-medium text-slate-900 dark:text-white">
                        {alert.message}
                      </div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        {new Date(alert.timestamp).toLocaleString('ko-KR')}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Performance Trends */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            성능 동향
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                <span className="font-medium text-slate-900 dark:text-white">응답 시간</span>
              </div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {systemHealth?.performanceTrends?.responseTime || 0}ms
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                평균 응답 시간
              </div>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span className="font-medium text-slate-900 dark:text-white">처리량</span>
              </div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {systemHealth?.performanceTrends?.cpu?.reduce((a, b) => a + b, 0) || 0}
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                초당 요청 수
              </div>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <Activity className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <span className="font-medium text-slate-900 dark:text-white">오류율</span>
              </div>
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {systemHealth?.performanceTrends?.memory?.reduce((a, b) => a + b, 0) || 0}%
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                오류 발생률
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default SystemStatus;