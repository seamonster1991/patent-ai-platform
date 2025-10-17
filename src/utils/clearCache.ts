/**
 * 🚨 브라우저 캐시 완전 삭제 유틸리티
 * 모든 저장소와 캐시를 강제로 삭제합니다.
 */

export const clearAllBrowserCache = async (): Promise<void> => {
  try {
    console.log('🧹 브라우저 캐시 완전 삭제 시작...');
    
    // 1. localStorage 완전 삭제
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
      console.log('✅ localStorage 삭제 완료');
    }
    
    // 2. sessionStorage 완전 삭제
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.clear();
      console.log('✅ sessionStorage 삭제 완료');
    }
    
    // 3. IndexedDB 삭제
    if ('indexedDB' in window) {
      try {
        const databases = await indexedDB.databases();
        await Promise.all(
          databases.map(db => {
            if (db.name) {
              return new Promise<void>((resolve, reject) => {
                const deleteReq = indexedDB.deleteDatabase(db.name!);
                deleteReq.onsuccess = () => resolve();
                deleteReq.onerror = () => reject(deleteReq.error);
              });
            }
          })
        );
        console.log('✅ IndexedDB 삭제 완료');
      } catch (error) {
        console.warn('⚠️ IndexedDB 삭제 중 오류:', error);
      }
    }
    
    // 4. Service Worker 등록 해제
    if ('serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(
          registrations.map(registration => registration.unregister())
        );
        console.log('✅ Service Worker 등록 해제 완료');
      } catch (error) {
        console.warn('⚠️ Service Worker 해제 중 오류:', error);
      }
    }
    
    // 5. Cache API 삭제
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
        console.log('✅ Cache API 삭제 완료');
      } catch (error) {
        console.warn('⚠️ Cache API 삭제 중 오류:', error);
      }
    }
    
    // 6. 쿠키 삭제 (현재 도메인)
    if (typeof document !== 'undefined') {
      document.cookie.split(";").forEach(cookie => {
        const eqPos = cookie.indexOf("=");
        const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
      });
      console.log('✅ 쿠키 삭제 완료');
    }
    
    console.log('🎉 브라우저 캐시 완전 삭제 완료!');
    
    // 7. 페이지 강제 새로고침
    setTimeout(() => {
      console.log('🔄 페이지 강제 새로고침...');
      window.location.reload();
    }, 1000);
    
  } catch (error) {
    console.error('❌ 캐시 삭제 중 오류 발생:', error);
  }
};

// 개발 환경에서 자동 실행
if (import.meta.env.DEV) {
  // 페이지 로드 시 한 번만 실행
  const cacheCleared = sessionStorage.getItem('cache-cleared-1760578717');
  if (!cacheCleared) {
    console.log('🚨 개발 환경에서 캐시 자동 삭제 실행');
    clearAllBrowserCache();
    sessionStorage.setItem('cache-cleared-1760578717', 'true');
  }
}