// Python FastAPI 백엔드와 통신하는 관리자 API 클라이언트

// 타입 정의
export interface AdminUser {
  id: string;
  email: string;
  username: string;
  role: 'super_admin' | 'admin' | 'operator';
  is_active: boolean;
  created_at: string;
  last_login?: string;
  two_factor_enabled: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
  totp_code?: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: AdminUser;
  expires_in: number;
}

export interface DashboardMetrics {
  total_users: number;
  active_users: number;
  total_revenue: number;
  daily_signups: number[];
  revenue_trend: number[];
  user_growth_rate: number;
  revenue_growth_rate: number;
}

export interface SystemHealth {
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  active_connections: number;
  api_response_time: number;
  status: 'healthy' | 'warning' | 'critical';
}

export interface User {
  id: string;
  email: string;
  username: string;
  is_active: boolean;
  created_at: string;
  last_login?: string;
  subscription_status: 'free' | 'premium' | 'enterprise';
  total_searches: number;
  total_spent: number;
  points_balance: number;
}

export interface Payment {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  payment_method: string;
  created_at: string;
  description?: string;
}

export interface SystemAlert {
  id: string;
  type: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  created_at: string;
  is_read: boolean;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  status: 'success' | 'error';
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pages: number;
  limit: number;
}

// API 클라이언트 클래스
class AdminApiClient {
  private baseURL: string;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    // 환경에 따른 API URL 설정
    const isDevelopment = import.meta.env.DEV;
    const apiUrl = isDevelopment 
      ? 'http://localhost:3001' 
      : (import.meta.env.VITE_API_URL || window.location.origin);
    
    this.baseURL = `${apiUrl}/api/admin`;
    this.loadTokensFromStorage();
  }

  private loadTokensFromStorage() {
    this.accessToken = localStorage.getItem('admin_token');
    this.refreshToken = localStorage.getItem('admin_refresh_token');
  }

  private saveTokensToStorage(accessToken: string, refreshToken: string) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    localStorage.setItem('admin_token', accessToken);
    localStorage.setItem('admin_refresh_token', refreshToken);
  }

  private clearTokensFromStorage() {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_refresh_token');
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers && typeof options.headers === 'object' && !Array.isArray(options.headers) 
        ? options.headers as Record<string, string>
        : {}),
    };

    if (this.accessToken) {
      headers.Authorization = `Bearer ${this.accessToken}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (response.status === 401 && this.refreshToken) {
        // 토큰 갱신 시도
        const refreshed = await this.refreshAccessToken();
        if (refreshed) {
          headers.Authorization = `Bearer ${this.accessToken}`;
          const retryResponse = await fetch(url, {
            ...options,
            headers,
          });
          return this.handleResponse<T>(retryResponse);
        }
      }

      return this.handleResponse<T>(response);
    } catch (error) {
      console.error('API request failed:', error);
      throw new Error('네트워크 오류가 발생했습니다.');
    }
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    // 서버 응답 구조: {success: true, data: {actual_data}}
    if (data.success && data.data) {
      return data.data as T;
    } else if (data.success) {
      return data as T;
    } else {
      throw new Error(data.error || data.message || '요청 처리에 실패했습니다.');
    }
  }

  // 인증 관련 메서드
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const response = await this.makeRequest<LoginResponse>('?action=auth', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    this.saveTokensToStorage(response.access_token, response.refresh_token);
    return response;
  }

  async logout(): Promise<void> {
    try {
      await this.makeRequest('/auth/logout', {
        method: 'POST',
      });
    } finally {
      this.clearTokensFromStorage();
    }
  }

  async refreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken) return false;

    try {
      const response = await this.makeRequest<{ access_token: string }>('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refresh_token: this.refreshToken }),
      });

      this.accessToken = response.access_token;
      localStorage.setItem('admin_access_token', response.access_token);
      return true;
    } catch (error) {
      this.clearTokensFromStorage();
      return false;
    }
  }

  async getCurrentAdmin(): Promise<AdminUser> {
    return this.makeRequest<AdminUser>('/auth/me');
  }

  // 대시보드 관련 메서드
  async getDashboardMetrics(period: string = 'week'): Promise<DashboardMetrics> {
    const timestamp = Date.now();
    return this.makeRequest<DashboardMetrics>(`/dashboard/metrics?period=${period}&_t=${timestamp}`);
  }

  async getSystemHealth(): Promise<SystemHealth> {
    return this.makeRequest<SystemHealth>('/monitoring/system');
  }

  async getSystemAlerts(): Promise<SystemAlert[]> {
    return this.makeRequest<SystemAlert[]>('/monitoring/alerts');
  }

  // 사용자 관리 관련 메서드
  async getUsers(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    role?: string;
  } = {}): Promise<PaginatedResponse<User>> {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });

    return this.makeRequest<PaginatedResponse<User>>(`/users?${queryParams}`);
  }

  async getUserById(userId: string): Promise<User> {
    return this.makeRequest<User>(`/users/${userId}`);
  }

  async updateUser(userId: string, data: Partial<User>): Promise<User> {
    return this.makeRequest<User>(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteUser(userId: string): Promise<void> {
    return this.makeRequest<void>(`/users/${userId}`, {
      method: 'DELETE',
    });
  }

  // 결제 관리 관련 메서드
  async getPayments(params: {
    page?: number;
    limit?: number;
    status?: string;
    payment_method?: string;
  } = {}): Promise<PaginatedResponse<Payment>> {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });

    return this.makeRequest<PaginatedResponse<Payment>>(`/payments?${queryParams}`);
  }

  async getPaymentById(paymentId: string): Promise<Payment> {
    return this.makeRequest<Payment>(`/payments/${paymentId}`);
  }

  async processRefund(paymentId: string, data: { amount: number; reason: string }): Promise<Payment> {
    return this.makeRequest<Payment>(`/payments/${paymentId}/refund`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // 유틸리티 메서드
  isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }
}

// 싱글톤 인스턴스 생성 및 내보내기
export const adminApi = new AdminApiClient();
export default adminApi;