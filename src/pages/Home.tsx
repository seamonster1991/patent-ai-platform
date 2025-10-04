import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, TrendingUp, Shield, Zap, Users, FileText, BarChart3, Brain, ArrowRight } from 'lucide-react'
import Layout from '../components/Layout/Layout'
import Button from '../components/UI/Button'
import Input from '../components/UI/Input'
import Card, { CardContent, CardHeader, CardTitle } from '../components/UI/Card'
import { useSearchStore } from '../store/searchStore'
import { toast } from 'sonner'

export default function Home() {
  const [searchKeyword, setSearchKeyword] = useState('')
  const [popularKeywords, setPopularKeywords] = useState<string[]>([])
  const [loadingKeywords, setLoadingKeywords] = useState(true)
  const navigate = useNavigate()
  const { setFilters } = useSearchStore()

  // 인기 검색어 데이터 가져오기
  useEffect(() => {
    const fetchPopularKeywords = async () => {
      try {
        setLoadingKeywords(true)
        const response = await fetch('/api/admin/user-activities?period=30&limit=5')
        const data = await response.json()
        
        if (data.success && data.data.topKeywords) {
          // 상위 5개 키워드만 추출
          const keywords = data.data.topKeywords
            .slice(0, 5)
            .map((item: { keyword: string; count: number }) => item.keyword)
          
          setPopularKeywords(keywords)
        } else {
          // API 실패 시 기본 키워드 사용
          setPopularKeywords(['인공지능', '블록체인', 'IoT', '자율주행', '바이오'])
        }
      } catch (error) {
        console.error('인기 검색어 조회 실패:', error)
        // 에러 시 기본 키워드 사용
        setPopularKeywords(['인공지능', '블록체인', 'IoT', '자율주행', '바이오'])
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
    
    navigate(`/search?q=${encodeURIComponent(searchKeyword)}`)
  }

  const features = [
    {
      icon: Search,
      title: 'AI 기반 특허 검색',
      description: '고도화된 AI 알고리즘으로 정확하고 빠른 특허 검색을 제공합니다.',
      color: 'text-primary-600 dark:text-primary-400'
    },
    {
      icon: TrendingUp,
      title: '시장 분석 리포트',
      description: '특허 데이터를 기반으로 한 상세한 시장 동향 분석을 제공합니다.',
      color: 'text-success-600 dark:text-success-400'
    },
    {
      icon: FileText,
      title: '사업화 가능성 분석',
      description: '특허의 사업화 가능성을 AI가 분석하여 인사이트를 제공합니다.',
      color: 'text-accent-600 dark:text-accent-400'
    },
    {
      icon: Zap,
      title: '실시간 업데이트',
      description: 'KIPRIS와 연동하여 최신 특허 정보를 실시간으로 업데이트합니다.',
      color: 'text-warning-600 dark:text-warning-400'
    }
  ]


  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-transparent">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-ms-text dark:text-white mb-6">
              AI 기반 특허 분석의
              <span className="block text-ms-olive">
                새로운 기준
              </span>
            </h1>
            <p className="text-xl text-secondary-700 dark:text-secondary-300 mb-8 max-w-3xl mx-auto">
              KIPRIS와 연동된 고도화된 AI 시스템으로 특허 검색부터 사업화 분석까지, 
              지식재산권 관리의 모든 것을 한 번에 해결하세요.
            </p>
            
            {/* Search Form */}
            <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-12">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <Input
                    type="text"
                    placeholder="특허 키워드를 입력하세요 (예: 인공지능, 블록체인, IoT)"
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    size="lg"
                    fullWidth
                    aria-label="특허 검색 키워드 입력"
                  />
                </div>
                <Button 
                  type="submit" 
                  size="lg" 
                  variant="primary"
                  className="sm:px-8"
                  aria-label="특허 검색 실행"
                >
                  <Search className="w-5 h-5 mr-2" />
                  검색하기
                </Button>
              </div>
            </form>

            {/* Popular Search Terms */}
            <div className="mb-8">
              <div className="text-center mb-4">
                <h3 className="text-lg font-semibold text-ms-text dark:text-white mb-2">인기 검색어</h3>
                <p className="text-secondary-700 dark:text-secondary-400 text-sm">
                  많이 검색되는 키워드로 빠르게 시작해보세요
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-3">
                {loadingKeywords ? (
                  // 로딩 중일 때 스켈레톤 표시
                  Array.from({ length: 5 }).map((_, index) => (
                    <div
                      key={index}
                      className="px-4 py-2 bg-neutral-200 rounded-full animate-pulse"
                    >
                      <div className="w-16 h-4 bg-neutral-300 rounded"></div>
                    </div>
                  ))
                ) : (
                  popularKeywords.map((keyword) => (
                  <button
                    key={keyword}
                    onClick={() => {
                      setSearchKeyword(keyword)
                      navigate(`/search?q=${encodeURIComponent(keyword)}`)
                    }}
                    className="px-4 py-2 bg-white/80 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 backdrop-blur-sm border-ms-line rounded-full transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ms-olive focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-900 transform hover:scale-105"
                    aria-label={`${keyword} 검색하기`}
                  >
                    <span className="text-ms-text dark:text-white font-medium text-sm">
                      {keyword}
                    </span>
                  </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Marketing Hook Section (replaces Stats) */}
      <section className="py-16 bg-white dark:bg-neutral-900/30 border-t border-ms-line">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-ms-text dark:text-white mb-4">한 번의 검색으로 전략까지</h2>
            <p className="text-xl text-secondary-700 dark:text-secondary-300 max-w-3xl mx-auto">AI가 키워드부터 보고서까지 연결해 실무에 바로 쓰는 인사이트를 제공합니다.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="ms-line-frame rounded-md bg-white dark:bg-neutral-800 p-6">
              <div className="w-12 h-12 mb-4 rounded-lg bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center text-ms-olive">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-ms-text dark:text-white mb-2">정확한 검색</h3>
              <p className="text-secondary-700 dark:text-secondary-300">유사 특허와 최신 출원 동향까지 한 화면에서 확인.</p>
            </div>
            <div className="ms-line-frame rounded-md bg-white dark:bg-neutral-800 p-6">
              <div className="w-12 h-12 mb-4 rounded-lg bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center text-ms-olive">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-ms-text dark:text-white mb-2">실무형 리포트</h3>
              <p className="text-secondary-700 dark:text-secondary-300">PDF/표로 정리된 결과를 바로 공유하고 의사결정에 활용.</p>
            </div>
            <div className="ms-line-frame rounded-md bg-white dark:bg-neutral-800 p-6">
              <div className="w-12 h-12 mb-4 rounded-lg bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center text-ms-olive">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-ms-text dark:text-white mb-2">인사이트 자동 생성</h3>
              <p className="text-secondary-700 dark:text-secondary-300">시장성, 사업화 가능성 등 핵심 포인트를 AI가 요약.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white dark:bg-neutral-900/30 border-t border-ms-line">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-ms-text dark:text-white mb-4">
              왜 P-AI를 선택해야 할까요?
            </h2>
            <p className="text-xl text-secondary-700 dark:text-secondary-300 max-w-3xl mx-auto">
              최첨단 AI 기술과 KIPRIS 연동으로 제공하는 차별화된 특허 분석 서비스
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} variant="elevated" className="text-center h-full bg-white dark:bg-neutral-800 border-ms-line hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors">
                <CardHeader>
                  <div className={`w-12 h-12 mx-auto mb-4 rounded-lg bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center ${feature.color}`}>
                    <feature.icon className="w-6 h-6" />
                  </div>
                  <CardTitle className="text-lg text-ms-text dark:text-white">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-secondary-700 dark:text-secondary-300">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-white border-t border-ms-line">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-ms-text mb-4">
            지금 시작하세요
          </h2>
          <p className="text-xl text-secondary-600 mb-8">
            무료로 시작하여 AI 기반 특허 분석의 강력함을 경험해보세요
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => navigate('/register')}
              className="sm:px-8"
              aria-label="무료 회원가입하기"
            >
              무료로 시작하기
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </section>
    </Layout>
  )
}