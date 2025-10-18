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
  status?: number;
}

export interface ApiRequestOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  headers?: Record<string, string>;
  requireAuth?: boolean; // 인증이 필요한 요청인지 여부
}

/**
 * 토큰 가져오기 및 검증
 */
async function getAuthToken(): Promise<string | null> {
  try {
    // TokenManager를 사용하여 유효한 토큰 확보
    const { tokenManager } = await import('./tokenManager');
    const validToken = await tokenManager.ensureValidToken();
    
    if (validToken) {
      console.log('🔍 [API] 유효한 토큰 확보됨:', `${validToken.substring(0, 20)}...`);
      return validToken;
    }
    
    // TokenManager에서 토큰을 가져올 수 없는 경우 fallback
    const localToken = localStorage.getItem('token');
    
    // Supabase 세션에서도 토큰 확인
    const { supabase } = await import('./supabase');
    const { data: { session }, error } = await supabase.auth.getSession();
    
    console.log('🔍 [API] 토큰 확인 (fallback):', {
      localToken: localToken ? `${localToken.substring(0, 20)}...` : null,
      sessionExists: !!session,
      sessionToken: session?.access_token ? `${session.access_token.substring(0, 20)}...` : null,
      user: session?.user ? { id: session.user.id, email: session.user.email } : null,
      error: error?.message
    });
    
    if (error) {
      console.error('❌ [API] 세션 가져오기 실패:', error);
      return localToken; // 세션 오류 시 localStorage 토큰 사용
    }
    
    const supabaseToken = session?.access_token;
    
    // 두 토큰이 다르면 localStorage 업데이트
    if (supabaseToken && supabaseToken !== localToken) {
      localStorage.setItem('token', supabaseToken);
      console.log('🔄 [API] localStorage 토큰 업데이트됨');
      return supabaseToken;
    }
    
    // Supabase 토큰이 있으면 우선 사용
    return supabaseToken || localToken;
  } catch (error) {
    console.error('❌ [API] 토큰 가져오기 실패:', error);
    return localStorage.getItem('token');
  }
}



/**
 * 토큰 만료 처리
 */
async function handleTokenExpiration(): Promise<void> {
  try {
    console.warn('🔄 [API] 토큰 만료 감지, 로그아웃 처리');
    
    // localStorage 정리
    localStorage.removeItem('token');
    localStorage.removeItem('supabase.auth.token');
    
    // Supabase 로그아웃
    const { supabase } = await import('./supabase');
    await supabase.auth.signOut();
    
    // authStore 상태 초기화
    const { useAuthStore } = await import('../store/authStore');
    const { signOut } = useAuthStore.getState();
    await signOut();
    
    // 로그인 페이지로 리다이렉트
    window.location.href = '/login';
  } catch (error) {
    console.error('❌ [API] 토큰 만료 처리 실패:', error);
    // 강제 리다이렉트
    window.location.href = '/login';
  }
}



/**
 * 환경 감지 함수 (Vercel 환경 최적화)
 */
function detectEnvironment(): 'development' | 'production' {
  const currentHost = window.location.host;
  
  // Vercel 배포 환경 감지
  if (currentHost.includes('vercel.app') || import.meta.env.VITE_APP_ENV === 'production') {
    return 'production';
  }
  
  // 로컬 개발 환경 감지
  if (currentHost.includes('localhost') || currentHost.includes('127.0.0.1')) {
    return 'development';
  }
  
  // Vercel 또는 기타 프로덕션 환경
  return 'production';
}

// 개발 환경 여부를 나타내는 변수
const isDevelopment = detectEnvironment() === 'development';

/**
 * API URL 생성 헬퍼 함수
 * 개발/프로덕션 환경에 따라 적절한 API URL을 생성합니다.
 */
export function getApiUrl(endpoint: string): string {
  const environment = detectEnvironment();
  const currentProtocol = window.location.protocol;
  const currentHost = window.location.host;
  
  // 🚨 긴급 캐시 문제 해결: 3001 포트 사용
  const FORCE_API_PORT = '3001';
  const FORCE_API_BASE = `http://localhost:${FORCE_API_PORT}`;
  
  // 모든 환경 변수 로깅
  const envApiUrl = import.meta.env.VITE_API_BASE_URL;
  console.log(`🔗 [API] ===== API URL 생성 시작 =====`);
  console.log(`🔗 [API] 요청 엔드포인트: ${endpoint}`);
  console.log(`🔗 [API] 환경 감지: ${environment}`);
  console.log(`🔗 [API] 현재 호스트: ${currentHost}`);
  console.log(`🔗 [API] 현재 프로토콜: ${currentProtocol}`);
  console.log(`🔗 [API] VITE_API_BASE_URL: ${envApiUrl}`);
  console.log(`🔗 [API] 🚨 강제 API 베이스: ${FORCE_API_BASE}`);
  console.log(`🔗 [API] import.meta.env:`, import.meta.env);
  
  // 엔드포인트 정규화 함수 - 중복된 /api 경로 제거
  function normalizeEndpoint(baseUrl: string, endpoint: string): string {
    console.log(`🔗 [API] 정규화 전 - baseUrl: ${baseUrl}, endpoint: ${endpoint}`);
    let result;
    
    // baseUrl이 /api로 끝나고 endpoint가 /api로 시작하면 중복 제거
    if (baseUrl.endsWith('/api') && endpoint.startsWith('/api')) {
      result = `${baseUrl}${endpoint.substring(4)}`; // /api 제거
      console.log(`🔗 [API] 중복 /api 제거: ${result}`);
    }
    // baseUrl이 /api로 끝나지 않고 endpoint가 /api로 시작하지 않으면 /api 추가
    else if (!baseUrl.endsWith('/api') && !endpoint.startsWith('/api')) {
      result = `${baseUrl}/api${endpoint}`;
      console.log(`🔗 [API] /api 추가: ${result}`);
    }
    // 그 외의 경우는 그대로 연결
    else {
      result = `${baseUrl}${endpoint}`;
      console.log(`🔗 [API] 그대로 연결: ${result}`);
    }
    
    // 3001 포트 사용 허용
    // 포트 변경 로직 제거됨
    
    return result;
  }
  
  let finalUrl;
  
  if (environment === 'development') {
    console.log(`🔗 [API] 개발 환경 처리 시작`);
    // 🚨 긴급 해결책: 로컬 개발 환경에서는 무조건 3001 포트 사용
    if (currentHost.includes('localhost') || currentHost.includes('127.0.0.1')) {
      console.log(`🔗 [API] localhost 감지됨 - 강제로 3001 포트 사용`);
      finalUrl = normalizeEndpoint(FORCE_API_BASE, endpoint);
      console.log(`🔗 [API] ✅ 강제 3001 포트 최종 URL: ${finalUrl}`);
    } else {
      // 기타 로컬 포트 - 여전히 강제로 3001 사용
      finalUrl = normalizeEndpoint(FORCE_API_BASE, endpoint);
      console.log(`🔗 [API] ✅ 강제 3001 포트 (기타 로컬) 최종 URL: ${finalUrl}`);
    }
  } else {
    console.log(`🔗 [API] 프로덕션 환경 처리 시작`);
    // 프로덕션 환경 - Vercel Functions 사용
    const baseUrl = `${currentProtocol}//${currentHost}`;
    finalUrl = normalizeEndpoint(baseUrl, endpoint);
    console.log(`🔗 [API] ✅ 프로덕션 최종 URL: ${finalUrl}`);
  }
  
  // 3001 포트 사용 허용
  // 최종 안전장치 제거됨
  
  console.log(`🔗 [API] ===== 최종 반환 URL: ${finalUrl} =====`);
  return finalUrl;
}

/**
 * API URL 생성 (대체 URL 포함)
 * 메인 URL이 실패할 경우 대체 URL을 제공합니다.
 */
export function getApiUrlWithFallback(endpoint: string): { primary: string; fallback?: string } {
  const environment = detectEnvironment();
  const primary = getApiUrl(endpoint);
  
  if (environment === 'development') {
    // 개발 환경에서는 로컬 API 서버를 우선 사용하고, 실패 시 Vite 프록시를 시도
    return {
      primary,
      fallback: endpoint // Vite 프록시를 통한 접근
    };
  }
  
  return { primary };
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
    requireAuth = true,
    ...fetchOptions
  } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  let lastError: Error | null = null;

  // 인증이 필요한 요청인 경우 토큰 추가
  let authHeaders = {};
  if (requireAuth) {
    // 관리자 API 요청인지 확인
    const isAdminRequest = url.includes('/api/admin/') || url.includes('/admin/');
    
    let token;
    if (isAdminRequest) {
      token = await getAuthToken();
    } else {
      token = await getAuthToken();
    }
    
    if (!token) {
      clearTimeout(timeoutId);
      return {
        success: false,
        error: '인증 토큰이 없습니다. 다시 로그인해주세요.',
        errorCode: 'NO_TOKEN',
        status: 401
      };
    }
    authHeaders = { 'Authorization': `Bearer ${token}` };
  }

  // 3001 포트 사용 허용
  // 포트 차단 로직 제거됨

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      console.log(`🔄 [API] 요청 시도 ${attempt + 1}/${retries + 1}: ${url}`);

      const response = await fetch(url, {
        ...fetchOptions,
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
          ...headers,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log(`📡 [API] 응답 상태: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        // 401 Unauthorized - 토큰 만료 또는 인증 실패
        if (response.status === 401 && requireAuth) {
          console.warn('🔒 [API] 인증 실패 (401), 토큰 갱신 시도');
          
          // TokenManager를 사용하여 토큰 갱신 시도
          try {
            const { tokenManager } = await import('./tokenManager');
            const refreshedToken = await tokenManager.refreshToken();
            
            if (refreshedToken) {
              console.log('✅ [API] 토큰 갱신 성공, 요청 재시도');
              
              // 갱신된 토큰으로 요청 재시도
              const retryResponse = await fetch(url, {
                ...fetchOptions,
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${refreshedToken}`,
                  ...headers,
                },
                signal: controller.signal,
              });
              
              if (retryResponse.ok) {
                const retryData = await retryResponse.json();
                console.log('✅ [API] 토큰 갱신 후 요청 성공');
                return retryData;
              }
            }
          } catch (refreshError) {
            console.error('❌ [API] 토큰 갱신 실패:', refreshError);
          }
          
          // 토큰 갱신 실패 시 로그아웃 처리
          await handleTokenExpiration();
          return {
            success: false,
            error: '인증이 만료되었습니다. 다시 로그인해주세요.',
            errorCode: 'AUTH_EXPIRED',
            status: 401
          };
        }

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
      console.error(`❌ [API] 요청 실패 (시도 ${attempt + 1}/${retries + 1}):`, {
        url,
        error: lastError.message,
        attempt: attempt + 1
      });

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
  console.error(`💥 [API] 모든 재시도 실패: ${url}`, lastError);
  return {
    success: false,
    error: lastError?.message || 'Network request failed',
    errorCode: 'NETWORK_ERROR',
    status: 0
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
 * PUT 요청
 */
export async function apiPut<T = any>(
  url: string,
  data?: any,
  options: ApiRequestOptions = {}
): Promise<ApiResponse<T>> {
  return apiRequest<T>(url, {
    ...options,
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * 특허 검색 API 호출
 */
export async function searchPatents(searchParams: any): Promise<ApiResponse> {
  console.log('🔍 [API] 특허 검색 요청:', searchParams);
  
  // userId가 searchParams에 있는지 확인하고 POST body에 포함
  const requestBody = {
    ...searchParams,
    // userId가 있으면 명시적으로 포함
    ...(searchParams.userId && { userId: searchParams.userId })
  };
  
  console.log('🔍 [API] 검색 요청 body:', requestBody);
  
  return apiPost(getApiUrl('/api/search'), requestBody, {
    timeout: 45000, // 검색은 시간이 오래 걸릴 수 있음
    retries: 2,
    retryDelay: 2000,
    requireAuth: false, // 특허 검색은 인증 불필요
  });
}

/**
 * 사용자 통계 조회 API 호출
 */
export async function getUserStats(userId: string): Promise<ApiResponse> {
  try {
    console.log('📊 [API] 사용자 통계 조회 시작:', userId);

    const { primary, fallback } = getApiUrlWithFallback(`/api/users?resource=stats&userId=${userId}`);
    console.log('📊 [API] 사용할 API URL:', primary, fallback ? `(대체: ${fallback})` : '');

    // 먼저 기본 URL로 시도
    try {
      const response = await apiRequest(primary, {
        timeout: 30000,
        retries: 2,
        retryDelay: 2000,
        requireAuth: !isDevelopment // 개발 환경에서는 인증 불필요
      });
      
      console.log('📊 [API] 사용자 통계 응답 (기본 URL):', {
        success: response.success,
        dataKeys: response.data ? Object.keys(response.data) : [],
        message: response.message,
        error: response.error,
        status: response.status
      });
      
      return response;
    } catch (primaryError) {
      console.warn('⚠️ [API] 기본 URL 실패, 대체 URL 시도:', primaryError);
      
      if (fallback) {
        const response = await apiRequest(fallback, {
          timeout: 30000,
          retries: 2,
          retryDelay: 2000,
          requireAuth: !isDevelopment // 개발 환경에서는 인증 불필요
        });
        
        console.log('📊 [API] 사용자 통계 응답 (대체 URL):', {
          success: response.success,
          dataKeys: response.data ? Object.keys(response.data) : [],
          message: response.message,
          error: response.error,
          status: response.status
        });
        
        return response;
      }
      
      throw primaryError;
    }
  } catch (error) {
    console.error('❌ [API] 사용자 통계 요청 중 예외 발생:', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      userId
    });
    
    return {
      success: false,
      error: error instanceof Error ? error.message : '사용자 통계를 가져오는 중 오류가 발생했습니다.',
      errorCode: 'NETWORK_ERROR',
      data: null
    };
  }
}

/**
 * 사용자 활동 통계 조회 API 호출
 */
export async function getUserActivityStats(userId: string): Promise<ApiResponse> {
  try {
    console.log('📈 [API] 사용자 활동 통계 조회 시작:', userId);

    const { primary, fallback } = getApiUrlWithFallback(`/api/users?resource=activities&userId=${userId}`);
    console.log('📈 [API] 사용할 API URL:', primary, fallback ? `(대체: ${fallback})` : '');

    // 먼저 기본 URL로 시도
    try {
      const response = await apiRequest(primary, {
        timeout: 30000,
        retries: 2,
        retryDelay: 2000,
        requireAuth: true
      });
      
      console.log('📈 [API] 활동 통계 응답 (기본 URL):', {
        success: response.success,
        dataKeys: response.data ? Object.keys(response.data) : [],
        message: response.message,
        error: response.error,
        status: response.status
      });
      
      return response;
    } catch (primaryError) {
      console.warn('⚠️ [API] 기본 URL 실패, 대체 URL 시도:', primaryError);
      
      if (fallback) {
        const response = await apiRequest(fallback, {
          timeout: 30000,
          retries: 2,
          retryDelay: 2000,
          requireAuth: true
        });
        
        console.log('📈 [API] 활동 통계 응답 (대체 URL):', {
          success: response.success,
          dataKeys: response.data ? Object.keys(response.data) : [],
          message: response.message,
          error: response.error,
          status: response.status
        });
        
        return response;
      }
      
      throw primaryError;
    }
  } catch (error) {
    console.error('❌ [API] 활동 통계 요청 중 예외 발생:', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      userId
    });
    
    return {
      success: false,
      error: error instanceof Error ? error.message : '활동 통계를 가져오는 중 오류가 발생했습니다.',
      errorCode: 'NETWORK_ERROR',
      data: null
    };
  }
}

/**
 * 대시보드 통계 조회 API 호출
 */
export async function getDashboardStats(userId: string, period: string = '100d'): Promise<ApiResponse> {
  try {
    console.log('📊 [API] 대시보드 통계 조회 시작:', { userId, period });

    // 개발 환경에서는 test_user_id 파라미터 사용
    const isDevelopment = detectEnvironment() === 'development';
    const queryParam = isDevelopment ? `test_user_id=${userId}` : `user_id=${userId}`;
    const timestamp = Date.now();
    const { primary, fallback } = getApiUrlWithFallback(`/api/dashboard-stats?${queryParam}&period=${period}&_t=${timestamp}`);
    console.log('📊 [API] 사용할 API URL:', primary, fallback ? `(대체: ${fallback})` : '');

    // 먼저 기본 URL로 시도
    try {
      const response = await apiRequest(primary, {
        timeout: 30000,
        retries: 2,
        retryDelay: 2000,
        requireAuth: true
      });
      
      console.log('📊 [API] 대시보드 통계 응답 (기본 URL):', {
        success: response.success,
        dataKeys: response.data ? Object.keys(response.data) : [],
        message: response.message,
        error: response.error,
        status: response.status
      });
      
      return response;
    } catch (primaryError) {
      console.warn('⚠️ [API] 기본 URL 실패, 대체 URL 시도:', primaryError);
      
      if (fallback) {
        const response = await apiRequest(fallback, {
          timeout: 30000,
          retries: 2,
          retryDelay: 2000,
          requireAuth: true
        });
        
        console.log('📊 [API] 대시보드 통계 응답 (대체 URL):', {
          success: response.success,
          dataKeys: response.data ? Object.keys(response.data) : [],
          message: response.message,
          error: response.error,
          status: response.status
        });
        
        return response;
      }
      
      throw primaryError;
    }
  } catch (error) {
    console.error('❌ [API] 대시보드 통계 요청 중 예외 발생:', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      userId,
      period
    });
    
    return {
      success: false,
      error: error instanceof Error ? error.message : '대시보드 통계를 가져오는 중 오류가 발생했습니다.',
      errorCode: 'NETWORK_ERROR',
      data: null
    };
  }
}

/**
 * 키워드 분석 데이터 조회 API 호출
 */
export async function getKeywordAnalytics(userId: string): Promise<ApiResponse> {
  try {
    console.log('🔍 [API] 키워드 분석 데이터 조회 시작:', userId);

    const apiUrl = getApiUrl('/api/users?resource=keyword-analytics');
    console.log('🔍 [API] 사용할 API URL:', apiUrl);

    const response = await apiRequest(apiUrl, {
      timeout: 30000,
      retries: 3,
      retryDelay: 2000,
      requireAuth: true
    });
    
    console.log('🔍 [API] 키워드 분석 응답:', {
      success: response.success,
      dataKeys: response.data ? Object.keys(response.data) : [],
      message: response.message,
      error: response.error,
      status: response.status
    });
    
    return response;
  } catch (error) {
    console.error('❌ [API] 키워드 분석 요청 중 예외 발생:', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      userId
    });
    
    return {
      success: false,
      error: error instanceof Error ? error.message : '키워드 분석 데이터를 가져오는 중 오류가 발생했습니다.',
      errorCode: 'NETWORK_ERROR',
      data: null
    };
  }
}

/**
 * 특허 상세 정보 API 호출
 */
export async function getPatentDetail(applicationNumber: string): Promise<ApiResponse> {
  console.log('📄 [API] 특허 상세 정보 요청:', applicationNumber);
  
  return apiGet(getApiUrl(`/api/detail?applicationNumber=${applicationNumber}`), {
    timeout: 30000,
    retries: 2,
    retryDelay: 2000,
    requireAuth: false, // 특허 상세 정보는 인증 불필요
  });
}

/**
 * AI 분석 API 호출
 */
export async function requestAiAnalysis(patentData: any, analysisType: string): Promise<ApiResponse> {
  console.log('🤖 [API] AI 분석 요청:', { analysisType });
  
  return apiPost(getApiUrl('/api/ai-analysis'), { patentData, analysisType }, {
    timeout: 300000, // AI 분석은 시간이 오래 걸림 (5분)
    retries: 1,
    retryDelay: 3000,
    requireAuth: true, // AI 분석은 인증 필요
  });
}

/**
 * 네트워크 연결 상태 확인
 */
export async function checkNetworkConnection(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(getApiUrl('/api/health'), {
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
  
  const apiUrl = getApiUrl(`/api/users/profile?userId=${encodeURIComponent(userId)}`);
  console.log('👤 [API] 프로필 조회 URL:', apiUrl);
  
  return apiGet(apiUrl, {
    timeout: 15000,
    retries: 2,
    retryDelay: 1000,
    requireAuth: true,
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
  
  const apiUrl = getApiUrl(`/api/users/profile?userId=${encodeURIComponent(userId)}`);
  console.log('📝 [API] 프로필 업데이트 URL:', apiUrl);
  
  return apiPut(apiUrl, payload, {
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
  
  return apiPost(getApiUrl('/api/auth/register'), userData, {
    timeout: 20000,
    retries: 1,
    retryDelay: 2000,
    requireAuth: false, // 회원가입은 인증 불필요
  });
}

/**
 * 비밀번호 재설정 요청 API 호출
 */
export async function requestPasswordReset(email: string): Promise<ApiResponse> {
  const apiUrl = getApiUrl('/api/auth/reset-password');
  
  return await apiPost(apiUrl, { email }, {
    timeout: 10000,
    retries: 2,
    requireAuth: false, // 비밀번호 재설정은 인증 불필요
  });
}

/**
 * 관리자 권한 확인
 */
export async function checkAdminPermission(): Promise<ApiResponse> {
  try {
    console.log('🔐 [API] 관리자 권한 확인 시작');
    
    const apiUrl = getApiUrl('/api/admin?resource=check-permission');
    console.log('🔐 [API] 관리자 권한 확인 요청:', apiUrl);
    
    const response = await apiGet(apiUrl, {
      timeout: 10000,
      retries: 1,
      requireAuth: true
    });

    console.log('🔐 [API] 관리자 권한 확인 응답:', response);
    
    return response;
  } catch (error) {
    console.error('❌ [API] 관리자 권한 확인 실패:', error);
    return {
      success: false,
      error: 'Admin permission check failed',
      errorCode: 'ADMIN_CHECK_FAILED'
    };
  }
}

// 구독/결제 및 크레딧 관련 API 래퍼 추가
export async function getDashboardSubscription(): Promise<ApiResponse> {
  try {
    const { primary, fallback } = getApiUrlWithFallback('/api/dashboard-subscription');
    try {
      return await apiRequest(primary, { requireAuth: true });
    } catch (e) {
      if (fallback) {
        return await apiRequest(fallback, { requireAuth: true });
      }
      throw e;
    }
  } catch (error) {
    return { success: false, error: '구독 정보를 가져오지 못했습니다.' };
  }
}

export async function getDashboardUsageCosts(params?: { start_date?: string; end_date?: string }): Promise<ApiResponse> {
  try {
    const query = new URLSearchParams();
    if (params?.start_date) query.set('start_date', params.start_date);
    if (params?.end_date) query.set('end_date', params.end_date);
    const qs = query.toString() ? `?${query.toString()}` : '';
    const { primary, fallback } = getApiUrlWithFallback(`/api/dashboard-usage-costs${qs}`);
    try {
      return await apiRequest(primary, { requireAuth: true });
    } catch (e) {
      if (fallback) {
        return await apiRequest(fallback, { requireAuth: true });
      }
      throw e;
    }
  } catch (error) {
    return { success: false, error: '사용 비용 데이터를 가져오지 못했습니다.' };
  }
}

export async function getCreditPackages(): Promise<ApiResponse> {
  try {
    const { primary, fallback } = getApiUrlWithFallback('/api/dashboard-charge-credits');
    try {
      return await apiRequest(primary, { requireAuth: false });
    } catch (e) {
      if (fallback) {
        return await apiRequest(fallback, { requireAuth: false });
      }
      throw e;
    }
  } catch (error) {
    return { success: false, error: '크레딧 패키지 정보를 가져오지 못했습니다.' };
  }
}

export async function chargeCredits(amount: number, payment_method: 'card' | 'bank_transfer' | 'kakao_pay' = 'card'): Promise<ApiResponse> {
  try {
    const response = await apiPost('/api/billing', {
      amount,
      payment_method,
      type: 'credit_purchase'
    });

    return response;
  } catch (error) {
    console.error('크레딧 충전 실패:', error);
    return {
      success: false,
      error: '크레딧 충전에 실패했습니다.'
    };
  }
}