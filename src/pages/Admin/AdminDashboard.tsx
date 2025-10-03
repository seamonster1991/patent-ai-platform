import React, { useEffect, useState } from 'react';
import { 
  Users, 
  FileText, 
  TrendingUp, 
  Activity,
  BarChart3,
  Search,
  Eye,
  Download,
  Clock,
  PieChart,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell
} from 'recharts';
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
  const [adminStats, setAdminStats] = useState<any>(null);
  const [adminLoading, setAdminLoading] = useState(true);

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

    const fetchAdminStats = async () => {
      try {
        const response = await fetch('/api/admin/user-activities?period=30');
        if (response.ok) {
          const data = await response.json();
          setAdminStats(data);
        } else {
          // API 응답이 실패한 경우 fallback 데이터 설정
          console.warn('Admin API response failed, using fallback data');
          setAdminStats({
            totalActivities: 0,
            activityTypes: [],
            dailyActivity: [],
            topUsers: []
          });
        }
      } catch (error) {
        console.error('Error fetching admin statistics:', error);
        // 네트워크 오류 등의 경우 fallback 데이터 설정
        setAdminStats({
          totalActivities: 0,
          activityTypes: [
            { activity_type: '검색', count: 0 },
            { activity_type: '로그인', count: 0 },
            { activity_type: '보고서 생성', count: 0 }
          ],
          dailyActivity: Array.from({ length: 7 }, (_, i) => ({
            date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toISOString(),
            count: 0
          })),
          topUsers: []
        });
      } finally {
        setAdminLoading(false);
      }
    };

    fetchStats();
    fetchAdminStats();
  }, []);

  if (loading || adminLoading) {
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

  // 차트 색상 설정
  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

  // 활동 유형별 데이터 준비
  const activityTypeData = adminStats?.activityTypes?.map((item: any, index: number) => ({
    name: item.activity_type,
    value: item.count,
    color: COLORS[index % COLORS.length]
  })) || [];

  // 일별 활동 데이터 준비
  const dailyActivityData = adminStats?.dailyActivity?.map((item: any) => ({
    date: new Date(item.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }),
    활동수: item.count
  })) || [];

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
      title: '총 활동',
      value: adminStats?.totalActivities?.toLocaleString() || '0',
      icon: TrendingUp,
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

  const additionalStatCards = [
    {
      title: '특허 조회',
      value: adminStats?.activityTypes?.find((item: any) => item.activity_type === 'patent_view')?.count?.toLocaleString() || '0',
      icon: Eye,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50 dark:bg-indigo-900/20'
    },
    {
      title: 'AI 분석',
      value: adminStats?.activityTypes?.find((item: any) => item.activity_type === 'ai_analysis')?.count?.toLocaleString() || '0',
      icon: BarChart3,
      color: 'text-pink-600',
      bgColor: 'bg-pink-50 dark:bg-pink-900/20'
    },
    {
      title: '문서 다운로드',
      value: adminStats?.activityTypes?.find((item: any) => item.activity_type === 'document_download')?.count?.toLocaleString() || '0',
      icon: Download,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-50 dark:bg-cyan-900/20'
    },
    {
      title: '평균 세션 시간',
      value: adminStats?.averageSessionDuration ? `${Math.round(adminStats.averageSessionDuration / 60)}분` : '0분',
      icon: Clock,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50 dark:bg-amber-900/20'
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

      {/* 기본 통계 카드 */}
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

      {/* 상세 활동 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {additionalStatCards.map((card, index) => {
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

      {/* 차트 섹션 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* 일별 활동 차트 */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center mb-4">
            <Calendar className="w-5 h-5 text-blue-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              일별 활동 추이 (최근 30일)
            </h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyActivityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="활동수" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 활동 유형별 분포 차트 */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center mb-4">
            <PieChart className="w-5 h-5 text-green-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              활동 유형별 분포
            </h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={activityTypeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {activityTypeData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 상위 활성 사용자 */}
      <div className="mb-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center mb-4">
            <TrendingUp className="w-5 h-5 text-purple-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              상위 활성 사용자 (최근 30일)
            </h3>
          </div>
          <div className="space-y-3">
            {adminStats?.topUsers?.length > 0 ? (
              adminStats.topUsers.map((user: any, index: number) => (
                <div 
                  key={user.user_id} 
                  className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700 last:border-b-0"
                >
                  <div className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold mr-3 ${
                      index === 0 ? 'bg-yellow-500' : 
                      index === 1 ? 'bg-gray-400' : 
                      index === 2 ? 'bg-amber-600' : 'bg-blue-500'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <span className="text-gray-900 dark:text-white font-medium">
                        {user.user_email || '익명 사용자'}
                      </span>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        활동 수: {user.activity_count}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      마지막 활동
                    </div>
                    <div className="text-sm text-gray-900 dark:text-white">
                      {new Date(user.last_activity).toLocaleDateString('ko-KR')}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4">
                <span className="text-gray-500 dark:text-gray-400">
                  활성 사용자 데이터가 없습니다.
                </span>
              </div>
            )}
          </div>
        </div>
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