import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, User, LogOut, Settings, Sun, Moon, Search, FileText, CreditCard } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';

const Navbar: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuthStore();
  const { isDark, toggleTheme } = useThemeStore();

  const handleLogout = () => {
    signOut();
    navigate('/');
    setIsProfileOpen(false);
  };

  const isActive = (path: string) => location.pathname === path;

  const navLinks = [
    { path: '/', label: '홈', icon: null },
    { path: '/search', label: '특허 검색', icon: Search },
    { path: '/dashboard', label: '대시보드', icon: null, requireAuth: false },
  ];

  return (
    <nav className="bg-ms-white border-b border-ms-line sticky top-0 z-50 backdrop-blur-sm bg-opacity-95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 min-h-[4rem]">
          {/* Logo */}
          <Link 
            to="/" 
            className="flex items-center space-x-3 group flex-shrink-0"
          >
            <div className="w-8 h-8 bg-ms-olive rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">P</span>
            </div>
            <span className="text-ms-primary font-semibold text-lg tracking-tight group-hover:text-ms-olive transition-colors">
              Patent AI
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-0.5 flex-shrink-0">
            {navLinks.map((link) => {
              if (link.requireAuth && !user) return null;
              
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`px-2.5 py-2 rounded-md text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                    isActive(link.path)
                      ? 'bg-ms-olive text-white shadow-ms-sm'
                      : 'text-ms-secondary hover:text-ms-olive hover:bg-ms-soft'
                  }`}
                >
                  <div className="flex items-center space-x-1.5">
                    {link.icon && <link.icon className="w-4 h-4" />}
                    <span>{link.label}</span>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center space-x-2 flex-shrink-0">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-md text-ms-secondary hover:text-ms-olive hover:bg-ms-soft transition-all duration-200"
              aria-label="테마 변경"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {user ? (
              /* User Profile Dropdown */
              <div className="relative">
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center space-x-2 p-2 rounded-md text-ms-secondary hover:text-ms-olive hover:bg-ms-soft transition-all duration-200"
                >
                  <User className="w-5 h-5" />
                  <span className="text-sm font-medium">{user.email}</span>
                </button>

                {isProfileOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-ms-white border border-ms-line rounded-lg shadow-ms-lg py-2 z-50">
                    <div className="px-4 py-2 border-b border-ms-soft">
                      <p className="text-sm font-medium text-ms-primary">{user.email}</p>
                      <p className="text-xs text-ms-muted">사용자</p>
                    </div>
                    
                    <Link
                      to="/billing"
                      className="flex items-center space-x-2 px-4 py-2 text-sm text-ms-secondary hover:text-ms-olive hover:bg-ms-soft transition-colors"
                      onClick={() => setIsProfileOpen(false)}
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>결제정보</span>
                    </Link>
                    
                    <Link
                      to="/profile"
                      className="flex items-center space-x-2 px-4 py-2 text-sm text-ms-secondary hover:text-ms-olive hover:bg-ms-soft transition-colors"
                      onClick={() => setIsProfileOpen(false)}
                    >
                      <Settings className="w-4 h-4" />
                      <span>프로필 설정</span>
                    </Link>
                    
                    <button
                      onClick={handleLogout}
                      className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-ms-secondary hover:text-ms-olive hover:bg-ms-soft transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>로그아웃</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Auth Buttons */
              <div className="flex items-center space-x-1.5">
                <Link
                  to="/login"
                  className="px-3 py-2 text-sm font-medium text-ms-olive hover:text-ms-olive/80 transition-colors"
                >
                  로그인
                </Link>
                <Link
                  to="/register"
                  className="ms-btn-primary"
                >
                  회원가입
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-md text-ms-secondary hover:text-ms-olive hover:bg-ms-soft transition-all duration-200"
            aria-label="메뉴 열기"
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-ms-soft bg-ms-white">
            <div className="py-4 space-y-2">
              {navLinks.map((link) => {
                if (link.requireAuth && !user) return null;
                
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-md text-sm font-medium transition-all duration-200 ${
                      isActive(link.path)
                        ? 'bg-ms-olive text-white'
                        : 'text-ms-secondary hover:text-ms-olive hover:bg-ms-soft'
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {link.icon && <link.icon className="w-4 h-4" />}
                    <span>{link.label}</span>
                  </Link>
                );
              })}

              {/* Mobile Theme Toggle */}
              <button
                onClick={() => {
                  toggleTheme();
                  setIsMenuOpen(false);
                }}
                className="flex items-center space-x-3 w-full px-4 py-3 rounded-md text-sm font-medium text-ms-secondary hover:text-ms-olive hover:bg-ms-soft transition-all duration-200"
              >
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                <span>{isDark ? '라이트 모드' : '다크 모드'}</span>
              </button>

              {user ? (
                /* Mobile User Menu */
                <div className="border-t border-ms-soft pt-4 mt-4">
                  <div className="px-4 py-2 mb-2">
                    <p className="text-sm font-medium text-ms-primary">{user.email}</p>
                    <p className="text-xs text-ms-muted">사용자</p>
                  </div>
                  
                  <Link
                    to="/billing"
                    className="flex items-center space-x-3 px-4 py-3 rounded-md text-sm font-medium text-ms-secondary hover:text-ms-olive hover:bg-ms-soft transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>결제정보</span>
                  </Link>
                  
                  <Link
                    to="/profile"
                    className="flex items-center space-x-3 px-4 py-3 rounded-md text-sm font-medium text-ms-secondary hover:text-ms-olive hover:bg-ms-soft transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Settings className="w-4 h-4" />
                    <span>프로필 설정</span>
                  </Link>
                  
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsMenuOpen(false);
                    }}
                    className="flex items-center space-x-3 w-full px-4 py-3 rounded-md text-sm font-medium text-ms-secondary hover:text-ms-olive hover:bg-ms-soft transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>로그아웃</span>
                  </button>
                </div>
              ) : (
                /* Mobile Auth Buttons */
                <div className="border-t border-ms-soft pt-4 mt-4 space-y-2">
                  <Link
                    to="/login"
                    className="block px-4 py-3 rounded-md text-sm font-medium text-ms-olive hover:text-ms-olive/80 hover:bg-ms-soft transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    로그인
                  </Link>
                  <Link
                    to="/register"
                    className="block px-4 py-3 rounded-md text-sm font-medium bg-ms-olive text-white hover:bg-ms-olive/90 transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    회원가입
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Overlay for mobile menu */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-20 z-40 md:hidden"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* Overlay for profile dropdown */}
      {isProfileOpen && (
        <div 
          className="fixed inset-0 z-40"
          onClick={() => setIsProfileOpen(false)}
        />
      )}
    </nav>
  );
};

export default Navbar;