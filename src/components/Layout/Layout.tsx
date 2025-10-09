import React, { useEffect, useCallback, useRef } from 'react';
import { Toaster } from 'sonner';
import { toast } from 'sonner';
import Navbar from './Navbar';
import { useAuthStore } from '../../store/authStore';
import { usePageTracking } from '../../hooks/usePageTracking';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user } = useAuthStore();
  const toastQueueRef = useRef<Array<() => void>>([]);
  
  // 페이지 네비게이션 추적 활성화
  usePageTracking();

  // 토스트를 안전하게 처리하는 함수
  const safeToast = useCallback((toastFn: () => void) => {
    // 다음 렌더링 사이클에서 실행
    requestAnimationFrame(() => {
      toastFn();
    });
  }, []);

  // 이벤트 핸들러를 useCallback으로 메모이제이션
  const handleReportGenerated = useCallback((event: CustomEvent) => {
      console.log('🚨 [Layout] ===== 전역 리포트 생성 이벤트 감지 =====');
      console.log('🌐 [Layout] 전역 리포트 생성 이벤트 감지:', {
        eventType: event.type,
        detail: event.detail,
        userId: user?.id,
        timestamp: new Date().toISOString(),
        windowLocation: window.location.pathname,
        eventTarget: event.target,
        eventCurrentTarget: event.currentTarget
      });
      
      // 이벤트 데이터 검증
      if (event.detail) {
        console.log('🌐 [Layout] 이벤트 상세 정보:', {
          reportType: event.detail.reportType,
          reportTitle: event.detail.reportTitle,
          patentNumber: event.detail.patentNumber,
          patentTitle: event.detail.patentTitle,
          eventTimestamp: event.detail.timestamp
        });
        
        // 안전한 toast 호출 - requestAnimationFrame 사용
        safeToast(() => {
          toast.success(`${event.detail.reportType} 리포트가 생성되었습니다!`, {
            description: `특허: ${event.detail.patentNumber}`,
            duration: 5000,
          });
        });
        
        // 항상 dashboardRefresh 이벤트 발생 (현재 페이지와 관계없이)
        console.log('🌐 [Layout] dashboardRefresh 이벤트 발생 준비...');
        console.log('🌐 [Layout] 이벤트 디스패치 전 상태:', {
          windowLocation: window.location.pathname,
          eventDetail: event.detail,
          timestamp: new Date().toISOString()
        });
        
        // 이벤트 디스패치도 안전하게 처리
        requestAnimationFrame(() => {
          const dashboardRefreshEvent = new CustomEvent('dashboardRefresh', {
            detail: event.detail,
            bubbles: true,
            cancelable: true
          });
          
          console.log('🌐 [Layout] dashboardRefresh 이벤트 디스패치 중...');
          const dispatched = window.dispatchEvent(dashboardRefreshEvent);
          console.log('🌐 [Layout] dashboardRefresh 이벤트 디스패치 결과:', dispatched);
        });
        
        // 대시보드 페이지에서는 이벤트 기반 업데이트만 사용 (페이지 새로고침 제거)
        if (window.location.pathname === '/dashboard') {
          console.log('🔄 [Layout] 대시보드 페이지 감지 - 이벤트 기반 업데이트 사용');
        }
      } else {
        console.warn('⚠️ [Layout] 이벤트 detail이 없습니다:', event);
      }
    }, [user?.id, safeToast]);

    const handleBookmarkAdded = useCallback((event: CustomEvent) => {
      console.log('🚨 [Layout] ===== 전역 북마크 추가 이벤트 감지 =====');
      console.log('🌐 [Layout] 전역 북마크 추가 이벤트 감지:', {
        eventType: event.type,
        detail: event.detail,
        timestamp: new Date().toISOString(),
        windowLocation: window.location.pathname
      });
      
      // 안전한 toast 호출 - requestAnimationFrame 사용
      safeToast(() => {
        toast.success('북마크가 추가되었습니다!');
      });
      
      // 항상 dashboardRefresh 이벤트 발생 (현재 페이지와 관계없이)
      console.log('🌐 [Layout] dashboardRefresh 이벤트 발생 준비 (북마크)...');
      
      // 이벤트 디스패치도 안전하게 처리
      requestAnimationFrame(() => {
        const dashboardRefreshEvent = new CustomEvent('dashboardRefresh', {
          detail: event.detail,
          bubbles: true,
          cancelable: true
        });
        
        console.log('🌐 [Layout] dashboardRefresh 이벤트 디스패치 중 (북마크)...');
        const dispatched = window.dispatchEvent(dashboardRefreshEvent);
        console.log('🌐 [Layout] dashboardRefresh 이벤트 디스패치 결과 (북마크):', dispatched);
      });
    }, [safeToast]);

    // 전역 이벤트 리스너 등록
    useEffect(() => {

    // 이벤트 리스너 등록 상태 로깅
    console.log('🔧 [Layout] 전역 이벤트 리스너 등록 중...', {
      userId: user?.id,
      hasUser: !!user,
      pathname: window.location.pathname
    });

    // 커스텀 이벤트 리스너 등록
    window.addEventListener('reportGenerated', handleReportGenerated);
    window.addEventListener('bookmarkAdded', handleBookmarkAdded);

    console.log('✅ [Layout] 전역 이벤트 리스너 등록 완료');

    // 클린업 함수
    return () => {
      console.log('🧹 [Layout] 전역 이벤트 리스너 정리 중...');
      window.removeEventListener('reportGenerated', handleReportGenerated);
      window.removeEventListener('bookmarkAdded', handleBookmarkAdded);
      console.log('✅ [Layout] 전역 이벤트 리스너 정리 완료');
    };
  }, [handleReportGenerated, handleBookmarkAdded]);

  return (
    <div className="min-h-screen bg-ms-soft">
      {/* Global Wallpaper Background */}
      <div className="fixed inset-0 bg-ms-white -z-10" />
      
      {/* Navigation */}
      <Navbar />
      
      {/* Main Content */}
      <main className="relative z-10 pt-16">
        <div className="min-h-[calc(100vh-4rem)]">
          {children}
        </div>
      </main>
      
      {/* Toast Notifications */}
      <Toaster 
        position="top-right"
        toastOptions={{
          style: {
            background: 'rgb(var(--ms-bg))',
            border: '1px solid rgb(var(--ms-line))',
            color: 'rgb(var(--ms-text))',
            borderRadius: '8px',
            boxShadow: 'var(--ms-shadow-lg)',
            fontSize: '14px',
            fontWeight: '500',
          },
          className: 'ms-toast',
        }}
        theme="light"
        richColors
        closeButton
        duration={4000}
      />
    </div>
  );
};

export default Layout;