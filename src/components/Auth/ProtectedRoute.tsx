import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { LoadingPage } from '../UI/Loading';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading, initialized, initialize } = useAuthStore();
  const location = useLocation();
  const [tokenCheckLoading, setTokenCheckLoading] = useState(false);

  // 토큰 유효성 검사
  const checkTokenValidity = async () => {
    try {
      setTokenCheckLoading(true);
      
      // localStorage에서 토큰 확인
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('[ProtectedRoute] 토큰이 없음');
        return false;
      }

      // Supabase 세션 확인
      const { supabase } = await import('../../lib/supabase');
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('[ProtectedRoute] 세션 확인 오류:', error);
        return false;
      }

      if (!session || !session.access_token) {
        console.warn('[ProtectedRoute] 유효한 세션이 없음');
        return false;
      }

      // 토큰이 다르면 localStorage 업데이트
      if (session.access_token !== token) {
        localStorage.setItem('token', session.access_token);
      }

      return true;
    } catch (error) {
      console.error('[ProtectedRoute] 토큰 검사 실패:', error);
      return false;
    } finally {
      setTokenCheckLoading(false);
    }
  };

  // 토큰 만료 처리
  const handleTokenExpiration = async () => {
    try {
      console.warn('[ProtectedRoute] 토큰 만료 처리 시작');
      
      // localStorage 정리
      localStorage.removeItem('token');
      localStorage.removeItem('supabase.auth.token');
      
      // Supabase 로그아웃
      const { supabase } = await import('../../lib/supabase');
      await supabase.auth.signOut();
      
      // authStore 상태 초기화
      const { signOut } = useAuthStore.getState();
      await signOut();
      
    } catch (error) {
      console.error('[ProtectedRoute] 토큰 만료 처리 실패:', error);
    }
  };

  // 초기화 시도
  useEffect(() => {
    if (!initialized) {
      initialize();
    }
  }, [initialized, initialize]);

  // 사용자가 있을 때 토큰 유효성 검사
  useEffect(() => {
    if (user && initialized && !loading) {
      checkTokenValidity().then(isValid => {
        if (!isValid) {
          console.warn('[ProtectedRoute] 토큰이 유효하지 않음, 로그아웃 처리');
          handleTokenExpiration();
        }
      });
    }
  }, [user, initialized, loading, location.pathname]);

  // 디버그 로깅
  useEffect(() => {
    console.log('[ProtectedRoute] 상태:', { 
      path: location.pathname, 
      loading, 
      initialized,
      tokenCheckLoading,
      authed: !!user, 
      userId: user?.id,
      email: user?.email
    });
  }, [location.pathname, loading, initialized, tokenCheckLoading, user]);

  // 로딩 중이면 로딩 페이지 표시
  if (loading || !initialized || tokenCheckLoading) {
    console.log('[ProtectedRoute] 로딩 중... (initialized:', initialized, ', loading:', loading, ', tokenCheckLoading:', tokenCheckLoading, ')');
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