import React, { useEffect, useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Search, 
  FileText,
  Users,
  Calendar,
  Download,
  Filter,
  RefreshCw,
  Clock,
  Activity,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react';
import AdminLayout from '../../components/Layout/AdminLayout';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
  ComposedChart
} from 'recharts';

interface UsageStats {
  totalSearches: number;
  totalReports: number;
  activeUsers: number;
  avgSearchesPerUser: number;
  topSearchTerms: Array<{
    term: string;
    count: number;
    percentage: number;
  }>;
  searchTrends: Array<{
    date: string;
    searches: number;
    reports: number;
    users: number;
  }>;
  userActivity: Array<{
    hour: number;
    searches: number;
    reports: number;
  }>;
  planUsage: Array<{
    plan: string;
    users: number;
    searches: number;
    reports: number;
    percentage: number;
  }>;
}

const UsageStatistics: React.FC = () => {
  const [stats, setStats] = useState<UsageStats>({
    totalSearches: 0,
    totalReports: 0,
    activeUsers: 0,
    avgSearchesPerUser: 0,
    topSearchTerms: [],
    searchTrends: [],
    userActivity: [],
    planUsage: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState('7d');
  const [selectedMetric, setSelectedMetric] = useState('searches');

  useEffect(() => {
    const fetchUsageStats = async () => {
      try {
        const response = await fetch(`/api/admin/usage-stats?range=${dateRange}`);
        const result = await response.json();
        
        if (result.success) {
          setStats(result.data);
        } else {
          console.error('Failed to fetch usage stats:', result.error);
          // 데모 데이터 사용
          const mockStats: UsageStats = {
            totalSearches: 12890,
            totalReports: 3456,
            activeUsers: 892,
            avgSearchesPerUser: 14.4,
            topSearchTerms: [
              { term: '인공지능', count: 1245, percentage: 9.7 },
              { term: '블록체인', count: 987, percentage: 7.7 },
              { term: '자율주행', count: 856, percentage: 6.6 },
              { term: '바이오', count: 743, percentage: 5.8 },
              { term: '5G', count: 632, percentage: 4.9 }
            ],
            searchTrends: Array.from({ length: 30 }, (_, i) => {
              const date = new Date();
              date.setDate(date.getDate() - (29 - i));
              return {
                date: date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }),
                searches: Math.floor(Math.random() * 200) + 100,
                reports: Math.floor(Math.random() * 50) + 20,
                users: Math.floor(Math.random() * 100) + 50
              };
            }),
            userActivity: Array.from({ length: 24 }, (_, i) => ({
              hour: i,
              searches: Math.floor(Math.random() * 100) + 20,
              reports: Math.floor(Math.random() * 30) + 5
            })),
            planUsage: [
              { plan: '무료', users: 450, searches: 2890, reports: 567, percentage: 50.4 },
              { plan: '베이직', users: 302, searches: 4567, reports: 1234, percentage: 33.8 },
              { plan: '프리미엄', users: 98, searches: 3456, reports: 1123, percentage: 11.0 },
              { plan: '엔터프라이즈', users: 42, searches: 1977, reports: 532, percentage: 4.7 }
            ]
          };
          setStats(mockStats);
        }
      } catch (error) {
        console.error('Error fetching usage stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsageStats();
  }, [dateRange]);

  const getChangeIcon = (value: number) => {
    if (value > 0) return <ArrowUpRight className="w-4 h-4 text-green-500" />;
    if (value < 0) return <ArrowDownRight className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  const getChangeColor = (value: number) => {
    if (value > 0) return 'text-green-600 dark:text-green-400';
    if (value < 0) return 'text-red-600 dark:text-red-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  const statCards = [
    {
      title: '총 검색 수',
      value: stats.totalSearches.toLocaleString(),
      icon: Search,
      change: '+12.5%',
      changeValue: 12.5,
      description: '지난 주 대비'
    },
    {
      title: '생성된 리포트',
      value: stats.totalReports.toLocaleString(),
      icon: FileText,
      change: '+8.3%',
      changeValue: 8.3,
      description: '지난 주 대비'
    },
    {
      title: '활성 사용자',
      value: stats.activeUsers.toLocaleString(),
      icon: Users,
      change: '+5.7%',
      changeValue: 5.7,
      description: '지난 주 대비'
    },
    {
      title: '평균 검색/사용자',
      value: stats.avgSearchesPerUser.toFixed(1),
      icon: BarChart3,
      change: '+2.1%',
      changeValue: 2.1,
      description: '지난 주 대비'
    }
  ];

  const pieColors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              사용 통계
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              시스템 사용 현황과 트렌드를 분석하세요
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex space-x-3">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="7d">최근 7일</option>
              <option value="30d">최근 30일</option>
              <option value="90d">최근 90일</option>
              <option value="1y">최근 1년</option>
            </select>
            <button className="inline-flex items-center px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700">
              <Download className="w-4 h-4 mr-2" />
              리포트 다운로드
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={index}
                className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <Icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                        {stat.title}
                      </p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">
                        {stat.value}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <div className={`flex items-center space-x-1 ${getChangeColor(stat.changeValue)}`}>
                    {getChangeIcon(stat.changeValue)}
                    <span className="text-sm font-medium">{stat.change}</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {stat.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Search Trends */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  사용 트렌드
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  시간별 검색 및 리포트 생성 현황
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <select
                  value={selectedMetric}
                  onChange={(e) => setSelectedMetric(e.target.value)}
                  className="px-3 py-1 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
                >
                  <option value="searches">검색</option>
                  <option value="reports">리포트</option>
                  <option value="users">사용자</option>
                </select>
                <div className="flex items-center space-x-4 text-xs">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-slate-600 dark:text-slate-400">검색</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-slate-600 dark:text-slate-400">리포트</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                    <span className="text-slate-600 dark:text-slate-400">사용자</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={stats.searchTrends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#64748b"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="#64748b"
                    fontSize={12}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#f1f5f9'
                    }}
                  />
                  <Bar dataKey="searches" fill="#3b82f6" name="검색" />
                  <Line 
                    type="monotone" 
                    dataKey="reports" 
                    stroke="#10b981" 
                    strokeWidth={3}
                    name="리포트"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="users" 
                    stroke="#8b5cf6" 
                    strokeWidth={3}
                    name="사용자"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Search Terms */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  인기 검색어
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  가장 많이 검색된 키워드
                </p>
              </div>
            </div>
            <div className="space-y-4">
              {stats.topSearchTerms.map((term, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-8 h-8 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                        {index + 1}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">
                        {term.term}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {term.count.toLocaleString()}회 검색
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-20 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${term.percentage * 10}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      {term.percentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Plan Usage Distribution */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  플랜별 사용 현황
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  구독 플랜별 활동 분포
                </p>
              </div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.planUsage}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="users"
                  >
                    {stats.planUsage.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#f1f5f9'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {stats.planUsage.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: pieColors[index % pieColors.length] }}
                    ></div>
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      {item.plan}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium text-slate-900 dark:text-white">
                      {item.users}명
                    </span>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {item.percentage}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Hourly Activity */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                시간대별 활동
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                24시간 사용자 활동 패턴
              </p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.userActivity}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  dataKey="hour" 
                  stroke="#64748b"
                  fontSize={12}
                  tickFormatter={(value) => `${value}시`}
                />
                <YAxis 
                  stroke="#64748b"
                  fontSize={12}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#f1f5f9'
                  }}
                  labelFormatter={(value) => `${value}시`}
                />
                <Area
                  type="monotone"
                  dataKey="searches"
                  stackId="1"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.6}
                  name="검색"
                />
                <Area
                  type="monotone"
                  dataKey="reports"
                  stackId="1"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.6}
                  name="리포트"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Detailed Statistics Table */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  플랜별 상세 통계
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  구독 플랜별 사용량 및 활동 현황
                </p>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
              <thead className="bg-slate-50 dark:bg-slate-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    플랜
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    사용자 수
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    총 검색
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    총 리포트
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    평균 검색/사용자
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    평균 리포트/사용자
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                {stats.planUsage.map((plan, index) => (
                  <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: pieColors[index % pieColors.length] }}
                        ></div>
                        <span className="text-sm font-medium text-slate-900 dark:text-white">
                          {plan.plan}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-white">
                      {plan.users.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-white">
                      {plan.searches.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-white">
                      {plan.reports.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-white">
                      {(plan.searches / plan.users).toFixed(1)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-white">
                      {(plan.reports / plan.users).toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default UsageStatistics;