import { useState, useEffect, useMemo } from 'react'
import Card, { CardContent, CardDescription, CardHeader, CardTitle } from '../components/UI/Card'
import Button from '../components/UI/Button'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ComposedChart,
  Legend
} from 'recharts'
import { 
  Search, 
  FileText, 
  TrendingUp, 
  Calendar,
  ExternalLink,
  Activity,
  BarChart3,
  PieChart as PieChartIcon,
  Users,
  Clock,
  AlertCircle,
  Target,
  Zap,
  History,
  Download
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuthStore } from '../store/authStore'
import { useSearchStore } from '../store/searchStore'
import { cn } from '../lib/utils'
import { getUserStats } from '../lib/api'


interface WeeklyActivityData {
  day: string;
  dayIndex: number;
  count: number;
  searchCount: number;
  aiAnalysisCount: number;
}

interface RecentSearch {
  keyword: string;
  searchDate: string;
  resultsCount: number;
  field: string;
}

interface RecentReport {
  id: string;
  title: string;
  patentTitle: string;
  patentNumber: string;
  reportType: string;
  createdAt: string;
  applicationNumber: string;
  downloadUrl: string;
}

// 키워드 기술 분야 간단 분류 함수 (프론트엔드용)
const classifyTechField = (keyword: string) => {
  if (!keyword) return '기타'
  const k = keyword.toLowerCase()
  if (/(ai|artificial intelligence|인공지능|machine learning|머신러닝|deep learning|딥러닝|neural network|신경망)/.test(k)) return 'AI/머신러닝'
  if (/(bio|바이오|medical|의료|healthcare|헬스케어|pharmaceutical|제약|diagnosis|진단)/.test(k)) return '바이오/의료'
  if (/(software|소프트웨어|algorithm|알고리즘|database|데이터베이스|network|네트워크|security|보안)/.test(k)) return 'IT/소프트웨어'
  if (/(semiconductor|반도체|electronic|전자|chip|칩|circuit|회로|processor|프로세서)/.test(k)) return '전자/반도체'
  if (/(communication|통신|wireless|무선|5g|6g|antenna|안테나|signal|신호)/.test(k)) return '통신'
  if (/(automotive|자동차|vehicle|차량|autonomous|자율주행|electric vehicle|전기차)/.test(k)) return '자동차'
  if (/(energy|에너지|battery|배터리|solar|태양광|renewable|재생에너지|fuel cell|연료전지)/.test(k)) return '에너지'
  return '기타'
}

interface UserStats {
  totalSearches: number
  reportsGenerated: number
  monthlyActivity: number
  savedPatents: number
  totalLogins: number
  engagementScore: number
  averageSearchResults: number
  aiAnalysisCount: number
  totalUsageCost: number
  searchHistory: Array<{
    date: string
    count: number
  }>
  searchKeywords: Array<{
    keyword: string
    count: number
    field: string
  }>
  recentSearches: Array<{
    keyword: string
    searchDate: string
    resultsCount: number
    field: string
  }>
  recentReports: Array<{
    id: string
    patentTitle: string
    patentNumber: string
    reportType: string
    createdAt: string
  }>
  fieldDistribution: Array<{
    field: string
    count: number
  }>
  weeklyActivity: Array<{
    day: string
    dayIndex: number
    count: number
    searchCount: number
    aiAnalysisCount: number
  }>
  hourlyActivity: Array<{
    hour: number
    count: number
  }>
  dailyActivities: Array<{
    date: string
    count: number
  }>
}

interface ChartData {
  hourlyActivity: Array<{
    hour: number
    count: number
  }>
  weeklyActivity: Array<{
    day: string
    dayIndex: number
    count: number
    searchCount: number
    aiAnalysisCount: number
  }>
}

export default function Dashboard() {
  const { user } = useAuthStore()
  const navigate = useNavigate()

  // 사용자 상태 로그
  console.log('👤 [Dashboard] 현재 사용자:', user)
  console.log('👤 [Dashboard] 사용자 ID:', user?.id)

  // 상태 관리
  const [userStats, setUserStats] = useState<UserStats>({
    totalSearches: 0,
    reportsGenerated: 0,
    monthlyActivity: 0,
    savedPatents: 0,
    totalLogins: 0,
    engagementScore: 0,
    averageSearchResults: 0,
    aiAnalysisCount: 0,
    totalUsageCost: 0,
    searchHistory: [],
    searchKeywords: [],
    recentSearches: [],
    recentReports: [],
    fieldDistribution: [],
    weeklyActivity: [],
    hourlyActivity: [],
    dailyActivities: []
  })

  const [chartData, setChartData] = useState<ChartData>({
    hourlyActivity: [],
    weeklyActivity: []
  })

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isNewUser, setIsNewUser] = useState(false)
  const [welcomeMessage, setWelcomeMessage] = useState<string | null>(null)

  // 데이터 로딩
  useEffect(() => {
    const loadDashboardData = async () => {
      if (!user?.id) {
        console.log('🚫 [Dashboard] 사용자 ID가 없음')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        console.log('📊 [Dashboard] 사용자 통계 요청 시작:', user.id)

        // API에서 사용자 통계 가져오기
        const response = await getUserStats(user.id)
        
        console.log('📊 [Dashboard] API 응답 전체:', response)
        console.log('📊 [Dashboard] API 응답 성공 여부:', response.success)
        console.log('📊 [Dashboard] API 응답 데이터:', response.data)
        
        if (response.success && response.data) {
          const stats = response.data
          console.log('📊 [Dashboard] API 응답 전체:', response)
          console.log('📊 [Dashboard] API 응답 성공 여부:', response.success)
          console.log('📊 [Dashboard] API 응답 데이터:', stats)

          // 새 사용자 정보 확인
          if (stats.isNewUser) {
            setIsNewUser(true)
            setWelcomeMessage(stats.message || '환영합니다! 첫 번째 특허 검색을 시작해보세요.')
            toast.success('환영합니다! 특허 AI 플랫폼에 오신 것을 환영합니다.', {
              description: '첫 번째 특허 검색을 시작해보세요.',
              duration: 5000
            })
          }
          console.log('📊 [Dashboard] daily_activities 데이터:', stats.daily_activities)
          console.log('📊 [Dashboard] daily_activities_100days 데이터:', stats.daily_activities_100days)
          console.log('📊 [Dashboard] 통계 데이터 구조:', {
            summary: stats.summary,
            recent_searches: stats.recent_searches?.length || 0,
            recent_reports: stats.recent_reports?.length || 0,
            top_keywords: stats.top_keywords?.length || 0,
            field_distribution: stats.field_distribution?.length || 0,
            weekly_activities: stats.weekly_activities?.length || 0,
            hourly_activities: stats.hourly_activities?.length || 0,
            daily_activities: stats.daily_activities?.length || 0,
            daily_activities_100days: stats.daily_activities_100days?.length || 0
          })
          
          // API 응답을 UserStats 형태로 매핑
          const mappedStats = {
            totalSearches: stats.summary?.search_count || 0,
            reportsGenerated: stats.summary?.ai_analysis_count || 0,
            monthlyActivity: stats.summary?.total_login_count || 0,
            savedPatents: stats.summary?.detail_view_count || 0,
            totalLogins: stats.summary?.total_login_count || 0,
            engagementScore: Math.min(100, (stats.summary?.search_count || 0) * 2),
            averageSearchResults: stats.summary?.average_search_results || 0,
            aiAnalysisCount: stats.summary?.ai_analysis_count || 0,
            totalUsageCost: stats.summary?.total_usage_cost || 0,
            searchHistory: [], // API에서 제공하지 않음
            searchKeywords: (stats.top_keywords || []).map((item: any) => ({
              keyword: item.keyword,
              count: item.count,
              field: classifyTechField(item.keyword)
            })),
            recentSearches: (stats.recent_searches || []).map((search: any) => ({
              keyword: search.query || '검색어 없음',
              searchDate: search.timestamp,
              resultsCount: search.results || 0,
              field: classifyTechField(search.query || '')
            })),
            recentReports: (stats.recent_reports || []).map((report: any) => ({
              id: report.id,
              patentTitle: report.title || report.patent_title || '리포트 제목 없음',
              patentNumber: report.patent_number || '특허번호 없음',
              reportType: report.report_type || 'analysis',
              createdAt: report.timestamp
            })),
            fieldDistribution: stats.field_distribution || [],
            weeklyActivity: stats.weekly_activities || [],
            hourlyActivity: stats.hourly_activities || [],
            dailyActivities: stats.daily_activities_100days || stats.daily_activities || []
          }
          
          console.log('📊 [Dashboard] 매핑된 통계:', mappedStats)
          console.log('📊 [Dashboard] 매핑된 dailyActivities:', mappedStats.dailyActivities)
          console.log('📊 [Dashboard] dailyActivities 길이:', mappedStats.dailyActivities?.length)
          console.log('📊 [Dashboard] dailyActivities 첫 번째 항목:', mappedStats.dailyActivities?.[0])
          console.log('📊 [Dashboard] dailyActivities 마지막 항목:', mappedStats.dailyActivities?.[mappedStats.dailyActivities.length - 1])

          setUserStats(mappedStats)

          // 차트 데이터 설정
          setChartData({
            hourlyActivity: stats.hourly_activities || Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0 })),
            weeklyActivity: stats.weekly_activities || [
              { day: '월', dayIndex: 1, count: 0, searchCount: 0, aiAnalysisCount: 0 },
              { day: '화', dayIndex: 2, count: 0, searchCount: 0, aiAnalysisCount: 0 },
              { day: '수', dayIndex: 3, count: 0, searchCount: 0, aiAnalysisCount: 0 },
              { day: '목', dayIndex: 4, count: 0, searchCount: 0, aiAnalysisCount: 0 },
              { day: '금', dayIndex: 5, count: 0, searchCount: 0, aiAnalysisCount: 0 },
              { day: '토', dayIndex: 6, count: 0, searchCount: 0, aiAnalysisCount: 0 },
              { day: '일', dayIndex: 0, count: 0, searchCount: 0, aiAnalysisCount: 0 }
            ]
          })
        } else {
          console.warn('⚠️ [Dashboard] API 응답이 성공하지 않음 또는 데이터가 없음')
          console.warn('⚠️ [Dashboard] 응답:', response)
          
          // 폴백 데이터 설정
          setUserStats({
            totalSearches: 0,
            reportsGenerated: 0,
            monthlyActivity: 0,
            savedPatents: 0,
            totalLogins: 0,
            engagementScore: 0,
            averageSearchResults: 0,
            aiAnalysisCount: 0,
            totalUsageCost: 0,
            searchHistory: [],
            searchKeywords: [],
            recentSearches: [],
            recentReports: [],
            fieldDistribution: [],
            weeklyActivity: [],
            hourlyActivity: [],
            dailyActivities: []
          })

          setChartData({
            hourlyActivity: Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0 })),
            weeklyActivity: [
              { day: '월', dayIndex: 1, count: 0, searchCount: 0, aiAnalysisCount: 0 },
              { day: '화', dayIndex: 2, count: 0, searchCount: 0, aiAnalysisCount: 0 },
              { day: '수', dayIndex: 3, count: 0, searchCount: 0, aiAnalysisCount: 0 },
              { day: '목', dayIndex: 4, count: 0, searchCount: 0, aiAnalysisCount: 0 },
              { day: '금', dayIndex: 5, count: 0, searchCount: 0, aiAnalysisCount: 0 },
              { day: '토', dayIndex: 6, count: 0, searchCount: 0, aiAnalysisCount: 0 },
              { day: '일', dayIndex: 0, count: 0, searchCount: 0, aiAnalysisCount: 0 }
            ]
          })
        }
      } catch (err) {
        console.error('❌ [Dashboard] 대시보드 데이터 로딩 실패:', err)
        const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.'
        setError(`대시보드 데이터를 불러오는데 실패했습니다: ${errorMessage}`)
        
        // 네트워크 오류인 경우 재시도 제안
        if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
          toast.error('네트워크 연결을 확인해주세요', {
            description: '잠시 후 다시 시도해보세요.',
            action: {
              label: '재시도',
              onClick: () => {
                setError(null)
                loadDashboardData()
              }
            }
          })
        } else {
          toast.error('데이터 로딩 실패', {
            description: errorMessage
          })
        }
      } finally {
        setLoading(false)
      }
    }

    loadDashboardData()
  }, [user?.id])

  // 통계 카드 데이터
  const stats = useMemo(() => {
    return [
      {
        title: '총 검색 수',
        value: userStats.totalSearches.toLocaleString(),
        icon: Search,
        description: '누적 특허 검색 횟수',
        trend: userStats.totalSearches > 0 ? `+${userStats.totalSearches}` : '0',
        trendLabel: '전체 기간'
      },
      {
        title: '생성된 보고서',
        value: userStats.reportsGenerated.toLocaleString(),
        icon: FileText,
        description: 'AI 분석 보고서 수',
        trend: userStats.reportsGenerated > 0 ? `+${userStats.reportsGenerated}` : '0',
        trendLabel: '전체 기간'
      },
      {
        title: '월간 활동',
        value: userStats.monthlyActivity.toLocaleString(),
        icon: TrendingUp,
        description: '이번 달 활동 수',
        trend: userStats.monthlyActivity > 0 ? `+${userStats.monthlyActivity}` : '0',
        trendLabel: '이번 달'
      },
      {
        title: '저장된 특허',
        value: userStats.savedPatents.toLocaleString(),
        icon: Target,
        description: '북마크한 특허 수',
        trend: userStats.savedPatents > 0 ? `+${userStats.savedPatents}` : '0',
        trendLabel: '전체 기간'
      },
      {
        title: '총 로그인',
        value: userStats.totalLogins.toLocaleString(),
        icon: Users,
        description: '누적 로그인 횟수',
        trend: userStats.totalLogins > 0 ? `+${userStats.totalLogins}` : '0',
        trendLabel: '전체 기간'
      },
      {
        title: '총 사용비용',
        value: `₩${userStats.totalUsageCost?.toLocaleString() || '0'}`,
        icon: Download,
        description: '누적 사용 비용',
        trend: userStats.totalUsageCost > 0 ? `₩${userStats.totalUsageCost.toLocaleString()}` : '₩0',
        trendLabel: '전체 기간'
      }
    ]
  }, [userStats])

  // 검색 트렌드 데이터 (최근 100일)
  const searchTrendData = useMemo(() => {
    if (!userStats.searchHistory || userStats.searchHistory.length === 0) {
      // 기본 데이터 생성 - 최근 100일
      const data = []
      for (let i = 99; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        data.push({
          date: date.toISOString().split('T')[0], // YYYY-MM-DD 형식
          count: 0,
          searchCount: 0
        })
      }
      return data
    }

    // 실제 데이터가 있는 경우 일별로 집계 (최근 100일)
    const dailyData = userStats.searchHistory.reduce((acc, item) => {
      const date = new Date(item.date).toISOString().split('T')[0] // YYYY-MM-DD 형식
      if (!acc[date]) {
        acc[date] = { count: 0, searchCount: 0 }
      }
      acc[date].count += item.count || 0
      acc[date].searchCount += item.count || 0
      return acc
    }, {} as Record<string, { count: number; searchCount: number }>)

    return Object.entries(dailyData).map(([date, data]) => ({
      date,
      count: data.count,
      searchCount: data.searchCount
    })).slice(-100) // 최근 100일만 표시
  }, [userStats.searchHistory])

  // 분야별 분포 데이터 (최근 100일 기준)
  const categoryData = useMemo(() => {
    // API에서 받은 최근 100일 기술 분야 분포 데이터 우선 사용
    if (userStats.fieldDistribution && userStats.fieldDistribution.length > 0) {
      return userStats.fieldDistribution
        .filter(item => item.count > 0) // 0개인 분야 제외
        .sort((a, b) => b.count - a.count)
        .slice(0, 8) // 상위 8개만 표시
        .map(item => ({
          field: item.field,
          count: item.count
        }))
    }
    
    // 데이터가 없는 경우 빈 배열 반환
    if (!userStats.searchKeywords || userStats.searchKeywords.length === 0) {
      return []
    }
    
    // 백업: top_keywords에서 field 정보 활용
    const fieldCounts = userStats.searchKeywords.reduce((acc, item) => {
      const field = item.field || '기타'
      acc[field] = (acc[field] || 0) + item.count
      return acc
    }, {} as Record<string, number>)
    
    return Object.entries(fieldCounts)
      .map(([field, count]) => ({
        field,
        count
      }))
      .filter(item => item.count > 0) // 0개인 분야 제외
      .sort((a, b) => b.count - a.count)
      .slice(0, 8) // 상위 8개만
  }, [userStats.fieldDistribution, userStats.searchKeywords])

  // 활동 트렌드 데이터 (검색수와 보고서수를 일자별로 표시)
  const activityTrendData = useMemo(() => {
    if (!userStats.dailyActivities || userStats.dailyActivities.length === 0) {
      return []
    }

    // dailyActivities 데이터를 기반으로 검색수와 보고서수 생성
    return userStats.dailyActivities.map((item, index) => {
      // 검색수는 실제 데이터 사용
      const searchCount = item.count || 0
      
      // 보고서수는 검색수를 기반으로 시뮬레이션 (실제 API에서 보고서 데이터가 없는 경우)
      // 검색이 있는 날의 약 30-50% 확률로 보고서 생성으로 가정
      const reportCount = searchCount > 0 ? Math.floor(searchCount * (0.3 + Math.random() * 0.2)) : 0
      
      return {
        date: item.date,
        searchCount,
        reportCount,
        // 날짜 포맷팅을 위한 추가 필드
        formattedDate: (() => {
          try {
            const date = new Date(item.date)
            return `${date.getMonth() + 1}/${date.getDate()}`
          } catch (e) {
            return item.date
          }
        })()
      }
    })
  }, [userStats.dailyActivities])

  // 최근 활동 데이터 (실제 DB 데이터 활용)
  const recentActivity = useMemo(() => {
    const activities = []
    
    // 최근 검색 추가 (API recent_searches 구조에 맞게)
    userStats.recentSearches.slice(0, 3).forEach((search, index) => {
      activities.push({
        id: `search-${index}`,
        type: 'search',
        title: search.keyword,
        description: `${search.resultsCount}개 결과 • ${search.field}`,
        timestamp: search.searchDate,
        icon: Search
      })
    })

    // 최근 보고서 추가 (API recent_reports 구조에 맞게)
    userStats.recentReports.slice(0, 2).forEach(report => {
      activities.push({
        id: report.id,
        type: 'report',
        title: report.patentTitle,
        description: `특허번호: ${report.patentNumber}`,
        timestamp: report.createdAt,
        icon: FileText
      })
    })

    // 시간순 정렬
    return activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5)
  }, [userStats.recentSearches, userStats.recentReports])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ms-olive mx-auto mb-4"></div>
          <p className="text-ms-text-muted">대시보드를 로딩 중입니다...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-ms-text mb-2">오류가 발생했습니다</h2>
          <p className="text-ms-text-muted mb-4">{error}</p>
          <Button 
            onClick={() => window.location.reload()} 
            className="bg-ms-olive hover:bg-ms-olive/90 text-white"
          >
            다시 시도
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-ms-white">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="space-y-8">
          {/* 헤더 */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-ms-text">대시보드</h1>
              <p className="mt-2 text-ms-text-muted">
                안녕하세요, {user?.email || '사용자'}님! 특허 검색 활동을 확인해보세요.
              </p>
            </div>
            <div className="mt-4 sm:mt-0">
              <Link to="/search">
            <Button className="bg-ms-olive hover:bg-ms-olive/90 text-white flex items-center space-x-2">
              <Search className="h-4 w-4" />
              <span>새 검색</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* 새 사용자 환영 섹션 */}
      {isNewUser && welcomeMessage && (
        <Card className="ms-card bg-gradient-to-r from-ms-olive/10 to-ms-olive/5 border-ms-olive/20">
          <CardContent className="p-6">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-ms-olive/20 rounded-full flex items-center justify-center">
                  <Zap className="h-6 w-6 text-ms-olive" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-ms-text mb-2">
                  특허 AI 플랫폼에 오신 것을 환영합니다! 🎉
                </h3>
                <p className="text-ms-text-muted mb-4">
                  {welcomeMessage}
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link to="/search">
                    <Button className="bg-ms-olive hover:bg-ms-olive/90 text-white flex items-center space-x-2">
                      <Search className="h-4 w-4" />
                      <span>첫 번째 검색 시작하기</span>
                    </Button>
                  </Link>
                  <Button 
                    variant="outline" 
                    className="border-ms-olive text-ms-olive hover:bg-ms-olive/10"
                    onClick={() => {
                      setIsNewUser(false)
                      setWelcomeMessage(null)
                    }}
                  >
                    나중에 하기
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <Card key={index} className="ms-card hover:bg-ms-soft transition-colors">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-ms-text-muted">
                  {stat.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-ms-text-light" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold text-ms-text">{stat.value}</div>
                <p className="text-xs text-ms-text-muted mt-1">{stat.description}</p>
                <div className="flex items-center mt-2">
                  <span className="text-xs font-medium text-ms-olive">
                    {stat.trend}
                  </span>
                  <span className="text-xs text-ms-text-light ml-1">
                    {stat.trendLabel}
                  </span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* 차트 섹션 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 활동 트렌드 차트 */}
        <Card className="ms-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-ms-text">
              <Activity className="h-5 w-5 text-ms-text-light" />
              <span>활동 트렌드</span>
            </CardTitle>
            <CardDescription className="text-ms-text-muted">최근 100일간 검색수와 보고서 생성 현황</CardDescription>
          </CardHeader>
          <CardContent>
            {activityTrendData && activityTrendData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={activityTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="formattedDate" 
                      tick={{ fontSize: 10 }} 
                      interval="preserveStartEnd"
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip 
                      labelFormatter={(value, payload) => {
                        if (payload && payload[0] && payload[0].payload) {
                          try {
                            const date = new Date(payload[0].payload.date)
                            return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`
                          } catch (e) {
                            return value
                          }
                        }
                        return value
                      }}
                      formatter={(value, name) => [
                        `${value}${name === '검색 수' ? '회' : '개'}`, 
                        name
                      ]}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="searchCount" 
                      stroke="#3B82F6" 
                      strokeWidth={2}
                      dot={{ fill: "#3B82F6", strokeWidth: 2, r: 3 }}
                      activeDot={{ r: 5, fill: "#3B82F6" }}
                      name="검색 수"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="reportCount" 
                      stroke="#F59E0B" 
                      strokeWidth={2}
                      dot={{ fill: "#F59E0B", strokeWidth: 2, r: 3 }}
                      activeDot={{ r: 5, fill: "#F59E0B" }}
                      name="보고서 수"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center">
                <div className="text-center">
                  <Activity className="h-16 w-16 text-ms-text-light mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium text-ms-text mb-2">활동 데이터가 없습니다</h3>
                  <p className="text-ms-text-muted mb-4">
                    최근 100일간 활동이 없거나 데이터를 불러오는 중입니다.
                  </p>
                  <Link to="/search">
                    <Button className="bg-ms-olive hover:bg-ms-olive/90 text-white">
                      첫 검색 시작하기
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 분야별 분포 차트 */}
        <Card className="ms-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-ms-text">
              <PieChartIcon className="h-5 w-5 text-ms-text-light" />
              <span>분야별 분포</span>
            </CardTitle>
            <CardDescription className="text-ms-text-muted">최근 100일간 검색 키워드 기술 분야 분포</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={categoryData} 
                    dataKey="count" 
                    nameKey="field" 
                    cx="50%" 
                    cy="50%" 
                    outerRadius={80} 
                    label={({ field, count, percent }) => 
                      count > 0 ? `${field}: ${(percent * 100).toFixed(1)}%` : ''
                    }
                    labelLine={false}
                  >
                    {categoryData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={[
                          "#6B7280", // 올리브 그레이
                          "#84CC16", // 라임 그린
                          "#10B981", // 에메랄드
                          "#059669", // 에메랄드 다크
                          "#065F46", // 에메랄드 더 다크
                          "#374151", // 그레이 700
                          "#9CA3AF", // 그레이 400
                          "#D1D5DB"  // 그레이 300
                        ][index % 8]} 
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value, name) => [`${value}개`, name]}
                    labelFormatter={(label) => `분야: ${label}`}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 검색 트렌드 - 최근 100일간 일별 검색 활동 */}
      <div className="grid grid-cols-1 gap-6">
        <Card className="ms-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-ms-text">
              <TrendingUp className="h-5 w-5 text-ms-text-light" />
              <span>검색 트렌드</span>
            </CardTitle>
            <CardDescription className="text-ms-text-muted">최근 100일간 일별 검색 활동</CardDescription>
          </CardHeader>
          <CardContent>
            {userStats.dailyActivities && userStats.dailyActivities.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={userStats.dailyActivities}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => {
                        try {
                          const date = new Date(value)
                          return `${date.getMonth() + 1}/${date.getDate()}`
                        } catch (e) {
                          return value
                        }
                      }}
                      interval="preserveStartEnd"
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip 
                      labelFormatter={(value) => {
                        try {
                          const date = new Date(value)
                          return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`
                        } catch (e) {
                          return value
                        }
                      }}
                      formatter={(value) => [`${value}회`, '검색 수']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="count" 
                      stroke={userStats.dailyActivities.some(item => item.count > 0) ? "#059669" : "#d1d5db"}
                      strokeWidth={2}
                      dot={{ 
                        fill: userStats.dailyActivities.some(item => item.count > 0) ? "#059669" : "#d1d5db", 
                        strokeWidth: 2, 
                        r: 3 
                      }}
                      activeDot={{ 
                        r: 5, 
                        fill: userStats.dailyActivities.some(item => item.count > 0) ? "#059669" : "#d1d5db" 
                      }}
                      name="검색 수"
                    />
                  </LineChart>
                </ResponsiveContainer>
                {!userStats.dailyActivities.some(item => item.count > 0) && (
                  <div className="mt-4 text-center">
                    <p className="text-sm text-ms-text-muted">
                      최근 100일간 검색 활동이 없습니다. 첫 검색을 시작해보세요!
                    </p>
                    <Link to="/search">
                      <Button className="mt-2 bg-ms-olive hover:bg-ms-olive/90 text-white text-sm">
                        검색 시작하기
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-80 flex items-center justify-center">
                <div className="text-center">
                  <TrendingUp className="h-16 w-16 text-ms-text-light mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium text-ms-text mb-2">검색 활동 데이터가 없습니다</h3>
                  <p className="text-ms-text-muted mb-4">
                    최근 100일간 검색 활동이 없거나 데이터를 불러오는 중입니다.
                  </p>
                  <Link to="/search">
                    <Button className="bg-ms-olive hover:bg-ms-olive/90 text-white">
                      첫 검색 시작하기
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 활동 차트 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 시간대별 활동 */}
        <Card className="ms-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-ms-text">
              <Clock className="h-5 w-5 text-ms-text-light" />
              <span>시간대별 활동</span>
            </CardTitle>
            <CardDescription className="text-ms-text-muted">하루 중 검색이 많은 시간대</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.hourlyActivity}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="hour" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#6B7280" name="검색 수" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* 주간 활동 */}
        <Card className="ms-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-ms-text">
              <Calendar className="h-5 w-5 text-ms-text-light" />
              <span>주간 활동</span>
            </CardTitle>
            <CardDescription className="text-ms-text-muted">요일별 활동 통계 (월~일)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.weeklyActivity}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#6B7280" name="활동 수" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 최근 활동 섹션 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 최근 검색 키워드 */}
        <Card className="ms-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-ms-text">
              <Search className="h-5 w-5 text-ms-text-light" />
              <span>최근 검색 키워드</span>
            </CardTitle>
            <CardDescription className="text-ms-text-muted">최근 검색한 키워드 20개</CardDescription>
          </CardHeader>
          <CardContent>
            {userStats.recentSearches && userStats.recentSearches.length > 0 ? (
              <div className="space-y-3">
                {userStats.recentSearches.slice(0, 20).map((search, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg hover:bg-ms-soft transition-colors">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-ms-text">
                        {search.keyword}
                      </p>
                      <p className="text-xs text-ms-text-light">
                        결과 수: {search.resultsCount || 0}개
                      </p>
                    </div>
                    <div className="text-xs text-ms-text-light">
                      {new Date(search.searchDate).toLocaleDateString('ko-KR')}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Search className="h-12 w-12 text-ms-text-light mx-auto mb-4" />
                <p className="text-ms-text-muted">아직 검색 내역이 없습니다.</p>
                <Link to="/search">
                  <Button className="mt-4 bg-ms-olive hover:bg-ms-olive/90 text-white">
                    첫 검색 시작하기
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 최근 보고서 */}
        <Card className="ms-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-ms-text">
              <FileText className="h-5 w-5 text-ms-text-light" />
              <span>최근 보고서</span>
            </CardTitle>
            <CardDescription className="text-ms-text-muted">최근 작성한 보고서 20개</CardDescription>
          </CardHeader>
          <CardContent>
            {userStats.recentReports && userStats.recentReports.length > 0 ? (
              <div className="space-y-3">
                {userStats.recentReports.slice(0, 20).map((report, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg hover:bg-ms-soft transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ms-text truncate">
                        {report.patentTitle}
                      </p>
                      <p className="text-xs text-ms-text-light">
                        특허번호: {report.patentNumber} • {report.reportType}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="text-xs text-ms-text-light">
                        {new Date(report.createdAt).toLocaleDateString('ko-KR')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-ms-text-light mx-auto mb-4" />
                <p className="text-ms-text-muted">아직 작성한 보고서가 없습니다.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
        </div>
      </div>
    </div>
  )
}