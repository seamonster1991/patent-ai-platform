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
  monthlyRevenue: number;
  apiCalls: number;
  errorRate: number;
  avgLatency: number;
  newSignups: number;
}

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalReports: 0,
    monthlyRevenue: 0,
    apiCalls: 0,
    errorRate: 0,
    avgLatency: 0,
    newSignups: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        // TODO: Implement actual API calls to fetch dashboard statistics
        // For now, using mock data
        setTimeout(() => {
          setStats({
            totalUsers: 1247,
            activeUsers: 892,
            totalReports: 5634,
            monthlyRevenue: 45600,
            apiCalls: 12450,
            errorRate: 2.3,
            avgLatency: 1.2,
            newSignups: 156
          });
          setIsLoading(false);
        }, 1000);
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        setIsLoading(false);
      }
    };

    fetchDashboardStats();
  }, []);

  const statCards = [
    {
      title: '총 사용자',
      value: stats.totalUsers.toLocaleString(),
      change: '+12.5%',
      changeType: 'positive' as const,
      icon: Users,
      color: 'blue'
    },
    {
      title: '활성 사용자',
      value: stats.activeUsers.toLocaleString(),
      change: '+8.2%',
      changeType: 'positive' as const,
      icon: Activity,
      color: 'green'
    },
    {
      title: '총 리포트',
      value: stats.totalReports.toLocaleString(),
      change: '+15.3%',
      changeType: 'positive' as const,
      icon: FileText,
      color: 'purple'
    },
    {
      title: '월간 수익',
      value: `₩${stats.monthlyRevenue.toLocaleString()}`,
      change: '+23.1%',
      changeType: 'positive' as const,
      icon: DollarSign,
      color: 'yellow'
    },
    {
      title: 'API 호출',
      value: stats.apiCalls.toLocaleString(),
      change: '+5.7%',
      changeType: 'positive' as const,
      icon: BarChart3,
      color: 'indigo'
    },
    {
      title: '오류율',
      value: `${stats.errorRate}%`,
      change: '-0.5%',
      changeType: 'positive' as const,
      icon: AlertTriangle,
      color: 'red'
    },
    {
      title: '평균 지연시간',
      value: `${stats.avgLatency}초`,
      change: '-0.2초',
      changeType: 'positive' as const,
      icon: Clock,
      color: 'gray'
    },
    {
      title: '신규 가입',
      value: stats.newSignups.toLocaleString(),
      change: '+18.9%',
      changeType: 'positive' as const,
      icon: TrendingUp,
      color: 'pink'
    }
  ];

  const getColorClasses = (color: string) => {
    const colorMap = {
      blue: 'bg-blue-500 text-blue-100',
      green: 'bg-green-500 text-green-100',
      purple: 'bg-purple-500 text-purple-100',
      yellow: 'bg-yellow-500 text-yellow-100',
      indigo: 'bg-indigo-500 text-indigo-100',
      red: 'bg-red-500 text-red-100',
      gray: 'bg-gray-500 text-gray-100',
      pink: 'bg-pink-500 text-pink-100'
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
                          stat.changeType === 'positive' ? 'text-green-400' : 'text-red-400'
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

        {/* Recent Activity */}
        <div className="bg-gray-800 shadow-lg rounded-lg border border-gray-700">
          <div className="px-6 py-4 border-b border-gray-700">
            <h3 className="text-lg font-medium text-white">최근 활동</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <div className="h-2 w-2 bg-green-400 rounded-full"></div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white">새로운 사용자 15명이 가입했습니다</p>
                  <p className="text-xs text-gray-400">5분 전</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <div className="h-2 w-2 bg-blue-400 rounded-full"></div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white">시장 분석 리포트 234건이 생성되었습니다</p>
                  <p className="text-xs text-gray-400">12분 전</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <div className="h-2 w-2 bg-yellow-400 rounded-full"></div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white">KIPRIS API 응답 시간이 개선되었습니다</p>
                  <p className="text-xs text-gray-400">1시간 전</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <div className="h-2 w-2 bg-red-400 rounded-full"></div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white">결제 실패 알림 3건이 발생했습니다</p>
                  <p className="text-xs text-gray-400">2시간 전</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;