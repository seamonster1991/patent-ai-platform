import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  BarChart3, 
  TrendingUp, 
  Search, 
  FileText,
  Users,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react';

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
  AreaChart,
  Area
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
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30d');
  const [selectedMetric, setSelectedMetric] = useState('searches');
  const [stats, setStats] = useState<UsageStats>({
    totalSearches: 12543,
    totalReports: 8921,
    activeUsers: 1234,
    avgSearchesPerUser: 10.2,
    topSearchTerms: [
      { term: '인공지능', count: 1234, percentage: 15.2 },
      { term: '특허 검색', count: 987, percentage: 12.1 },
      { term: '블록체인', count: 765, percentage: 9.4 },
      { term: '바이오', count: 543, percentage: 6.7 },
      { term: '반도체', count: 432, percentage: 5.3 }
    ],
    searchTrends: [
      { date: '2024-01-01', searches: 120, reports: 85, users: 45 },
      { date: '2024-01-02', searches: 135, reports: 92, users: 52 },
      { date: '2024-01-03', searches: 142, reports: 98, users: 48 },
      { date: '2024-01-04', searches: 158, reports: 105, users: 55 },
      { date: '2024-01-05', searches: 165, reports: 112, users: 58 },
      { date: '2024-01-06', searches: 178, reports: 125, users: 62 },
      { date: '2024-01-07', searches: 185, reports: 132, users: 65 }
    ],
    userActivity: [
      { hour: 0, searches: 12, reports: 8 },
      { hour: 1, searches: 8, reports: 5 },
      { hour: 2, searches: 5, reports: 3 },
      { hour: 3, searches: 3, reports: 2 },
      { hour: 4, searches: 2, reports: 1 },
      { hour: 5, searches: 5, reports: 3 },
      { hour: 6, searches: 15, reports: 10 },
      { hour: 7, searches: 25, reports: 18 },
      { hour: 8, searches: 45, reports: 32 },
      { hour: 9, searches: 65, reports: 45 },
      { hour: 10, searches: 85, reports: 58 },
      { hour: 11, searches: 95, reports: 65 },
      { hour: 12, searches: 75, reports: 52 },
      { hour: 13, searches: 88, reports: 60 },
      { hour: 14, searches: 92, reports: 63 },
      { hour: 15, searches: 98, reports: 68 },
      { hour: 16, searches: 85, reports: 58 },
      { hour: 17, searches: 72, reports: 48 },
      { hour: 18, searches: 55, reports: 35 },
      { hour: 19, searches: 42, reports: 28 },
      { hour: 20, searches: 35, reports: 22 },
      { hour: 21, searches: 28, reports: 18 },
      { hour: 22, searches: 22, reports: 15 },
      { hour: 23, searches: 18, reports: 12 }
    ],
    planUsage: [
      { plan: 'Basic', users: 450, searches: 2250, reports: 1125, percentage: 36.5 },
      { plan: 'Pro', users: 320, searches: 4800, reports: 3200, percentage: 25.9 },
      { plan: 'Enterprise', users: 180, searches: 5400, reports: 4320, percentage: 14.6 },
      { plan: 'Premium', users: 284, searches: 5680, reports: 4544, percentage: 23.0 }
    ]
  });

  useEffect(() => {
    fetchUsageStatistics();
  }, [dateRange]);

  const fetchUsageStatistics = async () => {
    try {
      setIsLoading(true);
      
      // Get the current session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.error('No access token available');
        return;
      }

      const response = await fetch(`/api/users/admin/usage-statistics?period=${dateRange}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          const data = result.data;
          
          // Update stats with real data
          setStats(prevStats => ({
            ...prevStats,
            totalSearches: data.totalSearches || 0,
            totalReports: data.totalReports || 0,
            activeUsers: data.activeUsers || 0,
            avgSearchesPerUser: data.activeUsers > 0 ? (data.totalSearches / data.activeUsers) : 0,
            topSearchTerms: data.topSearchTerms || prevStats.topSearchTerms,
            searchTrends: data.searchTrends || prevStats.searchTrends,
            userActivity: data.userActivity || prevStats.userActivity,
            planUsage: data.planUsage || prevStats.planUsage
          }));
        } else {
          console.error('Failed to fetch usage statistics:', result.error);
        }
      } else {
        console.error('Failed to fetch usage statistics:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Failed to fetch usage statistics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getChangeIcon = (value: number) => {
    if (value > 0) return <ArrowUpRight className="w-4 h-4" />;
    if (value < 0) return <ArrowDownRight className="w-4 h-4" />;
    return <Minus className="w-4 h-4" />;
  };

  const getChangeColor = (value: number) => {
    if (value > 0) return 'text-green-600 dark:text-green-400';
    if (value < 0) return 'text-red-600 dark:text-red-400';
    return 'text-slate-600 dark:text-slate-400';
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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
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
            className="px-4 py-2 border border-ms-line dark:border-dark-700 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-ms-olive focus:border-ms-olive"
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
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.searchTrends}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="date" 
                  className="text-xs"
                  tick={{ fontSize: 12 }}
                />
                <YAxis className="text-xs" tick={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="searches"
                  stackId="1"
                  stroke="#3B82F6"
                  fill="#3B82F6"
                  fillOpacity={0.6}
                />
                <Area
                  type="monotone"
                  dataKey="reports"
                  stackId="1"
                  stroke="#10B981"
                  fill="#10B981"
                  fillOpacity={0.6}
                />
              </AreaChart>
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
                  <div className="flex items-center justify-center w-8 h-8 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm font-medium text-blue-600 dark:text-blue-400">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">
                      {term.term}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {term.count.toLocaleString()}회
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {term.percentage}%
                  </p>
                  <div className="w-16 h-2 bg-slate-200 dark:bg-slate-700 rounded-full mt-1">
                    <div 
                      className="h-2 bg-blue-500 rounded-full"
                      style={{ width: `${term.percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Plan Usage */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                플랜별 사용량
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                구독 플랜별 사용 현황
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
                  dataKey="percentage"
                >
                  {stats.planUsage.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any) => [`${value}%`, '사용률']}
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            {stats.planUsage.map((plan, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: pieColors[index % pieColors.length] }}
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {plan.plan}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {plan.users}명
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm ms-line-frame">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            플랜별 상세 통계
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            각 플랜의 상세한 사용 현황
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-700">
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
                  평균 리포트/사용자
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
              {stats.planUsage.map((plan, index) => (
                <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div 
                        className="w-3 h-3 rounded-full mr-3"
                        style={{ backgroundColor: pieColors[index % pieColors.length] }}
                      />
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
                    {(plan.reports / plan.users).toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UsageStatistics;