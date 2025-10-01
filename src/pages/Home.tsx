import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, TrendingUp, FileText, Zap, ArrowRight } from 'lucide-react'
import Layout from '../components/Layout/Layout'
import Button from '../components/UI/Button'
import Input from '../components/UI/Input'
import Card, { CardContent, CardHeader, CardTitle } from '../components/UI/Card'
import { useSearchStore } from '../store/searchStore'
import { toast } from 'sonner'

export default function Home() {
  const [searchKeyword, setSearchKeyword] = useState('')
  const navigate = useNavigate()
  const { setFilters } = useSearchStore()

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

  const stats = [
    { label: '등록된 특허', value: '1,000,000+' },
    { label: '분석 리포트', value: '50,000+' },
    { label: '활성 사용자', value: '10,000+' },
    { label: '검색 정확도', value: '98.5%' }
  ]

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-secondary-900 via-secondary-800 to-dark-900 dark:from-dark-900 dark:via-dark-800 dark:to-secondary-900">
        <div className="absolute inset-0 bg-gradient-to-r from-primary-600/20 to-accent-600/20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              AI 기반 특허 분석의
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-accent-400">
                새로운 기준
              </span>
            </h1>
            <p className="text-xl text-secondary-200 dark:text-secondary-300 mb-8 max-w-3xl mx-auto">
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
                <h3 className="text-lg font-semibold text-white mb-2">인기 검색어</h3>
                <p className="text-secondary-300 dark:text-secondary-400 text-sm">
                  많이 검색되는 키워드로 빠르게 시작해보세요
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-3">
                {[
                  '인공지능',
                  '블록체인', 
                  'IoT',
                  '자율주행',
                  '바이오',
                  '반도체',
                  '5G',
                  '메타버스'
                ].map((keyword) => (
                  <button
                    key={keyword}
                    onClick={() => {
                      setSearchKeyword(keyword)
                      setFilters({ keyword })
                      navigate(`/search?q=${encodeURIComponent(keyword)}`)
                    }}
                    className="px-4 py-2 bg-secondary-700/50 dark:bg-secondary-600/50 hover:bg-primary-600/80 dark:hover:bg-primary-500/80 backdrop-blur-sm border border-secondary-600/30 dark:border-secondary-500/30 hover:border-primary-500/50 rounded-full transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-secondary-900 transform hover:scale-105"
                    aria-label={`${keyword} 검색하기`}
                  >
                    <span className="text-white font-medium text-sm">
                      {keyword}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-secondary-900 dark:bg-dark-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-white mb-2">
                  {stat.value}
                </div>
                <div className="text-secondary-300 dark:text-secondary-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-secondary-950 dark:bg-dark-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              왜 P-AI를 선택해야 할까요?
            </h2>
            <p className="text-xl text-secondary-200 dark:text-secondary-300 max-w-3xl mx-auto">
              최첨단 AI 기술과 KIPRIS 연동으로 제공하는 차별화된 특허 분석 서비스
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} variant="elevated" className="text-center h-full bg-secondary-800 dark:bg-dark-800 border-secondary-700 dark:border-secondary-600 hover:bg-secondary-700 dark:hover:bg-dark-700 transition-colors">
                <CardHeader>
                  <div className={`w-12 h-12 mx-auto mb-4 rounded-lg bg-secondary-700 dark:bg-secondary-600 flex items-center justify-center ${feature.color}`}>
                    <feature.icon className="w-6 h-6" />
                  </div>
                  <CardTitle className="text-lg text-white">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-secondary-300 dark:text-secondary-400">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary-600 to-accent-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            지금 시작하세요
          </h2>
          <p className="text-xl text-primary-100 mb-8">
            무료로 시작하여 AI 기반 특허 분석의 강력함을 경험해보세요
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              variant="secondary"
              onClick={() => navigate('/register')}
              className="bg-white text-primary-600 hover:bg-secondary-100 focus-visible:ring-white focus-visible:ring-offset-primary-600"
              aria-label="무료 회원가입하기"
            >
              무료로 시작하기
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => navigate('/search')}
              className="border-white text-white hover:bg-white hover:text-primary-600 focus-visible:ring-white focus-visible:ring-offset-primary-600"
              aria-label="데모 체험해보기"
            >
              데모 체험하기
            </Button>
          </div>
        </div>
      </section>
    </Layout>
  )
}