// 리다이렉트 루프 방지를 위한 가드 클래스
class RedirectGuard {
  private redirectCount: Map<string, number> = new Map();
  private lastRedirectTime: Map<string, number> = new Map();
  private redirectHistory: Array<{path: string, timestamp: number, source: string}> = [];
  private readonly MAX_REDIRECTS = 2; // 더 엄격하게 설정
  private readonly RESET_INTERVAL = 3000; // 3초로 단축
  private readonly MAX_HISTORY = 10;
  private isBlocked = false;
  private blockUntil = 0;

  canRedirect(path: string, source: string = 'unknown'): boolean {
    const now = Date.now();
    
    // 전역 블록 상태 확인
    if (this.isBlocked && now < this.blockUntil) {
      console.error(`[RedirectGuard] 전역 블록 상태 - ${Math.ceil((this.blockUntil - now) / 1000)}초 후 해제`);
      return false;
    } else if (this.isBlocked && now >= this.blockUntil) {
      this.unblock();
    }

    const lastTime = this.lastRedirectTime.get(path) || 0;
    const count = this.redirectCount.get(path) || 0;

    // 히스토리에 추가
    this.redirectHistory.push({path, timestamp: now, source});
    if (this.redirectHistory.length > this.MAX_HISTORY) {
      this.redirectHistory.shift();
    }

    // 최근 히스토리 분석 (빠른 연속 리다이렉트 감지)
    const recentRedirects = this.redirectHistory.filter(h => now - h.timestamp < 1000);
    if (recentRedirects.length >= 3) {
      console.error('[RedirectGuard] 빠른 연속 리다이렉트 감지 - 전역 블록 활성화');
      this.block(10000); // 10초 블록
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
      this.block(5000); // 5초 블록
      return false;
    }

    console.log(`[RedirectGuard] 리다이렉트 허용: ${path} (${count + 1}/${this.MAX_REDIRECTS}) - 소스: ${source}`);
    return true;
  }

  recordRedirect(path: string, source: string = 'unknown'): void {
    const now = Date.now();
    const count = this.redirectCount.get(path) || 0;
    
    this.redirectCount.set(path, count + 1);
    this.lastRedirectTime.set(path, now);
    
    console.log(`[RedirectGuard] 리다이렉트 기록: ${path} (${count + 1}회) - 소스: ${source}`);
  }

  block(duration: number): void {
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
    this.unblock();
    console.log('[RedirectGuard] 완전 리셋');
  }

  getStatus(): any {
    return {
      isBlocked: this.isBlocked,
      blockUntil: this.blockUntil,
      redirectCount: Object.fromEntries(this.redirectCount),
      recentHistory: this.redirectHistory.slice(-5)
    };
  }
}

export const redirectGuard = new RedirectGuard();

// 전역 윈도우 객체에 디버깅용 함수 추가
if (typeof window !== 'undefined') {
  (window as any).redirectGuard = redirectGuard;
  console.log('[RedirectGuard] 전역 객체에 등록됨 - window.redirectGuard로 접근 가능');
}