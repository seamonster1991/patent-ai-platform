// 리다이렉트 루프 방지를 위한 가드 클래스
class RedirectGuard {
  private redirectCount: Map<string, number> = new Map();
  private lastRedirectTime: Map<string, number> = new Map();
  private redirectHistory: Array<{path: string, timestamp: number, source: string}> = [];
  private readonly MAX_REDIRECTS = 3; // 더 관대하게 설정 (3회 허용)
  private readonly RESET_INTERVAL = 2000; // 2초로 단축
  private readonly MAX_HISTORY = 15;
  private readonly RAPID_REDIRECT_THRESHOLD = 1000; // 1초 이내 연속 리다이렉트 감지
  private isBlocked = false;
  private blockUntil = 0;
  private lastGlobalRedirectTime = 0;

  canRedirect(path: string, source: string = 'unknown'): boolean {
    // 클라이언트 사이드에서만 실행
    if (typeof window === 'undefined') {
      return true; // 서버 사이드에서는 항상 허용
    }
    
    const now = Date.now();
    
    // 전역 블록 상태 확인
    if (this.isBlocked && now < this.blockUntil) {
      console.error(`[RedirectGuard] 전역 블록 상태 - ${Math.ceil((this.blockUntil - now) / 1000)}초 후 해제`);
      return false;
    } else if (this.isBlocked && now >= this.blockUntil) {
      this.unblock();
    }

    // 매우 빠른 전역 리다이렉트 감지
    if (now - this.lastGlobalRedirectTime < this.RAPID_REDIRECT_THRESHOLD) {
      console.error(`[RedirectGuard] 매우 빠른 연속 리다이렉트 감지 (${now - this.lastGlobalRedirectTime}ms) - 즉시 블록`);
      this.block(3000); // 3초 블록으로 단축
      return false;
    }

    // 중복 리다이렉트 감지 (같은 경로로의 빠른 연속 리다이렉트)
    const lastTime = this.lastRedirectTime.get(path) || 0;
    if (now - lastTime < this.RAPID_REDIRECT_THRESHOLD) {
      console.error(`[RedirectGuard] 중복 리다이렉트 감지: ${path} (${now - lastTime}ms 간격)`);
      this.block(3000); // 3초 블록으로 단축
      return false;
    }

    const count = this.redirectCount.get(path) || 0;

    // 히스토리에 추가
    this.redirectHistory.push({path, timestamp: now, source});
    if (this.redirectHistory.length > this.MAX_HISTORY) {
      this.redirectHistory.shift();
    }

    // 최근 히스토리 분석 (빠른 연속 리다이렉트 감지)
    const recentRedirects = this.redirectHistory.filter(h => now - h.timestamp < 2000);
    if (recentRedirects.length >= 2) {
      console.error('[RedirectGuard] 빠른 연속 리다이렉트 감지 - 전역 블록 활성화');
      this.block(10000); // 10초 블록
      return false;
    }

    // 동일한 소스에서의 중복 리다이렉트 감지
    const sameSourceRedirects = this.redirectHistory.filter(h => 
      h.source === source && now - h.timestamp < 3000
    );
    if (sameSourceRedirects.length >= 2) {
      console.error(`[RedirectGuard] 동일 소스(${source})에서 중복 리다이렉트 감지 - 블록`);
      this.block(8000); // 8초 블록
      return false;
    }

    // 리셋 간격 확인
    if (now - lastTime > this.RESET_INTERVAL) {
      this.redirectCount.set(path, 0);
      this.lastRedirectTime.set(path, now);
      console.log(`[RedirectGuard] ${path} 카운터 리셋`);
      return true;
    }

    // 최대 리다이렉트 횟수 초과 확인
    if (count >= this.MAX_REDIRECTS) {
      console.error(`[RedirectGuard] 리다이렉트 루프 감지: ${path} (${count}회) - 소스: ${source}`);
      this.block(3000); // 3초 블록으로 단축
      return false;
    }

    console.log(`[RedirectGuard] 리다이렉트 허용: ${path} (${count + 1}/${this.MAX_REDIRECTS}) - 소스: ${source}`);
    return true;
  }

  recordRedirect(path: string, source: string = 'unknown'): void {
    // 클라이언트 사이드에서만 실행
    if (typeof window === 'undefined') {
      return;
    }
    
    const now = Date.now();
    const count = this.redirectCount.get(path) || 0;
    
    this.redirectCount.set(path, count + 1);
    this.lastRedirectTime.set(path, now);
    this.lastGlobalRedirectTime = now; // 전역 리다이렉트 시간 업데이트
    
    console.log(`[RedirectGuard] 리다이렉트 기록: ${path} (${count + 1}회) - 소스: ${source}`);
  }

  block(duration: number): void {
    // 클라이언트 사이드에서만 실행
    if (typeof window === 'undefined') {
      return;
    }
    
    this.isBlocked = true;
    this.blockUntil = Date.now() + duration;
    console.error(`[RedirectGuard] 전역 블록 활성화 - ${duration}ms 동안`);
  }

  unblock(): void {
    this.isBlocked = false;
    this.blockUntil = 0;
    console.log('[RedirectGuard] 전역 블록 해제');
  }

  reset(): void {
    this.redirectCount.clear();
    this.lastRedirectTime.clear();
    this.redirectHistory = [];
    this.lastGlobalRedirectTime = 0;
    this.unblock();
    console.log('[RedirectGuard] 완전 리셋');
  }

  // 블록 상태 확인
  isCurrentlyBlocked(): boolean {
    return this.isBlocked && Date.now() < this.blockUntil;
  }

  getStatus(): any {
    return {
      isBlocked: this.isBlocked,
      blockUntil: this.blockUntil,
      redirectCount: Object.fromEntries(this.redirectCount),
      recentHistory: this.redirectHistory.slice(-5),
      lastGlobalRedirectTime: this.lastGlobalRedirectTime
    };
  }
}

export const redirectGuard = new RedirectGuard();

// 전역 윈도우 객체에 디버깅용 함수 추가
if (typeof window !== 'undefined') {
  (window as any).redirectGuard = redirectGuard;
  console.log('[RedirectGuard] 전역 객체에 등록됨 - window.redirectGuard로 접근 가능');
}