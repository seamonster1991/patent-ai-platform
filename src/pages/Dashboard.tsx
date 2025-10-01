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
  Download,
  ExternalLink,
  Activity,
  BarChart3,
  PieChart as PieChartIcon,
  Users,
  Clock,
  AlertCircle
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useSearchStore } from '../store/searchStore'
import { cn } from '../lib/utils'

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const { user, profile } = useAuthStore()
  const { searchHistory, reports, loadSearchHistory, loadReports } = useSearchStore()

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([
        loadSearchHistory(),
        loadReports()
      ])
      setLoading(false)
    }
    
    loadData()
  }, [])

  // 실제 데이터 기반 통계 계산
  const stats = useMemo(() => {
    const totalSearches = searchHistory.length
    const reportsGenerated = reports.length
    
    // 이번 달 검색 수 계산
    const currentMonth = new Date()
    currentMonth.setDate(1)
    const monthlySearches = searchHistory.filter(search => 
      new Date(search.created_at) >= currentMonth
    ).length

    // 평균 검색 결과 수 계산
    const avgResults = searchHistory.length > 0 
      ? Math.round(searchHistory.reduce((sum, search) => sum + (search.results_count || 0), 0) / searchHistory.length)
      : 0

    return [
      {
        title: '총 검색 수',
        value: totalSearches.toLocaleString(),
        icon: Search,
        description: '누적 특허 검색 횟수',
        color: 'text-blue-600 dark:text-blue-400',
        bgColor: 'bg-blue-50 dark:bg-blue-950/50'
      },
      {
        title: '생성된 리포트',
        value: reportsGenerated.toLocaleString(),
        icon: FileText,
        description: '분석 리포트 생성 수',
        color: 'text-green-600 dark:text-green-400',
        bgColor: 'bg-green-50 dark:bg-green-950/50'
      },
      {
        title: '이번 달 활동',
        value: monthlySearches.toLocaleString(),
        icon: TrendingUp,
        description: '이번 달 검색 활동',
        color: 'text-purple-600 dark:text-purple-400',
        bgColor: 'bg-purple-50 dark:bg-purple-950/50'
      },
      {
        title: '평균 검색 결과',
        value: avgResults.toLocaleString(),
        icon: BarChart3,
        description: '검색당 평균 결과 수',
        color: 'text-orange-600 dark:text-orange-400',
        bgColor: 'bg-orange-50 dark:bg-orange-950/50'
      }
    ]
  }, [searchHistory, reports])

  // 월별 검색 동향 데이터 (실제 데이터 기반)
  const searchTrendData = useMemo(() => {
    const monthlyData = new Map()
    const months = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']
    
    // 초기화
    months.forEach((month, index) => {
      monthlyData.set(index, { month, searches: 0 })
    })

    // 실제 검색 기록 집계
    searchHistory.forEach(search => {
      const date = new Date(search.created_at)
      const monthIndex = date.getMonth()
      const current = monthlyData.get(monthIndex)
      if (current) {
        current.searches += 1
      }
    })

    return Array.from(monthlyData.values()).slice(-6) // 최근 6개월
  }, [searchHistory])

  // 검색 분야 분포 데이터 (실제 데이터 기반)
  const categoryData = useMemo(() => {
    const categories = new Map()
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16']
    
    searchHistory.forEach(search => {
      const keyword = search.keyword || '기타'
      const category = keyword.includes('AI') || keyword.includes('인공지능') ? 'AI/머신러닝' :
                     keyword.includes('블록체인') ? '블록체인' :
                     keyword.includes('IoT') || keyword.includes('사물인터넷') ? 'IoT' :
                     keyword.includes('바이오') || keyword.includes('생명공학') ? '바이오' :
                     keyword.includes('자동차') || keyword.includes('자율주행') ? '자동차' :
                     keyword.includes('반도체') || keyword.includes('전자') ? '반도체/전자' :
                     '기타'
      
      categories.set(category, (categories.get(category) || 0) + 1)
    })

    if (categories.size === 0) {
      return [{ name: '검색 기록 없음', value: 1, color: '#9ca3af' }]
    }

    return Array.from(categories.entries())
      .map(([name, value], index) => ({
        name,
        value,
        color: colors[index % colors.length]
      }))
      .sort((a, b) => b.value - a.value)
  }, [searchHistory])

  // 최근 활동 데이터 (실제 데이터 기반)
  const recentActivity = useMemo(() => {
    const activities = []
    
    // 최근 검색 기록 추가
    searchHistory.slice(0, 3).forEach(search => {
      activities.push({
        type: 'search',
        title: `"${search.keyword}" 검색`,
        time: new Date(search.created_at).toLocaleDateString('ko-KR'),
        icon: Search,
        color: 'text-blue-600 dark:text-blue-400'
      })
    })

    // 최근 리포트 추가
    reports.slice(0, 2).forEach(report => {
      activities.push({
        type: 'report',
        title: report.title,
        time: new Date(report.created_at).toLocaleDateString('ko-KR'),
        icon: FileText,
        color: 'text-green-600 dark:text-green-400'
      })
    })

    return activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 5)
  }, [searchHistory, reports])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">대시보드를 로딩 중입니다...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            안녕하세요, {profile?.name || '사용자'}님!
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            특허 검색 및 분석 활동을 한눈에 확인하세요.
          </p>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <Card key={index} className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {stat.value}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {stat.description}
                    </p>
                  </div>
                  <div className={cn("p-3 rounded-lg", stat.bgColor)}>
                    <stat.icon className={cn("h-6 w-6", stat.color)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* 월별 검색 동향 */}
          <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                월별 검색 동향
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-300">
                최근 6개월간의 검색 활동
              </CardDescription>
            </CardHeader>
            <CardContent>
              {searchTrendData.some(data => data.searches > 0) ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={searchTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-600" />
                    <XAxis 
                      dataKey="month" 
                      stroke="#6b7280" 
                      className="dark:stroke-gray-400"
                      fontSize={12}
                    />
                    <YAxis 
                      stroke="#6b7280" 
                      className="dark:stroke-gray-400"
                      fontSize={12}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        color: '#374151'
                      }}
                    />
                    <Bar 
                      dataKey="searches" 
                      fill="#3b82f6" 
                      radius={[4, 4, 0, 0]}
                      name="검색 수"
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">아직 검색 기록이 없습니다</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">특허 검색을 시작해보세요!</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 검색 분야 분포 */}
          <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
                <PieChartIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                검색 분야 분포
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-300">
                관심 분야별 검색 비율
              </CardDescription>
            </CardHeader>
            <CardContent>
              {categoryData[0]?.name !== '검색 기록 없음' ? (
                <div className="flex flex-col lg:flex-row items-center gap-4">
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                        fontSize={12}
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          color: '#374151'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2">
                    {categoryData.map((category, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: category.color }}
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {category.name} ({category.value})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-[250px] flex items-center justify-center">
                  <div className="text-center">
                    <PieChartIcon className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">검색 분야 데이터가 없습니다</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">다양한 분야의 특허를 검색해보세요!</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 최근 검색 기록 */}
          <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
                <Search className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                최근 검색 기록
              </CardTitle>
            </CardHeader>
            <CardContent>
              {searchHistory.length > 0 ? (
                <div className="space-y-4">
                  {searchHistory.slice(0, 5).map((search, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {search.keyword}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {search.results_count}건 • {new Date(search.created_at).toLocaleDateString('ko-KR')}
                        </p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/50"
                        asChild
                      >
                        <Link to="/search">
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  ))}
                  <Button 
                    variant="outline" 
                    className="w-full border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    asChild
                  >
                    <Link to="/search">새로운 검색</Link>
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Search className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400 mb-4">검색 기록이 없습니다</p>
                  <Button 
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    asChild
                  >
                    <Link to="/search">첫 검색 시작하기</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 빠른 작업 */}
          <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">빠른 작업</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button 
                  className="w-full justify-start bg-blue-600 hover:bg-blue-700 text-white"
                  asChild
                >
                  <Link to="/search">
                    <Search className="mr-2 h-4 w-4" />
                    특허 검색
                  </Link>
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  asChild
                >
                  <Link to="/reports">
                    <FileText className="mr-2 h-4 w-4" />
                    리포트 보기
                  </Link>
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  asChild
                >
                  <Link to="/analysis">
                    <BarChart3 className="mr-2 h-4 w-4" />
                    분석 도구
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 최근 리포트 */}
          <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
                <FileText className="h-5 w-5 text-green-600 dark:text-green-400" />
                최근 리포트
              </CardTitle>
            </CardHeader>
            <CardContent>
              {reports.length > 0 ? (
                <div className="space-y-4">
                  {reports.slice(0, 3).map((report, index) => (
                    <div key={index} className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {report.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={cn(
                              "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                              report.report_type === 'market' 
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300" 
                                : "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300"
                            )}>
                              {report.report_type === 'market' ? '시장분석' : '사업화'}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {new Date(report.created_at).toLocaleDateString('ko-KR')}
                            </span>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-950/50"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button 
                    variant="outline" 
                    className="w-full border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    asChild
                  >
                    <Link to="/reports">모든 리포트 보기</Link>
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400 mb-4">생성된 리포트가 없습니다</p>
                  <Button 
                    className="bg-green-600 hover:bg-green-700 text-white"
                    asChild
                  >
                    <Link to="/search">특허 검색 후 리포트 생성</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 최근 활동 */}
        {recentActivity.length > 0 && (
          <Card className="mt-8 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
                <Activity className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                최근 활동
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-center gap-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    <div className={cn("p-2 rounded-lg", 
                      activity.type === 'search' ? "bg-blue-100 dark:bg-blue-900/50" : "bg-green-100 dark:bg-green-900/50"
                    )}>
                      <activity.icon className={cn("h-4 w-4", activity.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {activity.title}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {activity.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}