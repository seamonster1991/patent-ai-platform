import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAdminStore } from '../../stores/useAdminStore';
import { useAuthStore } from '../../store/authStore';
import { LoadingSpinner } from '../UI/LoadingSpinner';

interface AdminProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'super_admin' | 'admin' | 'operator';
}

const AdminProtectedRoute: React.FC<AdminProtectedRouteProps> = ({ 
  children, 
  requiredRole 
}) => {
  const location = useLocation();
  const { admin, isAuthenticated, isLoading, getCurrentAdmin } = useAdminStore();
  const { isAdmin: userIsAdmin, user, loading: userLoading } = useAuthStore();

  useEffect(() => {
    console.log('[AdminProtectedRoute] 상태 확인:', { admin, isAuthenticated, isLoading });
    console.log('[AdminProtectedRoute] 일반 사용자 상태:', { userIsAdmin, user: user?.email, userLoading });
    
    // 토큰이 있지만 사용자 정보가 없는 경우 사용자 정보를 가져옴
    if (!admin && !isLoading) {
      console.log('[AdminProtectedRoute] getCurrentAdmin 호출');
      getCurrentAdmin();
    }
  }, [admin, isAuthenticated, isLoading, getCurrentAdmin, userIsAdmin, user, userLoading]);

  // 로딩 중인 경우
  if (isLoading || userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">인증 정보를 확인하고 있습니다...</p>
        </div>
      </div>
    );
  }

  // 관리자 시스템 인증 또는 일반 사용자의 isAdmin 플래그 확인
  const hasAdminAccess = (isAuthenticated && admin) || (userIsAdmin && user);

  // 인증되지 않은 경우 로그인 페이지로 리다이렉트
  if (!hasAdminAccess) {
    console.log('[AdminProtectedRoute] 관리자 접근 권한 없음, 로그인 페이지로 리다이렉트');
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  // 역할 기반 접근 제어 (관리자 시스템에서만 적용)
  if (requiredRole && admin) {
    const roleHierarchy = {
      operator: 1,
      admin: 2,
      super_admin: 3,
    };

    const userRoleLevel = roleHierarchy[admin.role];
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