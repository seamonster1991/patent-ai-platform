import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
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
  Minus,
  Shield,
  Database,
  Server
} from 'lucide-react';
import AdminLayout from '../../components/Layout/AdminLayout';

interface SystemOverview {
  totalUsers: number;
  activeUsers: number;
  totalSearches: number;
  totalReports: number;
  systemStatus: 'healthy' | 'warning' | 'error';
  serverUptime: string;
  databaseStatus: 'connected' | 'disconnected';
}

const AdminHome: React.FC = () => {
  const { user, profile, isAdmin } = useAuthStore();
  const [overview, setOverview] = useState<SystemOverview>({
    totalUsers: 0,
    activeUsers: 0,
    totalSearches: 0,
    totalReports: 0,
    systemStatus: 'healthy',
    serverUptime: '0일 0시간',
    databaseStatus: 'connected'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUserAndFetchData();
  }, []);

  const checkUserAndFetchData = async () => {
    await fetchSystemOverview();
  };

  const fetchSystemOverview = async () => {
    try {
      setLoading(true);
      
      // Get the current session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.error('No access token available');
        return;
      }

      const response = await fetch('/api/users/admin/overview', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setOverview(data);
      } else {
        console.error('Failed to fetch overview:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Failed to fetch system overview:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickStats = [
    {
      title: '총 사용자',
      value: overview.totalUsers,
      icon: Users,
      color: 'bg-blue-500',
      change: '+12%',
      changeType: 'increase' as const
    },
    {
      title: '활성 사용자',
      value: overview.activeUsers,
      icon: Activity,
      color: 'bg-green-500',
      change: '+8%',
      changeType: 'increase' as const
    },
    {
      title: '총 검색',
      value: overview.totalSearches,
      icon: Search,
      color: 'bg-purple-500',
      change: '+15%',
      changeType: 'increase' as const
    },
    {
      title: '생성된 보고서',
      value: overview.totalReports,
      icon: FileText,
      color: 'bg-orange-500',
      change: '+5%',
      changeType: 'increase' as const
    }
  ];

  const systemHealth = [
    {
      title: '시스템 상태',
      status: overview.systemStatus,
      icon: Server,
      description: overview.systemStatus === 'healthy' ? '모든 시스템이 정상 작동 중입니다' : '시스템에 문제가 있습니다'
    },
    {
      title: '데이터베이스',
      status: overview.databaseStatus === 'connected' ? 'healthy' : 'error',
      icon: Database,
      description: overview.databaseStatus === 'connected' ? '데이터베이스 연결 정상' : '데이터베이스 연결 오류'
    },
    {
      title: '서버 가동시간',
      status: 'healthy' as const,
      icon: Clock,
      description: overview.serverUptime
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'error': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getChangeIcon = (changeType: 'increase' | 'decrease' | 'neutral') => {
    switch (changeType) {
      case 'increase': return <ArrowUpRight className="w-4 h-4 text-green-600" />;
      case 'decrease': return <ArrowDownRight className="w-4 h-4 text-red-600" />;
      default: return <Minus className="w-4 h-4 text-gray-600" />;
    }
  };

  if (loading) {
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
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
          <div className="flex items-center space-x-3 mb-4">
            <Shield className="w-8 h-8" />
            <div>
              <h1 className="text-2xl font-bold">관리자 대시보드</h1>
              <p className="text-blue-100">IP Insight AI 시스템 관리</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="bg-white/10 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">오늘 신규 가입</p>
                  <p className="text-2xl font-bold">+{Math.floor(overview.totalUsers * 0.1)}</p>
                </div>
                <Users className="w-8 h-8 text-blue-200" />
              </div>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">오늘 검색 수</p>
                  <p className="text-2xl font-bold">+{Math.floor(overview.totalSearches * 0.05)}</p>
                </div>
                <Search className="w-8 h-8 text-blue-200" />
              </div>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">시스템 상태</p>
                  <p className="text-2xl font-bold">정상</p>
                </div>
                <Activity className="w-8 h-8 text-blue-200" />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickStats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-lg ${stat.color}`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex items-center space-x-1">
                    {getChangeIcon(stat.changeType)}
                    <span className={`text-sm font-medium ${
                      stat.changeType === 'increase' ? 'text-green-600' : 
                      stat.changeType === 'decrease' ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {stat.change}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {stat.value.toLocaleString()}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{stat.title}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* System Health */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">시스템 상태</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {systemHealth.map((item, index) => {
              const Icon = item.icon;
              return (
                <div key={index} className="flex items-center space-x-4 p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
                  <div className={`p-3 rounded-lg ${getStatusColor(item.status)}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-slate-900 dark:text-white">{item.title}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{item.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">빠른 작업</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button className="flex items-center space-x-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">사용자 관리</span>
            </button>
            <button className="flex items-center space-x-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors">
              <BarChart3 className="w-5 h-5 text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium text-green-700 dark:text-green-300">통계 보기</span>
            </button>
            <button className="flex items-center space-x-3 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors">
              <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <span className="text-sm font-medium text-purple-700 dark:text-purple-300">보고서 관리</span>
            </button>
            <button className="flex items-center space-x-3 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors">
              <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              <span className="text-sm font-medium text-orange-700 dark:text-orange-300">시스템 알림</span>
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminHome;