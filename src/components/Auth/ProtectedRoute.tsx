import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { LoadingPage } from '../UI/Loading';
import { supabase } from '../../lib/supabase'
import { redirectGuard } from '../../lib/redirectGuard'

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading, initialized, initialize } = useAuthStore();
  const location = useLocation();
  const [timeoutReached, setTimeoutReached] = useState(false);
  // 세션 확인이 완료되었는지 여부 (초기 렌더에서 조기 리다이렉트 방지)
  const [hasCheckedSession, setHasCheckedSession] = useState(false);
  const [lastRedirectAttempt, setLastRedirectAttempt] = useState<number>(0);
  const [redirectBlocked, setRedirectBlocked] = useState(false);

  // 디버그 로깅
  useEffect(() => {
    console.log('[ProtectedRoute] 상태:', { 
      path: location.pathname, 
      loading, 
      initialized,
      authed: !!user, 
      userId: user?.id,
      email: user?.email,
      timeoutReached
    });
  }, [location.pathname, loading, initialized, user, timeoutReached]);

  // 초기화되지 않은 상태에서만 타임아웃 적용
  useEffect(() => {
    if (!initialized && loading) {
      const timeout = setTimeout(() => {
        console.warn('[ProtectedRoute] 초기화 타임아웃 (10초)');
        setTimeoutReached(true);
      }, 10000); // 10초로 증가

      return () => clearTimeout(timeout);
    } else {
      // 초기화가 완료되면 타임아웃 리셋
      setTimeoutReached(false);
    }
  }, [loading, initialized]);

  // 초기화 완료 후, 사용자 객체가 없을 때 브라우저 세션을 한 번 확인하여 조기 리다이렉트 루프를 방지
  useEffect(() => {
    const checkSessionOnce = async () => {
      try {
        // 이미 확인했다면 재확인하지 않음
        if (hasCheckedSession) return;
        if (!initialized || loading) return;

        console.log('[ProtectedRoute] 브라우저 세션 확인 시작');
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.warn('[ProtectedRoute] 세션 확인 오류:', error?.message);
        }

        if (session?.user && !user) {
          console.log('[ProtectedRoute] 세션 존재하지만 스토어에 사용자 없음, 재초기화 시도');
          // 세션이 있지만 스토어에 사용자 정보가 없다면 재초기화하여 사용자/프로필 동기화
          initialize();
        } else {
          console.log('[ProtectedRoute] 세션 상태:', session?.user ? '존재' : '없음', ', 스토어 사용자:', user ? '존재' : '없음');
        }
      } catch (err) {
        console.error('[ProtectedRoute] 세션 확인 예외:', err);
      } finally {
        setHasCheckedSession(true);
      }
    };

    checkSessionOnce();
  }, [initialized, loading, hasCheckedSession, user, initialize]); // user 의존성 추가

  // 아직 초기화 중이거나 로딩 중이거나, 세션 확인이 끝나지 않았을 때는 로딩 페이지 표시
  if (!initialized || loading || !hasCheckedSession) {
    console.log('[ProtectedRoute] 로딩 중... (initialized:', initialized, ', loading:', loading, ', checkedSession:', hasCheckedSession, ')');
    return <LoadingPage />
  }

  // 타임아웃이 발생했거나, 초기화/로딩 완료 및 세션 확인까지 끝났는데 사용자가 없는 경우
  if (timeoutReached || (initialized && !loading && hasCheckedSession && !user)) {
    console.warn('[ProtectedRoute] 인증되지 않음. 로그인으로 리다이렉트:', location.pathname);
    
    // 추가 안전장치: 너무 빠른 연속 리다이렉트 방지 - 클라이언트 사이드에서만 실행
    if (typeof window !== 'undefined') {
      const now = Date.now();
      if (now - lastRedirectAttempt < 1000) {
        console.error('[ProtectedRoute] 너무 빠른 연속 리다이렉트 시도 차단');
        setRedirectBlocked(true);
        return <LoadingPage />
      }
    }
    
    // 이미 블록된 상태라면 로딩 페이지 유지
    if (redirectBlocked) {
      console.error('[ProtectedRoute] 리다이렉트 블록 상태 유지');
      return <LoadingPage />
    }
    
    // 리다이렉트 가드 확인 - 클라이언트 사이드에서만 실행
    if (typeof window !== 'undefined' && redirectGuard.canRedirect('/login', 'ProtectedRoute')) {
      const now = Date.now();
      setLastRedirectAttempt(now);
      redirectGuard.recordRedirect('/login', 'ProtectedRoute');
      return <Navigate to="/login" replace state={{ from: location }} />
    } else {
      console.error('[ProtectedRoute] 로그인 리다이렉트 루프 감지. 로딩 페이지 유지');
      console.error('[ProtectedRoute] RedirectGuard 상태:', redirectGuard.getStatus());
      setRedirectBlocked(true);
      return <LoadingPage />
    }
  }

  // 인증된 사용자는 자식 컴포넌트 렌더링
  console.log('[ProtectedRoute] 인증 완료. 페이지 렌더링:', location.pathname, 'User:', user?.email);
  return <>{children}</>
};

export default ProtectedRoute;