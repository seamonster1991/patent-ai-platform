import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { adminApi, AdminUser, LoginCredentials, DashboardMetrics, SystemHealth, SystemAlert } from '../lib/adminApi';

// 관리자 인증 상태 인터페이스
interface AdminAuthState {
  admin: AdminUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // 액션들
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  getCurrentAdmin: () => Promise<void>;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
}

// 대시보드 데이터 상태 인터페이스
interface AdminDashboardState {
  metrics: DashboardMetrics | null;
  systemHealth: SystemHealth | null;
  alerts: SystemAlert[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  
  // 액션들
  fetchDashboardMetrics: (period?: string) => Promise<void>;
  fetchSystemHealth: () => Promise<void>;
  fetchSystemAlerts: () => Promise<void>;
  markAlertAsRead: (alertId: string) => void;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
}

// 관리자 인증 스토어
export const useAdminStore = create<AdminAuthState>()(
  persist(
    (set, get) => ({
      admin: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (credentials: LoginCredentials) => {
        set({ isLoading: true, error: null });
        try {
          const response = await adminApi.login(credentials);
          set({
            admin: response.user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          set({
            admin: null,
            isAuthenticated: false,
            isLoading: false,
            error: error instanceof Error ? error.message : '로그인에 실패했습니다.',
          });
          throw error;
        }
      },

      logout: async () => {
        set({ isLoading: true });
        try {
          await adminApi.logout();
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          set({
            admin: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        }
      },

      getCurrentAdmin: async () => {
        if (!adminApi.isAuthenticated()) {
          set({ isAuthenticated: false, admin: null });
          return;
        }

        set({ isLoading: true });
        try {
          const admin = await adminApi.getCurrentAdmin();
          set({
            admin,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          set({
            admin: null,
            isAuthenticated: false,
            isLoading: false,
            error: error instanceof Error ? error.message : '사용자 정보를 가져올 수 없습니다.',
          });
        }
      },

      clearError: () => set({ error: null }),
      setLoading: (loading: boolean) => set({ isLoading: loading }),
    }),
    {
      name: 'admin-auth-storage',
      partialize: (state) => ({
        admin: state.admin,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// 대시보드 데이터 스토어
export const useAdminDashboardStore = create<AdminDashboardState>((set, get) => ({
  metrics: null,
  systemHealth: null,
  alerts: [],
  isLoading: false,
  error: null,
  lastUpdated: null,

  fetchDashboardMetrics: async (period = 'week') => {
    set({ isLoading: true, error: null });
    try {
      const metrics = await adminApi.getDashboardMetrics(period);
      set({
        metrics,
        isLoading: false,
        error: null,
        lastUpdated: new Date(),
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : '대시보드 데이터를 가져올 수 없습니다.',
      });
    }
  },

  fetchSystemHealth: async () => {
    try {
      const systemHealth = await adminApi.getSystemHealth();
      set({
        systemHealth,
        error: null,
        lastUpdated: new Date(),
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '시스템 상태를 가져올 수 없습니다.',
      });
    }
  },

  fetchSystemAlerts: async () => {
    try {
      const alerts = await adminApi.getSystemAlerts();
      set({
        alerts,
        error: null,
        lastUpdated: new Date(),
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '시스템 알림을 가져올 수 없습니다.',
      });
    }
  },

  markAlertAsRead: (alertId: string) => {
    const { alerts } = get();
    const updatedAlerts = alerts.map(alert =>
      alert.id === alertId ? { ...alert, is_read: true } : alert
    );
    set({ alerts: updatedAlerts });
  },

  clearError: () => set({ error: null }),
  setLoading: (loading: boolean) => set({ isLoading: loading }),
}));