/**
 * Admin API Service - Python 백엔드와 연결
 * 관리자 대시보드 API 호출 관리
 */

import axios, { AxiosInstance, AxiosResponse } from 'axios';

// API 기본 URL 설정
const API_BASE_URL = import.meta.env.MODE === 'production' 
  ? '/api' // Vercel에서는 상대 경로 사용
  : 'http://localhost:3001'; // Node.js Express 서버 포트

// 타임아웃 설정 최적화
const API_TIMEOUTS = {
  auth: 5000,      // 인증 관련: 5초
  dashboard: 8000, // 대시보드: 8초
  default: 10000   // 기본: 10초
};

// Axios 인스턴스 생성
const adminApi: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUTS.default,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청 인터셉터 - 토큰 자동 추가 및 타임아웃 동적 설정
adminApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('admin_token');
    if (token && config.headers) {
      (config.headers as any).Authorization = `Bearer ${token}`;
    }
    
    // URL에 따른 동적 타임아웃 설정
    if (config.url?.includes('/auth/')) {
      config.timeout = API_TIMEOUTS.auth;
    } else if (config.url?.includes('/dashboard/')) {
      config.timeout = API_TIMEOUTS.dashboard;
    }
    
    // Content-Type 헤더 강제 설정
    if (config.headers && config.data) {
      (config.headers as any)['Content-Type'] = 'application/json';
    }
    
    console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url} (timeout: ${config.timeout}ms)`, {
      headers: config.headers,
      data: config.data ? (typeof config.data === 'string' ? config.data : JSON.stringify(config.data)) : 'no data'
    });
    
    return config;
  },
  (error) => {
    console.error('[API Request Error]', error);
    return Promise.reject(error);
  }
);

// 응답 인터셉터 - 에러 처리 개선
adminApi.interceptors.response.use(
  (response: AxiosResponse) => {
    console.log(`[API Response] ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status} (${response.headers['content-length'] || 'unknown'} bytes)`);
    return response;
  },
  (error) => {
    const method = error.config?.method?.toUpperCase();
    const url = error.config?.url;
    const status = error.response?.status;
    
    console.error(`[API Error] ${method} ${url} - Status: ${status}`, {
      message: error.message,
      code: error.code,
      response: error.response?.data
    });
    
    // 타임아웃 에러 처리
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      console.error('[API Timeout] Request timed out');
      error.isTimeout = true;
      error.userMessage = '요청 시간이 초과되었습니다. 네트워크 연결을 확인하고 다시 시도해주세요.';
    }
    
    // 네트워크 에러 처리
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      console.error('[API Network Error] Cannot connect to server');
      error.isNetworkError = true;
      error.userMessage = '서버에 연결할 수 없습니다. 네트워크 연결을 확인해주세요.';
    }
    
    // 401 에러 처리 (토큰 만료)
    if (status === 401) {
      console.warn('[API Auth Error] Token expired or invalid');
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_refresh_token');
      
      // 현재 페이지가 로그인 페이지가 아닌 경우에만 리다이렉트
      if (!window.location.pathname.includes('/admin/login')) {
        window.location.href = '/admin/login';
      }
      error.userMessage = '인증이 만료되었습니다. 다시 로그인해주세요.';
    }
    
    // 403 에러 처리 (권한 없음)
    if (status === 403) {
      error.userMessage = '접근 권한이 없습니다.';
    }
    
    // 404 에러 처리
    if (status === 404) {
      error.userMessage = '요청한 리소스를 찾을 수 없습니다.';
    }
    
    // 500 에러 처리 (서버 에러)
    if (status >= 500) {
      error.userMessage = '서버에 문제가 발생했습니다. 잠시 후 다시 시도해주세요.';
    }
    
    return Promise.reject(error);
  }
);

// 제네릭 API 응답 타입
export interface ApiResponse<T> {
  data: T;
  success?: boolean;
  message?: string;
}

// 타입 정의
export interface LoginRequest {
  email: string;
  password: string;
  totp_code?: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  admin: AdminUser;
  requires_2fa: boolean;
}

export interface DashboardMetrics {
  total_users: number;
  active_users: number;
  total_revenue: number;
  monthly_revenue: number;
  total_patents: number;
  pending_patents: number;
  user_growth_rate: number;
  revenue_growth_rate: number;
  total_analyses: number;
  analysis_growth_rate: number;
  
  // 기존 통계
  totalUsers: number;
  totalSearches: number;
  totalReports: number;
  activeUsers: number;
  todaySearches: number;
  todayReports: number;
  todayNewUsers: number;
  
  // 로그인 통계
  totalLogins: number;
  todayLogins: number;
  weeklyLogins: number;
  monthlyLogins: number;
  uniqueLoginUsers: number;
  
  // 검색 통계
  averageDailySearches: number;
  searchesPerUser: number;
  uniqueSearchUsers: number;
  
  // 리포트 생성 통계
  averageDailyReports: number;
  reportsPerUser: number;
  uniqueReportUsers: number;
  
  // 전환율 통계
  searchToReportRate: number;
  loginToSearchRate: number;
  newToActiveUserRate: number;
  userActivityRate: number;
  
  // 추가 통계
  averageSessionTime: number;
  returnUserRate: number;
  engagementScore: number;
  
  system_health: {
    status: string;
    cpu_usage: number;
    memory_usage: number;
    disk_usage: number;
  };
  recent_activities: Array<{
    id: string;
    type: string;
    description: string;
    timestamp: string;
    user_email?: string;
  }>;
  timestamp: string;
}

// 확장된 대시보드 통계 타입
export interface ExtendedDashboardStats {
  total_users: number;
  total_logins: number;
  total_searches: number;
  total_reports: number;
  total_patent_views: number;
  total_downloads: number;
  avg_logins_per_user: number;
  avg_searches_per_user: number;
  avg_reports_per_user: number;
  login_to_report_rate: number;
  search_to_report_rate: number;
  period_days: number;
}

// 인기 검색어 타입 - 백엔드 응답 구조에 맞게 수정
export interface PopularKeyword {
  keyword: string;
  count: number;
  rank: number;
}

// 인기 특허 타입 - 백엔드 응답 구조에 맞게 수정
export interface PopularPatent {
  patent_number: string;
  title: string;
  analysis_count: number;
  rank: number;
}

// 사용자 삭제 응답 타입
export interface UserDeleteResponse {
  success: boolean;
  message: string;
  user_id: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  username?: string;
  role?: string;
  status?: string;
  created_at: string;
  updated_at?: string;
  last_login?: string;
  is_active: boolean;
  subscription_status: string;
  subscription_type?: 'free' | 'paid' | 'premium';
  total_patents: number;
  deleted_at?: string;
  point_balance?: number;
  total_searches?: number;
  total_payments?: number;
  last_payment_date?: string;
  registration_date?: string;
  // 새로 추가된 삭제 관련 필드들
  deletion_reason?: string;
  previously_deleted?: boolean;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  permissions: string[];
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  last_login?: string;
}



export interface Payment {
  id: string;
  user_id: string;
  user_email: string;
  user_name?: string;
  transaction_id?: string;
  amount: number;
  currency: string;
  status: string;
  payment_method: string;
  method?: string;
  created_at: string;
  description?: string;
}

export interface SystemMetrics {
  timestamp: string;
  cpu_usage: number;
  memory_usage: number;
  memory_used: number;
  memory_total: number;
  disk_usage: number;
  disk_used: number;
  disk_total: number;
  network_io: {
    bytes_sent: number;
    bytes_recv: number;
  };
  active_connections: number;
  response_time: number;
  uptime: number;
  requests_per_second: number;
  avg_response_time: number;
  error_rate: number;
  db_status: string;
  db_connections: number;
  db_query_time: number;
  db_size: number;
  name?: string;
  description?: string;
  value?: number;
  status?: string;
}

// 회원별 통계 타입 정의
export interface UserStats {
  id: string;
  email: string;
  name: string;
  company: string;
  role: string;
  subscription_plan: string;
  total_logins: number;
  total_searches: number;
  total_reports: number;
  total_detail_views: number;
  last_login_at: string | null;
  created_at: string;
  activity_score: number;
}

export interface UserStatsResponse {
  success: boolean;
  data: {
    users: UserStats[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
    summary: {
      totalUsers: number;
      totalLogins: number;
      totalSearches: number;
      totalReports: number;
      averageLogins: number;
      averageSearches: number;
      averageReports: number;
    };
    timestamp: string;
  };
}

// API 함수들
export const adminApiService = {
  // 인증 관련
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      // 모든 환경에서 동일한 엔드포인트 사용
      const endpoint = '/api/admin/auth';
      
      // 요청 데이터 검증 및 정리
      const cleanCredentials = {
        email: credentials.email?.trim(),
        password: credentials.password?.trim()
      };
      
      // 디버깅을 위한 로그
      console.log('🔐 [AdminAPI] 로그인 시도:', {
        endpoint,
        fullUrl: `${adminApi.defaults.baseURL}${endpoint}`,
        credentials: { email: cleanCredentials.email, password: '***' },
        baseURL: adminApi.defaults.baseURL
      });
      
      // JSON 직렬화 확인
      const requestData = JSON.stringify(cleanCredentials);
      console.log('📤 [AdminAPI] 요청 데이터:', requestData);
      
      // 명시적인 axios 설정으로 요청
      const response = await axios({
        method: 'POST',
        url: `${adminApi.defaults.baseURL}${endpoint}`,
        data: cleanCredentials,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: API_TIMEOUTS.auth,
        validateStatus: (status) => status < 500 // 500 미만은 모두 성공으로 처리
      });
      
      console.log('✅ [AdminAPI] 로그인 응답:', {
        status: response.status,
        headers: response.headers,
        data: response.data
      });
      
      if (response.status >= 400) {
        throw new Error(`HTTP ${response.status}: ${response.data?.message || '로그인 실패'}`);
      }
      
      return response.data;
    } catch (error: any) {
      console.error('❌ [AdminAPI] 로그인 실패:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
        method: error.config?.method,
        headers: error.config?.headers,
        requestData: error.config?.data
      });
      
      // 에러 메시지 개선
      if (error.code === 'ECONNREFUSED') {
        throw new Error('서버에 연결할 수 없습니다. 백엔드 서버가 실행 중인지 확인해주세요.');
      } else if (error.response?.status === 401) {
        throw new Error('이메일 또는 비밀번호가 올바르지 않습니다.');
      } else if (error.response?.status === 400) {
        throw new Error(error.response.data?.message || '잘못된 요청입니다.');
      }
      
      throw error;
    }
  },

  async logout(): Promise<void> {
    // 로컬 토큰만 제거 (서버에 logout 엔드포인트가 없음)
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_refresh_token');
  },

  async refreshToken(): Promise<{ access_token: string }> {
    const refreshToken = localStorage.getItem('admin_refresh_token');
    // 모든 환경에서 동일한 엔드포인트 사용
    const endpoint = '/api/admin/auth/refresh';
    const response = await adminApi.post(endpoint, {
      refresh_token: refreshToken,
    });
    return response.data;
  },

  async getCurrentAdmin(): Promise<any> {
    // 모든 환경에서 동일한 엔드포인트 사용
    const endpoint = '/api/admin/auth/me';
    const response = await adminApi.get(endpoint);
    return response.data;
  },

  // 대시보드 관련
  async getDashboardMetrics(period: string = '7d'): Promise<DashboardMetrics | ApiResponse<DashboardMetrics>> {
    const timestamp = Date.now();
    const response = await adminApi.get(`/dashboard/metrics?period=${period}&_t=${timestamp}`);
    return response.data;
  },

  async getRecentActivities(limit: number = 10): Promise<any[] | ApiResponse<any[]>> {
    const timestamp = Date.now();
    const response = await adminApi.get(`/dashboard/recent-activities?limit=${limit}&_t=${timestamp}`);
    return response.data;
  },

  // 확장된 대시보드 통계
  async getExtendedDashboardStats(days: number = 30): Promise<ExtendedDashboardStats> {
    const timestamp = Date.now();
    const response = await adminApi.get(`/dashboard/extended-stats?days=${days}&_t=${timestamp}`);
    return response.data;
  },

  async getPopularKeywords(days: number = 30): Promise<PopularKeyword[]> {
    const timestamp = Date.now();
    const response = await adminApi.get(`/dashboard/popular-keywords?days=${days}&_t=${timestamp}`);
    return response.data.keywords || [];
  },

  async getPopularPatents(days: number = 30): Promise<PopularPatent[]> {
    const timestamp = Date.now();
    const response = await adminApi.get(`/dashboard/popular-patents?days=${days}&_t=${timestamp}`);
    return response.data.patents || [];
  },

  // 회원별 통계 조회
  async getUserStats(params: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<UserStatsResponse> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.search) queryParams.append('search', params.search);
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);
    
    const response = await adminApi.get(`/dashboard/user-stats?${queryParams.toString()}`);
    return response.data;
  },

  // 사용자 관리
  async getUsers(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    role?: string;
    date_range?: string;
  } = {}): Promise<{
    users: User[];
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
  }> {
    const queryParams = new URLSearchParams();
    
    // 기본값 설정
    const page = params.page || 1;
    const limit = params.limit || 20;
    
    queryParams.append('page', page.toString());
    queryParams.append('per_page', limit.toString());
    
    if (params.search) {
      queryParams.append('search', params.search);
    }
    if (params.status) {
      queryParams.append('status', params.status);
    }
    if (params.role) {
      queryParams.append('role', params.role);
    }
    
    const response = await adminApi.get(`/users?${queryParams}`);
    return response.data;
  },

  async getUserById(userId: string): Promise<User> {
    const response = await adminApi.get(`/users/${userId}`);
    return response.data;
  },

  async updateUser(userId: string, data: Partial<User>): Promise<User> {
    const response = await adminApi.put(`/users/${userId}`, data);
    return response.data;
  },

  async deleteUser(userId: string): Promise<UserDeleteResponse> {
    const response = await adminApi.delete(`/users/${userId}`);
    return response.data;
  },

  async restoreUser(userId: string): Promise<UserDeleteResponse> {
    const response = await adminApi.post(`/users/${userId}/restore`);
    return response.data;
  },

  async getDeletedUsers(params: {
    page?: number;
    limit?: number;
    search?: string;
  } = {}): Promise<{
    users: User[];
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
  }> {
    const queryParams = new URLSearchParams();
    
    // 기본값 설정
    const page = params.page || 1;
    const limit = params.limit || 20;
    
    queryParams.append('page', page.toString());
    queryParams.append('per_page', limit.toString());
    
    if (params.search) {
      queryParams.append('search', params.search);
    }
    
    const response = await adminApi.get(`/users/deleted?${queryParams}`);
    return response.data;
  },

  async toggleUserStatus(userId: string): Promise<User> {
    const response = await adminApi.patch(`/users/${userId}/toggle-status`);
    return response.data;
  },

  async updateUserStatus(userId: string, status: string): Promise<User> {
    const response = await adminApi.patch(`/users/${userId}/status`, { status });
    return response.data;
  },

  // 결제 관리
  async getPayments(params: {
    page?: number;
    limit?: number;
    status?: string;
    method?: string;
    search?: string;
    date_range?: string;
    amount_range?: string;
  } = {}): Promise<{
    payments: Payment[];
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
  }> {
    const queryParams = new URLSearchParams();
    
    // 기본값 설정
    queryParams.append('page', (params.page || 1).toString());
    queryParams.append('per_page', (params.limit || 20).toString());
    
    // 선택적 매개변수 추가
    if (params.status) queryParams.append('status', params.status);
    if (params.method) queryParams.append('method', params.method);
    if (params.search) queryParams.append('search', params.search);
    if (params.date_range) queryParams.append('date_range', params.date_range);
    if (params.amount_range) queryParams.append('amount_range', params.amount_range);
    
    const response = await adminApi.get(`/payments?${queryParams}`);
    
    // 서버 응답 구조 확인 및 변환
    const serverData = response.data;
    
    // 서버가 { data: [], pagination: {} } 형식으로 반환하는 경우 처리
    if (serverData.data && serverData.pagination) {
      return {
        payments: serverData.data || [],
        total: serverData.pagination.total || 0,
        page: serverData.pagination.page || 1,
        per_page: serverData.pagination.per_page || 20,
        total_pages: serverData.pagination.total_pages || 0,
      };
    }
    
    // 기존 형식으로 반환하는 경우
    return serverData;
  },

  async getPaymentById(paymentId: string): Promise<Payment> {
    const response = await adminApi.get(`/payments/${paymentId}`);
    return response.data;
  },

  async refundPayment(paymentId: string, reason?: string): Promise<Payment> {
    const response = await adminApi.post(`/payments/${paymentId}/refund`, {
      reason,
    });
    return response.data;
  },

  async processRefund(paymentId: string, data: { amount: number; reason: string }): Promise<Payment> {
    const response = await adminApi.post(`/payments/${paymentId}/process-refund`, data);
    return response.data;
  },

  async getPaymentStats(params?: { date_range?: string }): Promise<{
    total_revenue: number;
    total_transactions: number;
    successful_transactions: number;
    failed_transactions: number;
    refunded_transactions: number;
    pending_transactions: number;
    average_transaction_amount: number;
    revenue_today: number;
    revenue_this_week: number;
    revenue_this_month: number;
  }> {
    const queryParams = new URLSearchParams();
    if (params?.date_range) {
      queryParams.append('date_range', params.date_range);
    }
    const response = await adminApi.get(`/payments/stats${queryParams.toString() ? '?' + queryParams.toString() : ''}`);
    
    // 서버 응답을 프론트엔드 형식에 맞게 변환
    const serverData = response.data;
    return {
      total_revenue: serverData.total_revenue || 0,
      total_transactions: serverData.total_transactions || 0,
      successful_transactions: serverData.completed_transactions || 0,
      failed_transactions: serverData.failed_transactions || 0,
      refunded_transactions: serverData.cancelled_transactions || 0, // cancelled를 refunded로 매핑
      pending_transactions: serverData.pending_transactions || 0,
      average_transaction_amount: serverData.total_transactions > 0 
        ? Math.round((serverData.total_revenue / serverData.total_transactions) * 100) / 100 
        : 0,
      revenue_today: 0, // 서버에서 제공하지 않으므로 0으로 설정
      revenue_this_week: 0, // 서버에서 제공하지 않으므로 0으로 설정
      revenue_this_month: serverData.total_revenue || 0, // 전체 수익을 월간 수익으로 사용
    };
  },

  // 시스템 메트릭 조회
  async getSystemMetrics(period: string = '1h'): Promise<SystemMetrics[] | ApiResponse<SystemMetrics[]>> {
    const timestamp = Date.now();
    const response = await adminApi.get(`/dashboard/system-metrics?period=${period}&_t=${timestamp}`);
    return response.data;
  },

  async getSystemHealth(): Promise<{
    status: string;
    services: Record<string, any>;
    uptime: number;
  }> {
    const response = await adminApi.get('/monitoring/health');
    return response.data;
  },

  async getSystemLogs(params: { level?: string; source?: string; search?: string; limit?: number }): Promise<{ logs: any[] }> {
    const searchParams = new URLSearchParams();
    if (params.level) searchParams.append('level', params.level);
    if (params.source) searchParams.append('source', params.source);
    if (params.search) searchParams.append('search', params.search);
    if (params.limit) searchParams.append('limit', params.limit.toString());
    
    const response = await adminApi.get(`/monitoring/logs?${searchParams}`);
    return response.data;
  },

  async getAlertRules(): Promise<{ rules: any[] }> {
    const response = await adminApi.get('/monitoring/alert-rules');
    return response.data;
  },

  async updateAlertRule(ruleId: string, rule: any): Promise<any> {
    const response = await adminApi.put(`/monitoring/alert-rules/${ruleId}`, rule);
    return response.data;
  },

  // 파일 업로드
  async uploadFile(file: File, type: string): Promise<{ url: string; filename: string }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    const response = await adminApi.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // 설정 관리
  async getSettings(): Promise<Record<string, any>> {
    const response = await adminApi.get('/settings');
    return response.data;
  },

  async updateSettings(settings: Record<string, any>): Promise<Record<string, any>> {
    const response = await adminApi.put('/settings', settings);
    return response.data;
  },
};

export default adminApiService;