import React, { useEffect, useState } from 'react';
import { 
  Users, 
  FileText, 
  TrendingUp, 
  Activity,
  AlertTriangle,
  Clock,
  BarChart3,
  Search,
  Eye,
  Download,
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
  AreaChart
} from 'recharts';

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalReports: number;
  totalSearches: number;
  newSignups: number;
  monthlyActivity: number;
  recentUsers: Array<{
    id: string;
    email: string;
    name?: string;
    subscription_plan: string;
    created_at: string;
  }>;
}

interface ActivityData {
  date: string;
  searches: number;
  reports: number;
  users: number;
}

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalReports: 0,
    totalSearches: 0,
    newSignups: 0,
    monthlyActivity: 0,
    recentUsers: []
  });
  const [activityData, setActivityData] = useState<ActivityData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        const response = await fetch('/api/users/admin/stats');
        const result = await response.json();
        
        if (result.success) {
          setStats(result.data);
        } else {
          console.error('Failed to fetch admin stats:', result.error);
          // 데모 데이터 사용
          setStats({
            totalUsers: 1247,
            activeUsers: 892,
            totalReports: 3456,
            totalSearches: 12890,
            newSignups: 45,
            monthlyActivity: 78,
            recentUsers: [
              {
                id: '1',
                email: 'user1@example.com',
                name: '김철수',
                subscription_plan: 'premium',
                created_at: new Date().toISOString()
              },
              {
                id: '2',
                email: 'user2@example.com',
                name: '이영희',
                subscription_plan: 'basic',
                created_at: new Date().toISOString()
              }
            ]
          });
        }

        // 활동 데이터 생성 (데모)
        const mockActivityData = Array.from({ length: 7 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (6 - i));
          return {
            date: date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }),
            searches: Math.floor(Math.random() * 200) + 100,
            reports: Math.floor(Math.random() * 50) + 20,
            users: Math.floor(Math.random() * 100) + 50
          };
        });
        setActivityData(mockActivityData);

      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardStats();
  }, []);

  const statCards = [
    {
      title: '총 사용자',
      value: stats.totalUsers.toLocaleString(),
      icon: Users,
      change: '+12%',
      changeType: 'positive',
      description: '지난 달 대비'
    },
    {
      title: '활성 사용자',
      value: stats.activeUsers.toLocaleString(),
      icon: Activity,
      change: '+8%',
      changeType: 'positive',
      description: '이번 주 활성 사용자'
    },
    {
      title: '총 검색',
      value: stats.totalSearches.toLocaleString(),
      icon: Search,
      change: '+24%',
      changeType: 'positive',
      description: '누적 검색 횟수'
    },
    {
      title: '생성된 리포트',
      value: stats.totalReports.toLocaleString(),
      icon: FileText,
      change: '+15%',
      changeType: 'positive',
      description: '총 분석 리포트'
    }
  ];

  const pieData = [
    { name: '프리미엄', value: 35, color: '#3B82F6' },
    { name: '베이직', value: 45, color: '#10B981' },
    { name: '무료', value: 20, color: '#F59E0B' }
  ];

  const getChangeIcon = (changeType: string) => {
    switch (changeType) {
      case 'positive':
        return <ArrowUpRight className="w-4 h-4 text-green-500" />;
      case 'negative':
        return <ArrowDownRight className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-400" />;
    }
  };

  const getChangeColor = (changeType: string) => {
    switch (changeType) {
      case 'positive':
        return 'text-green-600 dark:text-green-400';
      case 'negative':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

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
              관리자 대시보드
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              IP Insight AI 시스템 현황을 한눈에 확인하세요
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex space-x-3">
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
                  <div className={`flex items-center space-x-1 ${getChangeColor(stat.changeType)}`}>
                    {getChangeIcon(stat.changeType)}
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
          {/* Activity Chart */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  주간 활동 현황
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  최근 7일간의 사용자 활동
                </p>
              </div>
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
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activityData}>
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
                  <Area
                    type="monotone"
                    dataKey="searches"
                    stackId="1"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.6}
                  />
                  <Area
                    type="monotone"
                    dataKey="reports"
                    stackId="1"
                    stroke="#10b981"
                    fill="#10b981"
                    fillOpacity={0.6}
                  />
                  <Area
                    type="monotone"
                    dataKey="users"
                    stackId="1"
                    stroke="#8b5cf6"
                    fill="#8b5cf6"
                    fillOpacity={0.6}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Subscription Distribution */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  구독 플랜 분포
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  사용자 구독 현황
                </p>
              </div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
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
              {pieData.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    ></div>
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      {item.name}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-slate-900 dark:text-white">
                    {item.value}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  최근 가입 사용자
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  신규 가입한 사용자 목록
                </p>
              </div>
              <button className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium">
                전체 보기
              </button>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {stats.recentUsers.slice(0, 5).map((user, index) => (
                <div key={user.id} className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-700 last:border-b-0">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full">
                      <span className="text-sm font-medium text-white">
                        {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">
                        {user.name || '이름 없음'}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {user.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.subscription_plan === 'premium' 
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                        : user.subscription_plan === 'basic'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                    }`}>
                      {user.subscription_plan}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {new Date(user.created_at).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;