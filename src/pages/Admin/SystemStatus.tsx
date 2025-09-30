import React, { useEffect, useState } from 'react';
import { 
  Activity, 
  Clock, 
  AlertTriangle, 
  DollarSign,
  TrendingUp,
  TrendingDown,
  Zap,
  Server,
  RefreshCw
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import AdminLayout from '../../components/Layout/AdminLayout';

interface SystemMetrics {
  geminiTokenUsage: {
    daily: number;
    weekly: number;
    cost: number;
    growthRate: number;
  };
  kiprisApiCalls: {
    weekly: number;
    growthRate: number;
    trend: Array<{ date: string; calls: number }>;
  };
  apiLatency: {
    kipris: number;
    gemini: number;
    average: number;
  };
  errorRate: {
    percentage: number;
    last24h: number;
    trend: Array<{ hour: string; errors: number }>;
  };
}

const SystemStatus: React.FC = () => {
  const [metrics, setMetrics] = useState<SystemMetrics>({
    geminiTokenUsage: {
      daily: 125000,
      weekly: 850000,
      cost: 42.5,
      growthRate: 15.3
    },
    kiprisApiCalls: {
      weekly: 12450,
      growthRate: 8.7,
      trend: [
        { date: '12/14', calls: 1800 },
        { date: '12/15', calls: 1950 },
        { date: '12/16', calls: 1750 },
        { date: '12/17', calls: 2100 },
        { date: '12/18', calls: 1900 },
        { date: '12/19', calls: 2200 },
        { date: '12/20', calls: 1750 }
      ]
    },
    apiLatency: {
      kipris: 1.2,
      gemini: 0.8,
      average: 1.0
    },
    errorRate: {
      percentage: 2.3,
      last24h: 15,
      trend: [
        { hour: '00:00', errors: 2 },
        { hour: '04:00', errors: 1 },
        { hour: '08:00', errors: 3 },
        { hour: '12:00', errors: 4 },
        { hour: '16:00', errors: 2 },
        { hour: '20:00', errors: 3 }
      ]
    }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    const fetchSystemMetrics = async () => {
      try {
        // TODO: Implement actual API calls to fetch system metrics
        // For now, using mock data
        setTimeout(() => {
          setIsLoading(false);
          setLastUpdated(new Date());
        }, 1000);
      } catch (error) {
        console.error('Error fetching system metrics:', error);
        setIsLoading(false);
      }
    };

    fetchSystemMetrics();
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchSystemMetrics, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const refreshData = () => {
    setIsLoading(true);
    // Simulate data refresh
    setTimeout(() => {
      setIsLoading(false);
      setLastUpdated(new Date());
    }, 1000);
  };

  const getStatusColor = (value: number, threshold: number, inverse = false) => {
    if (inverse) {
      return value <= threshold ? 'text-green-400' : 'text-red-400';
    }
    return value >= threshold ? 'text-green-400' : 'text-red-400';
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="md:flex md:items-center md:justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold leading-7 text-white sm:text-3xl sm:truncate">
              시스템 상태 및 비용 관리
            </h2>
            <p className="mt-1 text-sm text-gray-400">
              API 비용, 시스템 성능 및 안정성 모니터링
            </p>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4 space-x-3">
            <div className="text-sm text-gray-400">
              마지막 업데이트: {lastUpdated.toLocaleString('ko-KR')}
            </div>
            <button
              onClick={refreshData}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span>새로고침</span>
            </button>
          </div>
        </div>

        {/* API Cost Monitoring */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {/* Gemini Token Usage */}
          <div className="bg-gray-800 overflow-hidden shadow-lg rounded-lg border border-gray-700">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="p-3 rounded-lg bg-purple-500 text-purple-100">
                    <Zap className="h-6 w-6" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-400 truncate">
                      Gemini 토큰 (일간)
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-white">
                        {metrics.geminiTokenUsage.daily.toLocaleString()}
                      </div>
                      <div className="ml-2 flex items-baseline text-sm font-semibold text-green-400">
                        <TrendingUp className="h-4 w-4 mr-1" />
                        +{metrics.geminiTokenUsage.growthRate}%
                      </div>
                    </dd>
                    <dd className="text-sm text-gray-400 mt-1">
                      주간: {metrics.geminiTokenUsage.weekly.toLocaleString()}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Token Cost */}
          <div className="bg-gray-800 overflow-hidden shadow-lg rounded-lg border border-gray-700">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="p-3 rounded-lg bg-yellow-500 text-yellow-100">
                    <DollarSign className="h-6 w-6" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-400 truncate">
                      추정 비용 (일간)
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-white">
                        ${metrics.geminiTokenUsage.cost}
                      </div>
                      <div className="ml-2 flex items-baseline text-sm font-semibold text-green-400">
                        <TrendingUp className="h-4 w-4 mr-1" />
                        +{metrics.geminiTokenUsage.growthRate}%
                      </div>
                    </dd>
                    <dd className="text-sm text-gray-400 mt-1">
                      월간 예상: ${(metrics.geminiTokenUsage.cost * 30).toFixed(2)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* KIPRIS API Calls */}
          <div className="bg-gray-800 overflow-hidden shadow-lg rounded-lg border border-gray-700">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="p-3 rounded-lg bg-blue-500 text-blue-100">
                    <Server className="h-6 w-6" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-400 truncate">
                      KIPRIS API 호출 (주간)
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-white">
                        {metrics.kiprisApiCalls.weekly.toLocaleString()}
                      </div>
                      <div className="ml-2 flex items-baseline text-sm font-semibold text-green-400">
                        <TrendingUp className="h-4 w-4 mr-1" />
                        +{metrics.kiprisApiCalls.growthRate}%
                      </div>
                    </dd>
                    <dd className="text-sm text-gray-400 mt-1">
                      일평균: {Math.round(metrics.kiprisApiCalls.weekly / 7).toLocaleString()}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Average Latency */}
          <div className="bg-gray-800 overflow-hidden shadow-lg rounded-lg border border-gray-700">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="p-3 rounded-lg bg-green-500 text-green-100">
                    <Clock className="h-6 w-6" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-400 truncate">
                      평균 응답시간
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-white">
                        {metrics.apiLatency.average}초
                      </div>
                      <div className={`ml-2 flex items-baseline text-sm font-semibold ${getStatusColor(metrics.apiLatency.average, 2, true)}`}>
                        {metrics.apiLatency.average <= 2 ? (
                          <TrendingDown className="h-4 w-4 mr-1" />
                        ) : (
                          <TrendingUp className="h-4 w-4 mr-1" />
                        )}
                        양호
                      </div>
                    </dd>
                    <dd className="text-sm text-gray-400 mt-1">
                      KIPRIS: {metrics.apiLatency.kipris}초 | Gemini: {metrics.apiLatency.gemini}초
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* KIPRIS API Calls Trend */}
          <div className="bg-gray-800 shadow-lg rounded-lg border border-gray-700">
            <div className="px-6 py-4 border-b border-gray-700">
              <h3 className="text-lg font-medium text-white">KIPRIS API 호출 추이</h3>
              <p className="text-sm text-gray-400">최근 7일간 일별 API 호출 현황</p>
            </div>
            <div className="p-6">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={metrics.kiprisApiCalls.trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#F9FAFB'
                    }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="calls" 
                    stroke="#3B82F6" 
                    strokeWidth={2}
                    dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Error Rate Trend */}
          <div className="bg-gray-800 shadow-lg rounded-lg border border-gray-700">
            <div className="px-6 py-4 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-white">오류율 모니터링</h3>
                  <p className="text-sm text-gray-400">최근 24시간 오류 발생 현황</p>
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-bold ${getStatusColor(metrics.errorRate.percentage, 5, true)}`}>
                    {metrics.errorRate.percentage}%
                  </div>
                  <div className="text-sm text-gray-400">
                    총 {metrics.errorRate.last24h}건
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={metrics.errorRate.trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="hour" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#F9FAFB'
                    }} 
                  />
                  <Bar 
                    dataKey="errors" 
                    fill="#EF4444"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* System Health Status */}
        <div className="bg-gray-800 shadow-lg rounded-lg border border-gray-700">
          <div className="px-6 py-4 border-b border-gray-700">
            <h3 className="text-lg font-medium text-white">시스템 건전성 상태</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-green-500 rounded-full">
                  <Activity className="h-8 w-8 text-white" />
                </div>
                <h4 className="text-lg font-medium text-white mb-2">API 서비스</h4>
                <div className="text-green-400 font-semibold">정상 운영</div>
                <div className="text-sm text-gray-400 mt-1">99.9% 가동률</div>
              </div>
              
              <div className="text-center">
                <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-yellow-500 rounded-full">
                  <Clock className="h-8 w-8 text-white" />
                </div>
                <h4 className="text-lg font-medium text-white mb-2">응답 성능</h4>
                <div className="text-yellow-400 font-semibold">주의 필요</div>
                <div className="text-sm text-gray-400 mt-1">평균 {metrics.apiLatency.average}초</div>
              </div>
              
              <div className="text-center">
                <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-red-500 rounded-full">
                  <AlertTriangle className="h-8 w-8 text-white" />
                </div>
                <h4 className="text-lg font-medium text-white mb-2">오류 발생</h4>
                <div className="text-red-400 font-semibold">{metrics.errorRate.percentage}% 오류율</div>
                <div className="text-sm text-gray-400 mt-1">24시간 {metrics.errorRate.last24h}건</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default SystemStatus;