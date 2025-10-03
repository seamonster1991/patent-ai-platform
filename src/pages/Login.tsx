import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Eye, EyeOff, Search } from 'lucide-react'
import Layout from '../components/Layout/Layout'
import Button from '../components/UI/Button'
import Input from '../components/UI/Input'
import Card, { CardContent, CardHeader, CardTitle } from '../components/UI/Card'
import { useAuthStore } from '../store/authStore'
import { validateEmail } from '../lib/utils'
import { toast } from 'sonner'
import { redirectGuard } from '../lib/redirectGuard'

export default function Login() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [lastRedirectAttempt, setLastRedirectAttempt] = useState<number>(0)
  const [redirectBlocked, setRedirectBlocked] = useState(false)
  
  const { signIn, isAdmin, user, loading: authLoading, initialized } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()

  // 페이지 로드 시 이미 로그인된 사용자 확인 (한 번만 실행)
  useEffect(() => {
    // 초기화 완료되고 이미 로그인된 사용자가 있으면 리다이렉트
    const fromPath = (location.state as any)?.from?.pathname as string | undefined;
    if (initialized && !authLoading && user) {
      console.log('[Login] 페이지 로드 시 로그인된 사용자 감지, 리다이렉트:', user.email);

      let targetPath = '/';
      
      if (fromPath) {
        targetPath = fromPath;
        console.log('[Login] 이전 페이지로 이동:', fromPath);
      } else if (isAdmin || user.email === 'admin@p-ai.com') {
        targetPath = '/admin';
      }

      // 추가 안전장치: 너무 빠른 연속 리다이렉트 방지
      const now = Date.now();
      if (now - lastRedirectAttempt < 1000) {
        console.error('[Login] 너무 빠른 연속 리다이렉트 시도 차단');
        setRedirectBlocked(true);
        return;
      }
      
      // 이미 블록된 상태라면 리다이렉트 중단
      if (redirectBlocked) {
        console.error('[Login] 리다이렉트 블록 상태');
        return;
      }

      // 리다이렉트 가드 확인
      if (redirectGuard.canRedirect(targetPath, 'Login-useEffect')) {
        setLastRedirectAttempt(now);
        redirectGuard.recordRedirect(targetPath, 'Login-useEffect');
        navigate(targetPath, { replace: true });
      } else {
        console.warn('[Login] 리다이렉트 루프 방지로 인해 리다이렉트 취소:', targetPath);
        console.error('[Login] RedirectGuard 상태:', redirectGuard.getStatus());
        setRedirectBlocked(true);
        toast.error('리다이렉트 오류가 발생했습니다. 페이지를 새로고침해주세요.');
      }
    }
  }, [initialized, authLoading, user, isAdmin, navigate, location.state]); // loading 제거

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.email) {
      newErrors.email = '이메일을 입력해주세요.'
    } else if (!validateEmail(formData.email)) {
      newErrors.email = '올바른 이메일 형식을 입력해주세요.'
    }

    if (!formData.password) {
      newErrors.password = '비밀번호를 입력해주세요.'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.email || !formData.password) {
      toast.error('이메일과 비밀번호를 입력해주세요')
      return
    }

    setLoading(true)
    
    try {
      console.log('[Login] 로그인 시도:', formData.email);
      const result = await signIn(formData.email, formData.password)
      
      if (result.error) {
        console.log('[Login] 로그인 실패:', result.error);
        toast.error(result.error)
        setLoading(false)
      } else {
        console.log('[Login] 로그인 성공, 즉시 리다이렉트 처리');
        toast.success('로그인되었습니다.')
        
        // 로그인 성공 시 즉시 리다이렉트 처리
        setLoading(false)
        
        // 이전 페이지(from)가 있으면 우선 이동, 없으면 관리자 여부에 따라 기본 경로로 이동
        const fromPath = (location.state as any)?.from?.pathname as string | undefined;
        let targetPath = '/';
        
        if (fromPath) {
          targetPath = fromPath;
          console.log('[Login] 이전 페이지로 이동:', fromPath);
        } else if (formData.email === 'admin@p-ai.com' || isAdmin) {
          targetPath = '/admin';
          console.log('[Login] 관리자 계정으로 /admin 이동');
        } else {
          console.log('[Login] 일반 사용자 계정으로 / 이동');
        }

        // 리다이렉트 가드 확인
        if (redirectGuard.canRedirect(targetPath, 'Login-handleSubmit')) {
          redirectGuard.recordRedirect(targetPath, 'Login-handleSubmit');
          navigate(targetPath, { replace: true });
        } else {
          console.warn('[Login] 리다이렉트 루프 방지로 인해 리다이렉트 취소:', targetPath);
          console.error('[Login] RedirectGuard 상태:', redirectGuard.getStatus());
          toast.error('리다이렉트 오류가 발생했습니다. 페이지를 새로고침해주세요.');
        }
      }
    } catch (error) {
      console.error('[Login] 로그인 예외:', error);
      toast.error('로그인 중 오류가 발생했습니다.')
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  // authStore가 초기화되는 동안 로딩 표시
  if (!initialized) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-slate-400">인증 상태 확인 중...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {/* Logo and Title */}
          <div className="text-center">
            <div className="flex justify-center">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <Search className="w-7 h-7 text-white" />
              </div>
            </div>
            <h2 className="mt-6 text-3xl font-bold text-white">
              P-AI에 로그인
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              AI 기반 특허 분석 서비스를 이용하세요
            </p>
          </div>

          {/* Login Form */}
          <Card>
            <CardHeader>
              <CardTitle>로그인</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <Input
                  label="이메일"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  error={errors.email}
                  placeholder="your@email.com"
                  autoComplete="email"
                />

                <div className="relative">
                  <Input
                    label="비밀번호"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    error={errors.password}
                    placeholder="비밀번호를 입력하세요"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-8 text-slate-400 hover:text-slate-300"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-blue-500 focus:ring-2"
                    />
                    <span className="ml-2 text-sm text-slate-300">로그인 상태 유지</span>
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-sm text-blue-400 hover:text-blue-300"
                  >
                    비밀번호 찾기
                  </Link>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  loading={loading}
                  disabled={loading}
                >
                  로그인
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-slate-400">
                  계정이 없으신가요?{' '}
                  <Link
                    to="/register"
                    className="font-medium text-blue-400 hover:text-blue-300"
                  >
                    회원가입
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Demo Account Info */}
          <Card className="bg-slate-900 border-slate-600">
            <CardContent className="text-center">
              <p className="text-sm text-slate-400 mb-2">
                데모 계정으로 체험해보세요
              </p>
              <div className="text-xs text-slate-500 space-y-1">
                <div>이메일: demo@example.com</div>
                <div>비밀번호: demo123456</div>
              </div>
              <Button
                onClick={async () => {
                  setFormData({ email: 'demo@example.com', password: 'demo123456' });
                  setLoading(true);
                  
                  try {
                    console.log('[Login] 데모 로그인 시도');
                    const result = await signIn('demo@example.com', 'demo123456');
                    
                    if (result.error) {
                      console.log('[Login] 데모 로그인 실패:', result.error);
                      toast.error(result.error);
                      setLoading(false);
                    } else {
                      console.log('[Login] 데모 로그인 성공, 즉시 리다이렉트 처리');
                      toast.success('데모 로그인 성공');
                      
                      // 로그인 성공 시 즉시 리다이렉트 처리 (handleSubmit과 동일한 로직)
                      setLoading(false);
                      const fromPath = (location.state as any)?.from?.pathname as string | undefined;
                      let targetPath = '/';
                      
                      if (fromPath) {
                        targetPath = fromPath;
                        console.log('[Login] 이전 페이지로 이동:', fromPath);
                      } else {
                        console.log('[Login] 일반 사용자 계정으로 / 이동');
                      }

                      // 리다이렉트 가드 확인
                      if (redirectGuard.canRedirect(targetPath, 'Login-demo')) {
                        redirectGuard.recordRedirect(targetPath, 'Login-demo');
                        navigate(targetPath, { replace: true });
                      } else {
                        console.warn('[Login] 리다이렉트 루프 방지로 인해 리다이렉트 취소:', targetPath);
                        console.error('[Login] RedirectGuard 상태:', redirectGuard.getStatus());
                        toast.error('리다이렉트 오류가 발생했습니다. 페이지를 새로고침해주세요.');
                      }
                    }
                  } catch (error) {
                    console.error('[Login] 데모 로그인 예외:', error);
                    toast.error('로그인 중 오류가 발생했습니다.');
                    setLoading(false);
                  }
                }}
                className="mt-3 w-full bg-blue-600 hover:bg-blue-700"
                size="sm"
                disabled={loading}
              >
                🧪 데모 로그인 테스트
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  )
}