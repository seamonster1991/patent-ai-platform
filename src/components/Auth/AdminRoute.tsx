import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAdminStore } from '../../store/adminStore';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';

interface AdminRouteProps {
  children: React.ReactNode;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const [isChecking, setIsChecking] = useState(true);
  const { user } = useAuthStore();
  const { isAdmin, setAdmin, clearAdmin, setLoading } = useAdminStore();

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        clearAdmin();
        setIsChecking(false);
        return;
      }

      try {
        setLoading(true);
        
        // Check if user has admin role in users table
        const { data: userProfile, error } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error checking admin status:', error);
          clearAdmin();
          setIsChecking(false);
          return;
        }

        // Check if user has admin or super_admin role
        if (userProfile?.role === 'admin' || userProfile?.role === 'super_admin') {
          setAdmin({
            id: user.id,
            email: user.email || '',
            role: userProfile.role,
            created_at: user.created_at || ''
          });
        } else {
          clearAdmin();
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        clearAdmin();
      } finally {
        setLoading(false);
        setIsChecking(false);
      }
    };

    checkAdminStatus();
  }, [user, setAdmin, clearAdmin, setLoading]);

  // Show loading while checking admin status
  if (isChecking) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">관리자 권한을 확인하는 중...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect to home if not admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-white mb-2">접근 권한이 없습니다</h1>
          <p className="text-gray-400 mb-6">관리자 권한이 필요한 페이지입니다.</p>
          <button
            onClick={() => window.history.back()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            이전 페이지로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AdminRoute;