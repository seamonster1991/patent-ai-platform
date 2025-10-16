/**
 * Admin API Service - Python 백엔드와 연결
 * 관리자 대시보드 API 호출 관리
 */

import axios, { AxiosInstance, AxiosResponse } from 'axios';

// API 기본 설정
const API_BASE_URL = 'http://localhost:8005/api/v1';

// Axios 인스턴스 생성
const adminApi: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // 60초로 증가
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청 인터셉터 - 토큰 자동 추가
adminApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('admin_token');
    if (token && config.headers) {
      (config.headers as any).Authorization = `Bearer ${token}`;
    }
    console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('[API Request Error]', error);
    return Promise.reject(error);
  }
);

// 응답 인터셉터 - 에러 처리
adminApi.interceptors.response.use(
  (response: AxiosResponse) => {
    console.log(`[API Response] ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
    return response;
  },
  (error) => {
    console.error(`[API Error] ${error.config?.method?.toUpperCase()} ${error.config?.url}`, error);
    
    if (error.code === 'ECONNABORTED') {
      console.error('[API Timeout] Request timed out');
    }
    
    if (error.response?.status === 401) {
      // 토큰 만료 시 로그아웃 처리
      localStorage.removeItem('admin_token');
      window.location.href = '/admin/login';
    }
    return Promise.reject(error);
  }
);

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

// API 함수들
export const adminApiService = {
  // 인증 관련
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await adminApi.post('/auth/login', credentials);
    return response.data;
  },

  async logout(): Promise<void> {
    await adminApi.post('/auth/logout');
    localStorage.removeItem('admin_token');
  },

  async refreshToken(): Promise<{ access_token: string }> {
    const refreshToken = localStorage.getItem('admin_refresh_token');
    const response = await adminApi.post('/auth/refresh', {
      refresh_token: refreshToken,
    });
    return response.data;
  },

  async getCurrentAdmin(): Promise<any> {
    const response = await adminApi.get('/auth/me');
    return response.data;
  },

  // 대시보드 관련
  async getDashboardMetrics(period: string = '7d'): Promise<DashboardMetrics> {
    const response = await adminApi.get(`/dashboard/metrics?period=${period}`);
    return response.data;
  },

  async getRecentActivities(limit: number = 10): Promise<any[]> {
    const response = await adminApi.get(`/dashboard/recent-activities?limit=${limit}`);
    return response.data;
  },

  // 확장된 대시보드 통계
  async getExtendedDashboardStats(days: number = 30): Promise<ExtendedDashboardStats> {
    const response = await adminApi.get(`/dashboard/extended-stats?days=${days}`);
    return response.data;
  },

  async getPopularKeywords(days: number = 30): Promise<PopularKeyword[]> {
    const response = await adminApi.get(`/dashboard/popular-keywords?days=${days}`);
    return response.data.keywords || [];
  },

  async getPopularPatents(days: number = 30): Promise<PopularPatent[]> {
    const response = await adminApi.get(`/dashboard/popular-patents?days=${days}`);
    return response.data.patents || [];
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
    return response.data;
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
    return response.data;
  },

  // 시스템 모니터링
  async getSystemMetrics(period: string = '1h'): Promise<SystemMetrics[]> {
    const response = await adminApi.get(`/dashboard/system-metrics?period=${period}`);
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