import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Shield, AlertTriangle, Loader2 } from 'lucide-react';

interface AdminRouteProps {
  children: React.ReactNode;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { user, isAdmin, loading, initialized } = useAuthStore();

  // 아직 초기화되지 않았거나 로딩 중인 경우
  if (!initialized || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
          <div className="flex items-center justify-center space-x-2 mb-2">
            <Shield className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              관리자 권한 확인 중
            </h2>
          </div>
          <p className="text-slate-600 dark:text-slate-400">
            잠시만 기다려주세요...
          </p>
        </div>
      </div>
    );
  }

  // 로그인하지 않은 경우 홈으로 리다이렉트
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // 관리자가 아닌 경우 접근 거부 페이지 표시
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            접근 권한이 없습니다
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            관리자 권한이 필요한 페이지입니다. 관리자 계정으로 로그인해주세요.
          </p>
          <div className="space-y-3">
            <button 
              onClick={() => window.location.href = '/'} 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              홈으로 돌아가기
            </button>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              현재 로그인: {user.email}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 관리자 권한이 확인된 경우 자식 컴포넌트 렌더링
  return <>{children}</>;
};

export default AdminRoute;