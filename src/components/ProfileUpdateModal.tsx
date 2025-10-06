import { useState, useEffect } from 'react'
import { X, User, Phone } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { toast } from 'sonner'

interface ProfileUpdateModalProps {
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
}

export default function ProfileUpdateModal({ isOpen, onClose, onComplete }: ProfileUpdateModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    phone: ''
  })
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [isLoading, setIsLoading] = useState(false)

  const { user, profile, updateProfile } = useAuthStore()

  useEffect(() => {
    if (isOpen && profile) {
      setFormData({
        name: profile.name || '',
        phone: profile.phone || ''
      })
    }
  }, [isOpen, profile])

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {}

    if (!formData.name.trim()) {
      newErrors.name = '이름을 입력해주세요.'
    }

    if (!formData.phone.trim()) {
      newErrors.phone = '전화번호를 입력해주세요.'
    } else if (!/^\d{3}-\d{4}-\d{4}$/.test(formData.phone)) {
      newErrors.phone = '전화번호는 000-0000-0000 형식으로 입력해주세요.'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsLoading(true)

    try {
      const result = await updateProfile({
        name: formData.name,
        phone: formData.phone
      })

      if (result.error) {
        toast.error(`프로필 업데이트 실패: ${result.error}`)
      } else {
        toast.success('프로필이 성공적으로 업데이트되었습니다.')
        onComplete()
      }
    } catch (error) {
      console.error('Profile update error:', error)
      toast.error('프로필 업데이트 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

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
      setFormData(prev => ({ 
        ...prev, 
        [name]: value 
      }))
    }
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">프로필 정보 완성</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="mb-4">
          <p className="text-gray-600 text-sm">
            서비스 이용을 위해 필수 정보를 입력해주세요.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <User className="w-4 h-4 inline mr-1" />
              이름 (필수)
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="홍길동"
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.name && (
              <p className="text-red-500 text-sm mt-1">{errors.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Phone className="w-4 h-4 inline mr-1" />
              전화번호 (필수)
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="000-0000-0000"
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.phone ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.phone && (
              <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
            )}
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              나중에
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}