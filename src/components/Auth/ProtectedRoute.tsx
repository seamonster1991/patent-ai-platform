import React, { useEffect, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { LoadingPage } from '../UI/Loading';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuthStore();
  const location = useLocation();
  const hasLoggedRef = useRef<string>('');

  // 임시 디버그 로깅: 라우팅 가드 상태 추적
  useEffect(() => {
    const key = `${location.pathname}|${loading ? 'loading' : 'ready'}|${user ? 'authed' : 'guest'}`;
    if (hasLoggedRef.current !== key) {
      hasLoggedRef.current = key;
      console.log('[ProtectedRoute] path=', location.pathname, 'state=', { loading, authed: !!user });
    }
  }, [location.pathname, loading, user]);

  if (loading) {
    return <LoadingPage />
  }

  if (!user) {
    console.warn('[ProtectedRoute] 인증되지 않음. 로그인으로 리다이렉트:', location.pathname);
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <>{children}</>
};

export default ProtectedRoute;