/**
 * 시스템 모니터링 페이지
 * 서버 상태, 성능 메트릭, 로그 모니터링
 */

import React, { useEffect, useState } from 'react';
import AdminLayout from '../components/Admin/AdminLayout';
import { Card } from '../components/UI/Card';
import { LoadingSpinner } from '../components/UI/LoadingSpinner';
import { adminApiService, SystemMetrics } from '../services/adminApi';
import { 
  CpuChipIcon,
  ServerIcon,
  CircleStackIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  ChartBarIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

interface LogEntry {
  id: string;
  level: 'info' | 'warning' | 'error' | 'debug';
  message: string;
  timestamp: string;
  source: string;
}

interface AlertRule {
  id: string;
  name: string;
  metric: string;
  threshold: number;
  condition: 'greater_than' | 'less_than';
  enabled: boolean;
}

const SystemMonitoring: React.FC = () => {
  const [metrics, setMetrics] = useState<SystemMetrics[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [alerts, setAlerts] = useState<AlertRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLogsLoading, setIsLogsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30); // seconds
  
  // 로그 필터
  const [logLevel, setLogLevel] = useState<string>('all');
  const [logSource, setLogSource] = useState<string>('all');
  const [logSearch, setLogSearch] = useState<string>('');

  // 시스템 메트릭 조회
  const fetchMetrics = async () => {
    try {
      const response = await adminApiService.getSystemMetrics();
      setMetrics(response);
      setError(null);
    } catch (error: any) {
      setError(error.response?.data?.detail || '시스템 메트릭을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 시스템 로그 조회
  const fetchLogs = async () => {
    setIsLogsLoading(true);
    try {
      const params = {
        level: logLevel !== 'all' ? logLevel : undefined,
        source: logSource !== 'all' ? logSource : undefined,
        search: logSearch || undefined,
        limit: 100
      };
      
      const response = await adminApiService.getSystemLogs(params);
      setLogs(response.logs);
    } catch (error: any) {
      console.error('로그 조회 실패:', error);
    } finally {
      setIsLogsLoading(false);
    }
  };

  // 알림 규칙 조회
  const fetchAlerts = async () => {
    try {
      const response = await adminApiService.getAlertRules();
      setAlerts(response.rules);
    } catch (error: any) {
      console.error('알림 규칙 조회 실패:', error);
    }
  };

  useEffect(() => {
    fetchMetrics();
    fetchLogs();
    fetchAlerts();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [logLevel, logSource, logSearch]);

  // 자동 새로고침
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchMetrics();
      fetchLogs();
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  // 상태 색상 결정
  const getStatusColor = (value: number, warning: number, critical: number) => {
    if (value >= critical) return 'text-red-600';
    if (value >= warning) return 'text-yellow-600';
    return 'text-green-600';
  };

  // 상태 배지 색상
  const getStatusBadgeColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'healthy':
      case 'online':
        return 'bg-green-100 text-green-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'critical':
      case 'offline':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // 로그 레벨 색상
  const getLogLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'error':
        return 'text-red-600 bg-red-50';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50';
      case 'info':
        return 'text-blue-600 bg-blue-50';
      case 'debug':
        return 'text-gray-600 bg-gray-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  // 날짜 포맷팅
  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date(dateString));
  };

  // 바이트 포맷팅
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 업타임 포맷팅
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

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* 헤더 */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">시스템 모니터링</h1>
            <p className="text-gray-600">실시간 시스템 상태 및 성능 모니터링</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-700">자동 새로고침</label>
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                disabled={!autoRefresh}
                className="text-sm border border-gray-300 rounded-md px-2 py-1 disabled:opacity-50"
              >
                <option value={10}>10초</option>
                <option value={30}>30초</option>
                <option value={60}>1분</option>
                <option value={300}>5분</option>
              </select>
            </div>
            
            <button
              onClick={() => {
                fetchMetrics();
                fetchLogs();
                fetchAlerts();
              }}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <ArrowPathIcon className="h-5 w-5 mr-2" />
              새로고침
            </button>
          </div>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">오류</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="mt-2 text-sm text-red-600 hover:text-red-500"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 시스템 상태 개요 */}
        {isLoading ? (
          <Card className="p-6">
            <div className="flex justify-center">
              <LoadingSpinner size="lg" />
            </div>
          </Card>
        ) : metrics.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* CPU 사용률 */}
            <Card className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CpuChipIcon className="h-8 w-8 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">CPU 사용률</p>
                  <p className={`text-2xl font-bold ${getStatusColor(metrics[0].cpu_usage, 70, 90)}`}>
                    {(metrics[0].cpu_usage || 0).toFixed(1)}%
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      metrics[0].cpu_usage >= 90 ? 'bg-red-500' :
                      metrics[0].cpu_usage >= 70 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${metrics[0].cpu_usage}%` }}
                  ></div>
                </div>
              </div>
            </Card>

            {/* 메모리 사용률 */}
            <Card className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ServerIcon className="h-8 w-8 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">메모리 사용률</p>
                  <p className={`text-2xl font-bold ${getStatusColor(metrics[0].memory_usage, 80, 95)}`}>
                    {(metrics[0].memory_usage || 0).toFixed(1)}%
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      metrics[0].memory_usage >= 95 ? 'bg-red-500' :
                      metrics[0].memory_usage >= 80 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${metrics[0].memory_usage}%` }}
                  ></div>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {formatBytes(metrics[0].memory_used)} / {formatBytes(metrics[0].memory_total)}
              </p>
            </Card>

            {/* 디스크 사용률 */}
            <Card className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CircleStackIcon className="h-8 w-8 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">디스크 사용률</p>
                  <p className={`text-2xl font-bold ${getStatusColor(metrics[0].disk_usage, 85, 95)}`}>
                    {(metrics[0].disk_usage || 0).toFixed(1)}%
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      metrics[0].disk_usage >= 95 ? 'bg-red-500' :
                      metrics[0].disk_usage >= 85 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${metrics[0].disk_usage}%` }}
                  ></div>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {formatBytes(metrics[0].disk_used)} / {formatBytes(metrics[0].disk_total)}
              </p>
            </Card>

            {/* 시스템 업타임 */}
            <Card className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ClockIcon className="h-8 w-8 text-indigo-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">시스템 업타임</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatUptime(metrics[0].uptime)}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* 성능 메트릭 */}
        {metrics.length > 0 && (
          <Card className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">성능 메트릭</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <p className="text-sm text-gray-500">활성 연결</p>
                <span className="text-sm font-medium text-gray-900">{metrics[0].active_connections}</span>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500">초당 요청</p>
                <span className="text-sm font-medium text-gray-900">{metrics[0].requests_per_second}</span>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500">평균 응답시간</p>
                <span className="text-sm font-medium text-gray-900">{metrics[0].avg_response_time}ms</span>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500">에러율</p>
                <span className={`text-sm font-medium ${getStatusColor(metrics[0].error_rate, 5, 10)}`}>
                  {(metrics[0].error_rate || 0).toFixed(2)}%
                </span>
              </div>
            </div>
          </Card>
        )}

        {/* 데이터베이스 상태 */}
        {metrics.length > 0 && (
          <Card className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">데이터베이스 상태</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <p className="text-sm text-gray-500">상태</p>
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor(metrics[0].db_status)}`}>
                  {metrics[0].db_status}
                </span>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500">활성 연결</p>
                <span className="text-sm font-medium text-gray-900">{metrics[0].db_connections}</span>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500">평균 쿼리 시간</p>
                <span className="text-sm font-medium text-gray-900">{metrics[0].db_query_time}ms</span>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500">데이터베이스 크기</p>
                <span className="text-sm font-medium text-gray-900">{formatBytes(metrics[0].db_size)}</span>
              </div>
            </div>
          </Card>
        )}

        {/* 시스템 로그 */}
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">시스템 로그</h3>
            
            <div className="flex items-center space-x-4">
              {/* 로그 레벨 필터 */}
              <select
                value={logLevel}
                onChange={(e) => setLogLevel(e.target.value)}
                className="text-sm border border-gray-300 rounded-md px-3 py-1"
              >
                <option value="all">모든 레벨</option>
                <option value="error">에러</option>
                <option value="warning">경고</option>
                <option value="info">정보</option>
                <option value="debug">디버그</option>
              </select>

              {/* 소스 필터 */}
              <select
                value={logSource}
                onChange={(e) => setLogSource(e.target.value)}
                className="text-sm border border-gray-300 rounded-md px-3 py-1"
              >
                <option value="all">모든 소스</option>
                <option value="api">API</option>
                <option value="auth">인증</option>
                <option value="database">데이터베이스</option>
                <option value="system">시스템</option>
              </select>

              {/* 검색 */}
              <input
                type="text"
                placeholder="로그 검색..."
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                className="text-sm border border-gray-300 rounded-md px-3 py-1 w-48"
              />
            </div>
          </div>

          {isLogsLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="sm" />
            </div>
          ) : logs.length > 0 ? (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {logs.map((log) => (
                <div key={log.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-md">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getLogLevelColor(log.level)}`}>
                    {log.level.toUpperCase()}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">{log.message}</p>
                    <div className="flex items-center space-x-4 mt-1">
                      <span className="text-xs text-gray-500">{formatDate(log.timestamp)}</span>
                      <span className="text-xs text-gray-500">{log.source}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">조건에 맞는 로그가 없습니다.</p>
            </div>
          )}
        </Card>

        {/* 알림 규칙 */}
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">알림 규칙</h3>
            <button className="text-sm text-blue-600 hover:text-blue-800">
              새 규칙 추가
            </button>
          </div>

          {alerts.length > 0 ? (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${alert.enabled ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{alert.name}</p>
                      <p className="text-xs text-gray-500">
                        {alert.metric} {alert.condition === 'greater_than' ? '>' : '<'} {alert.threshold}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      alert.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {alert.enabled ? '활성' : '비활성'}
                    </span>
                    <button className="text-sm text-blue-600 hover:text-blue-800">편집</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <ExclamationTriangleIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">설정된 알림 규칙이 없습니다.</p>
            </div>
          )}
        </Card>
      </div>
    </AdminLayout>
  );
};

export default SystemMonitoring;