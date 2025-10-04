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
  Cell
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
import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useSearchStore } from '../store/searchStore'
import { cn } from '../lib/utils'
import SearchTrendChart from '../components/Charts/SearchTrendChart'
import FieldDistributionChart from '../components/Charts/FieldDistributionChart'
import HourlyActivityChart from '../components/Charts/HourlyActivityChart'
import WeeklyActivityChart from '../components/Charts/WeeklyActivityChart'

interface WeeklyActivityData {
  day: string;
  dayIndex: number;
  count: number;
  searchCount: number;
  aiAnalysisCount: number;
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userStats, setUserStats] = useState({
    totalSearches: 0,
    reportsGenerated: 0,
    monthlyActivity: 0,
    savedPatents: 0,
    totalLogins: 0,
    engagementScore: 0,
    averageSearchResults: 0,
    aiAnalysisCount: 0,
    documentDownloadCount: 0,
    searchHistory: [] as Array<{
      date: string
      count: number
    }>,
    searchKeywords: [] as Array<{
      keyword: string
      count: number
      field: string
    }>,
    recentSearches: [] as Array<{
      keyword: string
      searchDate: string
      resultsCount: number
      field: string
    }>,
    recentReports: [] as Array<{
      id: string
      title: string
      createdAt: string
      applicationNumber: string
      downloadUrl: string
    }>,
    fieldDistribution: [] as Array<{
      field: string
      count: number
    }>
  })
  const [chartData, setChartData] = useState({
    hourlyActivity: [] as Array<{ hour: number; count: number }>,
    weeklyActivity: [] as WeeklyActivityData[]
  })

  const { user } = useAuthStore()

  useEffect(() => {
    const loadUserStats = async () => {
      try {
        console.log('📊 [Dashboard] 사용자 통계 로딩 시작')
        
        // 사용자 ID 결정 로직 개선 - 다중 fallback 전략
        let userId = user?.id
        
        if (!userId) {
          console.log('🔍 [Dashboard] 사용자 ID가 없음, fallback 전략 사용')
          // 다중 fallback 전략
          userId = 'guest_user' // 임시 사용자 ID
          console.log('📊 [Dashboard] Guest 사용자로 처리:', userId)
        }
        
        console.log('📊 [Dashboard] 사용할 사용자 ID:', userId)

        // 개선된 API 유티리티 사용
        const { getUserStats } = await import('../lib/api')
        const data = await getUserStats(userId)
        
        if (!data.success) {
          console.error('❌ [Dashboard] API 요청 실패:', data.error)
          
          // API 실패 시 기본 데이터로 fallback
          console.log('🔄 [Dashboard] 기본 데이터로 fallback 처리')
          setUserStats({
            totalSearches: 0,
            reportsGenerated: 0,
            monthlyActivity: 0,
            savedPatents: 0,
            totalLogins: 0,
            engagementScore: 0,
            averageSearchResults: 0,
            aiAnalysisCount: 0,
            documentDownloadCount: 0,
            searchHistory: [],
            searchKeywords: [],
            recentSearches: [],
            recentReports: [],
            fieldDistribution: []
          })
          
          setChartData({
            hourlyActivity: [],
            weeklyActivity: []
          })
          
          setLoading(false)
          return
        }
        console.log('✅ [Dashboard] 사용자 통계 로딩 완료:', data)
        console.log('📊 [Dashboard] API 응답 구조:', {
          success: data.success,
          hasData: !!data.data,
          summary: data.data?.summary,
          recentSearches: data.data?.recent_searches?.length || 0,
          recentReports: data.data?.recent_reports?.length || 0,
          topKeywords: data.data?.top_keywords?.length || 0,
          weeklyActivities: data.data?.weekly_activities?.length || 0,
          fieldDistribution: data.data?.field_distribution?.length || 0,
          hourlyActivities: data.data?.hourly_activities?.length || 0
        })

        // API 응답 구조: data.data.summary, data.data.recent_searches 등
        const apiData = data.data || {}
        const summary = apiData.summary || {}

        // 사용자 통계 설정 (실제 DB 데이터 활용)
        setUserStats({
          totalSearches: summary.search_count || 0,
          reportsGenerated: summary.report_generate_count || 0,
          monthlyActivity: summary.total_activities || 0,
          savedPatents: summary.patent_view_count || 0,
          totalLogins: summary.total_activities || 0, // 전체 활동으로 대체
          engagementScore: Math.min(100, Math.round((summary.total_activities || 0) * 2.5)), // 활동 기반 점수
          averageSearchResults: summary.average_search_results || 0,
          aiAnalysisCount: summary.ai_analysis_count || 0,
          documentDownloadCount: summary.document_download_count || 0,
          searchHistory: apiData.daily_activities_100days || [],
          searchKeywords: apiData.top_keywords || [],
          recentSearches: apiData.recent_searches || [],
          recentReports: apiData.recent_reports || [],
          fieldDistribution: apiData.field_distribution || []
        })

        // 차트 데이터 설정 (실제 DB 데이터 활용)
        const weeklyData = (apiData.weekly_activities || []).map((item: any, index: number) => ({
          day: item.day || `Day ${index}`,
          dayIndex: typeof item.dayIndex === 'number' ? item.dayIndex : index,
          count: item.count ?? ((item.searchCount || 0) + (item.aiAnalysisCount || 0)),
          searchCount: item.searchCount ?? item.searches ?? 0,
          aiAnalysisCount: item.aiAnalysisCount ?? item.reports ?? 0
        }))

        const hourlyData = (apiData.hourly_activities || []).map((item: any) => ({
          hour: typeof item.hour === 'number' ? item.hour : parseInt(item.hour) || 0,
          count: item.count ?? item.searchCount ?? 0
        }))

        setChartData({
          hourlyActivity: hourlyData,
          weeklyActivity: weeklyData
        })

      } catch (error) {
        console.error('❌ [Dashboard] 사용자 통계 로딩 실패:', error)
        setError('데이터를 불러오는데 실패했습니다.')
        setLoading(false)
        return
      } finally {
        setLoading(false)
      }
    }

    loadUserStats()
  }, [user?.id])

  // 통계 계산 (실제 DB 데이터 기반)
  const stats = useMemo(() => {
    if (!userStats) return []

    return [
      {
        title: '총 검색 수',
        value: userStats.totalSearches.toLocaleString(),
        icon: Search,
        description: '누적 특허 검색 횟수',
        trend: userStats.totalSearches > 0 ? `${userStats.totalSearches}회` : '0회',
        trendLabel: '전체 기간'
      },
      {
        title: '생성된 보고서',
        value: userStats.reportsGenerated.toLocaleString(),
        icon: FileText,
        description: 'AI 분석 보고서 수',
        trend: userStats.reportsGenerated > 0 ? `${userStats.reportsGenerated}개` : '0개',
        trendLabel: '전체 기간'
      },
      {
        title: '전체 활동',
        value: userStats.monthlyActivity.toLocaleString(),
        icon: TrendingUp,
        description: '총 활동 횟수',
        trend: userStats.monthlyActivity > 0 ? `${userStats.monthlyActivity}회` : '0회',
        trendLabel: '전체 기간'
      },
      {
        title: '평균 검색 결과',
        value: userStats.averageSearchResults.toLocaleString(),
        icon: Target,
        description: '검색당 평균 특허 수',
        trend: userStats.averageSearchResults > 0 ? `${userStats.averageSearchResults.toFixed(1)}개` : '0개',
        trendLabel: '평균'
      },
      {
        title: 'AI 분석',
        value: userStats.aiAnalysisCount.toLocaleString(),
        icon: Zap,
        description: 'AI 분석 실행 횟수',
        trend: userStats.aiAnalysisCount > 0 ? `${userStats.aiAnalysisCount}회` : '0회',
        trendLabel: '전체 기간'
      },
      {
        title: '문서 다운로드',
        value: userStats.documentDownloadCount.toLocaleString(),
        icon: Download,
        description: '다운로드한 문서 수',
        trend: userStats.documentDownloadCount > 0 ? `${userStats.documentDownloadCount}개` : '0개',
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

  // 분야별 분포 데이터
  const categoryData = useMemo(() => {
    if (!userStats.searchKeywords || userStats.searchKeywords.length === 0) {
      return [
        { field: 'AI/머신러닝', count: 0 },
        { field: '블록체인', count: 0 },
        { field: 'IoT', count: 0 },
        { field: '바이오', count: 0 },
        { field: '자동차', count: 0 },
        { field: '반도체/전자', count: 0 }
      ]
    }

    // 키워드를 분야별로 분류 (API field_distribution 데이터 활용)
    if (userStats.fieldDistribution && userStats.fieldDistribution.length > 0) {
      return userStats.fieldDistribution
        .sort((a, b) => b.count - a.count)
        .slice(0, 7) // 상위 7개만
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
      .sort((a, b) => b.count - a.count)
      .slice(0, 7) // 상위 7개만
  }, [userStats.searchKeywords])

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
        title: report.title,
        description: `출원번호: ${report.applicationNumber}`,
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">대시보드를 로딩 중입니다...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">오류가 발생했습니다</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button 
            onClick={() => window.location.reload()} 
            className="bg-[var(--ms-olive-600)] hover:bg-[var(--ms-olive-700)] text-white"
          >
            다시 시도
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">대시보드</h1>
          <p className="mt-2 text-gray-600">
            안녕하세요, {user?.email || '사용자'}님! 특허 검색 활동을 확인해보세요.
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Link to="/search">
            <Button className="bg-[var(--ms-olive-600)] hover:bg-[var(--ms-olive-700)] text-white flex items-center space-x-2">
              <Search className="h-4 w-4" />
              <span>새 검색</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <Card key={index} className="hover:bg-ms-olive/5 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {stat.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-gray-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                <p className="text-xs text-gray-600 mt-1">{stat.description}</p>
                <div className="flex items-center mt-2">
                  <span className="text-xs font-medium text-green-600">
                    {stat.trend}
                  </span>
                  <span className="text-xs text-gray-500 ml-1">
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
        {/* 검색 트렌드 차트 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>검색 트렌드</span>
            </CardTitle>
            <CardDescription>최근 100일간 일별 검색 활동</CardDescription>
          </CardHeader>
          <CardContent>
            <SearchTrendChart data={searchTrendData} />
          </CardContent>
        </Card>

        {/* 분야별 분포 차트 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <PieChartIcon className="h-5 w-5" />
              <span>분야별 분포</span>
            </CardTitle>
            <CardDescription>최근 100일간 검색 키워드 기술 분야 분포</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldDistributionChart data={categoryData} />
          </CardContent>
        </Card>
      </div>

      {/* 활동 차트 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 시간대별 활동 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>시간대별 활동</span>
            </CardTitle>
            <CardDescription>하루 중 검색이 많은 시간대</CardDescription>
          </CardHeader>
          <CardContent>
            <HourlyActivityChart data={chartData.hourlyActivity} />
          </CardContent>
        </Card>

        {/* 주간 활동 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>주간 활동</span>
            </CardTitle>
            <CardDescription>요일별 활동 통계 (월~일)</CardDescription>
          </CardHeader>
          <CardContent>
            <WeeklyActivityChart data={chartData.weeklyActivity} />
          </CardContent>
        </Card>
      </div>

      {/* 최근 활동 섹션 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 최근 검색 키워드 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Search className="h-5 w-5" />
              <span>최근 검색 키워드</span>
            </CardTitle>
            <CardDescription>최근 검색한 키워드 5개</CardDescription>
          </CardHeader>
          <CardContent>
            {userStats.recentSearches && userStats.recentSearches.length > 0 ? (
              <div className="space-y-3">
                {userStats.recentSearches.slice(0, 5).map((search, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {search.keyword}
                      </p>
                      <p className="text-xs text-gray-500">
                        {search.resultsCount}개 결과 • {search.field}
                      </p>
                    </div>
                    <div className="text-xs text-gray-400">
                      {new Date(search.searchDate).toLocaleDateString('ko-KR')}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">아직 검색 내역이 없습니다.</p>
                <Link to="/search">
                  <Button className="mt-4 bg-[var(--ms-olive-600)] hover:bg-[var(--ms-olive-700)] text-white">
                    첫 검색 시작하기
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 최근 보고서 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>최근 보고서</span>
            </CardTitle>
            <CardDescription>최근 작성한 보고서 20개</CardDescription>
          </CardHeader>
          <CardContent>
            {userStats.recentReports && userStats.recentReports.length > 0 ? (
              <div className="space-y-3">
                {userStats.recentReports.slice(0, 20).map((report, index) => (
                  <div key={report.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {report.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        출원번호: {report.applicationNumber}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="text-xs text-gray-400">
                        {new Date(report.createdAt).toLocaleDateString('ko-KR')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">아직 작성한 보고서가 없습니다.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}