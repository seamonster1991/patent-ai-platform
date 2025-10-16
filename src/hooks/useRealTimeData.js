import { useState, useEffect, useRef } from 'react';
import useAdminAuthStore from '../stores/adminAuthStore';

/**
 * 실시간 데이터 업데이트를 위한 커스텀 훅
 * @param {string} endpoint - API 엔드포인트
 * @param {Object} options - 설정 옵션
 * @param {number} options.interval - 폴링 간격 (밀리초, 기본값: 30000)
 * @param {boolean} options.enabled - 실시간 업데이트 활성화 여부 (기본값: true)
 * @param {Object} options.params - API 요청 파라미터
 * @returns {Object} { data, loading, error, refresh, lastUpdated }
 */
export const useRealTimeData = (endpoint, options = {}) => {
  const {
    interval = 30000, // 30초마다 업데이트
    enabled = true,
    params = {}
  } = options;

  const { token } = useAdminAuthStore();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  
  const intervalRef = useRef(null);
  const mountedRef = useRef(true);

  const fetchData = async (showLoading = false) => {
    if (!token || !endpoint) return;

    try {
      if (showLoading) setLoading(true);
      setError(null);

      // URL 파라미터 구성
      const queryParams = new URLSearchParams(params).toString();
      const url = queryParams ? `${endpoint}?${queryParams}` : endpoint;

      console.log(`[useRealTimeData] Fetching: ${url}`);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (mountedRef.current) {
        setData(result.data || result);
        setLastUpdated(new Date());
        console.log(`[useRealTimeData] Data updated for ${endpoint}:`, result.data || result);
      }
    } catch (err) {
      console.error(`[useRealTimeData] Error fetching ${endpoint}:`, err);
      if (mountedRef.current) {
        setError(err.message);
      }
    } finally {
      if (mountedRef.current && showLoading) {
        setLoading(false);
      }
    }
  };

  const refresh = () => {
    fetchData(true);
  };

  useEffect(() => {
    mountedRef.current = true;
    
    if (!enabled || !token) {
      setLoading(false);
      return;
    }

    // 초기 데이터 로드
    fetchData(true);

    // 폴링 설정
    if (interval > 0) {
      intervalRef.current = setInterval(() => {
        fetchData(false); // 백그라운드 업데이트는 로딩 표시 안함
      }, interval);
    }

    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [endpoint, token, enabled, interval, JSON.stringify(params)]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return {
    data,
    loading,
    error,
    refresh,
    lastUpdated
  };
};

/**
 * 관리자 대시보드 실시간 데이터 훅
 */
export const useAdminDashboardData = (userType = 'all', dateRange = {}) => {
  const params = { userType };
  if (dateRange.start) params.startDate = dateRange.start;
  if (dateRange.end) params.endDate = dateRange.end;
  
  return useRealTimeData('/api/admin/dashboard/statistics', {
    interval: 60000, // 1분마다 업데이트
    params
  });
};

/**
 * 사용자 분석 실시간 데이터 훅
 */
export const useUserAnalyticsData = (period = 'week') => {
  return useRealTimeData('/api/admin/analytics', {
    interval: 120000, // 2분마다 업데이트
    params: { type: 'users', period }
  });
};

/**
 * 키워드 분석 실시간 데이터 훅
 */
export const useKeywordAnalyticsData = (period = 'week') => {
  return useRealTimeData('/api/admin/analytics-keywords', {
    interval: 180000, // 3분마다 업데이트
    params: { period }
  });
};

/**
 * 리포트 분석 실시간 데이터 훅
 */
export const useReportAnalyticsData = (period = 'week') => {
  return useRealTimeData('/api/admin/analytics-reports', {
    interval: 120000, // 2분마다 업데이트
    params: { period }
  });
};



/**
 * 결제 상태 실시간 모니터링 훅
 */
export const usePaymentStatusData = (orderId) => {
  return useRealTimeData('/api/admin/payment-status', {
    interval: 10000, // 10초마다 업데이트 (결제 진행 중일 때)
    enabled: !!orderId,
    params: { orderId }
  });
};

/**
 * 시스템 상태 실시간 모니터링 훅
 */
export const useSystemStatusData = () => {
  return useRealTimeData('/api/admin/system-status', {
    interval: 30000, // 30초마다 업데이트
  });
};

export default useRealTimeData;