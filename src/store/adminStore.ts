import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { AdminStats, SystemHealth, RecentActivity, UserManagementData, ReportManagementData, SystemMetrics } from '../types/admin';

interface AdminStore {
  // 상태
  stats: AdminStats | null;
  systemHealth: SystemHealth | null;
  recentActivities: RecentActivity[];
  userManagement: UserManagementData | null;
  userManagementData: UserManagementData | null;
  reportManagement: ReportManagementData | null;
  reportManagementData: ReportManagementData | null;
  systemMetrics: SystemMetrics | null;
  
  // 로딩 상태
  loading: {
    stats: boolean;
    systemHealth: boolean;
    activities: boolean;
    users: boolean;
    reports: boolean;
    metrics: boolean;
  };
  
  // 에러 상태
  error: string | null;
  
  // 액션
  fetchStats: () => Promise<void>;
  fetchSystemHealth: () => Promise<void>;
  fetchRecentActivities: () => Promise<void>;
  fetchUserManagement: () => Promise<void>;
  fetchUserManagementData: () => Promise<void>;
  fetchReportManagement: () => Promise<void>;
  fetchReportManagementData: () => Promise<void>;
  fetchSystemMetrics: () => Promise<void>;
  
  // 사용자 관리 액션
  updateUserStatus: (userId: string, isActive: boolean) => Promise<void>;
  toggleUserStatus: (userId: string, isActive: boolean) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  
  // 리포트 관리 액션
  deleteReport: (reportId: string) => Promise<void>;
  
  // 유틸리티
  clearError: () => void;
  refreshAll: () => Promise<void>;
}

export const useAdminStore = create<AdminStore>((set, get) => ({
  // 초기 상태
  stats: null,
  systemHealth: null,
  recentActivities: [],
  userManagement: null,
  userManagementData: null,
  reportManagement: null,
  reportManagementData: null,
  systemMetrics: null,
  
  loading: {
    stats: false,
    systemHealth: false,
    activities: false,
    users: false,
    reports: false,
    metrics: false,
  },
  
  error: null,
  
  // 통계 데이터 가져오기
  fetchStats: async () => {
    set(state => ({ loading: { ...state.loading, stats: true }, error: null }));
    
    try {
      // 사용자 수 조회
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      
      // 활성 사용자 수 (최근 30일 내 로그인)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { count: activeUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('last_sign_in_at', thirtyDaysAgo.toISOString());
      
      // 리포트 수 조회
      const { count: totalReports } = await supabase
        .from('reports')
        .select('*', { count: 'exact', head: true });
      
      // 검색 수 조회 (activities 테이블에서)
      const { count: totalSearches } = await supabase
        .from('activities')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'search');
      
      // 오늘 신규 가입자
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { count: newUsersToday } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString());
      
      // 오늘 검색 수
      const { count: searchesToday } = await supabase
        .from('activities')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'search')
        .gte('created_at', today.toISOString());
      
      // 오늘 리포트 수
      const { count: reportsToday } = await supabase
        .from('reports')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString());
      
      const stats: AdminStats = {
        totalUsers: totalUsers || 0,
        activeUsers: activeUsers || 0,
        totalReports: totalReports || 0,
        totalSearches: totalSearches || 0,
        newUsersToday: newUsersToday || 0,
        searchesToday: searchesToday || 0,
        reportsToday: reportsToday || 0,
      };
      
      set(state => ({ 
        stats, 
        loading: { ...state.loading, stats: false } 
      }));
    } catch (error) {
      console.error('통계 데이터 가져오기 실패:', error);
      set(state => ({ 
        error: '통계 데이터를 가져오는데 실패했습니다.',
        loading: { ...state.loading, stats: false }
      }));
    }
  },
  
  // 시스템 상태 가져오기
  fetchSystemHealth: async () => {
    set(state => ({ loading: { ...state.loading, systemHealth: true }, error: null }));
    
    try {
      // 데이터베이스 상태 확인
      const dbStart = Date.now();
      const { error: dbError } = await supabase.from('profiles').select('id').limit(1);
      const dbResponseTime = Date.now() - dbStart;
      
      // 시스템 상태 모의 데이터 (실제 환경에서는 서버 메트릭스 API 호출)
      const systemHealth: SystemHealth = {
        status: 'healthy',
        overallStatus: 'healthy',
        uptime: Date.now() - (Math.random() * 86400000 * 7),
        activeUsers: Math.floor(Math.random() * 100) + 100,
        requestsPerMinute: Math.floor(Math.random() * 50) + 30,
        services: [
           { name: 'API Server', status: 'healthy', responseTime: Math.floor(Math.random() * 100) + 100 },
           { name: 'Database', status: dbError ? 'error' : dbResponseTime > 1000 ? 'warning' : 'healthy', responseTime: dbResponseTime },
           { name: 'File Storage', status: 'healthy', responseTime: Math.floor(Math.random() * 50) + 50 }
         ],
        serverMetrics: {
          cpuUsage: Math.floor(Math.random() * 30) + 20,
          memoryUsage: Math.floor(Math.random() * 40) + 30,
          diskUsage: Math.floor(Math.random() * 50) + 20,
          networkIn: Math.floor(Math.random() * 1000) + 500,
          networkOut: Math.floor(Math.random() * 2000) + 1000
        },
        databaseMetrics: {
           connections: Math.floor(Math.random() * 50) + 10,
           queries: Math.floor(Math.random() * 1000) + 1000,
           avgResponseTime: dbResponseTime,
           size: Math.floor(Math.random() * 1000) + 500,
           cacheHitRatio: Math.random() * 0.3 + 0.7
         },
        recentAlerts: [
          {
            id: '1',
            type: 'warning',
            message: 'High CPU usage detected',
            timestamp: new Date().toISOString(),
            resolved: false
          }
        ],
        performanceTrends: {
          cpu: Array.from({length: 5}, () => Math.floor(Math.random() * 30) + 20),
          memory: Array.from({length: 5}, () => Math.floor(Math.random() * 40) + 30),
          responseTime: Array.from({length: 5}, () => Math.floor(Math.random() * 100) + 100)
        },
        database: {
          status: dbError ? 'offline' : dbResponseTime > 1000 ? 'slow' : 'online',
          responseTime: dbResponseTime,
          connections: Math.floor(Math.random() * 50) + 10, // 모의 데이터
        },
        server: {
          status: 'online',
          cpuUsage: Math.floor(Math.random() * 30) + 20, // 모의 데이터
          memoryUsage: Math.floor(Math.random() * 40) + 30, // 모의 데이터
          uptime: Date.now() - (Math.random() * 86400000 * 7), // 모의 데이터
        },
        storage: {
          status: 'normal',
          usedSpace: 2.5,
          totalSpace: 10,
        },
      };
      
      // 전체 상태 결정
      if (systemHealth.database.status === 'offline' || systemHealth.server.status === 'offline') {
        systemHealth.status = 'critical';
      } else if (systemHealth.database.status === 'slow' || systemHealth.server.status === 'overloaded' || systemHealth.storage.status === 'warning') {
        systemHealth.status = 'warning';
      }
      
      set(state => ({ 
        systemHealth, 
        loading: { ...state.loading, systemHealth: false } 
      }));
    } catch (error) {
      console.error('시스템 상태 가져오기 실패:', error);
      set(state => ({ 
        error: '시스템 상태를 가져오는데 실패했습니다.',
        loading: { ...state.loading, systemHealth: false }
      }));
    }
  },
  
  // 최근 활동 가져오기
  fetchRecentActivities: async () => {
    set(state => ({ loading: { ...state.loading, activities: true }, error: null }));
    
    try {
      const { data: activities, error } = await supabase
        .from('activities')
        .select(`
          id,
          type,
          description,
          created_at,
          user_id,
          metadata,
          profiles:user_id (email)
        `)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      
      const recentActivities: RecentActivity[] = (activities || []).map(activity => ({
        id: activity.id,
        type: activity.type as RecentActivity['type'],
        description: activity.description,
        timestamp: activity.created_at,
        userId: activity.user_id,
        userEmail: Array.isArray(activity.profiles) ? activity.profiles[0]?.email : (activity.profiles as any)?.email,
        metadata: activity.metadata,
      }));
      
      set(state => ({ 
        recentActivities, 
        loading: { ...state.loading, activities: false } 
      }));
    } catch (error) {
      console.error('최근 활동 가져오기 실패:', error);
      set(state => ({ 
        error: '최근 활동을 가져오는데 실패했습니다.',
        loading: { ...state.loading, activities: false }
      }));
    }
  },
  
  // 사용자 관리 데이터 가져오기
  fetchUserManagementData: async () => {
    set(state => ({ loading: { ...state.loading, users: true }, error: null }));
    
    try {
      const { data: users, error } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          name,
          company,
          phone,
          created_at,
          last_sign_in_at,
          is_active
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // 각 사용자의 리포트 수와 검색 수 가져오기
      const usersWithCounts = await Promise.all((users || []).map(async (user) => {
        const [reportResult, searchResult] = await Promise.all([
          supabase.from('reports').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
          supabase.from('activities').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('type', 'search')
        ]);
        
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          company: user.company,
          phone: user.phone,
          createdAt: user.created_at,
          lastLogin: user.last_sign_in_at,
          isActive: user.is_active ?? true,
          reportCount: reportResult.count || 0,
          searchCount: searchResult.count || 0,
        };
      }));
      
      const totalUsers = usersWithCounts.length;
      const activeUsers = usersWithCounts.filter(user => user.isActive).length;
      
      // 이번 달 신규 가입자
      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);
      
      const newUsersThisMonth = usersWithCounts.filter(user => 
        new Date(user.createdAt) >= thisMonth
      ).length;
      
      const userManagementData: UserManagementData = {
        users: usersWithCounts,
        totalUsers,
        activeUsers,
        newUsersThisMonth,
      };
      
      set(state => ({ 
        userManagementData, 
        loading: { ...state.loading, users: false } 
      }));
    } catch (error) {
      console.error('사용자 관리 데이터 가져오기 실패:', error);
      set(state => ({ 
        error: '사용자 관리 데이터를 가져오는데 실패했습니다.',
        loading: { ...state.loading, users: false }
      }));
    }
  },

  // 사용자 관리 데이터 가져오기 (별칭)
  fetchUserManagement: async () => {
    const { fetchUserManagementData } = get();
    await fetchUserManagementData();
    const { userManagementData } = get();
    set({ userManagement: userManagementData });
  },
  
  // 리포트 관리 데이터 가져오기
  fetchReportManagementData: async () => {
    set(state => ({ loading: { ...state.loading, reports: true }, error: null }));
    
    try {
      const { data: reports, error } = await supabase
        .from('reports')
        .select(`
          id,
          title,
          user_id,
          created_at,
          status,
          file_size,
          download_count,
          profiles:user_id (email)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      const reportsData = (reports || []).map(report => ({
        id: report.id,
        title: report.title,
        type: (report as any).type || 'patent_analysis',
        userId: report.user_id,
        user_email: Array.isArray(report.profiles) ? report.profiles[0]?.email : (report.profiles as any)?.email || '',
        createdAt: report.created_at,
        created_at: report.created_at,
        status: report.status as 'completed' | 'processing' | 'failed' | 'pending',
        fileSize: report.file_size,
        downloadCount: report.download_count || 0,
      }));
      
      const totalReports = reportsData.length;
      
      // 이번 달 리포트 수
      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);
      
      const reportsThisMonth = reportsData.filter(report => 
        new Date(report.createdAt) >= thisMonth
      ).length;
      
      const totalFileSize = reportsData.reduce((sum, report) => sum + (report.fileSize || 0), 0);
      
      const completedReports = reportsData.filter(r => r.status === 'completed').length;
      const processingReports = reportsData.filter(r => r.status === 'processing').length;
      const failedReports = reportsData.filter(r => r.status === 'failed').length;

      const reportManagementData: ReportManagementData = {
        reports: reportsData,
        totalReports,
        reportsThisMonth,
        totalFileSize,
        completedReports,
        processingReports,
        failedReports,
      };
      
      set(state => ({ 
        reportManagementData, 
        loading: { ...state.loading, reports: false } 
      }));
    } catch (error) {
      console.error('리포트 관리 데이터 가져오기 실패:', error);
      set(state => ({ 
        error: '리포트 관리 데이터를 가져오는데 실패했습니다.',
        loading: { ...state.loading, reports: false }
      }));
    }
  },

  // 리포트 관리 데이터 가져오기 (별칭)
  fetchReportManagement: async () => {
    const { fetchReportManagementData } = get();
    await fetchReportManagementData();
    const { reportManagementData } = get();
    set({ reportManagement: reportManagementData });
  },
  
  // 시스템 메트릭 가져오기
  fetchSystemMetrics: async () => {
    set(state => ({ loading: { ...state.loading, metrics: true }, error: null }));
    
    try {
      // 실시간 메트릭스 (모의 데이터)
      const realtime = {
        activeConnections: Math.floor(Math.random() * 100) + 50,
        requestsPerMinute: Math.floor(Math.random() * 500) + 200,
        errorRate: Math.random() * 5,
        averageResponseTime: Math.floor(Math.random() * 200) + 100,
      };
      
      // 일별 데이터 (최근 7일)
      const daily = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        daily.push({
          date: date.toISOString().split('T')[0],
          users: Math.floor(Math.random() * 50) + 20,
          searches: Math.floor(Math.random() * 200) + 100,
          reports: Math.floor(Math.random() * 30) + 10,
          errors: Math.floor(Math.random() * 10),
        });
      }
      
      // 주별 데이터 (최근 4주)
      const weekly = [];
      for (let i = 3; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - (i * 7));
        weekly.push({
          week: `${date.getFullYear()}-W${Math.ceil(date.getDate() / 7)}`,
          users: Math.floor(Math.random() * 300) + 150,
          searches: Math.floor(Math.random() * 1000) + 500,
          reports: Math.floor(Math.random() * 150) + 75,
          errors: Math.floor(Math.random() * 50) + 10,
        });
      }
      
      const systemMetrics: SystemMetrics = {
        realtime,
        daily,
        weekly,
      };
      
      set(state => ({ 
        systemMetrics, 
        loading: { ...state.loading, metrics: false } 
      }));
    } catch (error) {
      console.error('시스템 메트릭스 가져오기 실패:', error);
      set(state => ({ 
        error: '시스템 메트릭스를 가져오는데 실패했습니다.',
        loading: { ...state.loading, metrics: false }
      }));
    }
  },

  // 사용자 상태 업데이트
  updateUserStatus: async (userId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_active: isActive })
        .eq('id', userId);

      if (error) throw error;

      // 사용자 관리 데이터 새로고침
      const { fetchUserManagementData } = get();
      await fetchUserManagementData();
    } catch (error) {
      console.error('사용자 상태 업데이트 실패:', error);
      set({ error: '사용자 상태를 업데이트하는데 실패했습니다.' });
    }
  },
  
  // 사용자 상태 토글
  toggleUserStatus: async (userId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: isActive })
        .eq('id', userId);
      
      if (error) throw error;
      
      // 로컬 상태 업데이트
      set(state => ({
        userManagementData: state.userManagementData ? {
          ...state.userManagementData,
          users: state.userManagementData.users.map(user =>
            user.id === userId ? { ...user, isActive } : user
          ),
          activeUsers: state.userManagementData.users.filter(user =>
            user.id === userId ? isActive : user.isActive
          ).length,
        } : null,
      }));
    } catch (error) {
      console.error('사용자 상태 변경 실패:', error);
      set({ error: '사용자 상태를 변경하는데 실패했습니다.' });
    }
  },
  
  // 사용자 삭제
  deleteUser: async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);
      
      if (error) throw error;
      
      // 로컬 상태 업데이트
      set(state => ({
        userManagementData: state.userManagementData ? {
          ...state.userManagementData,
          users: state.userManagementData.users.filter(user => user.id !== userId),
          totalUsers: state.userManagementData.totalUsers - 1,
          activeUsers: state.userManagementData.users.find(user => user.id === userId)?.isActive 
            ? state.userManagementData.activeUsers - 1 
            : state.userManagementData.activeUsers,
        } : null,
      }));
    } catch (error) {
      console.error('사용자 삭제 실패:', error);
      set({ error: '사용자를 삭제하는데 실패했습니다.' });
    }
  },
  
  // 리포트 삭제
  deleteReport: async (reportId: string) => {
    try {
      const { error } = await supabase
        .from('reports')
        .delete()
        .eq('id', reportId);
      
      if (error) throw error;
      
      // 로컬 상태 업데이트
      set(state => ({
        reportManagementData: state.reportManagementData ? {
          ...state.reportManagementData,
          reports: state.reportManagementData.reports.filter(report => report.id !== reportId),
          totalReports: state.reportManagementData.totalReports - 1,
        } : null,
      }));
    } catch (error) {
      console.error('리포트 삭제 실패:', error);
      set({ error: '리포트를 삭제하는데 실패했습니다.' });
    }
  },
  
  // 에러 클리어
  clearError: () => {
    set({ error: null });
  },
  
  // 모든 데이터 새로고침
  refreshAll: async () => {
    const { fetchStats, fetchSystemHealth, fetchRecentActivities } = get();
    await Promise.all([
      fetchStats(),
      fetchSystemHealth(),
      fetchRecentActivities(),
    ]);
  },
}));