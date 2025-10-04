// 인증 관련 무한 루프 방지를 위한 전역 가드
class AuthGuard {
  private static instance: AuthGuard;
  private isLoginInProgress = false;
  private lastLoginAttempt = 0;
  private loginAttemptCount = 0;
  private readonly MIN_LOGIN_INTERVAL = 1000; // 1초로 단축
  private readonly MAX_LOGIN_ATTEMPTS = 5; // 시도 횟수 증가
  private readonly RESET_INTERVAL = 30000; // 30초로 증가

  static getInstance(): AuthGuard {
    if (!AuthGuard.instance) {
      AuthGuard.instance = new AuthGuard();
    }
    return AuthGuard.instance;
  }

  canAttemptLogin(): boolean {
    // 클라이언트 사이드에서만 실행
    if (typeof window === 'undefined') {
      return true; // 서버 사이드에서는 항상 허용
    }
    
    const now = Date.now();
    
    // 리셋 간격이 지났으면 카운터 리셋
    if (now - this.lastLoginAttempt > this.RESET_INTERVAL) {
      this.loginAttemptCount = 0;
      this.isLoginInProgress = false;
    }

    // 이미 로그인이 진행 중인 경우
    if (this.isLoginInProgress) {
      console.warn('[AuthGuard] 로그인이 이미 진행 중입니다');
      return false;
    }

    // 너무 빠른 연속 시도 방지
    if (now - this.lastLoginAttempt < this.MIN_LOGIN_INTERVAL) {
      console.warn('[AuthGuard] 너무 빠른 로그인 시도');
      return false;
    }

    // 최대 시도 횟수 초과 확인
    if (this.loginAttemptCount >= this.MAX_LOGIN_ATTEMPTS) {
      console.error('[AuthGuard] 최대 로그인 시도 횟수 초과');
      return false;
    }

    return true;
  }

  startLogin(): void {
    // 클라이언트 사이드에서만 실행
    if (typeof window === 'undefined') {
      return;
    }
    
    const now = Date.now();
    this.isLoginInProgress = true;
    this.lastLoginAttempt = now;
    this.loginAttemptCount++;
    console.log(`[AuthGuard] 로그인 시작 (${this.loginAttemptCount}/${this.MAX_LOGIN_ATTEMPTS})`);
  }

  finishLogin(success: boolean): void {
    this.isLoginInProgress = false;
    if (success) {
      this.loginAttemptCount = 0; // 성공 시 카운터 리셋
      console.log('[AuthGuard] 로그인 성공 - 카운터 리셋');
    } else {
      console.log('[AuthGuard] 로그인 실패');
    }
  }

  reset(): void {
    this.isLoginInProgress = false;
    this.loginAttemptCount = 0;
    this.lastLoginAttempt = 0;
    console.log('[AuthGuard] 완전 리셋');
  }

  getStatus(): any {
    return {
      isLoginInProgress: this.isLoginInProgress,
      loginAttemptCount: this.loginAttemptCount,
      lastLoginAttempt: this.lastLoginAttempt,
      canAttempt: this.canAttemptLogin()
    };
  }
}

export const authGuard = AuthGuard.getInstance();

// 전역 윈도우 객체에 디버깅용 함수 추가
if (typeof window !== 'undefined') {
  (window as any).authGuard = authGuard;
  console.log('[AuthGuard] 전역 객체에 등록됨 - window.authGuard로 접근 가능');
}