import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Search } from 'lucide-react'
import Layout from '../components/Layout/Layout'
import Button from '../components/UI/Button'
import Input from '../components/UI/Input'
import Card, { CardContent, CardHeader, CardTitle } from '../components/UI/Card'
import { useAuthStore } from '../store/authStore'
import { validateEmail } from '../lib/utils'
import { toast } from 'sonner'

export default function Login() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  
  const { signIn, isAdmin, user, loading: authLoading, initialized } = useAuthStore()
  const navigate = useNavigate()

  // 컴포넌트 마운트 확인
  console.warn('🎯 [Login] 컴포넌트 마운트됨');
  console.warn('🔍 [Login] AuthStore 상태:', { authLoading, initialized, hasUser: !!user });
  
  // Supabase 클라이언트 상태 확인
  console.warn('🔍 [Login] Supabase 환경변수:', {
    hasUrl: !!import.meta.env.VITE_SUPABASE_URL,
    hasKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
    urlLength: import.meta.env.VITE_SUPABASE_URL?.length || 0,
    keyLength: import.meta.env.VITE_SUPABASE_ANON_KEY?.length || 0
  });

  // 디버그 로깅
  useEffect(() => {
    console.log('[Login] 상태:', { 
      authLoading, 
      initialized,
      authed: !!user, 
      userId: user?.id,
      email: user?.email,
      isAdmin
    });
  }, [authLoading, initialized, user, isAdmin]);

  // 이미 로그인된 사용자는 리다이렉트
  useEffect(() => {
    if (initialized && !authLoading && user) {
      console.log('[Login] 이미 로그인됨, 리다이렉트');
      if (isAdmin || user.email === 'admin@p-ai.com') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    }
  }, [initialized, authLoading, user, isAdmin, navigate]);

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
    
    console.warn('🔥 [Login] 로그인 시도 시작:', { email: formData.email });
    
    if (!formData.email || !formData.password) {
      console.warn('❌ [Login] 이메일 또는 비밀번호 누락');
      toast.error('이메일과 비밀번호를 입력해주세요')
      return
    }

    setLoading(true)
    console.warn('🔥 [Login] 로딩 상태 설정됨');
    
    try {
      console.warn('🔥 [Login] signIn 함수 호출 시작');
      const result = await signIn(formData.email, formData.password)
      console.warn('🔥 [Login] signIn 함수 호출 완료, 결과:', result);
      
      if (result.error) {
        console.warn('❌ [Login] 로그인 에러:', result.error);
        toast.error(result.error)
      } else {
        console.warn('✅ [Login] 로그인 성공');
        toast.success('로그인되었습니다.')
        
        console.warn('✅ [Login] 홈으로 이동');
        navigate('/', { replace: true });
      }
    } catch (error) {
      console.error('💥 [Login] 로그인 예외:', error);
      toast.error('로그인 중 오류가 발생했습니다.')
    } finally {
      console.warn('🔥 [Login] 로딩 상태 해제');
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



  // authStore가 초기화되는 동안 로딩 표시 - 수정된 조건
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
              IP-Insight AI에 로그인
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
                  console.warn('🧪 [Login] 데모 로그인 테스트 시작');
                  setFormData({ email: 'demo@example.com', password: 'demo123456' });
                  
                  // 직접 signIn 호출
                  const result = await signIn('demo@example.com', 'demo123456');
                  console.warn('🧪 [Login] 데모 로그인 결과:', result);
                  
                  if (result.error) {
                    console.warn('❌ [Login] 데모 로그인 실패:', result.error);
                  } else {
                    console.warn('✅ [Login] 데모 로그인 성공');
                  }
                }}
                className="mt-3 w-full bg-blue-600 hover:bg-blue-700"
                size="sm"
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