import React, { useEffect, useState } from 'react';
import { 
  Users, 
  FileText, 
  TrendingUp, 
  Activity,
  BarChart3,
  Search,
  Eye,
  Download
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalReports: number;
  totalSearches: number;
}

interface RecentActivity {
  id: string;
  type: string;
  description: string;
  created_at: string;
  user_email?: string;
}

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalReports: 0,
    totalSearches: 0
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);

        // 전체 사용자 수 조회
        const { count: totalUsers } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true });

        // 최근 7일간 활성 사용자 수 조회 (로그인한 사용자)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const { count: activeUsers } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .gte('last_sign_in_at', sevenDaysAgo.toISOString());

        // 총 검색 수 조회
        const { count: totalSearches } = await supabase
          .from('search_history')
          .select('*', { count: 'exact', head: true });

        // 생성된 보고서 수 조회
        const { count: totalReports } = await supabase
          .from('reports')
          .select('*', { count: 'exact', head: true });

        // 최근 활동 조회
        const { data: activities } = await supabase
          .from('search_history')
          .select(`
            id,
            query,
            created_at,
            users!inner(email)
          `)
          .order('created_at', { ascending: false })
          .limit(5);

        const formattedActivities: RecentActivity[] = activities?.map(activity => ({
          id: activity.id,
          type: 'search',
          description: `특허 검색: "${activity.query}"`,
          created_at: activity.created_at,
          user_email: (activity as any).users?.email || 'Unknown'
        })) || [];

        setStats({
          totalUsers: totalUsers || 0,
          activeUsers: activeUsers || 0,
          totalReports: totalReports || 0,
          totalSearches: totalSearches || 0
        });

        setRecentActivities(formattedActivities);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching stats:', error);
        // 에러 발생 시 기본값 설정
        setStats({
          totalUsers: 0,
          activeUsers: 0,
          totalReports: 0,
          totalSearches: 0
        });
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: '전체 사용자',
      value: stats.totalUsers.toLocaleString(),
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20'
    },
    {
      title: '활성 사용자',
      value: stats.activeUsers.toLocaleString(),
      icon: Activity,
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-900/20'
    },
    {
      title: '총 검색',
      value: stats.totalSearches.toLocaleString(),
      icon: Search,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20'
    },
    {
      title: '생성된 보고서',
      value: stats.totalReports.toLocaleString(),
      icon: FileText,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20'
    }
  ];

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          관리자 대시보드
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          시스템 현황과 주요 지표를 확인하세요
        </p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((card, index) => {
          const IconComponent = card.icon;
          return (
            <div
              key={index}
              className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {card.title}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {card.value}
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${card.bgColor}`}>
                  <IconComponent className={`w-6 h-6 ${card.color}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 빠른 액션 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center mb-4">
            <Users className="w-5 h-5 text-blue-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              사용자 관리
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            사용자 계정을 관리하고 권한을 설정하세요
          </p>
          <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">
            사용자 관리로 이동
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center mb-4">
            <BarChart3 className="w-5 h-5 text-green-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              사용량 통계
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            시스템 사용량과 성능 지표를 확인하세요
          </p>
          <button className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors">
            통계 보기
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center mb-4">
            <Activity className="w-5 h-5 text-purple-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              시스템 상태
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            시스템 상태와 서버 성능을 모니터링하세요
          </p>
          <button className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors">
            상태 확인
          </button>
        </div>
      </div>

      {/* 최근 활동 */}
      <div className="mt-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            최근 활동
          </h3>
          <div className="space-y-3">
            {recentActivities.length > 0 ? (
              recentActivities.map((activity, index) => (
                <div 
                  key={activity.id} 
                  className={`flex items-center justify-between py-2 ${
                    index < recentActivities.length - 1 ? 'border-b border-gray-200 dark:border-gray-700' : ''
                  }`}
                >
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                    <div className="flex flex-col">
                      <span className="text-gray-900 dark:text-white">
                        {activity.description}
                      </span>
                      {activity.user_email && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          사용자: {activity.user_email}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {new Date(activity.created_at).toLocaleString('ko-KR', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-4">
                <span className="text-gray-500 dark:text-gray-400">
                  최근 활동이 없습니다.
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;