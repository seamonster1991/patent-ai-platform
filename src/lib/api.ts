/**
 * API 유틸리티 함수들
 * 네트워크 요청 타임아웃, 재시도 로직, 에러 핸들링을 포함
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errorCode?: string;
}

export interface ApiRequestOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  headers?: Record<string, string>;
}

/**
 * 기본 API 요청 함수
 */
export async function apiRequest<T = any>(
  url: string,
  options: RequestInit & ApiRequestOptions = {}
): Promise<ApiResponse<T>> {
  const {
    timeout = 30000,
    retries = 3,
    retryDelay = 1000,
    headers = {},
    ...fetchOptions
  } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      console.log(`🔄 [API] 요청 시도 ${attempt + 1}/${retries + 1}: ${url}`);

      const response = await fetch(url, {
        ...fetchOptions,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log(`📡 [API] 응답 상태: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        // HTTP 에러 상태 처리
        let errorData: any = {};
        try {
          errorData = await response.json();
        } catch {
          errorData = { message: `HTTP ${response.status}: ${response.statusText}` };
        }

        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`✅ [API] 요청 성공: ${url}`);

      return data;
    } catch (error) {
      lastError = error as Error;
      console.error(`❌ [API] 요청 실패 (시도 ${attempt + 1}):`, error);

      // AbortError (타임아웃)인 경우 재시도하지 않음
      if (error instanceof Error && error.name === 'AbortError') {
        clearTimeout(timeoutId);
        return {
          success: false,
          error: '요청 시간이 초과되었습니다. 네트워크 연결을 확인해주세요.',
          errorCode: 'TIMEOUT_ERROR'
        };
      }

      // 마지막 시도가 아니면 재시도
      if (attempt < retries) {
        console.log(`⏳ [API] ${retryDelay}ms 후 재시도...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        continue;
      }
    }
  }

  clearTimeout(timeoutId);

  // 모든 재시도 실패
  return {
    success: false,
    error: lastError?.message || '알 수 없는 오류가 발생했습니다.',
    errorCode: 'NETWORK_ERROR'
  };
}

/**
 * GET 요청
 */
export async function apiGet<T = any>(
  url: string,
  options: ApiRequestOptions = {}
): Promise<ApiResponse<T>> {
  return apiRequest<T>(url, { ...options, method: 'GET' });
}

/**
 * POST 요청
 */
export async function apiPost<T = any>(
  url: string,
  data?: any,
  options: ApiRequestOptions = {}
): Promise<ApiResponse<T>> {
  return apiRequest<T>(url, {
    ...options,
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * 특허 검색 API 호출
 */
export async function searchPatents(searchParams: any): Promise<ApiResponse> {
  console.log('🔍 [API] 특허 검색 요청:', searchParams);
  
  return apiPost('/api/search', searchParams, {
    timeout: 45000, // 검색은 시간이 오래 걸릴 수 있음
    retries: 2,
    retryDelay: 2000,
  });
}

/**
 * 사용자 통계 API 호출
 */
export async function getUserStats(userId: string): Promise<ApiResponse> {
  console.log('📊 [API] 사용자 통계 요청:', userId);
  // 서버리스 함수 경로 특성상 동적 세그먼트가 params로 전달되지 않을 수 있으므로
  // 쿼리스트링으로 userId를 전달하도록 변경
  return apiGet(`/api/users/stats?userId=${encodeURIComponent(userId)}`, {
    timeout: 20000,
    retries: 2,
    retryDelay: 1500,
  });
}

/**
 * 특허 상세 정보 API 호출
 */
export async function getPatentDetail(applicationNumber: string): Promise<ApiResponse> {
  console.log('📄 [API] 특허 상세 정보 요청:', applicationNumber);
  
  return apiGet(`/api/detail?applicationNumber=${applicationNumber}`, {
    timeout: 30000,
    retries: 2,
    retryDelay: 2000,
  });
}

/**
 * AI 분석 API 호출
 */
export async function requestAiAnalysis(patentData: any, analysisType: string): Promise<ApiResponse> {
  console.log('🤖 [API] AI 분석 요청:', { analysisType });
  
  return apiPost('/api/ai-analysis', { patentData, analysisType }, {
    timeout: 300000, // AI 분석은 시간이 오래 걸림 (5분)
    retries: 1,
    retryDelay: 3000,
  });
}

/**
 * 네트워크 연결 상태 확인
 */
export async function checkNetworkConnection(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch('/api/health', {
      method: 'GET',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * API 에러 메시지 포맷팅
 */
export function formatApiError(error: any): string {
  if (typeof error === 'string') {
    return error;
  }

  if (error?.message) {
    return error.message;
  }

  if (error?.error) {
    return error.error;
  }

  return '알 수 없는 오류가 발생했습니다.';
}