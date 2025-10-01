import React, { useEffect, useState } from 'react';
import { 
  Users, 
  FileText, 
  TrendingUp, 
  DollarSign,
  Activity,
  AlertTriangle,
  Clock,
  BarChart3
} from 'lucide-react';
import AdminLayout from '../../components/Layout/AdminLayout';

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
        }
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
      change: `+${stats.newSignups}명 (30일)`,
      changeType: 'positive' as const,
      icon: Users,
      color: 'blue'
    },
    {
      title: '활성 사용자',
      value: stats.activeUsers.toLocaleString(),
      change: '최근 30일 활동',
      changeType: 'neutral' as const,
      icon: Activity,
      color: 'green'
    },
    {
      title: '총 검색',
      value: stats.totalSearches.toLocaleString(),
      change: `${stats.monthlyActivity}회 (30일)`,
      changeType: 'positive' as const,
      icon: TrendingUp,
      color: 'purple'
    },
    {
      title: '총 리포트',
      value: stats.totalReports.toLocaleString(),
      change: '누적 생성',
      changeType: 'neutral' as const,
      icon: FileText,
      color: 'yellow'
    },
    {
      title: '신규 가입',
      value: stats.newSignups.toLocaleString(),
      change: '최근 30일',
      changeType: 'neutral' as const,
      icon: BarChart3,
      color: 'indigo'
    },
    {
      title: '월간 활동',
      value: stats.monthlyActivity.toLocaleString(),
      change: '최근 30일 검색',
      changeType: 'neutral' as const,
      icon: Activity,
      color: 'orange'
    }
  ];

  const getColorClasses = (color: string) => {
    const colorMap = {
      blue: 'bg-blue-500 text-blue-100',
      green: 'bg-green-500 text-green-100',
      purple: 'bg-purple-500 text-purple-100',
      yellow: 'bg-yellow-500 text-yellow-100',
      indigo: 'bg-indigo-500 text-indigo-100',
      orange: 'bg-orange-500 text-orange-100'
    };
    return colorMap[color as keyof typeof colorMap] || 'bg-gray-500 text-gray-100';
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
              대시보드 개요
            </h2>
            <p className="mt-1 text-sm text-gray-400">
              KIPRIS 특허 분석 SaaS 플랫폼의 전체 현황을 한눈에 확인하세요
            </p>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4">
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              데이터 새로고침
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat, index) => (
            <div
              key={index}
              className="bg-gray-800 overflow-hidden shadow-lg rounded-lg border border-gray-700"
            >
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className={`p-3 rounded-lg ${getColorClasses(stat.color)}`}>
                      <stat.icon className="h-6 w-6" />
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-400 truncate">
                        {stat.title}
                      </dt>
                      <dd className="flex items-baseline">
                        <div className="text-2xl font-semibold text-white">
                          {stat.value}
                        </div>
                        <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                          stat.changeType === 'positive' ? 'text-green-400' : 'text-gray-400'
                        }`}>
                          {stat.change}
                        </div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="bg-gray-800 shadow-lg rounded-lg border border-gray-700">
          <div className="px-6 py-4 border-b border-gray-700">
            <h3 className="text-lg font-medium text-white">빠른 작업</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <button className="bg-gray-700 hover:bg-gray-600 text-white p-4 rounded-lg text-left transition-colors">
                <div className="flex items-center">
                  <Users className="h-8 w-8 text-blue-400" />
                  <div className="ml-3">
                    <p className="text-sm font-medium">사용자 관리</p>
                    <p className="text-xs text-gray-400">계정 및 권한 관리</p>
                  </div>
                </div>
              </button>
              
              <button className="bg-gray-700 hover:bg-gray-600 text-white p-4 rounded-lg text-left transition-colors">
                <div className="flex items-center">
                  <BarChart3 className="h-8 w-8 text-green-400" />
                  <div className="ml-3">
                    <p className="text-sm font-medium">시스템 모니터링</p>
                    <p className="text-xs text-gray-400">성능 및 상태 확인</p>
                  </div>
                </div>
              </button>
              
              <button className="bg-gray-700 hover:bg-gray-600 text-white p-4 rounded-lg text-left transition-colors">
                <div className="flex items-center">
                  <FileText className="h-8 w-8 text-purple-400" />
                  <div className="ml-3">
                    <p className="text-sm font-medium">리포트 분석</p>
                    <p className="text-xs text-gray-400">품질 및 사용 현황</p>
                  </div>
                </div>
              </button>
              
              <button className="bg-gray-700 hover:bg-gray-600 text-white p-4 rounded-lg text-left transition-colors">
                <div className="flex items-center">
                  <DollarSign className="h-8 w-8 text-yellow-400" />
                  <div className="ml-3">
                    <p className="text-sm font-medium">결제 관리</p>
                    <p className="text-xs text-gray-400">수익 및 구독 관리</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Recent Users */}
        <div className="bg-gray-800 shadow-lg rounded-lg border border-gray-700">
          <div className="px-6 py-4 border-b border-gray-700">
            <h3 className="text-lg font-medium text-white">최근 가입 사용자</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {stats.recentUsers.length > 0 ? (
                stats.recentUsers.map((user) => (
                  <div key={user.id} className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="h-8 w-8 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-medium">
                          {user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium">
                        {user.name || user.email}
                      </p>
                      <p className="text-xs text-gray-400">
                        {user.email} • {user.subscription_plan} • {new Date(user.created_at).toLocaleDateString('ko-KR')}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-400">최근 가입한 사용자가 없습니다.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;