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
  
  try {
    const response = await apiGet(`/api/users/stats?userId=${encodeURIComponent(userId)}`, {
      timeout: 20000,
      retries: 2,
      retryDelay: 1500,
    });
    
    console.log('📊 [API] 사용자 통계 응답:', {
      success: response.success,
      dataKeys: response.data ? Object.keys(response.data) : [],
      message: response.message,
      error: response.error
    });
    
    if (!response.success) {
      console.error('❌ [API] 사용자 통계 요청 실패:', response.error || response.message);
    }
    
    return response;
  } catch (error) {
    console.error('❌ [API] 사용자 통계 요청 중 예외 발생:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '사용자 통계를 가져오는 중 오류가 발생했습니다.',
      data: null
    };
  }
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

/**
 * 사용자 프로필 조회 API 호출
 */
export async function getUserProfile(userId: string): Promise<ApiResponse> {
  console.log('👤 [API] 사용자 프로필 조회 요청:', userId);
  
  return apiGet(`/api/users/profile?userId=${encodeURIComponent(userId)}`, {
    timeout: 15000,
    retries: 2,
    retryDelay: 1000,
  });
}

/**
 * 사용자 프로필 업데이트 API 호출
 */
export async function updateUserProfile(userId: string, profileData: {
  name: string;
  phone: string;
  company?: string;
  bio?: string;
}): Promise<ApiResponse> {
  console.log('📝 [API] 사용자 프로필 업데이트 요청:', userId);
  console.log('📝 [API] 프로필 데이터:', profileData);
  
  // 전화번호 정규화: 숫자만 남기고 3-4-4 형식으로 변환
  const normalizePhone = (raw: string) => {
    const digits = (raw || '').replace(/\D/g, '')
    const d = digits.slice(0, 11)
    if (d.length <= 3) return d
    if (d.length <= 7) return `${d.slice(0,3)}-${d.slice(3)}`
    return `${d.slice(0,3)}-${d.slice(3,7)}-${d.slice(7)}`
  }

  const payload = {
    ...profileData,
    phone: normalizePhone(profileData.phone)
  }
  
  console.log('📝 [API] 정규화된 페이로드:', payload);
  
  // 로컬 API 서버(포트 3001)로 요청
  return apiRequest(`http://localhost:3001/api/users/profile?userId=${encodeURIComponent(userId)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
    timeout: 15000,
    retries: 2,
    retryDelay: 1000,
  });
}

/**
 * 사용자 등록 API 호출
 */
export async function registerUser(userData: {
  email: string;
  password: string;
  name: string;
  phone: string;
  company?: string;
}): Promise<ApiResponse> {
  console.log('📝 [API] 사용자 등록 요청:', userData.email);
  
  return apiPost('/api/auth/register', userData, {
    timeout: 20000,
    retries: 1,
    retryDelay: 2000,
  });
}

/**
 * 비밀번호 재설정 요청 API 호출
 */
export async function requestPasswordReset(email: string): Promise<ApiResponse> {
  console.log('🔐 [API] 비밀번호 재설정 요청:', email);
  
  return apiPost('/api/auth/reset-password', { email }, {
    timeout: 15000,
    retries: 2,
    retryDelay: 1500,
  });
}