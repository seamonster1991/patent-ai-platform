import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  ChartBarIcon, 
  ClockIcon,
  CalendarIcon,
  ArrowTrendingUpIcon,
  FunnelIcon,
  ArrowLeftIcon,
  EyeIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline'
import { 
  Card, 
  Text, 
  Title, 
  BarChart, 
  LineChart, 
  AreaChart,
  Grid, 
  Col,
  Metric,
  Flex,
  Badge,
  Select,
  SelectItem,
  DateRangePicker,
  DateRangePickerValue
} from '@tremor/react'
import { useAuthStore } from '../../store/authStore'
import { toast } from 'sonner'

// Types
interface ActivityStats {
  totalActivities: number
  activityTypes: Array<{
    activity_type: string
    count: number
    percentage: number
  }>
  hourlyPattern: Array<{
    hour: number
    count: number
  }>
  dailyTrend: Array<{
    date: string
    searches: number
    reports: number
    views: number
  }>
  weeklyPattern: Array<{
    day: string
    count: number
  }>
  efficiencyMetrics: {
    searchToReportConversion: number
    viewToReportConversion: number
    averageSessionDuration: number
    peakActivityHour: number
  }
}

export default function ActivityAnalysis() {
  const { user } = useAuthStore()
  const [stats, setStats] = useState<ActivityStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState('30d')
  const [dateRange, setDateRange] = useState<DateRangePickerValue>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: new Date()
  })

  // Mock data for development
  const mockStats: ActivityStats = {
    totalActivities: 156,
    activityTypes: [
      { activity_type: 'search', count: 45, percentage: 28.8 },
      { activity_type: 'patent_view', count: 38, percentage: 24.4 },
      { activity_type: 'report_generation', count: 23, percentage: 14.7 },
      { activity_type: 'bookmark', count: 18, percentage: 11.5 },
      { activity_type: 'login', count: 15, percentage: 9.6 },
      { activity_type: 'page_navigation', count: 17, percentage: 10.9 }
    ],
    hourlyPattern: Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      count: Math.floor(Math.random() * 20) + 1
    })),
    dailyTrend: Array.from({ length: 30 }, (_, i) => {
      const date = new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000)
      return {
        date: date.toISOString().split('T')[0],
        searches: Math.floor(Math.random() * 10) + 1,
        reports: Math.floor(Math.random() * 5) + 1,
        views: Math.floor(Math.random() * 15) + 1
      }
    }),
    weeklyPattern: [
      { day: '월', count: 25 },
      { day: '화', count: 32 },
      { day: '수', count: 28 },
      { day: '목', count: 35 },
      { day: '금', count: 30 },
      { day: '토', count: 15 },
      { day: '일', count: 12 }
    ],
    efficiencyMetrics: {
      searchToReportConversion: 51.1,
      viewToReportConversion: 60.5,
      averageSessionDuration: 24.5,
      peakActivityHour: 14
    }
  }

  useEffect(() => {
    const fetchActivityStats = async () => {
      if (!user?.id) return

      try {
        setLoading(true)
        setError(null)

        // In a real app, this would be an API call
        // const response = await fetch(`/api/dashboard/activity-stats?user_id=${user.id}&period=${selectedPeriod}`)
        
        // For now, use mock data
        setTimeout(() => {
          setStats(mockStats)
          setLoading(false)
        }, 1000)

      } catch (error) {
        console.error('Activity stats fetch error:', error)
        setError(error instanceof Error ? error.message : 'Unknown error occurred')
        toast.error('활동 분석 데이터를 불러오는데 실패했습니다.')
        setLoading(false)
      }
    }

    fetchActivityStats()
  }, [user?.id, selectedPeriod])

  const handlePeriodChange = (value: string) => {
    setSelectedPeriod(value)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <Text>활동 분석 데이터를 불러오는 중...</Text>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Text className="text-red-600 mb-4">{error}</Text>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            다시 시도
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <Link 
              to="/dashboard" 
              className="mr-4 p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-3xl font-semibold text-gray-800">활동 분석</h1>
              <Text className="text-gray-600">상세한 사용 패턴 및 효율성 지표</Text>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center space-x-2">
              <FunnelIcon className="h-5 w-5 text-gray-500" />
              <Text>기간 선택:</Text>
            </div>
            <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
              <SelectItem value="7d">최근 7일</SelectItem>
              <SelectItem value="30d">최근 30일</SelectItem>
              <SelectItem value="90d">최근 90일</SelectItem>
            </Select>
            <DateRangePicker
              value={dateRange}
              onValueChange={setDateRange}
              className="max-w-md"
            />
          </div>
        </div>

        {/* Key Metrics */}
        <Grid numItems={1} numItemsSm={2} numItemsLg={4} className="gap-6 mb-8">
          <Card className="p-6">
            <Flex alignItems="start">
              <div>
                <Text className="text-gray-600">총 활동 수</Text>
                <Metric className="text-gray-800">{stats?.totalActivities}</Metric>
                <Text className="text-emerald-600 text-sm mt-1">+12% 전월 대비</Text>
              </div>
              <ChartBarIcon className="h-8 w-8 text-blue-500" />
            </Flex>
          </Card>

          <Card className="p-6">
            <Flex alignItems="start">
              <div>
                <Text className="text-gray-600">검색→리포트 전환율</Text>
                <Metric className="text-gray-800">{stats?.efficiencyMetrics.searchToReportConversion.toFixed(1)}%</Metric>
                <Text className="text-emerald-600 text-sm mt-1">+5.2% 전월 대비</Text>
              </div>
              <ArrowTrendingUpIcon className="h-8 w-8 text-emerald-500" />
            </Flex>
          </Card>

          <Card className="p-6">
            <Flex alignItems="start">
              <div>
                <Text className="text-gray-600">조회→리포트 전환율</Text>
                <Metric className="text-gray-800">{stats?.efficiencyMetrics.viewToReportConversion.toFixed(1)}%</Metric>
                <Text className="text-red-600 text-sm mt-1">-2.1% 전월 대비</Text>
              </div>
              <EyeIcon className="h-8 w-8 text-purple-500" />
            </Flex>
          </Card>

          <Card className="p-6">
            <Flex alignItems="start">
              <div>
                <Text className="text-gray-600">평균 세션 시간</Text>
                <Metric className="text-gray-800">{stats?.efficiencyMetrics.averageSessionDuration.toFixed(1)}분</Metric>
                <Text className="text-emerald-600 text-sm mt-1">+8.3% 전월 대비</Text>
              </div>
              <ClockIcon className="h-8 w-8 text-orange-500" />
            </Flex>
          </Card>
        </Grid>

        {/* Activity Trend Chart */}
        <Card className="mb-8 p-6">
          <Title className="text-gray-800 mb-2">일별 활동 추이</Title>
          <Text className="text-gray-600 mb-6">검색, 리포트 생성, 특허 조회 활동 패턴</Text>
          
          <AreaChart
            data={stats?.dailyTrend || []}
            index="date"
            categories={["searches", "reports", "views"]}
            colors={["blue", "emerald", "orange"]}
            yAxisWidth={40}
            className="h-80"
          />
        </Card>

        {/* Activity Patterns */}
        <Grid numItems={1} numItemsLg={2} className="gap-6 mb-8">
          {/* Hourly Pattern */}
          <Card className="p-6">
            <Title className="text-gray-800 mb-2">시간대별 활동 패턴</Title>
            <Text className="text-gray-600 mb-6">24시간 활동 분포</Text>
            
            <BarChart
              data={stats?.hourlyPattern || []}
              index="hour"
              categories={["count"]}
              colors={["blue"]}
              yAxisWidth={40}
              className="h-64"
            />
            
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <Text className="text-blue-800 font-medium">
                피크 시간: {stats?.efficiencyMetrics.peakActivityHour}시
              </Text>
            </div>
          </Card>

          {/* Weekly Pattern */}
          <Card className="p-6">
            <Title className="text-gray-800 mb-2">요일별 활동 패턴</Title>
            <Text className="text-gray-600 mb-6">주간 활동 분포</Text>
            
            <BarChart
              data={stats?.weeklyPattern || []}
              index="day"
              categories={["count"]}
              colors={["emerald"]}
              yAxisWidth={40}
              className="h-64"
            />
          </Card>
        </Grid>

        {/* Activity Types Breakdown */}
        <Card className="mb-8 p-6">
          <Title className="text-gray-800 mb-2">활동 유형별 분석</Title>
          <Text className="text-gray-600 mb-6">전체 활동 중 유형별 비율 및 상세 통계</Text>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {stats?.activityTypes.map((type, index) => (
              <div key={type.activity_type} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    {type.activity_type === 'search' && <MagnifyingGlassIcon className="h-5 w-5 text-blue-500 mr-2" />}
                    {type.activity_type === 'patent_view' && <EyeIcon className="h-5 w-5 text-green-500 mr-2" />}
                    {type.activity_type === 'report_generation' && <DocumentTextIcon className="h-5 w-5 text-purple-500 mr-2" />}
                    {type.activity_type === 'bookmark' && <span className="h-5 w-5 text-yellow-500 mr-2">⭐</span>}
                    {type.activity_type === 'login' && <span className="h-5 w-5 text-indigo-500 mr-2">🔐</span>}
                    {type.activity_type === 'page_navigation' && <span className="h-5 w-5 text-gray-500 mr-2">🧭</span>}
                    
                    <Text className="font-medium text-gray-800">
                      {type.activity_type === 'search' ? '검색' :
                       type.activity_type === 'patent_view' ? '특허 조회' :
                       type.activity_type === 'report_generation' ? '리포트 생성' :
                       type.activity_type === 'bookmark' ? '북마크' :
                       type.activity_type === 'login' ? '로그인' :
                       type.activity_type === 'page_navigation' ? '페이지 이동' :
                       type.activity_type}
                    </Text>
                  </div>
                  <Badge color="blue">{type.percentage.toFixed(1)}%</Badge>
                </div>
                <Metric className="text-gray-800">{type.count}</Metric>
              </div>
            ))}
          </div>
        </Card>

        {/* Insights and Recommendations */}
        <Card className="p-6">
          <Title className="text-gray-800 mb-4">인사이트 및 추천</Title>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
              <h4 className="font-semibold text-emerald-800 mb-2">🎯 효율성 개선 포인트</h4>
              <Text className="text-emerald-700 mb-2">
                검색 후 리포트 생성률이 51.1%로 양호합니다. 
              </Text>
              <Text className="text-emerald-700">
                특허 조회 후 리포트 생성률을 높이면 더 효율적인 분석이 가능합니다.
              </Text>
            </div>
            
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-2">⏰ 최적 활동 시간</h4>
              <Text className="text-blue-700 mb-2">
                오후 2시경에 가장 활발한 활동을 보입니다.
              </Text>
              <Text className="text-blue-700">
                이 시간대에 중요한 분석 작업을 집중하는 것을 추천합니다.
              </Text>
            </div>
            
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <h4 className="font-semibold text-purple-800 mb-2">📊 활동 패턴 분석</h4>
              <Text className="text-purple-700 mb-2">
                평일 활동량이 주말보다 2.5배 높습니다.
              </Text>
              <Text className="text-purple-700">
                일정한 활동 패턴을 유지하고 있어 좋은 습관입니다.
              </Text>
            </div>
            
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <h4 className="font-semibold text-orange-800 mb-2">🚀 성장 기회</h4>
              <Text className="text-orange-700 mb-2">
                세션 시간이 24.5분으로 적절합니다.
              </Text>
              <Text className="text-orange-700">
                북마크 기능을 더 활용하여 관심 특허를 체계적으로 관리해보세요.
              </Text>
            </div>
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-wrap gap-4 justify-center">
          <Link to="/dashboard">
            <button className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-lg transition-colors flex items-center">
              <ArrowLeftIcon className="h-5 w-5 mr-2" />
              대시보드로 돌아가기
            </button>
          </Link>
          <Link to="/search">
            <button className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg transition-colors flex items-center">
              <MagnifyingGlassIcon className="h-5 w-5 mr-2" />
              새 검색 시작
            </button>
          </Link>
          <Link to="/dashboard/billing">
            <button className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-lg transition-colors flex items-center">
              <ArrowTrendingUpIcon className="h-5 w-5 mr-2" />
              플랜 업그레이드
            </button>
          </Link>
        </div>
      </div>
    </div>
  )
}