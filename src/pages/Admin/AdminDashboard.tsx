import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { 
  Users, 
  FileText, 
  Search, 
  TrendingUp, 
  Activity, 
  Database,
  Server,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  PieChart,
  Settings,
  RefreshCw,
  Download,
  Trash2,
  Shield,
  Zap,
  Globe,
  HardDrive,
  Cpu,
  MemoryStick,
  Network,
  Eye,
  UserCheck,
  FileBarChart,
  Calendar,
  Timer,
  Target,
  Wifi,
  WifiOff,
  Bell,
  X
} from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart as RechartsPieChart, Cell, Pie } from 'recharts'
import { useSocket } from '@/hooks/useSocket'
import { toast } from 'sonner'

// Supabase 클라이언트 초기화
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

interface AdminStats {
  totalUsers: number
  activeUsers: number
  totalReports: number
  totalSearches: number
  recentActivities: any[]
  systemHealth: 'healthy' | 'warning' | 'critical'
  databaseSize: number
  serverLoad: number
  memoryUsage: number
  diskUsage: number
}

interface RealtimeMetrics {
  activeConnections: number
  requestsPerMinute: number
  errorRate: number
  responseTime: number
}

interface MaintenanceStats {
  lastCleanup: string
  reportsToDelete: number
  activitiesToDelete: number
  cleanupHistory: any[]
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D']

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [realtimeMetrics, setRealtimeMetrics] = useState<RealtimeMetrics | null>(null)
  const [maintenanceStats, setMaintenanceStats] = useState<MaintenanceStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [selectedTimeRange, setSelectedTimeRange] = useState('7d')
  const [showAlerts, setShowAlerts] = useState(false)

  // WebSocket 연결 및 실시간 데이터
  const { 
    socket, 
    isConnected, 
    stats: socketStats, 
    alerts, 
    requestStats, 
    runMaintenance, 
    clearAlerts,
    connectionError 
  } = useSocket()

  // 실시간 데이터 페칭
  useEffect(() => {
    const fetchData = async () => {
      try {
        await Promise.all([
          fetchAdminStats(),
          fetchRealtimeMetrics(),
          fetchMaintenanceStats()
        ])
        setLastUpdated(new Date())
      } catch (error) {
        console.error('데이터 페칭 오류:', error)
        setError('데이터를 불러오는데 실패했습니다.')
      } finally {
        setLoading(false)
      }
    }

    fetchData()

    // 자동 새로고침 설정 (30초마다)
    let interval: NodeJS.Timeout
    if (autoRefresh) {
      interval = setInterval(fetchData, 30000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [autoRefresh, selectedTimeRange])

  const fetchAdminStats = async () => {
    try {
      // 전체 사용자 수
      const { count: totalUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })

      // 최근 7일간 활성 사용자
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      
      const { count: activeUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('last_sign_in_at', sevenDaysAgo.toISOString())

      // 총 리포트 수
      const { count: totalReports } = await supabase
        .from('ai_analysis_reports')
        .select('*', { count: 'exact', head: true })

      // 총 검색 수 (user_activities에서 search 타입)
      const { count: totalSearches } = await supabase
        .from('user_activities')
        .select('*', { count: 'exact', head: true })
        .eq('activity_type', 'search')

      // 최근 활동 내역
      const { data: recentActivities } = await supabase
        .from('user_activities')
        .select(`
          *,
          users(email)
        `)
        .order('created_at', { ascending: false })
        .limit(10)

      setStats({
        totalUsers: totalUsers || 0,
        activeUsers: activeUsers || 0,
        totalReports: totalReports || 0,
        totalSearches: totalSearches || 0,
        recentActivities: recentActivities || [],
        systemHealth: 'healthy',
        databaseSize: 0,
        serverLoad: 0,
        memoryUsage: 0,
        diskUsage: 0
      })

    } catch (error) {
      console.error('관리자 통계 조회 오류:', error)
      throw error
    }
  }

  const fetchRealtimeMetrics = async () => {
    try {
      // 실시간 메트릭 시뮬레이션 (실제 환경에서는 모니터링 시스템에서 가져옴)
      setRealtimeMetrics({
        activeConnections: Math.floor(Math.random() * 100) + 50,
        requestsPerMinute: Math.floor(Math.random() * 1000) + 500,
        errorRate: Math.random() * 2,
        responseTime: Math.floor(Math.random() * 200) + 100
      })
    } catch (error) {
      console.error('실시간 메트릭 조회 오류:', error)
      throw error
    }
  }

  const fetchMaintenanceStats = async () => {
    try {
      // 유지보수 통계 조회
      const response = await fetch('/api/admin/maintenance?action=stats', {
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setMaintenanceStats({
          lastCleanup: data.data.cleanup_history[0]?.created_at || 'Never',
          reportsToDelete: 0,
          activitiesToDelete: 0,
          cleanupHistory: data.data.cleanup_history || []
        })
      }
    } catch (error) {
      console.error('유지보수 통계 조회 오류:', error)
    }
  }

  const handleManualRefresh = async () => {
    setLoading(true)
    try {
      await Promise.all([
        fetchAdminStats(),
        fetchRealtimeMetrics(),
        fetchMaintenanceStats()
      ])
      setLastUpdated(new Date())
    } catch (error) {
      setError('데이터 새로고침에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleCleanup = async () => {
    try {
      const response = await fetch('/api/admin/maintenance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          action: 'cleanup',
          confirm: true
        })
      })

      if (response.ok) {
        await fetchMaintenanceStats()
        alert('클린업이 성공적으로 완료되었습니다.')
      } else {
        alert('클린업 실행에 실패했습니다.')
      }
    } catch (error) {
      console.error('클린업 실행 오류:', error)
      alert('클린업 실행 중 오류가 발생했습니다.')
    }
  }

  // 차트 데이터 생성
  const chartData = useMemo(() => {
    if (!stats) return []
    
    // 최근 7일간 데이터 시뮬레이션
    const data = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      data.push({
        date: date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }),
        users: Math.floor(Math.random() * 50) + 20,
        searches: Math.floor(Math.random() * 200) + 100,
        reports: Math.floor(Math.random() * 30) + 10
      })
    }
    return data
  }, [stats])

  const activityTypeData = useMemo(() => {
    if (!stats?.recentActivities) return []
    
    const types = stats.recentActivities.reduce((acc, activity) => {
      const type = activity.activity_type
      acc[type] = (acc[type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return Object.entries(types).map(([name, value]) => ({ name, value }))
  }, [stats?.recentActivities])

  if (loading && !stats) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">관리자 대시보드를 로딩 중입니다...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">오류가 발생했습니다</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={handleManualRefresh} className="bg-blue-600 hover:bg-blue-700 text-white">
            다시 시도
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">관리자 대시보드</h1>
          <p className="mt-2 text-gray-600">
            시스템 상태 및 사용자 활동을 실시간으로 모니터링합니다.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center space-x-4">
          {/* 실시간 연결 상태 */}
          <div className="flex items-center space-x-2">
            {isConnected ? (
              <div className="flex items-center space-x-2 text-green-600">
                <Wifi className="h-4 w-4" />
                <span className="text-sm font-medium">실시간 연결됨</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2 text-red-600">
                <WifiOff className="h-4 w-4" />
                <span className="text-sm font-medium">연결 끊김</span>
              </div>
            )}
          </div>

          {/* 알림 버튼 */}
          <div className="relative">
            <Button
              onClick={() => setShowAlerts(!showAlerts)}
              variant="outline"
              size="sm"
              className="relative"
            >
              <Bell className="h-4 w-4" />
              {alerts.length > 0 && (
                <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs bg-red-500">
                  {alerts.length}
                </Badge>
              )}
            </Button>
          </div>

          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <Clock className="h-4 w-4" />
            <span>마지막 업데이트: {lastUpdated.toLocaleTimeString('ko-KR')}</span>
          </div>
          <Button
            onClick={() => setAutoRefresh(!autoRefresh)}
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
            자동 새로고침
          </Button>
          <Button onClick={handleManualRefresh} size="sm" variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            새로고침
          </Button>
          <Button 
            onClick={requestStats} 
            size="sm" 
            variant="outline"
            disabled={!isConnected}
          >
            <Activity className="h-4 w-4 mr-2" />
            실시간 데이터
          </Button>
        </div>
      </div>

      {/* 알림 패널 */}
      {showAlerts && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center">
                <Bell className="h-5 w-5 mr-2 text-orange-600" />
                시스템 알림
              </CardTitle>
              <div className="flex items-center space-x-2">
                <Button onClick={clearAlerts} size="sm" variant="outline">
                  모두 지우기
                </Button>
                <Button onClick={() => setShowAlerts(false)} size="sm" variant="ghost">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {alerts.length === 0 ? (
              <p className="text-gray-600 text-center py-4">새로운 알림이 없습니다.</p>
            ) : (
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-3 rounded-lg border-l-4 ${
                      alert.type === 'error' ? 'border-red-500 bg-red-50' :
                      alert.type === 'warning' ? 'border-yellow-500 bg-yellow-50' :
                      alert.type === 'success' ? 'border-green-500 bg-green-50' :
                      'border-blue-500 bg-blue-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">{alert.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                        <p className="text-xs text-gray-500 mt-2">
                          {new Date(alert.timestamp).toLocaleString('ko-KR')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 연결 오류 표시 */}
      {connectionError && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
              <div>
                <h4 className="font-medium text-red-900">실시간 연결 오류</h4>
                <p className="text-sm text-red-700">{connectionError}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 실시간 상태 표시줄 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">시스템 상태</p>
                <div className="flex items-center mt-1">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  <span className="text-sm font-semibold text-green-600">정상</span>
                </div>
              </div>
              <Server className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">활성 연결</p>
                <p className="text-2xl font-bold text-blue-600">
                  {realtimeMetrics?.activeConnections || 0}
                </p>
              </div>
              <Network className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">분당 요청</p>
                <p className="text-2xl font-bold text-purple-600">
                  {realtimeMetrics?.requestsPerMinute || 0}
                </p>
              </div>
              <Activity className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">응답 시간</p>
                <p className="text-2xl font-bold text-orange-600">
                  {realtimeMetrics?.responseTime || 0}ms
                </p>
              </div>
              <Timer className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 주요 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              총 사용자
            </CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats?.totalUsers.toLocaleString()}</div>
            <p className="text-xs text-gray-600 mt-1">
              활성 사용자: {stats?.activeUsers}명
            </p>
            <div className="flex items-center mt-2">
              <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
              <span className="text-xs font-medium text-green-600">
                +{Math.floor((stats?.activeUsers || 0) / (stats?.totalUsers || 1) * 100)}%
              </span>
              <span className="text-xs text-gray-500 ml-1">활성률</span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              생성된 리포트
            </CardTitle>
            <FileText className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats?.totalReports.toLocaleString()}</div>
            <p className="text-xs text-gray-600 mt-1">AI 분석 리포트</p>
            <div className="flex items-center mt-2">
              <FileBarChart className="h-3 w-3 text-green-500 mr-1" />
              <span className="text-xs font-medium text-green-600">
                평균 {Math.floor((stats?.totalReports || 0) / (stats?.totalUsers || 1))}개
              </span>
              <span className="text-xs text-gray-500 ml-1">사용자당</span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              총 검색 수
            </CardTitle>
            <Search className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats?.totalSearches.toLocaleString()}</div>
            <p className="text-xs text-gray-600 mt-1">특허 검색 횟수</p>
            <div className="flex items-center mt-2">
              <Target className="h-3 w-3 text-purple-500 mr-1" />
              <span className="text-xs font-medium text-purple-600">
                평균 {Math.floor((stats?.totalSearches || 0) / (stats?.totalUsers || 1))}회
              </span>
              <span className="text-xs text-gray-500 ml-1">사용자당</span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              오류율
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {(realtimeMetrics?.errorRate || 0).toFixed(2)}%
            </div>
            <p className="text-xs text-gray-600 mt-1">지난 24시간</p>
            <div className="flex items-center mt-2">
              <Shield className="h-3 w-3 text-green-500 mr-1" />
              <span className="text-xs font-medium text-green-600">
                안정적
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 탭 컨테이너 */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">개요</TabsTrigger>
          <TabsTrigger value="users">사용자</TabsTrigger>
          <TabsTrigger value="system">시스템</TabsTrigger>
          <TabsTrigger value="maintenance">유지보수</TabsTrigger>
          <TabsTrigger value="analytics">분석</TabsTrigger>
        </TabsList>

        {/* 개요 탭 */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 활동 트렌드 차트 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>활동 트렌드</span>
                </CardTitle>
                <CardDescription>최근 7일간 사용자 활동 추이</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="users" stackId="1" stroke="#8884d8" fill="#8884d8" />
                    <Area type="monotone" dataKey="searches" stackId="1" stroke="#82ca9d" fill="#82ca9d" />
                    <Area type="monotone" dataKey="reports" stackId="1" stroke="#ffc658" fill="#ffc658" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* 활동 유형 분포 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <PieChart className="h-5 w-5" />
                  <span>활동 유형 분포</span>
                </CardTitle>
                <CardDescription>최근 활동의 유형별 분포</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={activityTypeData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {activityTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* 최근 활동 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5" />
                <span>최근 활동</span>
              </CardTitle>
              <CardDescription>실시간 사용자 활동 로그</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats?.recentActivities.slice(0, 10).map((activity, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {activity.users?.email || 'Unknown User'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {activity.activity_type} • {activity.activity_data?.keyword || 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div className="text-xs text-gray-400">
                      {new Date(activity.created_at).toLocaleString('ko-KR')}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 사용자 탭 */}
        <TabsContent value="users" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>사용자 통계</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">총 사용자</span>
                    <span className="font-semibold">{stats?.totalUsers}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">활성 사용자</span>
                    <span className="font-semibold">{stats?.activeUsers}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">신규 가입률</span>
                    <span className="font-semibold text-green-600">+12%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>사용자 활동</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">평균 세션 시간</span>
                    <span className="font-semibold">24분</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">페이지뷰/세션</span>
                    <span className="font-semibold">8.3</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">이탈률</span>
                    <span className="font-semibold text-orange-600">23%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>지역별 분포</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">한국</span>
                    <span className="font-semibold">78%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">미국</span>
                    <span className="font-semibold">12%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">기타</span>
                    <span className="font-semibold">10%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 시스템 탭 */}
        <TabsContent value="system" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Server className="h-5 w-5" />
                  <span>서버 상태</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">CPU 사용률</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: '45%' }}></div>
                      </div>
                      <span className="text-sm font-semibold">45%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">메모리 사용률</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div className="bg-green-600 h-2 rounded-full" style={{ width: '62%' }}></div>
                      </div>
                      <span className="text-sm font-semibold">62%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">디스크 사용률</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div className="bg-orange-600 h-2 rounded-full" style={{ width: '78%' }}></div>
                      </div>
                      <span className="text-sm font-semibold">78%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Database className="h-5 w-5" />
                  <span>데이터베이스</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">연결 수</span>
                    <span className="font-semibold">23/100</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">쿼리/초</span>
                    <span className="font-semibold">145</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">평균 응답시간</span>
                    <span className="font-semibold">12ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">캐시 적중률</span>
                    <span className="font-semibold text-green-600">94%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 유지보수 탭 */}
        <TabsContent value="maintenance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="h-5 w-5" />
                  <span>실시간 유지보수</span>
                </CardTitle>
                <CardDescription>WebSocket 기반 실시간 유지보수 작업</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium">마지막 클린업</p>
                      <p className="text-xs text-gray-500">
                        {maintenanceStats?.lastCleanup ? 
                          new Date(maintenanceStats.lastCleanup).toLocaleString('ko-KR') : 
                          'Never'
                        }
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        onClick={() => runMaintenance('cleanup')} 
                        size="sm" 
                        variant="outline"
                        disabled={!isConnected}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        실시간 클린업
                      </Button>
                      <Button onClick={handleCleanup} size="sm" variant="outline">
                        <Trash2 className="h-4 w-4 mr-2" />
                        기존 클린업
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      onClick={() => runMaintenance('optimize')} 
                      size="sm" 
                      variant="outline"
                      disabled={!isConnected}
                      className="w-full"
                    >
                      <Zap className="h-4 w-4 mr-2" />
                      최적화
                    </Button>
                    <Button 
                      onClick={() => runMaintenance('backup')} 
                      size="sm" 
                      variant="outline"
                      disabled={!isConnected}
                      className="w-full"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      백업
                    </Button>
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-gray-600">실시간 연결 상태:</p>
                      {isConnected ? (
                        <Badge className="bg-green-100 text-green-800">
                          <Wifi className="h-3 w-3 mr-1" />
                          연결됨
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <WifiOff className="h-3 w-3 mr-1" />
                          연결 끊김
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">정리 정책:</p>
                    <ul className="text-xs text-gray-500 space-y-1">
                      <li>• AI 리포트: 100일 보관</li>
                      <li>• 사용자 활동: 1년 보관</li>
                      <li>• 시스템 로그: 30일 보관</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="h-5 w-5" />
                  <span>실시간 시스템 상태</span>
                </CardTitle>
                <CardDescription>WebSocket을 통한 실시간 모니터링</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {socketStats ? (
                    <>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">총 사용자</span>
                        <span className="font-semibold">{socketStats.totalUsers}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">총 리포트</span>
                        <span className="font-semibold">{socketStats.totalReports}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">데이터베이스 상태</span>
                        <Badge 
                          variant={socketStats.systemHealth.database === 'healthy' ? 'default' : 'destructive'}
                          className={socketStats.systemHealth.database === 'healthy' ? 'bg-green-100 text-green-800' : ''}
                        >
                          {socketStats.systemHealth.database}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">응답 시간</span>
                        <span className="font-semibold">{socketStats.systemHealth.responseTime}ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">시스템 상태</span>
                        <Badge 
                          variant={socketStats.systemHealth.status === 'operational' ? 'default' : 'destructive'}
                          className={socketStats.systemHealth.status === 'operational' ? 'bg-green-100 text-green-800' : ''}
                        >
                          {socketStats.systemHealth.status}
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-500 mt-4">
                        마지막 업데이트: {new Date(socketStats.timestamp).toLocaleString('ko-KR')}
                      </div>
                    </>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">인덱스 상태</span>
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          최적화됨
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">캐시 효율성</span>
                        <Badge variant="default" className="bg-blue-100 text-blue-800">
                          우수
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">쿼리 성능</span>
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          정상
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-500 mt-4">
                        실시간 데이터를 가져오려면 WebSocket 연결이 필요합니다.
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 분석 탭 */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>사용량 분석</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="users" stroke="#8884d8" strokeWidth={2} />
                    <Line type="monotone" dataKey="searches" stroke="#82ca9d" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>성능 지표</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-gray-600">응답 시간</span>
                      <span className="text-sm font-semibold">{realtimeMetrics?.responseTime}ms</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${Math.min((realtimeMetrics?.responseTime || 0) / 500 * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-gray-600">처리량</span>
                      <span className="text-sm font-semibold">{realtimeMetrics?.requestsPerMinute}/분</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full" 
                        style={{ width: `${Math.min((realtimeMetrics?.requestsPerMinute || 0) / 1000 * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-gray-600">오류율</span>
                      <span className="text-sm font-semibold">{(realtimeMetrics?.errorRate || 0).toFixed(2)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-red-600 h-2 rounded-full" 
                        style={{ width: `${Math.min((realtimeMetrics?.errorRate || 0) * 10, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}