/**
 * Admin Store - 관리자 상태 관리
 * Zustand를 사용한 관리자 인증 및 상태 관리
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { adminApiService, LoginRequest, LoginResponse } from '../services/adminApi';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  permissions: Record<string, any>;
}

interface AdminState {
  // 상태
  isAuthenticated: boolean;
  isLoading: boolean;
  admin: AdminUser | null;
  token: string | null;
  refreshToken: string | null;
  error: string | null;

  // 액션
  login: (credentials: LoginRequest) => Promise<boolean>;
  logout: () => void;
  refreshAuth: () => Promise<boolean>;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
  getCurrentAdmin: () => Promise<void>;
}

export const useAdminStore = create<AdminState>()(
  persist(
    (set, get) => ({
      // 초기 상태
      isAuthenticated: false,
      isLoading: false,
      admin: null,
      token: localStorage.getItem('admin_token'),
      refreshToken: localStorage.getItem('admin_refresh_token'),
      error: null,

      // 로그인
      login: async (credentials: LoginRequest): Promise<boolean> => {
        console.log('[AdminStore] 로그인 시도:', credentials.email);
        set({ isLoading: true, error: null });

        try {
          console.log('[AdminStore] API 호출 시작');
          const response: LoginResponse = await adminApiService.login(credentials);
          console.log('[AdminStore] API 응답 받음:', response);
          
          // 토큰 저장
          localStorage.setItem('admin_token', response.access_token);
          localStorage.setItem('admin_refresh_token', response.refresh_token);
          console.log('[AdminStore] 토큰 저장 완료');

          set({
            isAuthenticated: true,
            admin: response.admin,
            token: response.access_token,
            refreshToken: response.refresh_token,
            isLoading: false,
            error: null,
          });

          console.log('[AdminStore] 로그인 성공');
          return true;
        } catch (error: any) {
          console.error('[AdminStore] 로그인 실패:', error);
          const errorMessage = error.response?.data?.detail || '로그인에 실패했습니다.';
          set({
            isAuthenticated: false,
            admin: null,
            token: null,
            refreshToken: null,
            isLoading: false,
            error: errorMessage,
          });
          return false;
        }
      },

      // 로그아웃
      logout: () => {
        // API 호출 (백그라운드에서)
        adminApiService.logout().catch(console.error);

        // 로컬 상태 및 저장소 정리
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_refresh_token');

        set({
          isAuthenticated: false,
          admin: null,
          token: null,
          refreshToken: null,
          error: null,
        });
      },

      // 토큰 갱신
      refreshAuth: async (): Promise<boolean> => {
        const { refreshToken } = get();
        
        if (!refreshToken) {
          return false;
        }

        try {
          const response = await adminApiService.refreshToken();
          
          localStorage.setItem('admin_token', response.access_token);

          set({
            token: response.access_token,
            isAuthenticated: true,
          });

          return true;
        } catch (error) {
          // 리프레시 토큰도 만료된 경우 로그아웃
          get().logout();
          return false;
        }
      },

      // 현재 관리자 정보 조회
      getCurrentAdmin: async (): Promise<void> => {
        const { token } = get();
        console.log('[AdminStore] getCurrentAdmin 호출, token:', token ? '있음' : '없음');
        
        if (!token) {
          console.log('[AdminStore] 토큰이 없어서 getCurrentAdmin 종료');
          return;
        }

        try {
          console.log('[AdminStore] adminApiService.getCurrentAdmin 호출');
          const admin = await adminApiService.getCurrentAdmin();
          console.log('[AdminStore] getCurrentAdmin 성공:', admin);
          set({ admin, isAuthenticated: true });
        } catch (error) {
          console.error('[AdminStore] getCurrentAdmin 실패:', error);
          // 토큰이 유효하지 않은 경우 로그아웃
          get().logout();
        }
      },

      // 에러 클리어
      clearError: () => {
        set({ error: null });
      },

      // 로딩 상태 설정
      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },
    }),
    {
      name: 'admin-store',
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        admin: state.admin,
        token: state.token,
        refreshToken: state.refreshToken,
      }),
    }
  )
);

// 권한 확인 헬퍼 함수들
export const useAdminPermissions = () => {
  const admin = useAdminStore((state) => state.admin);
  
  const hasPermission = (resource: string, action: string): boolean => {
    if (!admin?.permissions) return false;
    
    const resourcePermissions = admin.permissions[resource];
    if (!resourcePermissions) return false;
    
    return resourcePermissions[action] === true;
  };

  const isSuperAdmin = (): boolean => {
    return admin?.role === 'super_admin';
  };

  const canManageUsers = (): boolean => {
    return hasPermission('users', 'manage') || isSuperAdmin();
  };

  const canViewPayments = (): boolean => {
    return hasPermission('payments', 'view') || isSuperAdmin();
  };

  const canManagePayments = (): boolean => {
    return hasPermission('payments', 'manage') || isSuperAdmin();
  };

  const canViewMonitoring = (): boolean => {
    return hasPermission('monitoring', 'view') || isSuperAdmin();
  };

  const canManageSettings = (): boolean => {
    return hasPermission('settings', 'manage') || isSuperAdmin();
  };

  return {
    hasPermission,
    isSuperAdmin,
    canManageUsers,
    canViewPayments,
    canManagePayments,
    canViewMonitoring,
    canManageSettings,
  };
};

export default useAdminStore;