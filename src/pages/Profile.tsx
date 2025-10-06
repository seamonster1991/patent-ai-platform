import { useState, useEffect } from 'react'
import { User, Mail, Building, Calendar, Shield, Bell, Download, Trash2, Save } from 'lucide-react'
import Button from '../components/UI/Button'
import Input from '../components/UI/Input'
import Card, { CardContent, CardHeader, CardTitle } from '../components/UI/Card'
import { useAuthStore } from '../store/authStore'
import { formatDate } from '../lib/utils'
import { toast } from 'sonner'

export default function Profile() {
  const { user, profile, updateProfile } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: profile?.name || '',
    company: profile?.company || '',
    phone: profile?.phone || '',
    bio: profile?.bio || ''
  })
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    marketing: false
  })

  // Update formData when profile is loaded
  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        company: profile.company || '',
        phone: profile.phone || '',
        bio: profile.bio || ''
      })
    }
  }, [profile])

  // 전화번호 포맷터: 숫자만 남기고 3-4-4 형식으로 변환 (예: 01012345678 -> 010-1234-5678)
  const formatPhone = (raw: string) => {
    const digits = (raw || '').replace(/\D/g, '')
    if (!digits) return ''
    // 11자리 이상만 포맷, 초과 자릿수는 잘라냄
    const d = digits.slice(0, 11)
    if (d.length <= 3) return d
    if (d.length <= 7) return `${d.slice(0,3)}-${d.slice(3)}`
    return `${d.slice(0,3)}-${d.slice(3,7)}-${d.slice(7)}`
  }

  // 입력 유효성 검사
  const validateForm = () => {
    const errors: string[] = []
    
    // 이름 검증
    if (!formData.name.trim()) {
      errors.push('이름은 필수 입력 항목입니다.')
    } else if (formData.name.trim().length < 2) {
      errors.push('이름은 최소 2글자 이상이어야 합니다.')
    } else if (formData.name.trim().length > 50) {
      errors.push('이름은 50글자를 초과할 수 없습니다.')
    }
    
    // 전화번호 검증 (선택사항이지만 입력된 경우 검증)
    if (formData.phone.trim()) {
      const phoneDigits = formData.phone.replace(/\D/g, '')
      if (phoneDigits.length < 10 || phoneDigits.length > 11) {
        errors.push('올바른 전화번호 형식을 입력해주세요. (예: 010-1234-5678)')
      }
    }
    
    // 회사명 검증 (선택사항이지만 입력된 경우 검증)
    if (formData.company.trim() && formData.company.trim().length > 100) {
      errors.push('회사명은 100글자를 초과할 수 없습니다.')
    }
    
    // 소개 검증 (선택사항이지만 입력된 경우 검증)
    if (formData.bio.trim() && formData.bio.trim().length > 500) {
      errors.push('소개는 500글자를 초과할 수 없습니다.')
    }
    
    return errors
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // 입력 유효성 검사
    const validationErrors = validateForm()
    if (validationErrors.length > 0) {
      toast.error(validationErrors[0]) // 첫 번째 오류만 표시
      return
    }
    
    setLoading(true)
    
    try {
      console.log('📝 [Profile] 프로필 업데이트 요청:', formData)
      const result = await updateProfile(formData)
      
      console.log('📝 [Profile] 프로필 업데이트 결과:', result)
      
      if (result.error || !result.success) {
        console.error('📝 [Profile] 프로필 업데이트 오류:', result.error)
        // 서버 오류 메시지를 사용자 친화적으로 변환
        let errorMessage = result.error || '프로필 업데이트에 실패했습니다.'
        
        if (errorMessage.includes('name')) {
          errorMessage = '이름 형식이 올바르지 않습니다.'
        } else if (errorMessage.includes('phone')) {
          errorMessage = '전화번호 형식이 올바르지 않습니다.'
        } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
          errorMessage = '네트워크 연결을 확인해주세요.'
        } else if (errorMessage.includes('timeout')) {
          errorMessage = '요청 시간이 초과되었습니다. 다시 시도해주세요.'
        } else if (errorMessage.includes('Database error')) {
          errorMessage = '데이터베이스 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
        }
        
        toast.error(errorMessage)
        return
      }
      
      // 성공 처리
      if (result.success && result.profile) {
        console.log('✅ [Profile] 프로필 업데이트 성공:', result.profile)
        toast.success('프로필이 성공적으로 업데이트되었습니다.')
        
        // 폼 데이터를 업데이트된 프로필 데이터로 동기화
        setFormData({
          name: result.profile.name || '',
          company: result.profile.company || '',
          phone: result.profile.phone || '',
          bio: result.profile.bio || ''
        })
        
        // 페이지 새로고침 없이 프로필 정보 다시 로드
        window.location.reload()
      } else {
        console.warn('📝 [Profile] 프로필 업데이트 결과가 예상과 다름:', result)
        toast.error('프로필 업데이트에 실패했습니다. 다시 시도해주세요.')
      }
    } catch (error: any) {
      console.error('📝 [Profile] 프로필 업데이트 예외:', error)
      let errorMessage = '프로필 업데이트 중 오류가 발생했습니다.'
      
      if (error?.message?.includes('fetch') || error?.message?.includes('network')) {
        errorMessage = '서버에 연결할 수 없습니다. 네트워크 연결을 확인해주세요.'
      } else if (error?.message?.includes('timeout')) {
        errorMessage = '요청 시간이 초과되었습니다. 다시 시도해주세요.'
      } else if (error?.message) {
        errorMessage = `오류: ${error.message}`
      }
      
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    if (name === 'phone') {
      const formatted = formatPhone(value)
      setFormData(prev => ({ ...prev, [name]: formatted }))
      return
    }
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleNotificationChange = (key: string, value: boolean) => {
    setNotifications(prev => ({ ...prev, [key]: value }))
  }

  const handleDeleteAccount = () => {
    if (window.confirm('정말로 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      toast.error('계정 삭제 기능은 고객 지원팀에 문의해주세요.')
    }
  }

  const handleExportData = () => {
    toast.success('데이터 내보내기 요청이 처리되었습니다. 이메일로 전송됩니다.')
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">프로필 설정</h1>
          <p className="text-slate-400">
            계정 정보와 설정을 관리하세요
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Profile Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="w-5 h-5 mr-2 text-blue-400" />
                  기본 정보
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <Input
                      label="이름"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="이름을 입력하세요"
                    />
                    <Input
                      label="이메일"
                      type="email"
                      value={user?.email || ''}
                      disabled
                      helperText="이메일은 변경할 수 없습니다"
                    />
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <Input
                      label="회사명"
                      name="company"
                      value={formData.company}
                      onChange={handleChange}
                      placeholder="회사명을 입력하세요"
                    />
                    <Input
                      label="전화번호"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="전화번호를 입력하세요"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      소개
                    </label>
                    <textarea
                      name="bio"
                      value={formData.bio}
                      onChange={handleChange}
                      placeholder="자기소개를 입력하세요"
                      rows={4}
                      className="w-full px-3 py-2 bg-slate-800 border border-ms-line dark:border-dark-700 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-ms-olive focus:border-ms-olive resize-none"
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" loading={loading}>
                      <Save className="w-4 h-4 mr-2" />
                      저장하기
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Notification Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Bell className="w-5 h-5 mr-2 text-green-400" />
                  알림 설정
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-white font-medium">이메일 알림</h4>
                      <p className="text-sm text-slate-400">
                        검색 결과 및 리포트 생성 알림을 이메일로 받습니다
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifications.email}
                        onChange={(e) => handleNotificationChange('email', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-white font-medium">푸시 알림</h4>
                      <p className="text-sm text-slate-400">
                        브라우저 푸시 알림을 받습니다
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifications.push}
                        onChange={(e) => handleNotificationChange('push', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-white font-medium">마케팅 알림</h4>
                      <p className="text-sm text-slate-400">
                        새로운 기능 및 프로모션 정보를 받습니다
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifications.marketing}
                        onChange={(e) => handleNotificationChange('marketing', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Data & Privacy */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="w-5 h-5 mr-2 text-purple-400" />
                  데이터 및 개인정보
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-white font-medium">데이터 내보내기</h4>
                      <p className="text-sm text-slate-400">
                        계정 데이터를 다운로드합니다
                      </p>
                    </div>
                    <Button variant="outline" onClick={handleExportData}>
                      <Download className="w-4 h-4 mr-2" />
                      내보내기
                    </Button>
                  </div>

                  <div className="border-t border-slate-700 pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-red-400 font-medium">계정 삭제</h4>
                        <p className="text-sm text-slate-400">
                          계정과 모든 데이터를 영구적으로 삭제합니다
                        </p>
                      </div>
                      <Button variant="danger" onClick={handleDeleteAccount}>
                        <Trash2 className="w-4 h-4 mr-2" />
                        삭제
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Account Info */}
            <Card>
              <CardHeader>
                <CardTitle>계정 정보</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-white font-medium">
                        {profile?.name || user?.email}
                      </h3>
                      <p className="text-sm text-slate-400">
                        {profile?.subscription_plan === 'premium' ? '프리미엄' : '무료'} 플랜
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 pt-4 border-t border-slate-700">
                    <div className="flex items-center text-sm">
                      <Mail className="w-4 h-4 mr-2 text-slate-400" />
                      <span className="text-slate-400">이메일:</span>
                      <span className="ml-2 text-white">{user?.email}</span>
                    </div>
                    
                    {profile?.company && (
                      <div className="flex items-center text-sm">
                        <Building className="w-4 h-4 mr-2 text-slate-400" />
                        <span className="text-slate-400">회사:</span>
                        <span className="ml-2 text-white">{profile.company}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center text-sm">
                      <Calendar className="w-4 h-4 mr-2 text-slate-400" />
                      <span className="text-slate-400">가입일:</span>
                      <span className="ml-2 text-white">
                        {user?.created_at ? formatDate(user.created_at) : '-'}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Subscription */}
            <Card>
              <CardHeader>
                <CardTitle>구독 정보</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Shield className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-white font-medium mb-2">
                    {profile?.subscription_plan === 'premium' ? '프리미엄 플랜' : '무료 플랜'}
                  </h3>
                  <p className="text-sm text-slate-400 mb-4">
                    {profile?.subscription_plan === 'premium' 
                      ? '모든 기능을 무제한으로 이용하세요' 
                      : '기본 기능을 이용하실 수 있습니다'
                    }
                  </p>
                  {profile?.subscription_plan !== 'premium' && (
                    <Button className="w-full">
                      프리미엄으로 업그레이드
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Usage Stats */}
            <Card>
              <CardHeader>
                <CardTitle>이번 달 사용량</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-400">검색 횟수</span>
                      <span className="text-white">45/100</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: '45%' }}></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-400">AI 리포트</span>
                      <span className="text-white">8/20</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: '40%' }}></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-400">저장 용량</span>
                      <span className="text-white">2.1GB/5GB</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div className="bg-purple-500 h-2 rounded-full" style={{ width: '42%' }}></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
  )
}