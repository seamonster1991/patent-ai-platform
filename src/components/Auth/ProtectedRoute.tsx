import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { LoadingPage } from '../UI/Loading';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading, initialized } = useAuthStore();
  const location = useLocation();

  // 초기화가 완료되지 않았거나 로딩 중이면 로딩 표시
  if (!initialized || loading) {
    return <LoadingPage text="인증 정보 확인 중..." />;
  }

  // 사용자가 없으면 로그인 페이지로 리다이렉트
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // 인증된 사용자는 자식 컴포넌트 렌더링
  return <>{children}</>;
};

export default ProtectedRoute;