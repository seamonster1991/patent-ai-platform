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
  isInitialized: boolean;
  isInitializing: boolean;
  isFetchingAdmin: boolean;
  admin: AdminUser | null;
  token: string | null;
  refreshToken: string | null;
  error: string | null;
  lastInitTime: number; // 마지막 초기화 시간 추가

  // 액션
  login: (credentials: LoginRequest) => Promise<{success: boolean, requires2FA?: boolean, error?: string}>;
  logout: () => void;
  refreshAuth: () => Promise<boolean>;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
  getCurrentAdmin: () => Promise<void>;
  initialize: () => Promise<void>;
}

// 캐시 관리
const CACHE_DURATION = 5 * 60 * 1000; // 5분 캐시
let adminCache: { admin: AdminUser | null; timestamp: number } | null = null;

export const useAdminStore = create<AdminState>()(
  persist(
    (set, get) => ({
      // 초기 상태
      isAuthenticated: false,
      isLoading: false,
      isInitialized: false,
      isInitializing: false,
      isFetchingAdmin: false,
      admin: null,
      token: null,
      refreshToken: null,
      error: null,
      lastInitTime: 0,

      // 초기화 함수 - 성능 최적화
      initialize: async (): Promise<void> => {
        const state = get();
        const now = Date.now();
        
        // 최근 5분 이내에 초기화했다면 스킵
        if (state.isInitialized && (now - state.lastInitTime) < CACHE_DURATION) {
          console.log('[AdminStore] 최근 초기화됨, 캐시 사용');
          return;
        }
        
        // 이미 초기화 중이면 스킵
        if (state.isInitializing) {
          console.log('[AdminStore] 이미 초기화 진행 중, 스킵');
          return;
        }

        const token = localStorage.getItem('admin_token');
        const refreshToken = localStorage.getItem('admin_refresh_token');
        
        console.log('[AdminStore] 초기화 시작, token:', token ? '있음' : '없음');
        
        set({ 
          isInitializing: true,
          isLoading: true,
          error: null
        });
        
        try {
          if (token) {
            set({ 
              token, 
              refreshToken
            });
            
            // 캐시된 관리자 정보 확인
            if (adminCache && (now - adminCache.timestamp) < CACHE_DURATION) {
              console.log('[AdminStore] 캐시된 관리자 정보 사용');
              set({
                admin: adminCache.admin,
                isAuthenticated: !!adminCache.admin,
                isLoading: false,
                isInitialized: true,
                lastInitTime: now
              });
              return;
            }
            
            // 토큰이 있으면 현재 관리자 정보를 가져옴 (타임아웃 적용)
            await Promise.race([
              get().getCurrentAdmin(),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('getCurrentAdmin timeout')), 3000)
              )
            ]);
          } else {
            // 토큰이 없으면 로딩 상태 해제
            set({ 
              isLoading: false,
              isAuthenticated: false,
              admin: null
            });
          }
        } catch (error) {
          console.error('[AdminStore] 초기화 중 getCurrentAdmin 실패:', error);
          // 토큰이 유효하지 않으면 로그아웃
          get().logout();
        } finally {
          set({ 
            isInitializing: false, 
            isInitialized: true,
            isLoading: false,
            lastInitTime: now
          });
        }
      },

      // 로그인 - 성능 최적화
      login: async (credentials: LoginRequest): Promise<{success: boolean, requires2FA?: boolean, error?: string}> => {
        console.log('[AdminStore] 로그인 시도:', credentials.email);
        set({ isLoading: true, error: null });

        try {
          console.log('[AdminStore] API 호출 시작');
          
          // 로그인 API 호출에 타임아웃 적용
          const response: LoginResponse = await Promise.race([
            adminApiService.login(credentials),
            new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error('Login timeout')), 5000)
            )
          ]);
          
          console.log('[AdminStore] API 응답 받음:', response);
          
          // 토큰 저장
          localStorage.setItem('admin_token', response.access_token);
          localStorage.setItem('admin_refresh_token', response.refresh_token);
          console.log('[AdminStore] 토큰 저장 완료');

          // 관리자 정보 캐시 업데이트
          adminCache = {
            admin: response.admin,
            timestamp: Date.now()
          };

          set({
            isAuthenticated: true,
            admin: response.admin,
            token: response.access_token,
            refreshToken: response.refresh_token,
            isLoading: false,
            error: null,
            isInitialized: true,
            lastInitTime: Date.now()
          });

          console.log('[AdminStore] 로그인 성공');
          return { success: true };
        } catch (error: any) {
          console.error('[AdminStore] 로그인 실패:', error);
          let errorMessage = '로그인에 실패했습니다.';
          
          if (error.message === 'Login timeout') {
            errorMessage = '로그인 요청 시간이 초과되었습니다. 다시 시도해주세요.';
          } else if (error.response?.data?.detail) {
            errorMessage = error.response.data.detail;
          }
          
          set({
            isAuthenticated: false,
            admin: null,
            token: null,
            refreshToken: null,
            isLoading: false,
            error: errorMessage,
          });
          return { success: false, error: errorMessage };
        }
      },

      // 로그아웃 - 캐시 정리 추가
      logout: () => {
        console.log('[AdminStore] 로그아웃 실행');
        
        // API 호출 (백그라운드에서)
        adminApiService.logout().catch(console.error);

        // 캐시 정리
        adminCache = null;

        // 로컬 상태 및 저장소 정리
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_refresh_token');

        set({
          isAuthenticated: false,
          admin: null,
          token: null,
          refreshToken: null,
          error: null,
          isLoading: false,
          isInitialized: false,
          lastInitTime: 0
        });
      },

      // 토큰 갱신 - 성능 최적화
      refreshAuth: async (): Promise<boolean> => {
        const { refreshToken } = get();
        
        if (!refreshToken) {
          return false;
        }

        try {
          const response = await Promise.race([
            adminApiService.refreshToken(),
            new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error('Refresh timeout')), 3000)
            )
          ]);
          
          localStorage.setItem('admin_token', response.access_token);

          set({
            token: response.access_token,
            isAuthenticated: true,
          });

          return true;
        } catch (error) {
          console.error('[AdminStore] 토큰 갱신 실패:', error);
          // 리프레시 토큰도 만료된 경우 로그아웃
          get().logout();
          return false;
        }
      },

      // 현재 관리자 정보 조회 - 성능 최적화
      getCurrentAdmin: async (): Promise<void> => {
        const state = get();
        console.log('[AdminStore] getCurrentAdmin 호출, token:', state.token ? '있음' : '없음');
        
        // 이미 관리자 정보를 가져오는 중이면 중복 실행 방지
        if (state.isFetchingAdmin) {
          console.log('[AdminStore] 이미 getCurrentAdmin 진행 중, 스킵');
          return;
        }
        
        if (!state.token) {
          console.log('[AdminStore] 토큰이 없어서 getCurrentAdmin 종료');
          set({ isLoading: false });
          return;
        }

        // 캐시 확인
        const now = Date.now();
        if (adminCache && (now - adminCache.timestamp) < CACHE_DURATION) {
          console.log('[AdminStore] 캐시된 관리자 정보 사용');
          set({ 
            admin: adminCache.admin, 
            isAuthenticated: !!adminCache.admin, 
            isLoading: false
          });
          return;
        }

        set({ isFetchingAdmin: true });

        try {
          console.log('[AdminStore] adminApiService.getCurrentAdmin 호출');
          const admin = await adminApiService.getCurrentAdmin();
          console.log('[AdminStore] getCurrentAdmin 성공:', admin);
          
          // 캐시 업데이트
          adminCache = {
            admin,
            timestamp: now
          };
          
          set({ 
            admin, 
            isAuthenticated: true, 
            isLoading: false,
            isFetchingAdmin: false
          });
        } catch (error) {
          console.error('[AdminStore] getCurrentAdmin 실패:', error);
          set({ isFetchingAdmin: false });
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
        lastInitTime: state.lastInitTime,
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