import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  Search, 
  FileText, 
  TrendingUp, 
  Clock, 
  BarChart3, 
  Users, 
  Calendar,
  Download,
  Eye,
  Plus
} from 'lucide-react'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import Layout from '../components/Layout/Layout'
import Button from '../components/UI/Button'
import Card, { CardContent, CardHeader, CardTitle } from '../components/UI/Card'
import Loading from '../components/UI/Loading'
import { useAuthStore } from '../store/authStore'
import { useSearchStore } from '../store/searchStore'
import { formatDate, formatDateTime } from '../lib/utils'

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

  // Mock data for charts
  const searchTrendData = [
    { month: '1월', searches: 45 },
    { month: '2월', searches: 52 },
    { month: '3월', searches: 48 },
    { month: '4월', searches: 61 },
    { month: '5월', searches: 55 },
    { month: '6월', searches: 67 }
  ]

  const categoryData = [
    { name: 'AI/머신러닝', value: 35, color: '#3b82f6' },
    { name: '블록체인', value: 25, color: '#10b981' },
    { name: 'IoT', value: 20, color: '#f59e0b' },
    { name: '바이오', value: 15, color: '#ef4444' },
    { name: '기타', value: 5, color: '#8b5cf6' }
  ]

  const recentActivity = [
    { type: 'search', title: '인공지능 관련 특허 검색', time: '2시간 전' },
    { type: 'report', title: '블록체인 기술 시장 분석 리포트 생성', time: '5시간 전' },
    { type: 'search', title: 'IoT 센서 기술 검색', time: '1일 전' },
    { type: 'report', title: '자율주행 기술 사업화 가능성 분석', time: '2일 전' }
  ]

  const stats = [
    {
      title: '총 검색 횟수',
      value: searchHistory.length || 127,
      icon: Search,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10'
    },
    {
      title: '생성된 리포트',
      value: reports.length || 23,
      icon: FileText,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10'
    },
    {
      title: '이번 달 활동',
      value: 45,
      icon: TrendingUp,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10'
    },
    {
      title: '저장된 특허',
      value: 89,
      icon: Clock,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10'
    }
  ]

  if (loading) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-center py-12">
            <Loading size="lg" text="대시보드를 불러오는 중..." />
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            안녕하세요, {profile?.name || user?.email}님!
          </h1>
          <p className="text-slate-400">
            IP-Insight AI 대시보드에서 특허 분석 활동을 확인하세요
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400 mb-1">{stat.title}</p>
                    <p className="text-2xl font-bold text-white">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Search Trend Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2 text-blue-400" />
                  월별 검색 동향
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={searchTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="month" stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1f2937', 
                        border: '1px solid #374151',
                        borderRadius: '8px'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="searches" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Category Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="w-5 h-5 mr-2 text-green-400" />
                  검색 분야 분포
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col lg:flex-row items-center">
                  <div className="w-full lg:w-1/2">
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={categoryData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {categoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#1f2937', 
                            border: '1px solid #374151',
                            borderRadius: '8px'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="w-full lg:w-1/2 space-y-3">
                    {categoryData.map((item, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div 
                            className="w-3 h-3 rounded-full mr-3"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="text-slate-300">{item.name}</span>
                        </div>
                        <span className="text-white font-medium">{item.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Search History */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center">
                    <Clock className="w-5 h-5 mr-2 text-purple-400" />
                    최근 검색 기록
                  </CardTitle>
                  <Link to="/search">
                    <Button variant="outline" size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      새 검색
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {searchHistory.length > 0 ? (
                  <div className="space-y-3">
                    {searchHistory.slice(0, 5).map((search, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                        <div>
                          <h4 className="text-white font-medium">{search.keyword}</h4>
                          <p className="text-sm text-slate-400">
                            {search.results_count}개 결과 • {formatDateTime(search.created_at)}
                          </p>
                        </div>
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Search className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400">아직 검색 기록이 없습니다</p>
                    <Link to="/search">
                      <Button className="mt-4">첫 검색 시작하기</Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>빠른 작업</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link to="/search">
                  <Button className="w-full">
                    <Search className="w-4 h-4 mr-2" />
                    특허 검색
                  </Button>
                </Link>
                <Button variant="outline" className="w-full">
                  <FileText className="w-4 h-4 mr-2" />
                  리포트 보기
                </Button>
                <Button variant="outline" className="w-full">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  분석 도구
                </Button>
              </CardContent>
            </Card>

            {/* Recent Reports */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-green-400" />
                  최근 리포트
                </CardTitle>
              </CardHeader>
              <CardContent>
                {reports.length > 0 ? (
                  <div className="space-y-3">
                    {reports.slice(0, 3).map((report, index) => (
                      <div key={index} className="p-3 bg-slate-700 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-xs px-2 py-1 rounded ${
                            report.report_type === 'market' 
                              ? 'bg-blue-500/20 text-blue-400' 
                              : 'bg-green-500/20 text-green-400'
                          }`}>
                            {report.report_type === 'market' ? '시장 분석' : '사업화 분석'}
                          </span>
                          <Button variant="ghost" size="sm">
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                        <h4 className="text-sm font-medium text-white mb-1">
                          {report.title}
                        </h4>
                        <p className="text-xs text-slate-400">
                          {formatDate(report.created_at)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <FileText className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">생성된 리포트가 없습니다</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="w-5 h-5 mr-2 text-yellow-400" />
                  최근 활동
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <div className={`p-1.5 rounded-full ${
                        activity.type === 'search' 
                          ? 'bg-blue-500/20' 
                          : 'bg-green-500/20'
                      }`}>
                        {activity.type === 'search' ? (
                          <Search className="w-3 h-3 text-blue-400" />
                        ) : (
                          <FileText className="w-3 h-3 text-green-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-white">{activity.title}</p>
                        <p className="text-xs text-slate-400">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  )
}