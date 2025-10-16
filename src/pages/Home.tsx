import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, TrendingUp, Shield, Zap, Users, FileText, BarChart3, Brain, ArrowRight, Star, CheckCircle, Globe, Lightbulb } from 'lucide-react'
import Button from '../components/UI/Button'
import Input from '../components/UI/Input'
import Card, { CardContent, CardHeader, CardTitle } from '../components/UI/Card'
import { useSearchStore } from '../store/searchStore'
import { toast } from 'sonner'
import { useAuthStore } from '../store/authStore'

export default function Home() {
  const [searchKeyword, setSearchKeyword] = useState('')
  const [popularKeywords, setPopularKeywords] = useState<string[]>([])
  const [loadingKeywords, setLoadingKeywords] = useState(true)
  const navigate = useNavigate()
  const { setFilters } = useSearchStore()
  const { user } = useAuthStore()

  // 인기 검색어 데이터 API에서 가져오기
  useEffect(() => {
    const fetchPopularKeywords = async () => {
      setLoadingKeywords(true)
      try {
        const response = await fetch('http://localhost:3001/api/popular-keywords')
        const result = await response.json()
        
        if (result.success && result.data) {
          // API 데이터에서 keyword 필드만 추출하여 문자열 배열로 변환
          const keywords = result.data.slice(0, 6).map(item => item.keyword)
          setPopularKeywords(keywords)
          console.log('✅ 인기 키워드 로드 완료:', keywords)
        } else {
          // API 실패 시 기본 키워드 사용
          setPopularKeywords(['인공지능', '블록체인', 'IoT', '자율주행', '바이오', '반도체'])
        }
      } catch (error) {
        console.error('❌ 인기 키워드 로드 실패:', error)
        // 에러 시 기본 키워드 사용
        setPopularKeywords(['인공지능', '블록체인', 'IoT', '자율주행', '바이오', '반도체'])
      } finally {
        setLoadingKeywords(false)
      }
    }

    fetchPopularKeywords()
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchKeyword.trim()) {
      toast.error('검색 키워드를 입력해주세요.')
      return
    }
    // 로그인 가드: 비로그인 시 로그인 페이지로 이동
    if (!user) {
      toast.error('검색 기능은 로그인 후 이용 가능합니다.')
      navigate('/login', { replace: true, state: { redirectTo: `/search?q=${encodeURIComponent(searchKeyword)}` } })
      return
    }
    // 검색페이지로 이동 - q 파라미터로 검색어 전달
    navigate(`/search?q=${encodeURIComponent(searchKeyword)}`)
  }

  const features = [
    {
      icon: Search,
      title: 'AI 기반 특허 검색',
      description: '고도화된 AI 알고리즘으로 정확하고 빠른 특허 검색을 제공합니다.',
      color: 'text-olive-600',
      bgColor: 'bg-olive-50'
    },
    {
      icon: TrendingUp,
      title: '시장 분석 리포트',
      description: '특허 데이터를 기반으로 한 상세한 시장 동향 분석을 제공합니다.',
      color: 'text-olive-600',
      bgColor: 'bg-olive-50'
    },
    {
      icon: FileText,
      title: '사업화 가능성 분석',
      description: '특허의 사업화 가능성을 AI가 분석하여 인사이트를 제공합니다.',
      color: 'text-olive-600',
      bgColor: 'bg-olive-50'
    },
    {
      icon: Zap,
      title: '실시간 업데이트',
      description: 'KIPRIS와 연동하여 최신 특허 정보를 실시간으로 업데이트합니다.',
      color: 'text-olive-600',
      bgColor: 'bg-olive-50'
    },
    {
      icon: Brain,
      title: 'AI 인사이트',
      description: '머신러닝 기반으로 특허의 핵심 가치와 경쟁력을 분석합니다.',
      color: 'text-olive-600',
      bgColor: 'bg-olive-50'
    },
    {
      icon: Globe,
      title: '글로벌 특허 DB',
      description: '국내외 주요 특허 데이터베이스와 연동하여 포괄적인 검색을 지원합니다.',
      color: 'text-olive-600',
      bgColor: 'bg-olive-50'
    }
  ]



  const benefits = [
    {
      title: '시간 절약',
      description: '기존 수작업 대비 90% 시간 단축',
      icon: Zap
    },
    {
      title: '정확한 분석',
      description: 'AI 기반 정밀 분석으로 신뢰성 확보',
      icon: CheckCircle
    },
    {
      title: '실무 활용',
      description: '바로 사용 가능한 리포트 제공',
      icon: FileText
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-olive-50/30 to-olive-100/50 relative overflow-hidden">
      {/* Mystical Background Animation */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Floating Particles */}
        <div className="absolute inset-0">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-olive-300/20 rounded-full animate-float"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 10}s`,
                animationDuration: `${8 + Math.random() * 6}s`
              }}
            />
          ))}
        </div>
        
        {/* Mystical Orbs */}
        <div className="absolute inset-0">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-gradient-to-r from-olive-200/10 to-olive-400/10 animate-pulse-slow"
              style={{
                width: `${60 + Math.random() * 120}px`,
                height: `${60 + Math.random() * 120}px`,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${4 + Math.random() * 4}s`
              }}
            />
          ))}
        </div>

        {/* Flowing Lines */}
        <div className="absolute inset-0">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute h-px bg-gradient-to-r from-transparent via-olive-300/30 to-transparent animate-flow"
              style={{
                width: `${200 + Math.random() * 300}px`,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                transform: `rotate(${Math.random() * 360}deg)`,
                animationDelay: `${Math.random() * 8}s`,
                animationDuration: `${12 + Math.random() * 8}s`
              }}
            />
          ))}
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-olive-50/50 to-olive-100/30"></div>
        <div className="absolute inset-0 opacity-40" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23a3a3a3' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}></div>
        
        <div className="relative ms-container py-16 sm:py-20 lg:py-28 xl:py-32">
          <div className="text-center max-w-5xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-olive-100 text-olive-700 text-sm font-medium mb-6 sm:mb-8">
              <Star className="w-4 h-4 mr-2" />
              AI 기반 특허 분석 플랫폼
            </div>

            {/* Main Heading */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-light text-gray-900 mb-6 sm:mb-8 leading-tight">
              AI 기반 특허 분석의
              <span className="block font-medium text-olive-600 mt-2">
                새로운 기준
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-600 mb-8 sm:mb-12 max-w-4xl mx-auto leading-relaxed px-4">
              KIPRIS와 연동된 고도화된 AI 시스템으로 특허 검색부터 사업화 분석까지, 
              지식재산권 관리의 모든 것을 한 번에 해결하세요.
            </p>
            
            {/* Search Form */}
            <form onSubmit={handleSearch} className="max-w-3xl mx-auto mb-12 sm:mb-16 px-4">
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <div className="flex-1">
                  <Input
                    type="text"
                    placeholder="특허 키워드를 입력하세요 (예: 인공지능, 블록체인, IoT)"
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    className="h-12 sm:h-14 lg:h-16 px-4 sm:px-6 py-3 sm:py-4 text-base sm:text-lg border-2 border-olive-200 focus:border-olive-500 focus:ring-olive-500/20 rounded-xl w-full"
                    aria-label="특허 검색 키워드 입력"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="h-12 sm:h-14 lg:h-16 px-6 sm:px-8 bg-olive-600 hover:bg-olive-700 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                  aria-label="특허 검색 실행"
                >
                  <Search className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  <span className="hidden sm:inline">검색하기</span>
                  <span className="sm:hidden">검색</span>
                </Button>
              </div>
            </form>

            {/* Popular Search Terms */}
            <div className="mb-8 sm:mb-12 px-4">
              <div className="text-center mb-4 sm:mb-6">
                <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">인기 검색어</h3>
                <p className="text-gray-600 text-sm sm:text-base">
                  많이 검색되는 키워드로 빠르게 시작해보세요
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 sm:gap-3 max-w-4xl mx-auto">
                {loadingKeywords ? (
                  // 로딩 중일 때 스켈레톤 표시
                  Array.from({ length: 8 }).map((_, index) => (
                    <div
                      key={index}
                      className="px-3 sm:px-4 py-2 bg-white/60 rounded-full animate-pulse border border-olive-200"
                    >
                      <div className="w-12 sm:w-16 h-3 sm:h-4 bg-olive-200 rounded"></div>
                    </div>
                  ))
                ) : (
                  popularKeywords.map((keyword) => (
                  <button
                    key={keyword}
                    onClick={() => {
                      setSearchKeyword(keyword)
                      if (!user) {
                        toast.error('검색 기능은 로그인 후 이용 가능합니다.')
                        navigate('/login', { replace: true, state: { redirectTo: `/search?q=${encodeURIComponent(keyword)}` } })
                        return
                      }
                      navigate(`/search?q=${encodeURIComponent(keyword)}`)
                    }}
                    className="px-3 sm:px-4 py-2 bg-white/80 hover:bg-white border border-olive-200 hover:border-olive-300 rounded-full transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-olive-500 focus-visible:ring-offset-2 hover:shadow-md"
                    aria-label={`${keyword} 검색하기`}
                  >
                    <span className="text-gray-700 font-medium text-xs sm:text-sm">
                      {keyword}
                    </span>
                  </button>
                  ))
                )}
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4">
              <Button 
                onClick={() => navigate('/register')}
                className="px-6 sm:px-8 py-3 sm:py-4 bg-olive-600 hover:bg-olive-700 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                aria-label="무료 회원가입하기"
              >
                무료로 시작하기
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
              </Button>
              <Button 
                onClick={() => navigate('/login')}
                className="px-6 sm:px-8 py-3 sm:py-4 bg-white hover:bg-gray-50 text-olive-600 font-medium border-2 border-olive-200 hover:border-olive-300 rounded-xl transition-all duration-200"
                aria-label="로그인하기"
              >
                로그인
              </Button>
            </div>
          </div>
        </div>
      </section>



      {/* Marketing Hook Section */}
      <section className="py-16 sm:py-20 lg:py-24 bg-gradient-to-br from-olive-50 to-olive-100/50">
        <div className="ms-container">
          <div className="text-center mb-12 sm:mb-16 lg:mb-20">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-light text-gray-900 mb-4 sm:mb-6">
              한 번의 검색으로 <span className="font-medium text-olive-600">전략까지</span>
            </h2>
            <p className="text-base sm:text-lg lg:text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed px-4">
              AI가 키워드부터 보고서까지 연결해 실무에 바로 쓰는 인사이트를 제공합니다.
            </p>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 lg:gap-10">
            {benefits.map((benefit, index) => (
              <div key={index} className="bg-white rounded-2xl p-6 sm:p-8 text-center shadow-lg hover:shadow-xl transition-all duration-300 border border-olive-100">
                <div className="w-16 h-16 sm:w-20 sm:h-20 mb-4 sm:mb-6 mx-auto rounded-2xl bg-olive-100 flex items-center justify-center">
                  <benefit.icon className="w-8 h-8 sm:w-10 sm:h-10 text-olive-600" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2 sm:mb-3">{benefit.title}</h3>
                <p className="text-gray-600 leading-relaxed text-sm sm:text-base">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 sm:py-20 lg:py-24 bg-white">
        <div className="ms-container">
          <div className="text-center mb-12 sm:mb-16 lg:mb-20">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-light text-gray-900 mb-4 sm:mb-6">
              왜 <span className="font-medium text-olive-600">Patent-AI</span>를 선택해야 할까요?
            </h2>
            <p className="text-base sm:text-lg lg:text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed px-4">
              최첨단 AI 기술과 KIPRIS 연동으로 제공하는 차별화된 특허 분석 서비스
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 lg:gap-10">
            {features.map((feature, index) => (
              <div key={index} className="group bg-white rounded-2xl p-6 sm:p-8 text-center border border-olive-100 hover:border-olive-200 hover:shadow-xl transition-all duration-300 h-full">
                <div className={`w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-4 sm:mb-6 rounded-2xl ${feature.bgColor} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className={`w-7 h-7 sm:w-8 sm:h-8 ${feature.color}`} />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed text-sm sm:text-base">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-16 sm:py-20 lg:py-24 bg-gradient-to-br from-olive-600 to-olive-700 text-white relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}></div>
        
        <div className="relative ms-container text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-light mb-4 sm:mb-6">
            지금 <span className="font-medium">시작하세요</span>
          </h2>
          <p className="text-base sm:text-lg lg:text-xl text-olive-100 mb-8 sm:mb-12 max-w-3xl mx-auto leading-relaxed px-4">
            무료로 시작하여 AI 기반 특허 분석의 강력함을 경험해보세요
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center px-4">
            <Button 
              onClick={() => navigate('/register')}
              className="px-6 sm:px-8 py-3 sm:py-4 bg-white hover:bg-gray-100 text-olive-600 font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
              aria-label="무료 회원가입하기"
            >
              무료로 시작하기
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
            </Button>
            <Button 
              onClick={() => navigate('/dashboard')}
              className="px-6 sm:px-8 py-3 sm:py-4 bg-transparent hover:bg-white/10 text-white font-medium border-2 border-white/30 hover:border-white/50 rounded-xl transition-all duration-200"
              aria-label="대시보드 보기"
            >
              대시보드 보기
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}