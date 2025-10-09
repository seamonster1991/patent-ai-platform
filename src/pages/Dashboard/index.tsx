import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Card, Title, Text, Metric, DonutChart, LineChart, Badge, ProgressBar, Grid, Button } from '@tremor/react'
import { 
  ChartBarIcon, 
  DocumentTextIcon, 
  MagnifyingGlassIcon, 
  UserIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CalendarIcon,

} from '@heroicons/react/24/outline'
import { useAuthStore } from '@/store/authStore'
import { activityTracker } from '@/lib/activityTracker'
import { getDashboardStats } from '@/lib/api'
import { KPICard, QuotaCard, ActivityFeed, QuickActions } from '@/components/Dashboard'
import { toast } from 'sonner'
import { exportToCsv } from '@/utils/export'

// Import new enhanced analytics components
import TrendChart from '@/components/Charts/TrendChart'
import EfficiencyMetrics from '@/components/Charts/EfficiencyMetrics'
import TechnologyFieldChart from '@/components/Charts/TechnologyFieldChart'
// MarketComparisonChart는 요청에 따라 제거
import RecentActivity from '@/components/Charts/RecentActivity'

// Types
interface DashboardStats {
  quotaStatus: {
    currentUsage: number
    maxQuota: number
    usagePercentage: number
    remainingQuota: number
    searches?: {
      current: number
      total: number
    }
    reports?: {
      current: number
      total: number
    }
    credits?: {
      current: number
      total: number
    }
  }
  efficiencyMetrics: {
    loginEfficiency: {
      value: number
      status: string
      totalLogins: number
      reportsGenerated: number
    }
    searchConversion: {
      value: number
      status: string
      totalSearches: number
      reportsGenerated: number
    }
    loginToReportRate?: number
    searchToReportRate?: number
    monthlyReports?: number
    monthlySearches?: number
  }
  subscriptionPlan?: string
  recentActivities: Array<{
    id: string
    type: 'report' | 'search'
    title: string
    description?: string
    timestamp: string
    metadata?: {
      reportType?: string
      searchQuery?: string
    }
  }>
  technologyFields: Array<{
    field: string
    count: number
    percentage: number
  }>
  // Enhanced analytics data
  searchTrends: {
    userDaily: Array<{ date: string; count: number }>
    marketDaily: Array<{ date: string; count: number }>
  }
  reportTrends: {
    userDaily: Array<{ date: string; count: number }>
    marketDaily: Array<{ date: string; count: number }>
  }
  searchFields: {
    user: Array<{ field: string; ipc_code: string; search_count: number; percentage: number }>
    market: Array<{ field: string; ipc_code: string; search_count: number; percentage: number }>
  }
  reportFields: {
    user: Array<{ field: string; ipc_code: string; report_count: number; percentage: number }>
    market: Array<{ field: string; ipc_code: string; report_count: number; percentage: number }>
  }
  recentReports: Array<{
    id: string
    title: string
    report_type: string
    status: string
    created_at: string
    technology_fields?: string[]
  }>
  recentSearches: Array<{
    keyword: string
    search_count: number
    last_searched: string
    ipc_class?: string
    cpc_class?: string
  }>
}

interface MarketTrendData {
  date: string
  myActivity: number
  industryAverage: number
  topPerformers: number
}

export default function Dashboard() {
  const { user, profile, loading: authLoading, initialized } = useAuthStore()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)

  // 대시보드 컴포넌트 로드 확인
  console.log('🎯 [대시보드] 컴포넌트 렌더링:', {
    user: user ? { id: user.id, email: user.email } : null,
    authLoading,
    initialized,
    loading,
    error,
    authError,
    statsLoaded: !!stats
  })

  

  // 사용자 행동 로깅: 대시보드 진입
  useEffect(() => {
    if (user?.id) {
      activityTracker.setUserId(user.id)
      activityTracker.trackDashboardView('main')
    }
  }, [user?.id])
  
  // 3개월(90일) 일별 데이터 및 요약 지표 계산
  const dailySearches: Array<{ date: string; count: number }> = stats?.searchTrends?.userDaily || []
  const dailyReports: Array<{ date: string; count: number }> = stats?.reportTrends?.userDaily || []

  const searchesChartData = useMemo(() => (
    dailySearches.map(d => ({ date: d.date, '검색 건수': d.count }))
  ), [dailySearches])

  const reportsChartData = useMemo(() => (
    dailyReports.map(d => ({ date: d.date, '리포트 건수': d.count }))
  ), [dailyReports])

  const threeMonthAvgSearch = useMemo(() => {
    if (!dailySearches.length) return 0
    const total = dailySearches.reduce((sum, d) => sum + (d.count || 0), 0)
    return Math.round(total / 3)
  }, [dailySearches])

  const lastMonthSearch = useMemo(() => {
    if (!dailySearches.length) return 0
    const last30 = dailySearches.slice(Math.max(0, dailySearches.length - 30))
    return last30.reduce((sum, d) => sum + (d.count || 0), 0)
  }, [dailySearches])

  const threeMonthAvgReport = useMemo(() => {
    if (!dailyReports.length) return 0
    const total = dailyReports.reduce((sum, d) => sum + (d.count || 0), 0)
    return Math.round(total / 3)
  }, [dailyReports])

  const lastMonthReport = useMemo(() => {
    if (!dailyReports.length) return 0
    const last30 = dailyReports.slice(Math.max(0, dailyReports.length - 30))
    return last30.reduce((sum, d) => sum + (d.count || 0), 0)
  }, [dailyReports])
  

  
  // API 응답을 대시보드 내에서 사용하는 camelCase 구조로 정규화
  const normalizeDashboardStats = (apiData: any): DashboardStats => {
    console.log('🔍 [Dashboard] API 데이터 정규화 시작:', apiData)
    
    const quota = apiData?.quota_status || {}
    const eff = apiData?.efficiency_metrics || {}
    // API에서 recent_activities는 {reports: [], searches: []} 형태로 반환됨
    const recentActivitiesData = apiData?.recent_activities || {}
    const reportsArray = Array.isArray(recentActivitiesData.reports) ? recentActivitiesData.reports : []
    const searchesArray = Array.isArray(recentActivitiesData.searches) ? recentActivitiesData.searches : []

    // 리포트 데이터 처리
    const recentReports = reportsArray.map((r: any, idx: number) => ({
      id: r.id || `report-${idx}`,
      type: 'report' as const,
      title: r.title || r.invention_title || '리포트',
      description: r.invention_title || r.description || undefined,
      timestamp: r.timestamp || r.created_at || new Date().toISOString(),
      metadata: { reportType: r.analysis_type || undefined }
    }))

    // 검색 데이터 처리
    let recentSearches = searchesArray.map((s: any, idx: number) => {
      const searchQuery = s.query || s.keyword || '검색'
      return {
        id: s.id || `search-${idx}`,
        type: 'search' as const,
        title: searchQuery,
        description: `검색어: ${searchQuery}`,
        timestamp: s.timestamp || s.created_at || new Date().toISOString(),
        metadata: { searchQuery }
      }
    })

    // 동일 검색어 중복 제거 및 최대 5개로 제한
    if (recentSearches.length > 0) {
      const seen = new Set<string>()
      recentSearches = recentSearches.filter((item) => {
        const key = (item.metadata?.searchQuery || '').trim().toLowerCase()
        if (seen.has(key)) return false
        seen.add(key)
        return true
      }).slice(0, 5)
    }

    // search_fields_top10과 report_fields_top10을 technologyFields로 변환
    const searchFields = Array.isArray(apiData?.search_fields_top10) ? apiData.search_fields_top10 : []
    const reportFields = Array.isArray(apiData?.report_fields_top10) ? apiData.report_fields_top10 : []
    
    console.log('🔍 [API 데이터] search_fields_top10:', searchFields)
    console.log('🔍 [API 데이터] report_fields_top10:', reportFields)
    
    // 검색 분야와 리포트 분야를 합쳐서 기술 분야 생성
    const combinedFields = [...searchFields, ...reportFields]
    const fieldMap = new Map()
    
    combinedFields.forEach((item: any) => {
      const field = item.field || item.name || '기타'
      const count = item.search_count || item.report_count || item.count || 0
      if (fieldMap.has(field)) {
        fieldMap.set(field, fieldMap.get(field) + count)
      } else {
        fieldMap.set(field, count)
      }
    })
    
    // 만약 API에서 기술 분야 데이터가 없다면, 리포트 제목에서 추출해서 기본 데이터 생성
    if (combinedFields.length === 0 && recentReports.length > 0) {
      // 리포트 제목에서 기술 분야 키워드 추출
      const techKeywords = ['AI', '의료', '진단', '반도체', '기술', '특허', '분석', '시장']
      recentReports.forEach((report) => {
        const title = report.title || ''
        techKeywords.forEach((keyword) => {
          if (title.includes(keyword)) {
            const currentCount = fieldMap.get(keyword) || 0
            fieldMap.set(keyword, currentCount + 1)
          }
        })
      })
    }
    
    const totalCount = Array.from(fieldMap.values()).reduce((sum, count) => sum + count, 0)
    const technologyFields = Array.from(fieldMap.entries()).map(([field, count]) => ({
      field,
      count,
      percentage: totalCount > 0 ? Math.round((count / totalCount) * 100) : 0
    }))

    console.log('🔍 [대시보드] 정규화된 데이터:', {
      recentReports: recentReports.length,
      recentSearches: recentSearches.length,
      technologyFields: technologyFields.length,
      searchFields: searchFields.length,
      reportFields: reportFields.length,
      efficiencyMetrics: eff
    })

    return {
      quotaStatus: {
        currentUsage: quota?.current_usage || 0,
        maxQuota: quota?.max_quota || 100,
        usagePercentage: quota?.usage_percentage || 0,
        remainingQuota: quota?.remaining_quota || 100
      },
      efficiencyMetrics: (() => {
        // API 응답의 실제 필드명 사용
        const totalLogins = eff?.total_logins || 0
        const totalSearches = eff?.total_searches || 0
        const totalReports = eff?.total_reports || 0
        const periodReports = eff?.period_reports || 0
        
        // API에서 이미 계산된 비율 사용 (있는 경우), 없으면 직접 계산
        const loginEfficiency = eff?.login_to_report_rate || (totalLogins > 0 ? (totalReports / totalLogins) * 100 : 0)
        const searchConversion = eff?.search_to_report_rate || (totalSearches > 0 ? (totalReports / totalSearches) * 100 : 0)
        
        const getEfficiencyStatus = (value: number) => {
          if (value >= 50) return 'excellent'
          if (value >= 25) return 'good'
          return 'improvement_needed'
        }

        console.log('🔍 [효율성 지표] 계산 결과:', {
          totalLogins,
          totalSearches,
          totalReports,
          periodReports,
          loginEfficiency,
          searchConversion,
          apiLoginRate: eff?.login_to_report_rate,
          apiSearchRate: eff?.search_to_report_rate
        })

        return {
          loginEfficiency: {
            value: Math.round(loginEfficiency * 10) / 10, // 소수점 1자리
            status: getEfficiencyStatus(loginEfficiency),
            totalLogins,
            reportsGenerated: totalReports
          },
          searchConversion: {
            value: Math.round(searchConversion * 10) / 10, // 소수점 1자리
            status: getEfficiencyStatus(searchConversion),
            totalSearches,
            reportsGenerated: totalReports
          }
        }
      })(),
      subscriptionPlan: quota?.subscription_plan || '정기 구독',
      recentActivities: [...recentReports, ...recentSearches].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
      technologyFields,
      // Enhanced analytics data - API 응답 구조에 맞게 수정
      searchTrends: {
        userDaily: Array.isArray(apiData?.daily_searches) ? apiData.daily_searches : [],
        marketDaily: Array.isArray(apiData?.market_daily_searches) ? apiData.market_daily_searches : []
      },
      reportTrends: {
        userDaily: Array.isArray(apiData?.daily_reports) ? apiData.daily_reports : [],
        marketDaily: Array.isArray(apiData?.market_daily_reports) ? apiData.market_daily_reports : []
      },
      searchFields: {
        user: (() => {
          console.log('🔍 [검색 분야] 원본 데이터:', searchFields);
          if (!Array.isArray(searchFields) || searchFields.length === 0) {
            console.log('⚠️ [검색 분야] 데이터가 없습니다');
            return [];
          }
          const totalSearches = searchFields.reduce((sum: number, item: any) => sum + (item.search_count || item.count || 0), 0);
          const result = searchFields.map((item: any) => ({
            field: item.field || '기타',
            ipc_code: item.ipc_code || '',
            search_count: item.search_count || item.count || 0,
            percentage: item.percentage || (totalSearches > 0 ? Math.round((item.search_count || item.count || 0) / totalSearches * 100) : 0)
          }));
          console.log('✅ [검색 분야] 처리된 데이터:', result);
          return result;
        })(),
        market: Array.isArray(apiData?.market_search_fields_top10) ? (() => {
          const marketSearchFields = apiData.market_search_fields_top10;
          console.log('🔍 [시장 검색 분야] 원본 데이터:', marketSearchFields);
          const totalMarketSearches = marketSearchFields.reduce((sum: number, item: any) => sum + (item.count || 0), 0);
          const result = marketSearchFields.map((item: any) => ({
            field: item.field || '기타',
            ipc_code: item.ipc_code || '',
            search_count: item.count || 0,
            percentage: totalMarketSearches > 0 ? Math.round((item.count || 0) / totalMarketSearches * 100) : 0
          }));
          console.log('✅ [시장 검색 분야] 처리된 데이터:', result);
          return result;
        })() : []
      },
      reportFields: {
        user: (() => {
          console.log('🔍 [리포트 분야] 원본 데이터:', reportFields);
          if (!Array.isArray(reportFields) || reportFields.length === 0) {
            console.log('⚠️ [리포트 분야] 데이터가 없습니다');
            return [];
          }
          const totalReports = reportFields.reduce((sum: number, item: any) => sum + (item.report_count || item.count || 0), 0);
          const result = reportFields.map((item: any) => ({
            field: item.field || '기타',
            ipc_code: item.ipc_code || '',
            report_count: item.report_count || item.count || 0,
            percentage: item.percentage || (totalReports > 0 ? Math.round((item.report_count || item.count || 0) / totalReports * 100) : 0)
          }));
          console.log('✅ [리포트 분야] 처리된 데이터:', result);
          return result;
        })(),
        market: Array.isArray(apiData?.market_report_fields_top10) ? (() => {
          const marketReportFields = apiData.market_report_fields_top10;
          console.log('🔍 [시장 리포트 분야] 원본 데이터:', marketReportFields);
          const totalMarketReports = marketReportFields.reduce((sum: number, item: any) => sum + (item.count || 0), 0);
          const result = marketReportFields.map((item: any) => ({
            field: item.field || '기타',
            ipc_code: item.ipc_code || '',
            report_count: item.count || 0,
            percentage: totalMarketReports > 0 ? Math.round((item.count || 0) / totalMarketReports * 100) : 0
          }));
          console.log('✅ [시장 리포트 분야] 처리된 데이터:', result);
          return result;
        })() : []
      },
      recentReports: (() => {
        console.log('🔍 [최근 리포트] 원본 데이터:', recentReports);
        const result = recentReports.map(r => ({
          id: r.id,
          title: r.title,
          report_type: r.metadata?.reportType || r.analysis_type || 'analysis',
          status: 'completed',
          created_at: r.timestamp,
          technology_fields: []
        }));
        console.log('✅ [최근 리포트] 처리된 데이터:', result);
        return result;
      })(),
      recentSearches: (() => {
        console.log('🔍 [최근 검색] 원본 데이터:', recentSearches);
        const result = recentSearches.map(s => ({
          keyword: s.title,
          search_count: s.activity_data?.results_count || 1,
          last_searched: s.timestamp,
          ipc_class: '',
          cpc_class: ''
        }));
        console.log('✅ [최근 검색] 처리된 데이터:', result);
        return result;
      })()
    }
  }
  
  const exportDashboardToCSV = () => {
    if (!stats) {
      toast.error('내보낼 데이터가 없습니다.')
      return
    }
    
    const rows: string[] = []
    const push = (cols: (string | number | null | undefined)[]) => {
      rows.push(cols.map(v => (v === null || v === undefined ? '' : String(v).replace(/,/g, ' '))).join(','))
    }
    
    // Header
    push(['섹션', '지표', '값'])
    
    // Quota
    if (stats.quotaStatus.searches) {
      push(['할당량', '월간 검색 현재/전체', `${stats.quotaStatus.searches.current}/${stats.quotaStatus.searches.total}`])
    }
    if (stats.quotaStatus.reports) {
      push(['할당량', '월간 리포트 현재/전체', `${stats.quotaStatus.reports.current}/${stats.quotaStatus.reports.total}`])
    }
    if (stats.quotaStatus.credits) {
      push(['할당량', '보유 크레딧 현재/전체', `${stats.quotaStatus.credits.current}/${stats.quotaStatus.credits.total}`])
    }

    // Efficiency
    if (stats.efficiencyMetrics.loginToReportRate !== undefined) {
      push(['효율성', '로그인→리포트 전환율', `${stats.efficiencyMetrics.loginToReportRate}%`])
    }
    if (stats.efficiencyMetrics.searchToReportRate !== undefined) {
      push(['효율성', '검색→리포트 전환율', `${stats.efficiencyMetrics.searchToReportRate}%`])
    }
    if (stats.efficiencyMetrics.monthlyReports !== undefined) {
      push(['효율성', '월간 리포트', stats.efficiencyMetrics.monthlyReports])
    }
    if (stats.efficiencyMetrics.monthlySearches !== undefined) {
      push(['효율성', '월간 검색', stats.efficiencyMetrics.monthlySearches])
    }
    
    // Recent Activities (top 5)
    rows.push('')
    push(['최근 활동', '제목', '타입/시간'])
    stats.recentActivities.slice(0,5).forEach(a => push(['최근 활동', a.title, `${a.type}/${a.timestamp}`]))
    
    // Technology Fields (top 5)
    rows.push('')
    push(['기술 분야', '분야', '건수/비율'])
    stats.technologyFields.slice(0,5).forEach(t => push(['기술 분야', t.field, `${t.count}/${t.percentage}%`]))

    const csv = rows.join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `대시보드_내보내기_${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('대시보드 데이터를 CSV로 내보냈습니다.')
  }

  // 인증 상태 확인 및 토큰 유효성 검증
  useEffect(() => {
    const checkAuthStatus = async () => {
      if (!initialized) {
        console.log('🔍 [대시보드] 인증 상태 초기화 대기 중...')
        return
      }

      if (authLoading) {
        console.log('🔍 [대시보드] 인증 로딩 중...')
        return
      }

      if (!user) {
        console.warn('🚫 [대시보드] 사용자가 로그인하지 않음')
        setAuthError('로그인이 필요합니다.')
        setLoading(false)
        return
      }

      // 토큰 유효성 확인
      const token = localStorage.getItem('token')
      if (!token) {
        console.warn('🚫 [대시보드] 인증 토큰이 없음')
        setAuthError('인증 토큰이 없습니다. 다시 로그인해주세요.')
        setLoading(false)
        return
      }

      console.log('✅ [대시보드] 인증 상태 확인 완료:', { userId: user.id, email: user.email })
      setAuthError(null)
    }

    checkAuthStatus()
  }, [user, authLoading, initialized])

  useEffect(() => {
    // 인증 오류가 있거나 사용자가 없으면 데이터 로딩하지 않음
    if (authError || !user || !initialized || authLoading) {
      return
    }

    console.log('🚀 [대시보드] 데이터 로딩 시작')
    
    const fetchDashboardStats = async () => {
      const userId = user.id;
      
      console.log('🔍 [대시보드] fetchDashboardStats 시작:', { userId, email: user.email })
      
      setLoading(true)
      setError(null)
      
      try {
        // 토큰 재확인
        const token = localStorage.getItem('token')
        if (!token) {
          throw new Error('인증 토큰이 없습니다.')
        }

        console.log('📡 [대시보드] API 호출 시작...')
        const response = await getDashboardStats(userId, '90d')
        
        console.log('🔍 [대시보드] API 응답:', response)
        console.log('🔍 [대시보드] API 응답 데이터 상세:', JSON.stringify(response.data, null, 2))
        
        if (response.success && response.data) {
          const normalized = normalizeDashboardStats(response.data)
          setStats(normalized)
          console.log('✅ [대시보드] 데이터 로딩 성공')
        } else {
          // 인증 관련 오류 처리
          if (response.errorCode === 'AUTH_EXPIRED' || response.status === 401) {
            setAuthError('인증이 만료되었습니다. 다시 로그인해주세요.')
            return
          }
          
          console.warn('⚠️ [대시보드] API 실패:', response.error)
          setError(response.error || '대시보드 데이터를 불러올 수 없습니다.')
          toast.warning('대시보드 데이터를 불러올 수 없습니다.')
        }

      } catch (error: any) {
        console.error('❌ [대시보드] 데이터 로딩 오류:', error)
        
        // 인증 관련 오류 처리
        if (error.message?.includes('인증') || error.message?.includes('토큰')) {
          setAuthError(error.message)
        } else {
          setError('대시보드 데이터를 불러오는데 실패했습니다.')
          toast.error('대시보드 데이터를 불러오는데 실패했습니다.')
        }
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardStats()

    // Listen for dashboard refresh events
    const handleDashboardRefresh = () => {
      console.log('🔄 [대시보드] dashboardRefresh 이벤트 수신됨')
      if (user && !authError) {
        fetchDashboardStats()
      }
    }

    // Listen for report generated events
    const handleReportGenerated = (event: any) => {
      console.log('📊 [대시보드] reportGenerated 이벤트 수신됨:', event.detail)
      if (user && !authError) {
        fetchDashboardStats()
      }
    }

    // Listen for search events
    const handleSearchCompleted = (event: any) => {
      console.log('🔍 [대시보드] searchCompleted 이벤트 수신됨:', event.detail)
      if (user && !authError) {
        fetchDashboardStats()
      }
    }

    // 이벤트명 통일: camelCase('dashboardRefresh')로 수신
    window.addEventListener('dashboardRefresh', handleDashboardRefresh)
    window.addEventListener('reportGenerated', handleReportGenerated)
    window.addEventListener('searchCompleted', handleSearchCompleted)
    
    return () => {
      window.removeEventListener('dashboardRefresh', handleDashboardRefresh)
      window.removeEventListener('reportGenerated', handleReportGenerated)
      window.removeEventListener('searchCompleted', handleSearchCompleted)
    }
  }, [user, authError, initialized, authLoading])

  // 인증 상태 로딩 중
  if (authLoading || !initialized) {
    return (
      <div className="min-h-screen bg-ms-soft flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ms-olive mx-auto mb-4"></div>
          <Text>인증 상태 확인 중...</Text>
        </div>
      </div>
    )
  }

  // 인증 오류 (로그인 필요)
  if (authError) {
    return (
      <div className="min-h-screen bg-ms-soft flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ExclamationTriangleIcon className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">인증이 필요합니다</h2>
          <Text className="text-gray-600 mb-6">{authError}</Text>
          <div className="space-y-3">
            <Link 
              to="/login" 
              className="block w-full bg-ms-olive hover:bg-ms-olive/90 text-white px-6 py-3 rounded-lg transition-colors font-medium"
            >
              로그인하기
            </Link>
            <button 
              onClick={() => window.location.reload()} 
              className="block w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-lg transition-colors"
            >
              새로고침
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 데이터 로딩 중
  if (loading) {
    return (
      <div className="min-h-screen bg-ms-soft flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ms-olive mx-auto mb-4"></div>
          <Text>대시보드를 불러오는 중...</Text>
        </div>
      </div>
    )
  }

  // 데이터 로딩 오류
  if (error) {
    return (
      <div className="min-h-screen bg-ms-soft flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ExclamationTriangleIcon className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">데이터 로딩 실패</h2>
          <Text className="text-gray-600 mb-6">{error}</Text>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-ms-olive hover:bg-ms-olive/90 text-white px-6 py-3 rounded-lg transition-colors font-medium"
          >
            다시 시도
          </button>
        </div>
      </div>
    )
  }

  // 데이터가 없는 경우 빈 상태 표시
  if (!stats) {
    return (
      <div className="min-h-screen bg-ms-soft flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <Text className="text-gray-600 mb-4">표시할 대시보드 데이터가 없습니다.</Text>
          <Text className="text-gray-500 text-sm">검색이나 리포트 생성을 시작해보세요.</Text>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Minimal Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {profile?.name ?? '사용자'}님의 대시보드
              </h1>
              <Text className="text-gray-500 text-sm mt-1">
                {new Date().toLocaleDateString('ko-KR', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </Text>
            </div>
            <Badge color="blue" size="sm" className="bg-blue-50 text-blue-700 border-blue-200">
              <UserIcon className="h-3 w-3 mr-1" />
              {stats?.subscriptionPlan === 'Pro' ? 'Pro' : 'Free'}
            </Badge>
          </div>
        </div>

        {/* Analytics Dashboard */}
        <div className="space-y-6">
          {/* 1. Search and Report Trends */}
          <Grid numItems={1} numItemsLg={2} className="gap-6">
            <TrendChart
              title="검색 추이"
              description="최근 30일간 검색 활동"
              data={stats?.searchTrends.userDaily || []}
              marketData={stats?.searchTrends.marketDaily || []}
              dataKey="count"
              dataLabel="검색 건수"
              marketLabel="시장 평균"
              color="#3B82F6"
              marketColor="#10B981"
            />
            <TrendChart
              title="리포트 추이"
              description="최근 30일간 리포트 생성"
              data={stats?.reportTrends.userDaily || []}
              marketData={stats?.reportTrends.marketDaily || []}
              dataKey="count"
              dataLabel="리포트 건수"
              marketLabel="시장 평균"
              color="#8B5CF6"
              marketColor="#F59E0B"
            />
          </Grid>

          {/* 2. Efficiency Metrics */}
          <EfficiencyMetrics
            efficiencyMetrics={stats?.efficiencyMetrics || {
              loginEfficiency: { value: 0, status: 'improvement_needed', totalLogins: 0, reportsGenerated: 0 },
              searchConversion: { value: 0, status: 'improvement_needed', totalSearches: 0, reportsGenerated: 0 }
            }}
          />

          {/* 3. Technology Field Analysis - Search */}
          <TechnologyFieldChart
            title="검색 IPC/CPC 분석"
            description="사용자 vs 전체 사용자 검색 기술 분야 비교"
            userFields={stats?.searchFields.user || []}
            marketFields={stats?.searchFields.market || []}
            type="search"
          />

          {/* 4. Market Comparison - Search Count (요청에 따라 제거) */}

          {/* 5. Technology Field Analysis - Report */}
          <TechnologyFieldChart
            title="리포트 IPC/CPC 분석"
            description="사용자 vs 전체 사용자 리포트 기술 분야 비교"
            userFields={stats?.reportFields.user || []}
            marketFields={stats?.reportFields.market || []}
            type="report"
          />

          {/* 6. Market Comparison - Report Count (요청에 따라 제거) */}

          {/* 7. Recent Activity (Reports and Searches) */}
          <RecentActivity
            recentActivities={stats?.recentActivities || []}
          />
        </div>
      </div>
    </div>
  )
}