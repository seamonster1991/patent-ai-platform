import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Eye, EyeOff, Search, Shield, FileText } from 'lucide-react'
import Button from '../components/UI/Button'
import Input from '../components/UI/Input'
import Card, { CardContent, CardHeader, CardTitle } from '../components/UI/Card'
import ProfileUpdateModal from '../components/ProfileUpdateModal'
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
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [hasRedirected, setHasRedirected] = useState(false) // 간단한 플래그
  
  const { signIn, user, profile, loading: authStoreLoading, initialized } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()

  // 간단한 리다이렉트 함수
  const performRedirect = () => {
    if (hasRedirected) return // 이미 리다이렉트했으면 중단
    
    const fromPath = (location.state as any)?.from?.pathname as string | undefined
    const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin'
    
    let targetPath = '/'
    if (fromPath) {
      targetPath = fromPath
    } else if (isAdmin) {
      targetPath = '/admin'
    }
    
    console.log('[Login] 리다이렉트 실행:', targetPath)
    setHasRedirected(true)
    navigate(targetPath, { replace: true })
  }

  // 프로필 업데이트 완료 핸들러
  const handleProfileUpdateComplete = () => {
    console.log('[Login] 프로필 업데이트 완료')
    setShowProfileModal(false)
    performRedirect()
  }

  // 프로필 업데이트 모달 닫기 핸들러
  const handleProfileUpdateClose = () => {
    console.log('[Login] 프로필 업데이트 모달 닫기')
    setShowProfileModal(false)
    performRedirect()
  }

  // 로그인된 사용자 자동 리다이렉트 (단순화)
  useEffect(() => {
    // 초기화가 완료되지 않았거나 로딩 중이면 대기
    if (!initialized || authStoreLoading || hasRedirected) {
      return
    }

    // 사용자가 로그인되어 있고 프로필이 있으면 리다이렉트
    if (user && profile) {
      console.log('[Login] 로그인된 사용자 감지, 리다이렉트 준비')
      
      // 프로필 정보가 완성되지 않았으면 모달 표시
      const needsProfileUpdate = !profile.name || !profile.phone
      if (needsProfileUpdate) {
        console.log('[Login] 프로필 정보 미완성, 모달 표시')
        setShowProfileModal(true)
        return
      }
      
      // 프로필이 완성되었으면 바로 리다이렉트
      performRedirect()
    }
  }, [initialized, user, profile, authStoreLoading, hasRedirected])

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
    
    if (!validateForm()) {
      return
    }

    setLoading(true)
    
    try {
      console.log('[Login] 로그인 시도:', formData.email)
      const result = await signIn(formData.email, formData.password)
      
      if (result.error) {
        console.log('[Login] 로그인 실패:', result.error)
        toast.error(result.error)
        setLoading(false)
      } else {
        console.log('[Login] 로그인 성공')
        toast.success('로그인되었습니다.')
        setLoading(false)
        
        // 로그인 성공 후 프로필 정보 확인을 위해 잠시 대기
        setTimeout(() => {
          const currentProfile = useAuthStore.getState().profile
          const needsProfileUpdate = !currentProfile?.name || !currentProfile?.phone
          
          if (needsProfileUpdate) {
            console.log('[Login] 프로필 정보 미완성, 모달 표시')
            setShowProfileModal(true)
          } else {
            console.log('[Login] 프로필 완성, 리다이렉트 실행')
            performRedirect()
          }
        }, 500)
      }
    } catch (error) {
      console.error('[Login] 로그인 예외:', error)
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
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-lg mx-auto">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-gradient-to-r from-ms-olive to-ms-olive-dark rounded-xl p-3 shadow-lg">
              <Search className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Patent AI</h1>
          <p className="text-slate-600">특허 검색 및 분석 플랫폼</p>
        </div>

        {/* Login Form */}
        <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-2xl font-bold text-slate-800">로그인</CardTitle>
            <p className="text-slate-600 mt-2">계정에 로그인하여 서비스를 이용하세요</p>
          </CardHeader>
          <CardContent className="px-6 sm:px-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Input
                  type="email"
                  name="email"
                  placeholder="이메일 주소"
                  value={formData.email}
                  onChange={handleChange}
                  error={errors.email}
                  className="h-14 text-lg w-full min-w-[320px] px-5 py-4 rounded-xl border-2 border-slate-200 focus:border-ms-olive focus:ring-4 focus:ring-ms-olive/20 transition-all duration-200 bg-white/80"
                />
              </div>

              <div>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    placeholder="비밀번호"
                    value={formData.password}
                    onChange={handleChange}
                    error={errors.password}
                    className="h-14 text-lg w-full min-w-[320px] px-5 py-4 pr-14 rounded-xl border-2 border-slate-200 focus:border-ms-olive focus:ring-4 focus:ring-ms-olive/20 transition-all duration-200 bg-white/80"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <Link
                  to="/forgot-password"
                  className="text-sm text-ms-olive hover:text-ms-olive-dark transition-colors font-medium"
                >
                  비밀번호를 잊으셨나요?
                </Link>
              </div>

              <Button
                type="submit"
                className="w-full h-14 bg-gradient-to-r from-ms-olive to-ms-olive-dark hover:from-ms-olive-dark hover:to-ms-olive text-white font-semibold text-lg rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    로그인 중...
                  </div>
                ) : (
                  '로그인'
                )}
              </Button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-slate-600">
                계정이 없으신가요?{' '}
                <Link
                  to="/register"
                  className="text-ms-olive hover:text-ms-olive-dark font-semibold transition-colors"
                >
                  회원가입
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Features */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-white/70 backdrop-blur-sm rounded-xl shadow-sm hover:shadow-md transition-all duration-200">
            <div className="bg-gradient-to-r from-ms-olive/10 to-ms-olive-dark/10 rounded-lg p-3 w-fit mx-auto mb-3">
              <Search className="h-8 w-8 text-ms-olive mx-auto" />
            </div>
            <h3 className="font-semibold text-slate-800 mb-1">특허 검색</h3>
            <p className="text-sm text-slate-600">AI 기반 특허 검색</p>
          </div>
          <div className="text-center p-4 bg-white/70 backdrop-blur-sm rounded-xl shadow-sm hover:shadow-md transition-all duration-200">
            <div className="bg-gradient-to-r from-ms-olive/10 to-ms-olive-dark/10 rounded-lg p-3 w-fit mx-auto mb-3">
              <FileText className="h-8 w-8 text-ms-olive mx-auto" />
            </div>
            <h3 className="font-semibold text-slate-800 mb-1">분석 리포트</h3>
            <p className="text-sm text-slate-600">상세한 특허 분석</p>
          </div>
          <div className="text-center p-4 bg-white/70 backdrop-blur-sm rounded-xl shadow-sm hover:shadow-md transition-all duration-200">
            <div className="bg-gradient-to-r from-ms-olive/10 to-ms-olive-dark/10 rounded-lg p-3 w-fit mx-auto mb-3">
              <Shield className="h-8 w-8 text-ms-olive mx-auto" />
            </div>
            <h3 className="font-semibold text-slate-800 mb-1">보안</h3>
            <p className="text-sm text-slate-600">안전한 데이터 보호</p>
          </div>
        </div>
      </div>

      {/* Profile Update Modal */}
      <ProfileUpdateModal
        isOpen={showProfileModal}
        onClose={handleProfileUpdateClose}
        onComplete={handleProfileUpdateComplete}
      />
    </div>
  )
}