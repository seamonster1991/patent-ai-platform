import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Search, Check } from 'lucide-react'
import Layout from '../components/Layout/Layout'
import Button from '../components/UI/Button'
import Input from '../components/UI/Input'
import Card, { CardContent, CardHeader, CardTitle } from '../components/UI/Card'
import { useAuthStore } from '../store/authStore'

export default function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    setSubmitError('')
    setSubmitSuccess(false)

    // Validate form
    const newErrors: { [key: string]: string } = {}

    if (!formData.name.trim()) {
      newErrors.name = '이름을 입력해주세요.'
    }

    if (!formData.email.trim()) {
      newErrors.email = '이메일을 입력해주세요.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '올바른 이메일 형식을 입력해주세요.'
    }

    if (!formData.password) {
      newErrors.password = '비밀번호를 입력해주세요.'
    } else if (formData.password.length < 8) {
      newErrors.password = '비밀번호는 최소 8자 이상이어야 합니다.'
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = '비밀번호는 대문자, 소문자, 숫자를 포함해야 합니다.'
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = '비밀번호가 일치하지 않습니다.'
    }

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ 
      ...prev, 
      [name]: value 
    }))
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }



  const passwordRequirements = [
    { text: '8자 이상', met: formData.password.length >= 8 },
    { text: '대문자 포함', met: /[A-Z]/.test(formData.password) },
    { text: '소문자 포함', met: /[a-z]/.test(formData.password) },
    { text: '숫자 포함', met: /\d/.test(formData.password) }
  ]

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
              IP-Insight AI 회원가입
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              AI 기반 특허 분석 서비스를 시작하세요
            </p>
          </div>

          {/* Register Form */}
          <Card>
            <CardHeader>
              <CardTitle>회원가입</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <Input
                  label="이름"
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  error={errors.name}
                  placeholder="홍길동"
                  autoComplete="name"
                />

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

                <Input
                  label="회사명 (선택사항)"
                  type="text"
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  placeholder="회사명을 입력하세요"
                  autoComplete="organization"
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
                    autoComplete="new-password"
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

                {/* Password Requirements */}
                {formData.password && (
                  <div className="space-y-2">
                    <p className="text-sm text-slate-400">비밀번호 요구사항:</p>
                    <div className="grid grid-cols-2 gap-2">
                      {passwordRequirements.map((req, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <Check 
                            className={`w-4 h-4 ${
                              req.met ? 'text-green-500' : 'text-slate-500'
                            }`} 
                          />
                          <span 
                            className={`text-xs ${
                              req.met ? 'text-green-400' : 'text-slate-500'
                            }`}
                          >
                            {req.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="relative">
                  <Input
                    label="비밀번호 확인"
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    error={errors.confirmPassword}
                    placeholder="비밀번호를 다시 입력하세요"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-8 text-slate-400 hover:text-slate-300"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>

                {/* Terms and Privacy */}
                <div className="space-y-3">
                  <label className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                      className="w-4 h-4 mt-0.5 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-blue-500 focus:ring-2"
                    />
                    <span className="text-sm text-slate-300">
                      <Link to="/terms" className="text-blue-400 hover:text-blue-300">
                        이용약관
                      </Link>에 동의합니다 (필수)
                    </span>
                  </label>

                  <label className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      checked={agreedToPrivacy}
                      onChange={(e) => setAgreedToPrivacy(e.target.checked)}
                      className="w-4 h-4 mt-0.5 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-blue-500 focus:ring-2"
                    />
                    <span className="text-sm text-slate-300">
                      <Link to="/privacy" className="text-blue-400 hover:text-blue-300">
                        개인정보처리방침
                      </Link>에 동의합니다 (필수)
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
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

              <div className="mt-6 text-center">
                <p className="text-sm text-slate-400">
                  이미 계정이 있으신가요?{' '}
                  <Link
                    to="/login"
                    className="font-medium text-blue-400 hover:text-blue-300"
                  >
                    로그인
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  )
}