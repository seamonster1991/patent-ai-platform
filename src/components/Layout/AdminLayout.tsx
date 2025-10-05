import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { 
  Home, 
  BarChart3, 
  Users, 
  CreditCard, 
  LogOut,
  Shield
} from 'lucide-react';

interface AdminLayoutProps {
  children?: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuthStore();

  const navigation = [
    {
      name: '홈',
      href: '/admin',
      icon: Home,
      current: location.pathname === '/admin'
    },
    {
      name: '통계',
      href: '/admin/statistics',
      icon: BarChart3,
      current: location.pathname === '/admin/statistics'
    },
    {
      name: '사용자',
      href: '/admin/users',
      icon: Users,
      current: location.pathname === '/admin/users'
    },
    {
      name: '결제',
      href: '/admin/billing',
      icon: CreditCard,
      current: location.pathname === '/admin/billing'
    }
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-ms-olive" />
              <span className="ml-3 text-xl font-bold text-ms-text">
                Patent AI Admin
              </span>
            </div>

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {user?.email}
              </span>
              <button
                onClick={handleSignOut}
                className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-ms-olive transition-colors"
              >
                <LogOut className="h-4 w-4 mr-2" />
                로그아웃
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <nav className="w-64 bg-white border-r border-gray-200 min-h-screen">
          <div className="p-6">
            <ul className="space-y-2">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.name}>
                    <button
                      onClick={() => navigate(item.href)}
                      className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                        item.current
                          ? 'bg-ms-olive text-white'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-ms-olive'
                      }`}
                    >
                      <Icon className="h-5 w-5 mr-3" />
                      {item.name}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 p-8">
          <div className="max-w-6xl mx-auto">
            {children || <Outlet />}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;