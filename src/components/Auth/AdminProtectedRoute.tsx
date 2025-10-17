import React, { useEffect, useRef, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAdminStore } from '../../stores/useAdminStore';
import { LoadingSpinner } from '../UI/LoadingSpinner';

interface AdminProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'super_admin' | 'admin' | 'operator';
}

// 전역 초기화 상태 관리 (컴포넌트 간 공유)
let globalInitialized = false;
let globalInitializing = false;

const AdminProtectedRoute: React.FC<AdminProtectedRouteProps> = ({ 
  children, 
  requiredRole 
}) => {
  const location = useLocation();
  const { admin, isAuthenticated, isLoading, isInitialized, initialize } = useAdminStore();
  const [localLoading, setLocalLoading] = useState(false);
  const initTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const initializeAuth = async () => {
      // 전역 및 스토어 상태 확인으로 중복 실행 완전 방지
      if (globalInitialized || globalInitializing || isInitialized) {
        console.log('[AdminProtectedRoute] 이미 초기화됨, 스킵');
        return;
      }

      console.log('[AdminProtectedRoute] 인증 초기화 시작');
      globalInitializing = true;
      setLocalLoading(true);

      // 3초 타임아웃 설정
      initTimeoutRef.current = setTimeout(() => {
        console.warn('[AdminProtectedRoute] 초기화 타임아웃 (3초)');
        setLocalLoading(false);
        globalInitializing = false;
      }, 3000);

      try {
        await initialize();
        globalInitialized = true;
        console.log('[AdminProtectedRoute] 초기화 완료');
      } catch (error) {
        console.error('[AdminProtectedRoute] 초기화 실패:', error);
      } finally {
        if (initTimeoutRef.current) {
          clearTimeout(initTimeoutRef.current);
        }
        setLocalLoading(false);
        globalInitializing = false;
      }
    };

    initializeAuth();

    // 컴포넌트 언마운트 시 타임아웃 정리
    return () => {
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
      }
    };
  }, []); // 빈 의존성 배열로 마운트 시에만 실행

  // 로딩 상태 통합 관리
  const isCurrentlyLoading = isLoading || localLoading || globalInitializing;

  // 로딩 중인 경우
  if (isCurrentlyLoading) {
    console.log('[AdminProtectedRoute] 로딩 중...');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">관리자 인증 정보를 확인하고 있습니다...</p>
          <p className="mt-2 text-sm text-gray-400">최대 3초 소요됩니다</p>
        </div>
      </div>
    );
  }

  console.log('[AdminProtectedRoute] 접근 권한 확인:', {
    isAuthenticated,
    hasAdmin: !!admin,
    adminRole: admin?.role,
    isInitialized
  });

  // 관리자 시스템 인증 확인
  if (!isAuthenticated || !admin) {
    console.log('[AdminProtectedRoute] 관리자 접근 권한 없음, 로그인 페이지로 리다이렉트');
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  // 역할 기반 접근 제어
  if (requiredRole && admin) {
    const roleHierarchy = {
      operator: 1,
      admin: 2,
      super_admin: 3,
    };

    const userRoleLevel = roleHierarchy[admin.role as keyof typeof roleHierarchy];
    const requiredRoleLevel = roleHierarchy[requiredRole];

    if (userRoleLevel < requiredRoleLevel) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <svg
                className="h-6 w-6 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                />
              </svg>
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">접근 권한이 없습니다</h3>
            <p className="mt-1 text-sm text-gray-500">
              이 페이지에 접근하려면 {requiredRole} 권한이 필요합니다.
            </p>
            <div className="mt-6">
              <button
                type="button"
                onClick={() => window.history.back()}
                className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                이전 페이지로 돌아가기
              </button>
            </div>
          </div>
        </div>
      );
    }
  }

  console.log('[AdminProtectedRoute] 관리자 접근 허용');
  return <>{children}</>;
};

export default AdminProtectedRoute;