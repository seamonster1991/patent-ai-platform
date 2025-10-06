import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, TrendingUp, Shield, Zap, Users, FileText, BarChart3, Brain, ArrowRight } from 'lucide-react'
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

  // 인기 검색어 데이터 설정 (기본 키워드 사용)
  useEffect(() => {
    setLoadingKeywords(true)
    // 기본 인기 키워드 설정
    setTimeout(() => {
      setPopularKeywords(['인공지능', '블록체인', 'IoT', '자율주행', '바이오'])
      setLoadingKeywords(false)
    }, 500) // 로딩 효과를 위한 짧은 지연
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
      color: 'text-ms-olive'
    },
    {
      icon: TrendingUp,
      title: '시장 분석 리포트',
      description: '특허 데이터를 기반으로 한 상세한 시장 동향 분석을 제공합니다.',
      color: 'text-ms-olive'
    },
    {
      icon: FileText,
      title: '사업화 가능성 분석',
      description: '특허의 사업화 가능성을 AI가 분석하여 인사이트를 제공합니다.',
      color: 'text-ms-olive'
    },
    {
      icon: Zap,
      title: '실시간 업데이트',
      description: 'KIPRIS와 연동하여 최신 특허 정보를 실시간으로 업데이트합니다.',
      color: 'text-ms-olive'
    }
  ]

  return (
    <>
      {/* Hero Section */}
      <section className="ms-container py-24 lg:py-32">
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-light text-ms-text mb-6 leading-tight">
            AI 기반 특허 분석의
            <span className="block font-medium text-ms-olive mt-2">
                새로운 기준
              </span>
          </h1>
          <p className="text-lg md:text-xl text-ms-text-light mb-12 max-w-3xl mx-auto leading-relaxed">
            KIPRIS와 연동된 고도화된 AI 시스템으로 특허 검색부터 사업화 분석까지, 
            지식재산권 관리의 모든 것을 한 번에 해결하세요.
          </p>
          
          {/* Search Form */}
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-16">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Input
                  type="text"
                  placeholder="특허 키워드를 입력하세요 (예: 인공지능, 블록체인, IoT)"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="h-14 text-lg border-ms-line focus:border-ms-olive focus:ring-ms-olive/20"
                  aria-label="특허 검색 키워드 입력"
                />
              </div>
              <Button 
                type="submit" 
                className="h-14 px-8 bg-ms-olive hover:bg-ms-olive/90 text-white font-medium"
                aria-label="특허 검색 실행"
              >
                <Search className="w-5 h-5 mr-2" />
                검색하기
              </Button>
            </div>
          </form>

          {/* Popular Search Terms */}
          <div className="mb-8">
            <div className="text-center mb-6">
              <h3 className="text-lg font-medium text-ms-text mb-2">인기 검색어</h3>
              <p className="text-ms-text-light text-sm">
                많이 검색되는 키워드로 빠르게 시작해보세요
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              {loadingKeywords ? (
                // 로딩 중일 때 스켈레톤 표시
                Array.from({ length: 5 }).map((_, index) => (
                  <div
                    key={index}
                    className="px-4 py-2 bg-ms-surface rounded-full animate-pulse"
                  >
                    <div className="w-16 h-4 bg-ms-line rounded"></div>
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
                  className="px-4 py-2 bg-ms-surface hover:bg-ms-surface-hover border border-ms-line rounded-full transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ms-olive focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                  aria-label={`${keyword} 검색하기`}
                >
                  <span className="text-ms-text font-medium text-sm">
                    {keyword}
                  </span>
                </button>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Marketing Hook Section */}
      <section className="py-20 bg-ms-surface border-t border-ms-line">
        <div className="ms-container">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-light text-ms-text mb-4">
              한 번의 검색으로 <span className="font-medium text-ms-olive">전략까지</span>
            </h2>
            <p className="text-lg text-ms-text-light max-w-3xl mx-auto leading-relaxed">
              AI가 키워드부터 보고서까지 연결해 실무에 바로 쓰는 인사이트를 제공합니다.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="ms-card p-8 text-center">
              <div className="w-16 h-16 mb-6 mx-auto rounded-lg bg-ms-surface-hover flex items-center justify-center text-ms-olive">
                <Search className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-medium text-ms-text mb-3">정확한 검색</h3>
              <p className="text-ms-text-light leading-relaxed">유사 특허와 최신 출원 동향까지 한 화면에서 확인.</p>
            </div>
            <div className="ms-card p-8 text-center">
              <div className="w-16 h-16 mb-6 mx-auto rounded-lg bg-ms-surface-hover flex items-center justify-center text-ms-olive">
                <FileText className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-medium text-ms-text mb-3">실무형 리포트</h3>
              <p className="text-ms-text-light leading-relaxed">PDF/표로 정리된 결과를 바로 공유하고 의사결정에 활용.</p>
            </div>
            <div className="ms-card p-8 text-center">
              <div className="w-16 h-16 mb-6 mx-auto rounded-lg bg-ms-surface-hover flex items-center justify-center text-ms-olive">
                <BarChart3 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-medium text-ms-text mb-3">인사이트 자동 생성</h3>
              <p className="text-ms-text-light leading-relaxed">시장성, 사업화 가능성 등 핵심 포인트를 AI가 요약.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white border-t border-ms-line">
        <div className="ms-container">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-light text-ms-text mb-4">
              왜 <span className="font-medium text-ms-olive">P-AI</span>를 선택해야 할까요?
            </h2>
            <p className="text-lg text-ms-text-light max-w-3xl mx-auto leading-relaxed">
              최첨단 AI 기술과 KIPRIS 연동으로 제공하는 차별화된 특허 분석 서비스
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="ms-card p-6 text-center h-full hover:shadow-lg transition-shadow duration-300">
                <div className={`w-12 h-12 mx-auto mb-4 rounded-lg bg-ms-surface-hover flex items-center justify-center ${feature.color}`}>
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-medium text-ms-text mb-3">{feature.title}</h3>
                <p className="text-ms-text-light leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-ms-surface border-t border-ms-line">
        <div className="ms-container text-center">
          <h2 className="text-3xl md:text-4xl font-light text-ms-text mb-4">
            지금 <span className="font-medium text-ms-olive">시작하세요</span>
          </h2>
          <p className="text-lg text-ms-text-light mb-12 max-w-2xl mx-auto leading-relaxed">
            무료로 시작하여 AI 기반 특허 분석의 강력함을 경험해보세요
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              onClick={() => navigate('/register')}
              className="px-8 py-3 bg-ms-olive hover:bg-ms-olive/90 text-white font-medium"
              aria-label="무료 회원가입하기"
            >
              무료로 시작하기
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </section>
    </>
  )
}