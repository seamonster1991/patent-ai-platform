/**
 * Admin Dashboard Store - 대시보드 데이터 관리
 * 대시보드 메트릭, 활동 로그, 시스템 상태 등 관리
 */

import React from 'react';
import { create } from 'zustand';
import adminApiService, { 
  DashboardMetrics, 
  SystemMetrics, 
  AdminUser, 
  ExtendedDashboardStats, 
  PopularKeyword, 
  PopularPatent 
} from '../services/adminApi';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  key: string;
}

interface DashboardState {
  // 메트릭 데이터
  metrics: DashboardMetrics | null;
  systemMetrics: SystemMetrics[];
  recentActivities: any[];
  extendedStats: ExtendedDashboardStats | null;
  popularKeywords: PopularKeyword[];
  popularPatents: PopularPatent[];
  
  // 캐시 데이터
  cache: Map<string, CacheEntry<any>>;
  cacheTimeout: number; // 캐시 유효 시간 (밀리초)
  
  // 로딩 상태
  isLoadingMetrics: boolean;
  isLoadingActivities: boolean;
  isLoadingSystemMetrics: boolean;
  isLoadingExtendedStats: boolean;
  isLoadingPopularKeywords: boolean;
  isLoadingPopularPatents: boolean;
  
  // 에러 상태
  metricsError: string | null;
  activitiesError: string | null;
  systemMetricsError: string | null;
  extendedStatsError: string | null;
  popularKeywordsError: string | null;
  popularPatentsError: string | null;
  
  // 필터 및 설정
  selectedPeriod: string;
  autoRefresh: boolean;
  refreshInterval: number;
  
  // 액션
  fetchMetrics: (period?: string) => Promise<void>;
  fetchRecentActivities: (limit?: number) => Promise<void>;
  fetchSystemMetrics: (period?: string) => Promise<void>;
  fetchExtendedStats: (days?: number) => Promise<void>;
  fetchPopularKeywords: (days?: number) => Promise<void>;
  fetchPopularPatents: (days?: number) => Promise<void>;
  setSelectedPeriod: (period: string) => void;
  setAutoRefresh: (enabled: boolean) => void;
  setRefreshInterval: (interval: number) => void;
  clearErrors: () => void;
  refreshAll: () => Promise<void>;
  
  // 캐시 관련 액션
  getCachedData: <T>(key: string) => T | null;
  setCachedData: <T>(key: string, data: T) => void;
  clearCache: () => void;
  isCacheValid: (key: string) => boolean;
}

export const useAdminDashboardStore = create<DashboardState>((set, get) => ({
  // 초기 상태
  metrics: null,
  systemMetrics: [],
  recentActivities: [],
  extendedStats: null,
  popularKeywords: [],
  popularPatents: [],
  
  // 캐시 초기값
  cache: new Map(),
  cacheTimeout: 300000, // 5분 캐시 유효 시간
  
  isLoadingMetrics: false,
  isLoadingActivities: false,
  isLoadingSystemMetrics: false,
  isLoadingExtendedStats: false,
  isLoadingPopularKeywords: false,
  isLoadingPopularPatents: false,
  
  metricsError: null,
  activitiesError: null,
  systemMetricsError: null,
  extendedStatsError: null,
  popularKeywordsError: null,
  popularPatentsError: null,
  
  selectedPeriod: '7d',
  autoRefresh: true,
  refreshInterval: 60000, // 60초 (성능 최적화)
  
  // 대시보드 메트릭 조회
  fetchMetrics: async (period?: string) => {
    const currentPeriod = period || get().selectedPeriod;
    const cacheKey = `metrics_${currentPeriod}`;
    
    // 캐시된 데이터 확인
    const cachedMetrics = get().getCachedData<DashboardMetrics>(cacheKey);
    if (cachedMetrics) {
      console.log('[AdminDashboard] 캐시된 메트릭 사용:', currentPeriod);
      set({ 
        metrics: cachedMetrics, 
        selectedPeriod: currentPeriod 
      });
      return;
    }
    
    console.log('[AdminDashboard] 메트릭 조회 시작:', currentPeriod);
    set({ isLoadingMetrics: true, metricsError: null });
    
    try {
      console.log('[AdminDashboard] API 호출 중...');
      const metrics = await adminApiService.getDashboardMetrics(currentPeriod);
      console.log('[AdminDashboard] 메트릭 조회 성공:', metrics);
      console.log('[AdminDashboard] total_analyses 값:', metrics.total_analyses);
      
      // 캐시에 저장
      get().setCachedData(cacheKey, metrics);
      
      set({ 
        metrics, 
        isLoadingMetrics: false,
        selectedPeriod: currentPeriod 
      });
    } catch (error: any) {
      console.error('[AdminDashboard] 메트릭 조회 실패:', error);
      const errorMessage = error.response?.data?.detail || '메트릭 조회에 실패했습니다.';
      set({ 
        metricsError: errorMessage, 
        isLoadingMetrics: false 
      });
    }
  },
  
  // 최근 활동 조회
  fetchRecentActivities: async (limit = 10) => {
    const cacheKey = `activities_${limit}`;
    
    // 캐시된 데이터 확인
    const cachedActivities = get().getCachedData<any[]>(cacheKey);
    if (cachedActivities) {
      console.log('[AdminDashboard] 캐시된 활동 로그 사용');
      set({ recentActivities: cachedActivities });
      return;
    }
    
    set({ isLoadingActivities: true, activitiesError: null });
    
    try {
      const activities = await adminApiService.getRecentActivities(limit);
      
      // 캐시에 저장
      get().setCachedData(cacheKey, activities);
      
      set({ 
        recentActivities: activities, 
        isLoadingActivities: false 
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || '활동 로그 조회에 실패했습니다.';
      set({ 
        activitiesError: errorMessage, 
        isLoadingActivities: false 
      });
    }
  },
  
  // 시스템 메트릭 조회
  fetchSystemMetrics: async (period = '1h') => {
    set({ isLoadingSystemMetrics: true, systemMetricsError: null });
    
    try {
      const systemMetrics = await adminApiService.getSystemMetrics(period);
      set({ 
        systemMetrics, 
        isLoadingSystemMetrics: false 
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || '시스템 메트릭 조회에 실패했습니다.';
      set({ 
        systemMetricsError: errorMessage, 
        isLoadingSystemMetrics: false 
      });
    }
  },

  // 확장 통계 조회
  fetchExtendedStats: async (days = 30) => {
    set({ isLoadingExtendedStats: true, extendedStatsError: null });
    
    try {
      const extendedStats = await adminApiService.getExtendedDashboardStats(days);
      set({ 
        extendedStats, 
        isLoadingExtendedStats: false 
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || '확장 통계 조회에 실패했습니다.';
      set({ 
        extendedStatsError: errorMessage, 
        isLoadingExtendedStats: false 
      });
    }
  },

  // 인기 검색어 조회
  fetchPopularKeywords: async (days = 30) => {
    set({ isLoadingPopularKeywords: true, popularKeywordsError: null });
    
    try {
      const popularKeywords = await adminApiService.getPopularKeywords(days);
      set({ 
        popularKeywords, 
        isLoadingPopularKeywords: false 
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || '인기 검색어 조회에 실패했습니다.';
      set({ 
        popularKeywordsError: errorMessage, 
        isLoadingPopularKeywords: false 
      });
    }
  },

  // 인기 특허 조회
  fetchPopularPatents: async (days = 30) => {
    set({ isLoadingPopularPatents: true, popularPatentsError: null });
    
    try {
      const popularPatents = await adminApiService.getPopularPatents(days);
      set({ 
        popularPatents, 
        isLoadingPopularPatents: false 
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || '인기 특허 조회에 실패했습니다.';
      set({ 
        popularPatentsError: errorMessage, 
        isLoadingPopularPatents: false 
      });
    }
  },
  
  // 기간 설정
  setSelectedPeriod: (period: string) => {
    set({ selectedPeriod: period });
    get().fetchMetrics(period);
  },
  
  // 자동 새로고침 설정
  setAutoRefresh: (enabled: boolean) => {
    set({ autoRefresh: enabled });
  },
  
  // 새로고침 간격 설정
  setRefreshInterval: (interval: number) => {
    set({ refreshInterval: interval });
  },
  
  // 에러 클리어
  clearErrors: () => {
    set({ 
      metricsError: null, 
      activitiesError: null, 
      systemMetricsError: null,
      extendedStatsError: null,
      popularKeywordsError: null,
      popularPatentsError: null
    });
  },

  // 모든 데이터 새로고침
  refreshAll: async () => {
    const { selectedPeriod } = get();
    await Promise.all([
      get().fetchMetrics(selectedPeriod),
      get().fetchRecentActivities(),
      get().fetchSystemMetrics(),
      get().fetchExtendedStats(),
      get().fetchPopularKeywords(),
      get().fetchPopularPatents()
    ]);
  },

  // 캐시 관련 함수들
  getCachedData: <T>(key: string): T | null => {
    const { cache } = get();
    const entry = cache.get(key);
    if (!entry) return null;
    
    if (!get().isCacheValid(key)) {
      cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  },

  setCachedData: <T>(key: string, data: T) => {
    const { cache } = get();
    cache.set(key, {
      data,
      timestamp: Date.now(),
      key
    });
    set({ cache: new Map(cache) });
  },

  clearCache: () => {
    set({ cache: new Map() });
  },

  isCacheValid: (key: string): boolean => {
    const { cache, cacheTimeout } = get();
    const entry = cache.get(key);
    if (!entry) return false;
    
    return (Date.now() - entry.timestamp) < cacheTimeout;
  },
}));

// 자동 새로고침 훅
export const useAutoRefresh = () => {
  const { autoRefresh, refreshInterval, refreshAll } = useAdminDashboardStore();
  
  React.useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      refreshAll();
    }, refreshInterval);
    
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, refreshAll]);
};

// 메트릭 포맷팅 유틸리티
export const useMetricsFormatters = () => {
  const formatCurrency = (amount: number): string => {
    if (isNaN(amount) || amount === null || amount === undefined) {
      return '₩0';
    }
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(amount);
  };
  
  const formatNumber = (num: number): string => {
    if (isNaN(num) || num === null || num === undefined) {
      return '0';
    }
    return new Intl.NumberFormat('ko-KR').format(num);
  };
  
  const formatPercentage = (value: number): string => {
    if (isNaN(value) || value === null || value === undefined) {
      return '0.0%';
    }
    return `${value.toFixed(1)}%`;
  };
  
  const formatDate = (dateString: string): string => {
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateString));
  };
  
  const getStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'healthy':
      case 'active':
      case 'success':
        return 'text-green-600';
      case 'warning':
      case 'pending':
        return 'text-yellow-600';
      case 'error':
      case 'failed':
      case 'inactive':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };
  
  const getStatusBadgeColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'healthy':
      case 'active':
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'warning':
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'error':
      case 'failed':
      case 'inactive':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  return {
    formatCurrency,
    formatNumber,
    formatPercentage,
    formatDate,
    getStatusColor,
    getStatusBadgeColor,
  };
};

export default useAdminDashboardStore