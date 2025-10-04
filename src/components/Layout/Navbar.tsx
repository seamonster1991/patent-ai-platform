import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Search, User, LogOut, Menu, X, Moon, Sun } from 'lucide-react'
import { useState, useMemo, useCallback } from 'react'
import { useAuthStore } from '../../store/authStore'
import { useThemeStore } from '../../store/themeStore'
import { cn } from '../../lib/utils'
import { toast } from 'sonner'

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { user, signOut, loading, initialized } = useAuthStore()
  const { isDark, toggleTheme } = useThemeStore()
  const location = useLocation()
  const navigate = useNavigate()

  // 네비게이션 메뉴 메모이제이션
  const navigation = useMemo(() => [
    { name: '홈', href: '/', icon: Search },
    { name: '검색', href: '/search', icon: Search },
    { name: '대시보드', href: '/dashboard', icon: User },
  ], [])

  // 활성 경로 확인 함수 메모이제이션
  const isActive = useCallback((path: string) => {
    if (path === '/') {
      return location.pathname === '/'
    }
    return location.pathname.startsWith(path)
  }, [location.pathname])

  // 로그아웃 핸들러 메모이제이션
  const handleSignOut = useCallback(async () => {
    try {
      await signOut()
      setIsMenuOpen(false)
      toast.success('로그아웃되었습니다.')
      navigate('/')
    } catch (error) {
      console.error('로그아웃 오류:', error)
      toast.error('로그아웃 중 오류가 발생했습니다.')
    }
  }, [signOut, navigate])

  // 보호된 네비게이션 핸들러 메모이제이션
  const handleProtectedNavigation = useCallback((href: string, name: string) => {
    if (!user) {
      toast.error(`${name} 페이지는 로그인이 필요합니다.`)
      navigate('/login')
      return
    }
    navigate(href)
  }, [user, navigate])

  // AuthStore가 초기화되지 않았으면 간단한 로딩 상태 표시
  if (!initialized) {
    return (
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-ms-line">
        <div className="ms-container">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-md border border-ms-line bg-white/70 flex items-center justify-center">
                <Search className="w-5 h-5 text-ms-olive" />
              </div>
              <span className="text-xl font-semibold text-ms-text">P-AI</span>
            </Link>
            <div className="w-6 h-6 border-2 border-ms-olive border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>
      </nav>
    )
  }



  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/70 dark:bg-slate-900/60 backdrop-blur border-b border-ms-line">
      <div className="ms-container">
        <div className="flex justify-between items-center h-16">
          {/* Logo and main navigation */}
          <div className="flex items-center">
            <Link 
              to="/" 
              className="flex items-center space-x-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ms-olive focus-visible:ring-offset-2 focus-visible:ring-offset-white rounded-md"
            >
              <div className="w-8 h-8 rounded-md border border-ms-line bg-white/70 flex items-center justify-center">
                <Search className="w-5 h-5 text-ms-olive" />
              </div>
              <span className="text-xl font-semibold text-ms-text">P-AI</span>
            </Link>

            {/* Desktop navigation */}
            <div className="hidden md:ml-10 md:flex md:space-x-8">
              {navigation.map((item) => {
                // 홈 페이지는 항상 표시, 검색과 대시보드는 로그인 상태에 따라 처리
                if (item.href === '/') {
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={cn(
                        'inline-flex items-center px-1 pt-1 text-sm font-medium border-b-2 transition-colors',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ms-olive focus-visible:ring-offset-2',
                        'focus-visible:ring-offset-white',
                        isActive(item.href)
                          ? 'border-ms-olive text-ms-olive'
                          : 'border-transparent text-gray-700 hover:text-ms-olive hover:border-ms-line'
                      )}
                    >
                      <item.icon className="w-4 h-4 mr-2" />
                      {item.name}
                    </Link>
                  )
                }

                // 검색과 대시보드는 로그인 상태에 따라 처리
                return (
                  <button
                    key={item.name}
                    onClick={() => handleProtectedNavigation(item.href, item.name)}
                    className={cn(
                      'inline-flex items-center px-1 pt-1 text-sm font-medium border-b-2 transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ms-olive focus-visible:ring-offset-2',
                      'focus-visible:ring-offset-white',
                      isActive(item.href)
                        ? 'border-ms-olive text-ms-olive'
                        : 'border-transparent text-gray-700 hover:text-ms-olive hover:border-ms-line',
                      !user && 'opacity-75'
                    )}
                  >
                    <item.icon className="w-4 h-4 mr-2" />
                    {item.name}
                    {!user && <span className="ml-1 text-xs text-secondary-400">🔒</span>}
                  </button>
                )
              })}
            </div>
          </div>

          {/* User menu */}
          <div className="flex items-center space-x-4">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="text-gray-700 hover:text-ms-olive transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ms-olive focus-visible:ring-offset-2 focus-visible:ring-offset-white rounded-md p-1"
              aria-label={isDark ? '라이트 모드로 전환' : '다크 모드로 전환'}
            >
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            {user ? (
              <>
                <Link
                  to="/profile"
                  className="text-gray-700 hover:text-ms-olive transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ms-olive focus-visible:ring-offset-2 focus-visible:ring-offset-white rounded-md p-1"
                  aria-label="개인정보 수정"
                >
                  <User className="h-5 w-5" />
                </Link>
                <button
                  onClick={handleSignOut}
                  className="text-gray-700 hover:text-danger-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white rounded-md p-1"
                  aria-label="로그아웃"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  to="/login"
                  className="text-gray-800 hover:text-ms-olive transition-colors px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ms-olive focus-visible:ring-offset-2 focus-visible:ring-offset-white rounded-md"
                >
                  로그인
                </Link>
                <Link
                  to="/register"
                  className="border border-ms-line text-ms-olive px-4 py-2 rounded-md hover:bg-ms-olive/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ms-olive focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                >
                  회원가입
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden text-secondary-600 dark:text-secondary-300 hover:text-ms-olive transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ms-olive focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-dark-900 rounded-lg p-1"
              aria-label={isMenuOpen ? '메뉴 닫기' : '메뉴 열기'}
              aria-expanded={isMenuOpen}
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-white/70 dark:bg-slate-900/60 backdrop-blur border-t border-ms-line">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navigation.map((item) => {
                // 홈 페이지는 항상 표시
                if (item.href === '/') {
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setIsMenuOpen(false)}
                      className={cn(
                        'flex items-center px-3 py-2 text-base font-medium rounded-lg transition-colors',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ms-olive focus-visible:ring-offset-2',
                        'focus-visible:ring-offset-white',
                        isActive(item.href)
                          ? 'text-ms-olive'
                          : 'text-gray-600 hover:text-ms-olive'
                      )}
                    >
                      <item.icon className="w-5 h-5 mr-3" />
                      {item.name}
                    </Link>
                  )
                }

                // 검색과 대시보드는 로그인 상태에 따라 처리
                return (
                  <button
                    key={item.name}
                    onClick={() => {
                      setIsMenuOpen(false)
                      handleProtectedNavigation(item.href, item.name)
                    }}
                    className={cn(
                      'flex items-center w-full px-3 py-2 text-base font-medium rounded-lg transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ms-olive focus-visible:ring-offset-2',
                      'focus-visible:ring-offset-white',
                      isActive(item.href)
                        ? 'text-ms-olive'
                        : 'text-gray-600 hover:text-ms-olive',
                      !user && 'opacity-75'
                    )}
                  >
                    <item.icon className="w-5 h-5 mr-3" />
                    {item.name}
                    {!user && <span className="ml-auto text-xs text-secondary-400">🔒</span>}
                  </button>
                )
              })}
              
              {user ? (
                <div className="border-t border-secondary-200 dark:border-secondary-700 pt-4 mt-4">
                  <Link
                    to="/profile"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center px-3 py-2 text-base font-medium text-secondary-600 dark:text-secondary-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-secondary-100 dark:hover:bg-secondary-800 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-dark-900"
                  >
                    <User className="w-5 h-5 mr-3" />
                    프로필
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center w-full px-3 py-2 text-base font-medium text-secondary-600 dark:text-secondary-300 hover:text-danger-600 dark:hover:text-danger-400 hover:bg-secondary-100 dark:hover:bg-secondary-800 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-dark-900"
                  >
                    <LogOut className="w-5 h-5 mr-3" />
                    로그아웃
                  </button>
                </div>
              ) : (
                <div className="border-t border-secondary-200 dark:border-secondary-700 pt-4 mt-4 space-y-1">
                  <Link
                    to="/login"
                    onClick={() => setIsMenuOpen(false)}
                    className="block px-3 py-2 text-base font-medium text-secondary-600 dark:text-secondary-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-secondary-100 dark:hover:bg-secondary-800 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-dark-900"
                  >
                    로그인
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setIsMenuOpen(false)}
                    className="block px-3 py-2 text-base font-medium bg-primary-600 text-white hover:bg-primary-700 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-dark-900"
                  >
                    회원가입
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}