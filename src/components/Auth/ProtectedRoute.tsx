import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { LoadingPage } from '../UI/Loading';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading, initialized, initialize } = useAuthStore();
  const location = useLocation();

  // 초기화 시도
  useEffect(() => {
    if (!initialized) {
      initialize();
    }
  }, [initialized, initialize]);

  // 디버그 로깅
  useEffect(() => {
    console.log('[ProtectedRoute] 상태:', { 
      path: location.pathname, 
      loading, 
      initialized,
      authed: !!user, 
      userId: user?.id,
      email: user?.email
    });
  }, [location.pathname, loading, initialized, user]);

  // 로딩 중이면 로딩 페이지 표시
  if (loading || !initialized) {
    console.log('[ProtectedRoute] 로딩 중... (initialized:', initialized, ', loading:', loading, ')');
    return <LoadingPage />
  }

  // 사용자가 없으면 로그인 페이지로 리다이렉트
  if (!user) {
    console.warn('[ProtectedRoute] 인증되지 않음. 로그인으로 리다이렉트:', location.pathname);
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  // 인증된 사용자는 자식 컴포넌트 렌더링
  console.log('[ProtectedRoute] 인증 완료. 페이지 렌더링:', location.pathname, 'User:', user?.email);
  return <>{children}</>
};

export default ProtectedRoute;