import { supabase } from './supabase';

export class TokenManager {
  private static instance: TokenManager;
  private refreshTimer: NodeJS.Timeout | null = null;
  private isRefreshing = false;

  private constructor() {}

  static getInstance(): TokenManager {
    if (!TokenManager.instance) {
      TokenManager.instance = new TokenManager();
    }
    return TokenManager.instance;
  }

  // 토큰 유효성 검사
  async isTokenValid(): Promise<boolean> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        console.log('[TokenManager] 세션 없음 또는 오류:', error?.message);
        return false;
      }

      // 토큰 만료 시간 확인 (5분 여유를 둠)
      const expiresAt = session.expires_at;
      const now = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = expiresAt - now;
      
      console.log('[TokenManager] 토큰 만료까지:', timeUntilExpiry, '초');
      
      // 5분(300초) 이내에 만료되면 갱신 필요
      if (timeUntilExpiry <= 300) {
        console.log('[TokenManager] 토큰 갱신 필요');
        return false;
      }

      return true;
    } catch (error) {
      console.error('[TokenManager] 토큰 유효성 검사 오류:', error);
      return false;
    }
  }

  // 토큰 수동 갱신
  async refreshToken(): Promise<boolean> {
    if (this.isRefreshing) {
      console.log('[TokenManager] 이미 토큰 갱신 중');
      return false;
    }

    this.isRefreshing = true;
    
    try {
      console.log('[TokenManager] 토큰 갱신 시작');
      
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('[TokenManager] 토큰 갱신 실패:', error);
        return false;
      }

      if (data.session?.access_token) {
        localStorage.setItem('token', data.session.access_token);
        console.log('[TokenManager] 토큰 갱신 성공');
        return true;
      }

      return false;
    } catch (error) {
      console.error('[TokenManager] 토큰 갱신 예외:', error);
      return false;
    } finally {
      this.isRefreshing = false;
    }
  }

  // 자동 토큰 갱신 스케줄링
  scheduleTokenRefresh(): void {
    this.clearRefreshTimer();
    
    // 5분마다 토큰 유효성 검사
    this.refreshTimer = setInterval(async () => {
      try {
        const isValid = await this.isTokenValid();
        
        if (!isValid) {
          console.log('[TokenManager] 토큰 갱신 시도');
          const refreshed = await this.refreshToken();
          
          if (!refreshed) {
            console.log('[TokenManager] 토큰 갱신 실패 - 로그아웃 처리');
            // 토큰 갱신 실패 시 로그아웃
            await supabase.auth.signOut();
          }
        }
      } catch (error) {
        console.error('[TokenManager] 자동 토큰 갱신 오류:', error);
      }
    }, 5 * 60 * 1000); // 5분마다 실행

    console.log('[TokenManager] 자동 토큰 갱신 스케줄 설정');
  }

  // 토큰 갱신 타이머 정리
  clearRefreshTimer(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
      console.log('[TokenManager] 토큰 갱신 타이머 정리');
    }
  }

  // API 요청 전 토큰 검증 및 갱신
  async ensureValidToken(): Promise<string | null> {
    try {
      const isValid = await this.isTokenValid();
      
      if (!isValid) {
        const refreshed = await this.refreshToken();
        if (!refreshed) {
          return null;
        }
      }

      const { data: { session } } = await supabase.auth.getSession();
      return session?.access_token || null;
    } catch (error) {
      console.error('[TokenManager] 토큰 검증 오류:', error);
      return null;
    }
  }

  // 토큰 만료 시간 가져오기
  async getTokenExpiryTime(): Promise<number | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session?.expires_at || null;
    } catch (error) {
      console.error('[TokenManager] 토큰 만료 시간 조회 오류:', error);
      return null;
    }
  }
}

// 전역 인스턴스 내보내기
export const tokenManager = TokenManager.getInstance();