import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { LoadingPage } from '../UI/Loading';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading, initialized } = useAuthStore();
  const location = useLocation();
  const [timeoutReached, setTimeoutReached] = useState(false);

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

  // 타임아웃이 발생했거나, 초기화가 완료되고 로딩이 끝났는데 사용자가 없는 경우
  if (timeoutReached || (initialized && !loading && !user)) {
    console.warn('[ProtectedRoute] 인증되지 않음. 로그인으로 리다이렉트:', location.pathname);
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  // 아직 초기화 중이거나 로딩 중일 때는 로딩 페이지 표시
  if (!initialized || loading) {
    console.log('[ProtectedRoute] 로딩 중... (initialized:', initialized, ', loading:', loading, ')');
    return <LoadingPage />
  }

  // 인증된 사용자는 자식 컴포넌트 렌더링
  console.log('[ProtectedRoute] 인증 완료. 페이지 렌더링:', location.pathname, 'User:', user?.email);
  return <>{children}</>
};

export default ProtectedRoute;