import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { checkAdminPermission } from '../../lib/api';
import { Shield, AlertTriangle, Loader2 } from 'lucide-react';

interface AdminRouteProps {
  children: React.ReactNode;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { user, isAdmin, loading, initialized } = useAuthStore();
  const [serverAuthChecked, setServerAuthChecked] = useState(false);
  const [serverAuthValid, setServerAuthValid] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // 서버측 권한 검증 - 클라이언트 권한과 관계없이 무조건 실행
  useEffect(() => {
    const verifyServerAuth = async () => {
      if (!user || !initialized || loading) {
        return;
      }

      console.log('🔐 [AdminRoute] 서버측 권한 검증 시작 - 클라이언트 isAdmin:', isAdmin);
      setServerAuthChecked(false);
      setAuthError(null);

      try {
        const response = await checkAdminPermission();
        
        if (response.success) {
          console.log('✅ [AdminRoute] 서버측 권한 검증 성공');
          setServerAuthValid(true);
        } else {
          console.error('❌ [AdminRoute] 서버측 권한 검증 실패:', response.error);
          setServerAuthValid(false);
          setAuthError(response.error || '서버 권한 검증에 실패했습니다.');
        }
      } catch (error) {
        console.error('❌ [AdminRoute] 서버측 권한 검증 오류:', error);
        setServerAuthValid(false);
        setAuthError('권한 검증 중 오류가 발생했습니다.');
      } finally {
        setServerAuthChecked(true);
      }
    };

    verifyServerAuth();
  }, [user, initialized, loading]); // isAdmin 의존성 제거

  // 아직 초기화되지 않았거나 로딩 중이거나 서버 권한 검증 중인 경우
  if (!initialized || loading || (user && !serverAuthChecked)) {
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

  // 서버측 권한 검증이 완료되었고 실패한 경우 무조건 접근 거부
  // 클라이언트 isAdmin 상태와 관계없이 서버 검증 결과만 사용
  if (serverAuthChecked && !serverAuthValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            접근 권한이 없습니다
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            {authError || '관리자 권한이 필요한 페이지입니다. 서버측 권한 검증에 실패했습니다.'}
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
            <p className="text-xs text-red-500">
              클라이언트 권한: {isAdmin ? '관리자' : '일반 유저'} | 서버 검증: 실패
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 서버측 권한 검증이 성공한 경우에만 자식 컴포넌트 렌더링
  if (serverAuthChecked && serverAuthValid) {
    console.log('✅ [AdminRoute] 관리자 접근 허용 - 서버 검증 성공');
    return <>{children}</>;
  }

  // 기본적으로 로딩 상태 표시 (예상치 못한 상황)
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
        <p className="text-slate-600 dark:text-slate-400">권한 확인 중...</p>
      </div>
    </div>
  );
};

export default AdminRoute;