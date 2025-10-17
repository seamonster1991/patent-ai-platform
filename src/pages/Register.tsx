import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Check, Shield } from 'lucide-react'
import { useAuthStore } from '../store/authStore'

export default function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
    password: '',
    confirmPassword: '',
  })
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState(false)

  const { signUp } = useAuthStore()
  const navigate = useNavigate()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    
    // Format phone number automatically
    if (name === 'phone') {
      const phoneValue = value.replace(/\D/g, '') // Remove non-digits
      let formattedPhone = phoneValue
      
      if (phoneValue.length >= 3) {
        formattedPhone = phoneValue.slice(0, 3) + '-'
        if (phoneValue.length >= 7) {
          formattedPhone += phoneValue.slice(3, 7) + '-' + phoneValue.slice(7, 11)
        } else {
          formattedPhone += phoneValue.slice(3)
        }
      }
      
      setFormData(prev => ({ 
        ...prev, 
        [name]: formattedPhone 
      }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
    
    // Clear submit error when user makes changes
    if (submitError) {
      setSubmitError('')
    }
  }

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {}

    if (!formData.name.trim()) {
      newErrors.name = '이름을 입력해주세요.'
    }

    if (!formData.email.trim()) {
      newErrors.email = '이메일을 입력해주세요.'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = '유효한 이메일 주소를 입력해주세요.'
    }

    if (!formData.phone.trim()) {
      newErrors.phone = '전화번호를 입력해주세요.'
    } else if (!/^\d{3}-\d{4}-\d{4}$/.test(formData.phone)) {
      newErrors.phone = '전화번호는 000-0000-0000 형식으로 입력해주세요.'
    }

    if (!formData.password) {
      newErrors.password = '비밀번호를 입력해주세요.'
    } else if (formData.password.length < 8) {
      newErrors.password = '비밀번호는 8자 이상이어야 합니다.'
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = '비밀번호 확인을 입력해주세요.'
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = '비밀번호가 일치하지 않습니다.'
    }

    return newErrors
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const newErrors = validateForm()

    if (!agreedToTerms) {
      newErrors.terms = '이용약관에 동의해주세요.'
    }

    if (!agreedToPrivacy) {
      newErrors.privacy = '개인정보처리방침에 동의해주세요.'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setIsLoading(true)

    try {
      const result = await signUp(formData.email, formData.password, {
        name: formData.name,
        company: formData.company || null,
        phone: formData.phone,
      })

      if (result.error) {
        // Handle specific Supabase errors
        if (result.error.includes('User already registered')) {
          setSubmitError('이미 등록된 이메일입니다. 로그인을 시도해보세요.')
        } else if (result.error.includes('Invalid email')) {
          setSubmitError('유효하지 않은 이메일 주소입니다.')
        } else if (result.error.includes('Password')) {
          setSubmitError('비밀번호가 요구사항을 만족하지 않습니다.')
        } else if (result.error.includes('network') || result.error.includes('fetch')) {
          setSubmitError('네트워크 연결을 확인해주세요.')
        } else if (result.error.includes('Please check your email')) {
          // Email confirmation required
          setSubmitSuccess(true)
        } else {
          setSubmitError(`회원가입 중 오류가 발생했습니다: ${result.error}`)
        }
      } else {
        setSubmitSuccess(true)
        // Don't auto-redirect, let user read the email confirmation message
      }
    } catch (error) {
      console.error('Registration error:', error)
      setSubmitError('예상치 못한 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setIsLoading(false)
    }
  }

  const passwordRequirements = [
    { text: '8자 이상', met: formData.password.length >= 8 },
    { text: '대문자 포함', met: /[A-Z]/.test(formData.password) },
    { text: '소문자 포함', met: /[a-z]/.test(formData.password) },
    { text: '숫자 포함', met: /\d/.test(formData.password) }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-olive-600 rounded-2xl mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Patent-AI</h1>
          <p className="text-gray-600 mt-2">AI 기반 특허 분석 서비스</p>
        </div>

        {/* Register Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8 max-h-[90vh] overflow-y-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">회원가입</h2>
            <p className="text-gray-600">Patent-AI 서비스를 시작하세요</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                이름 *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500 transition-colors ${
                  errors.name ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="이름을 입력하세요"
                autoComplete="name"
                required
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                이메일 *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500 transition-colors ${
                  errors.email ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="이메일을 입력하세요"
                autoComplete="email"
                required
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                회사명
              </label>
              <input
                type="text"
                name="company"
                value={formData.company}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500 transition-colors"
                placeholder="회사명을 입력하세요 (선택사항)"
                autoComplete="organization"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                전화번호 *
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500 transition-colors ${
                  errors.phone ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="000-0000-0000"
                autoComplete="tel"
                required
              />
              {errors.phone && (
                <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                비밀번호 *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500 transition-colors pr-12 ${
                    errors.password ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="비밀번호를 입력하세요"
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
              )}
            </div>

            {/* Password Requirements */}
            {formData.password && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-700 mb-2 font-medium">비밀번호 요구사항:</p>
                <div className="space-y-1">
                  {passwordRequirements.map((req, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Check
                        className={`w-4 h-4 ${
                          req.met ? 'text-green-500' : 'text-gray-400'
                        }`}
                      />
                      <span
                        className={`text-sm ${
                          req.met ? 'text-green-600' : 'text-gray-500'
                        }`}
                      >
                        {req.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                비밀번호 확인 *
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500 transition-colors pr-12 ${
                    errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="비밀번호를 다시 입력하세요"
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
              )}
            </div>

            {/* Terms and Privacy */}
            <div className="space-y-3">
              <label className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="w-4 h-4 mt-0.5 text-olive-600 bg-gray-100 border-gray-300 rounded focus:ring-olive-500 focus:ring-2"
                />
                <span className="text-sm text-gray-700">
                  <Link to="/terms" className="text-olive-600 hover:text-olive-700 font-medium">
                    이용약관
                  </Link>에 동의합니다 (필수)
                </span>
              </label>

              <label className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  checked={agreedToPrivacy}
                  onChange={(e) => setAgreedToPrivacy(e.target.checked)}
                  className="w-4 h-4 mt-0.5 text-olive-600 bg-gray-100 border-gray-300 rounded focus:ring-olive-500 focus:ring-2"
                />
                <span className="text-sm text-gray-700">
                  <Link to="/privacy" className="text-olive-600 hover:text-olive-700 font-medium">
                    개인정보처리방침
                  </Link>에 동의합니다 (필수)
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-olive-600 hover:bg-olive-700 text-white font-medium py-3 px-4 rounded-lg transition-colors focus:ring-2 focus:ring-olive-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  회원가입 중...
                </div>
              ) : (
                '회원가입'
              )}
            </button>

            {/* Error Message */}
            {submitError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{submitError}</p>
              </div>
            )}

            {/* Success Message */}
            {submitSuccess && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-600 text-sm font-medium">
                  회원가입이 완료되었습니다!
                </p>
                <p className="text-green-600 text-sm mt-1">
                  이메일로 전송된 확인 링크를 클릭하여 계정을 활성화해주세요.
                </p>
                <p className="text-green-500 text-xs mt-2">
                  이메일을 확인하신 후 <Link to="/login" className="text-green-600 hover:text-green-700 underline">로그인</Link>해주세요.
                </p>
              </div>
            )}

            {/* Terms and Privacy Errors */}
            {(errors.terms || errors.privacy) && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                {errors.terms && <p className="text-red-600 text-sm">{errors.terms}</p>}
                {errors.privacy && <p className="text-red-600 text-sm">{errors.privacy}</p>}
              </div>
            )}
          </form>

          <div className="mt-8 text-center">
            <p className="text-gray-600">
              이미 계정이 있으신가요?{' '}
              <Link
                to="/login"
                className="text-olive-600 hover:text-olive-700 font-medium"
              >
                로그인
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}