import React, { useEffect, useState } from 'react';
import { 
  Users, 
  UserPlus, 
  FileText, 
  TrendingUp,
  Calendar,
  Activity,
  RefreshCw
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, AreaChart, Area } from 'recharts';
import AdminLayout from '../../components/Layout/AdminLayout';

interface UserActivityMetrics {
  dau: number;
  mau: number;
  dauGrowth: number;
  mauGrowth: number;
  newSignups: {
    daily: number;
    weekly: number;
    growth: number;
    trend: Array<{ date: string; signups: number }>;
  };
  totalReports: {
    count: number;
    growth: number;
    byType: Array<{ type: string; count: number; percentage: number }>;
  };
  activityTrend: Array<{ date: string; dau: number; mau: number }>;
}

const UserActivity: React.FC = () => {
  const [metrics, setMetrics] = useState<UserActivityMetrics>({
    dau: 892,
    mau: 3456,
    dauGrowth: 8.2,
    mauGrowth: 12.5,
    newSignups: {
      daily: 45,
      weekly: 312,
      growth: 18.9,
      trend: [
        { date: '12/14', signups: 38 },
        { date: '12/15', signups: 42 },
        { date: '12/16', signups: 35 },
        { date: '12/17', signups: 51 },
        { date: '12/18', signups: 47 },
        { date: '12/19', signups: 55 },
        { date: '12/20', signups: 44 }
      ]
    },
    totalReports: {
      count: 15634,
      growth: 15.3,
      byType: [
        { type: '시장 분석', count: 8920, percentage: 57.1 },
        { type: '비즈니스 인사이트', count: 6714, percentage: 42.9 }
      ]
    },
    activityTrend: [
      { date: '11/20', dau: 756, mau: 2890 },
      { date: '11/27', dau: 782, mau: 3012 },
      { date: '12/04', dau: 834, mau: 3156 },
      { date: '12/11', dau: 867, mau: 3298 },
      { date: '12/18', dau: 892, mau: 3456 }
    ]
  });
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    const fetchUserActivityMetrics = async () => {
      try {
        // TODO: Implement actual API calls to fetch user activity metrics
        // For now, using mock data
        setTimeout(() => {
          setIsLoading(false);
          setLastUpdated(new Date());
        }, 1000);
      } catch (error) {
        console.error('Error fetching user activity metrics:', error);
        setIsLoading(false);
      }
    };

    fetchUserActivityMetrics();
    
    // Auto-refresh every 10 minutes
    const interval = setInterval(fetchUserActivityMetrics, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const refreshData = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setLastUpdated(new Date());
    }, 1000);
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
              사용자 활동 및 성과 지표
            </h2>
            <p className="mt-1 text-sm text-gray-400">
              사용자 참여도, 가입 현황 및 서비스 이용 통계
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

        {/* Core KPI Cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {/* DAU */}
          <div className="bg-gray-800 overflow-hidden shadow-lg rounded-lg border border-gray-700">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="p-3 rounded-lg bg-blue-500 text-blue-100">
                    <Activity className="h-6 w-6" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-400 truncate">
                      일간 활성 사용자 (DAU)
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-white">
                        {metrics.dau.toLocaleString()}
                      </div>
                      <div className="ml-2 flex items-baseline text-sm font-semibold text-green-400">
                        <TrendingUp className="h-4 w-4 mr-1" />
                        +{metrics.dauGrowth}%
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* MAU */}
          <div className="bg-gray-800 overflow-hidden shadow-lg rounded-lg border border-gray-700">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="p-3 rounded-lg bg-green-500 text-green-100">
                    <Users className="h-6 w-6" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-400 truncate">
                      월간 활성 사용자 (MAU)
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-white">
                        {metrics.mau.toLocaleString()}
                      </div>
                      <div className="ml-2 flex items-baseline text-sm font-semibold text-green-400">
                        <TrendingUp className="h-4 w-4 mr-1" />
                        +{metrics.mauGrowth}%
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* New Signups */}
          <div className="bg-gray-800 overflow-hidden shadow-lg rounded-lg border border-gray-700">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="p-3 rounded-lg bg-purple-500 text-purple-100">
                    <UserPlus className="h-6 w-6" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-400 truncate">
                      신규 가입자 (일간)
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-white">
                        {metrics.newSignups.daily}
                      </div>
                      <div className="ml-2 flex items-baseline text-sm font-semibold text-green-400">
                        <TrendingUp className="h-4 w-4 mr-1" />
                        +{metrics.newSignups.growth}%
                      </div>
                    </dd>
                    <dd className="text-sm text-gray-400 mt-1">
                      주간: {metrics.newSignups.weekly}명
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Total Reports */}
          <div className="bg-gray-800 overflow-hidden shadow-lg rounded-lg border border-gray-700">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="p-3 rounded-lg bg-yellow-500 text-yellow-100">
                    <FileText className="h-6 w-6" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-400 truncate">
                      총 리포트 생성
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-white">
                        {metrics.totalReports.count.toLocaleString()}
                      </div>
                      <div className="ml-2 flex items-baseline text-sm font-semibold text-green-400">
                        <TrendingUp className="h-4 w-4 mr-1" />
                        +{metrics.totalReports.growth}%
                      </div>
                    </dd>
                    <dd className="text-sm text-gray-400 mt-1">
                      누적 생성 건수
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User Activity Trend */}
          <div className="bg-gray-800 shadow-lg rounded-lg border border-gray-700">
            <div className="px-6 py-4 border-b border-gray-700">
              <h3 className="text-lg font-medium text-white">사용자 활동 추이</h3>
              <p className="text-sm text-gray-400">DAU/MAU 변화 추이 (최근 5주)</p>
            </div>
            <div className="p-6">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={metrics.activityTrend}>
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
                  <Area 
                    type="monotone" 
                    dataKey="mau" 
                    stackId="1"
                    stroke="#10B981" 
                    fill="#10B981"
                    fillOpacity={0.3}
                    name="MAU"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="dau" 
                    stackId="2"
                    stroke="#3B82F6" 
                    fill="#3B82F6"
                    fillOpacity={0.6}
                    name="DAU"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* New Signups Trend */}
          <div className="bg-gray-800 shadow-lg rounded-lg border border-gray-700">
            <div className="px-6 py-4 border-b border-gray-700">
              <h3 className="text-lg font-medium text-white">신규 가입자 추이</h3>
              <p className="text-sm text-gray-400">최근 7일간 일별 신규 가입자 수</p>
            </div>
            <div className="p-6">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={metrics.newSignups.trend}>
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
                  <Bar 
                    dataKey="signups" 
                    fill="#8B5CF6"
                    radius={[4, 4, 0, 0]}
                    name="신규 가입자"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Report Statistics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Report Type Distribution */}
          <div className="bg-gray-800 shadow-lg rounded-lg border border-gray-700">
            <div className="px-6 py-4 border-b border-gray-700">
              <h3 className="text-lg font-medium text-white">리포트 유형별 분포</h3>
              <p className="text-sm text-gray-400">생성된 리포트의 유형별 통계</p>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {metrics.totalReports.byType.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-4 h-4 rounded ${index === 0 ? 'bg-blue-500' : 'bg-purple-500'}`}></div>
                      <span className="text-white font-medium">{item.type}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-white font-semibold">{item.count.toLocaleString()}</div>
                      <div className="text-sm text-gray-400">{item.percentage}%</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6">
                <div className="flex rounded-full overflow-hidden h-3">
                  <div 
                    className="bg-blue-500" 
                    style={{ width: `${metrics.totalReports.byType[0].percentage}%` }}
                  ></div>
                  <div 
                    className="bg-purple-500" 
                    style={{ width: `${metrics.totalReports.byType[1].percentage}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Key Metrics Summary */}
          <div className="bg-gray-800 shadow-lg rounded-lg border border-gray-700">
            <div className="px-6 py-4 border-b border-gray-700">
              <h3 className="text-lg font-medium text-white">핵심 지표 요약</h3>
              <p className="text-sm text-gray-400">주요 성과 지표 현황</p>
            </div>
            <div className="p-6">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-400">사용자 참여율</div>
                    <div className="text-2xl font-bold text-white">
                      {((metrics.dau / metrics.mau) * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-400">DAU/MAU 비율</div>
                    <div className="text-green-400 text-sm font-medium">
                      +2.3% vs 지난달
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-400">일평균 리포트 생성</div>
                    <div className="text-2xl font-bold text-white">
                      {Math.round(metrics.totalReports.count / 30)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-400">월간 추정치</div>
                    <div className="text-green-400 text-sm font-medium">
                      +{metrics.totalReports.growth}% 성장
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-400">사용자당 리포트</div>
                    <div className="text-2xl font-bold text-white">
                      {(metrics.totalReports.count / metrics.mau).toFixed(1)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-400">평균 생성 수</div>
                    <div className="text-blue-400 text-sm font-medium">
                      MAU 기준
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default UserActivity;