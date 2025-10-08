import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Eye, EyeOff, Search } from 'lucide-react'
import Button from '../components/UI/Button'
import Input from '../components/UI/Input'
import Card, { CardContent, CardHeader, CardTitle } from '../components/UI/Card'
import ProfileUpdateModal from '../components/ProfileUpdateModal'
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
  const [showProfileModal, setShowProfileModal] = useState(false)
  
  const { signIn, isAdmin, user, profile, loading: authLoading, initialized } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()

  const handleSuccessfulLoginRedirect = () => {
    // 이전 페이지(from)가 있으면 우선 이동, 없으면 관리자 여부에 따라 기본 경로로 이동
    const fromPath = (location.state as any)?.from?.pathname as string | undefined;
    let targetPath = '/';
    
    if (fromPath) {
      targetPath = fromPath;
      console.log('[Login] 이전 페이지로 이동:', fromPath);
    } else if (isAdmin) {
      targetPath = '/admin';
      console.log('[Login] 관리자 권한 확인되어 /admin 이동');
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

  const handleProfileUpdateComplete = () => {
    setShowProfileModal(false);
    handleSuccessfulLoginRedirect();
  }

  const handleProfileUpdateClose = () => {
    setShowProfileModal(false);
    handleSuccessfulLoginRedirect();
  }

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
      } else if (isAdmin) {
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
        console.log('[Login] 로그인 성공, 프로필 정보 확인');
        toast.success('로그인되었습니다.')
        
        setLoading(false)
        
        // 프로필 정보 완성도 확인 (약간의 지연을 두어 profile이 로드될 시간을 줌)
        setTimeout(() => {
          const currentProfile = useAuthStore.getState().profile;
          const needsProfileUpdate = !currentProfile?.name || !currentProfile?.phone;
          
          if (needsProfileUpdate) {
            console.log('[Login] 프로필 정보 미완성, 모달 표시');
            setShowProfileModal(true);
            return;
          }
          
          // 프로필이 완성된 경우 리다이렉트 처리
          handleSuccessfulLoginRedirect();
        }, 500);
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
      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ms-olive mx-auto"></div>
            <p className="mt-4 text-slate-400">인증 상태 확인 중...</p>
          </div>
        </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {/* Logo and Title */}
          <div className="text-center">
            <div className="flex justify-center">
        <div className="w-12 h-12 bg-ms-olive rounded-lg flex items-center justify-center">
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
                    className="w-4 h-4 text-ms-olive bg-slate-700 border-slate-600 rounded focus:ring-ms-olive focus:ring-2"
                    />
                    <span className="ml-2 text-sm text-slate-300">로그인 상태 유지</span>
                  </label>
                  <Link
                    to="/password-reset"
                    className="text-sm text-ms-olive font-bold hover:text-ms-olive"
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
                    className="font-bold text-ms-olive hover:text-ms-olive"
                  >
                    회원가입
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Profile Update Modal */}
          <ProfileUpdateModal
            isOpen={showProfileModal}
            onClose={handleProfileUpdateClose}
            onComplete={handleProfileUpdateComplete}
          />

        </div>
      </div>
  )
}