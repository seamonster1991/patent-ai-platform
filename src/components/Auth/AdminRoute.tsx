import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAdminStore } from '../../store/adminStore';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';

interface AdminRouteProps {
  children: React.ReactNode;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { user, isAdmin, loading: authLoading } = useAuthStore();
  const { isLoading: adminLoading } = useAdminStore();
  const [isChecking, setIsChecking] = useState(true);
  const [hasAdminAccess, setHasAdminAccess] = useState(false);

  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        setIsChecking(true);
        
        // 사용자가 로그인되어 있지 않으면 접근 거부
        if (!user) {
          setHasAdminAccess(false);
          setIsChecking(false);
          return;
        }

        // 이메일 기반 관리자 확인 (admin@p-ai.com)
        if (user.email === 'admin@p-ai.com') {
          setHasAdminAccess(true);
          setIsChecking(false);
          return;
        }

        // AuthStore의 isAdmin 상태 확인
        if (isAdmin) {
          setHasAdminAccess(true);
          setIsChecking(false);
          return;
        }

        // Supabase에서 사용자 프로필 확인
        const { data: profile, error } = await supabase
          .from('users')
          .select('role, is_admin')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error checking admin status:', error);
          setHasAdminAccess(false);
        } else {
          // 프로필에서 관리자 권한 확인
          const isProfileAdmin = profile?.role === 'admin' || profile?.is_admin === true;
          setHasAdminAccess(isProfileAdmin);
        }
      } catch (error) {
        console.error('Error in admin access check:', error);
        setHasAdminAccess(false);
      } finally {
        setIsChecking(false);
      }
    };

    // 인증 로딩이 완료된 후에만 관리자 권한 확인
    if (!authLoading) {
      checkAdminAccess();
    }
  }, [user, isAdmin, authLoading]);

  // 로딩 중일 때 스피너 표시
  if (authLoading || adminLoading || isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // 사용자가 로그인하지 않았거나 관리자가 아닌 경우 홈으로 리다이렉트
  if (!user || !hasAdminAccess) {
    return <Navigate to="/" replace />;
  }

  // 관리자 권한이 확인된 경우 자식 컴포넌트 렌더링
  return <>{children}</>;
};

export default AdminRoute;