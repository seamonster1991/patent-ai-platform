import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

// 시스템 메트릭 인터페이스
export interface SystemMetrics {
  llmCost: number
  llmUsage: number
  cachingHitRate: number
  estimatedSavings: number
  apiLatency: number
  errorRate: number
  systemHealth: 'healthy' | 'warning' | 'critical'
}

// 사용자 통계 인터페이스
export interface UserStats {
  totalUsers: number
  activeUsers: number
  newSignups: number
  premiumUsers: number
  freeUsers: number
}

// 수익 메트릭 인터페이스
export interface RevenueMetrics {
  mrr: number
  churnRate: number
  arr: number
  totalRevenue: number
  avgRevenuePerUser: number
}

// 검색 키워드 인터페이스
export interface SearchKeyword {
  keyword: string
  count: number
  growthRate: number
}

// 기술 분포 인터페이스
export interface TechDistribution {
  category: string
  count: number
  percentage: number
}

// 인기 특허 인터페이스
export interface TopPatent {
  applicationNumber: string
  title: string
  applicant: string
  analysisCount: number
}

// 관리자 사용자 인터페이스
export interface AdminUser {
  id: string
  email: string
  name: string
  subscriptionPlan: 'free' | 'premium'
  lastLogin: string
  totalReports: number
  status: 'active' | 'inactive'
}

// 결제 위험 인터페이스
export interface PaymentRisk {
  userId: string
  email: string
  riskType: 'payment_failed' | 'card_expiring' | 'subscription_cancelled'
  description: string
  severity: 'low' | 'medium' | 'high'
}

interface AdminStore {
  // 상태
  systemMetrics: SystemMetrics | null
  userStats: UserStats | null
  revenueMetrics: RevenueMetrics | null
  searchKeywords: SearchKeyword[]
  techDistribution: TechDistribution[]
  topPatents: TopPatent[]
  adminUsers: AdminUser[]
  paymentRisks: PaymentRisk[]
  
  // 로딩 상태
  isLoading: boolean
  
  // 액션
  fetchSystemMetrics: () => Promise<void>
  fetchUserStats: () => Promise<void>
  fetchRevenueMetrics: () => Promise<void>
  fetchSearchKeywords: () => Promise<void>
  fetchTechDistribution: () => Promise<void>
  fetchTopPatents: () => Promise<void>
  fetchAdminUsers: () => Promise<void>
  fetchPaymentRisks: () => Promise<void>
  updateUserStatus: (userId: string, status: 'active' | 'inactive') => Promise<void>
  updateUserSubscription: (userId: string, plan: 'free' | 'premium') => Promise<void>
}

export const useAdminStore = create<AdminStore>((set, get) => ({
  // 초기 상태
  systemMetrics: null,
  userStats: null,
  revenueMetrics: null,
  searchKeywords: [],
  techDistribution: [],
  topPatents: [],
  adminUsers: [],
  paymentRisks: [],
  isLoading: false,

  // 시스템 메트릭 가져오기
  fetchSystemMetrics: async () => {
    set({ isLoading: true })
    try {
      // LLM 분석 로그에서 비용 및 사용량 계산
      const { data: llmLogs } = await supabase
        .from('llm_analysis_logs')
        .select('total_tokens, cost_estimate, processing_time_ms, created_at')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

      // 시스템 메트릭에서 캐싱 및 성능 데이터
      const { data: systemData } = await supabase
        .from('system_metrics')
        .select('*')
        .gte('recorded_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

      const totalCost = llmLogs?.reduce((sum, log) => sum + (Number(log.cost_estimate) || 0), 0) || 0
      const totalTokens = llmLogs?.reduce((sum, log) => sum + (log.total_tokens || 0), 0) || 0
      const avgLatency = llmLogs?.reduce((sum, log) => sum + (log.processing_time_ms || 0), 0) / (llmLogs?.length || 1) || 0

      // 캐싱 히트율 계산 (시스템 메트릭에서)
      const cachingMetric = systemData?.find(m => m.metric_name === 'cache_hit_rate')
      const cachingHitRate = cachingMetric ? Number(cachingMetric.value) : 75.0

      const systemMetrics: SystemMetrics = {
        llmCost: totalCost,
        llmUsage: totalTokens,
        cachingHitRate,
        estimatedSavings: totalCost * (cachingHitRate / 100),
        apiLatency: avgLatency,
        errorRate: 0.8, // 기본값
        systemHealth: totalCost > 2000 ? 'warning' : 'healthy'
      }
      
      set({ systemMetrics })
    } catch (error) {
      console.error('Failed to fetch system metrics:', error)
    } finally {
      set({ isLoading: false })
    }
  },

  // 사용자 통계 가져오기
  fetchUserStats: async () => {
    set({ isLoading: true })
    try {
      // 전체 사용자 수
      const { count: totalUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })

      // 프리미엄 사용자 수
      const { count: premiumUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('subscription_plan', 'premium')

      // 최근 30일 활성 사용자 (활동 기록이 있는 사용자)
      const { data: activeUserData } = await supabase
        .from('user_activities')
        .select('user_id')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

      const activeUsers = new Set(activeUserData?.map(a => a.user_id)).size

      // 최근 7일 신규 가입자
      const { count: newSignups } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

      const userStats: UserStats = {
        totalUsers: totalUsers || 0,
        activeUsers,
        newSignups: newSignups || 0,
        premiumUsers: premiumUsers || 0,
        freeUsers: (totalUsers || 0) - (premiumUsers || 0)
      }
      
      set({ userStats })
    } catch (error) {
      console.error('Failed to fetch user stats:', error)
    } finally {
      set({ isLoading: false })
    }
  },

  // 수익 메트릭 가져오기
  fetchRevenueMetrics: async () => {
    set({ isLoading: true })
    try {
      // 결제 이벤트에서 수익 데이터 계산
      const { data: billingEvents } = await supabase
        .from('billing_events')
        .select('amount, event_type, processed_at')
        .in('event_type', ['subscription_created', 'invoice_paid'])

      const totalRevenue = billingEvents?.reduce((sum, event) => sum + (Number(event.amount) || 0), 0) || 0
      
      // 월간 반복 수익 (MRR) - 최근 30일 구독 수익
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      const recentRevenue = billingEvents?.filter(e => e.processed_at >= thirtyDaysAgo)
        .reduce((sum, event) => sum + (Number(event.amount) || 0), 0) || 0

      const revenueMetrics: RevenueMetrics = {
        mrr: recentRevenue,
        churnRate: 3.2, // 기본값 - 실제로는 구독 취소 이벤트에서 계산
        arr: recentRevenue * 12,
        totalRevenue,
        avgRevenuePerUser: totalRevenue / Math.max(1, (await supabase.from('users').select('*', { count: 'exact', head: true })).count || 1)
      }
      
      set({ revenueMetrics })
    } catch (error) {
      console.error('Failed to fetch revenue metrics:', error)
    } finally {
      set({ isLoading: false })
    }
  },

  // 검색 키워드 가져오기
  fetchSearchKeywords: async () => {
    set({ isLoading: true })
    try {
      // 특허 검색 분석에서 인기 키워드 추출
      const { data: searchData } = await supabase
        .from('patent_search_analytics')
        .select('search_query, created_at')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

      // 키워드별 카운트 계산
      const keywordCounts: { [key: string]: number } = {}
      searchData?.forEach(search => {
        const keyword = search.search_query.toLowerCase()
        keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1
      })

      // 상위 10개 키워드 선택
      const searchKeywords: SearchKeyword[] = Object.entries(keywordCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([keyword, count]) => ({
          keyword,
          count,
          growthRate: Math.random() * 30 - 10 // 임시 성장률
        }))

      set({ searchKeywords })
    } catch (error) {
      console.error('Failed to fetch search keywords:', error)
    } finally {
      set({ isLoading: false })
    }
  },

  // 기술 분포 가져오기
  fetchTechDistribution: async () => {
    set({ isLoading: true })
    try {
      // IPC/CPC 코드별 분석 건수
      const { data: searchData } = await supabase
        .from('patent_search_analytics')
        .select('ipc_codes, cpc_codes')
        .not('ipc_codes', 'is', null)

      const codeCounts: { [key: string]: number } = {}
      let totalCount = 0

      searchData?.forEach(search => {
        const codes = [...(search.ipc_codes || []), ...(search.cpc_codes || [])]
        codes.forEach(code => {
          if (code) {
            const category = code.substring(0, 4) // 첫 4자리로 카테고리 분류
            codeCounts[category] = (codeCounts[category] || 0) + 1
            totalCount++
          }
        })
      })

      const techDistribution: TechDistribution[] = Object.entries(codeCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 8)
        .map(([category, count]) => ({
          category,
          count,
          percentage: (count / totalCount) * 100
        }))

      set({ techDistribution })
    } catch (error) {
      console.error('Failed to fetch tech distribution:', error)
    } finally {
      set({ isLoading: false })
    }
  },

  // 인기 특허 가져오기
  fetchTopPatents: async () => {
    set({ isLoading: true })
    try {
      // LLM 분석 로그에서 가장 많이 분석된 특허
      const { data: analysisData } = await supabase
        .from('llm_analysis_logs')
        .select('patent_application_number')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

      const patentCounts: { [key: string]: number } = {}
      analysisData?.forEach(analysis => {
        const patent = analysis.patent_application_number
        patentCounts[patent] = (patentCounts[patent] || 0) + 1
      })

      // AI 분석 리포트에서 특허 정보 가져오기
      const topPatentNumbers = Object.entries(patentCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([patent]) => patent)

      const { data: patentDetails } = await supabase
        .from('ai_analysis_reports')
        .select('application_number, invention_title')
        .in('application_number', topPatentNumbers)

      const topPatents: TopPatent[] = topPatentNumbers.map(patentNumber => {
        const detail = patentDetails?.find(p => p.application_number === patentNumber)
        return {
          applicationNumber: patentNumber,
          title: detail?.invention_title || '제목 없음',
          applicant: '출원인 정보 없음', // 별도 테이블에서 가져와야 함
          analysisCount: patentCounts[patentNumber]
        }
      })

      set({ topPatents })
    } catch (error) {
      console.error('Failed to fetch top patents:', error)
    } finally {
      set({ isLoading: false })
    }
  },

  // 관리자 사용자 목록 가져오기
  fetchAdminUsers: async () => {
    set({ isLoading: true })
    try {
      // 사용자 목록과 리포트 수 조인
      const { data: users } = await supabase
        .from('users')
        .select(`
          id,
          email,
          name,
          subscription_plan,
          created_at,
          updated_at
        `)
        .order('created_at', { ascending: false })
        .limit(50)

      if (!users) {
        set({ adminUsers: [] })
        return
      }

      // 각 사용자의 리포트 수와 마지막 활동 시간 가져오기
      const adminUsers: AdminUser[] = await Promise.all(
        users.map(async (user) => {
          // 리포트 수 계산
          const { count: reportCount } = await supabase
            .from('reports')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)

          // 마지막 활동 시간
          const { data: lastActivity } = await supabase
            .from('user_activities')
            .select('created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            subscriptionPlan: user.subscription_plan as 'free' | 'premium',
            lastLogin: lastActivity?.[0]?.created_at || user.updated_at,
            totalReports: reportCount || 0,
            status: 'active' as const // 기본값
          }
        })
      )

      set({ adminUsers })
    } catch (error) {
      console.error('Failed to fetch admin users:', error)
    } finally {
      set({ isLoading: false })
    }
  },

  // 결제 위험 가져오기
  fetchPaymentRisks: async () => {
    set({ isLoading: true })
    try {
      // 결제 실패 이벤트 조회
      const { data: failedPayments } = await supabase
        .from('billing_events')
        .select('user_id, event_data, processed_at')
        .eq('event_type', 'payment_failed')
        .gte('processed_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

      // 사용자 정보와 조인
      const paymentRisks: PaymentRisk[] = []
      
      if (failedPayments) {
        for (const payment of failedPayments) {
          const { data: user } = await supabase
            .from('users')
            .select('email')
            .eq('id', payment.user_id)
            .single()

          if (user) {
            paymentRisks.push({
              userId: payment.user_id,
              email: user.email,
              riskType: 'payment_failed',
              description: `결제 실패 (${new Date(payment.processed_at).toLocaleDateString()})`,
              severity: 'high'
            })
          }
        }
      }

      set({ paymentRisks })
    } catch (error) {
      console.error('Failed to fetch payment risks:', error)
    } finally {
      set({ isLoading: false })
    }
  },

  // 사용자 상태 업데이트
  updateUserStatus: async (userId: string, status: 'active' | 'inactive') => {
    try {
      // 실제 구현에서는 사용자 테이블에 status 컬럼이 필요
      const { adminUsers } = get()
      const updatedUsers = adminUsers.map(user =>
        user.id === userId ? { ...user, status } : user
      )
      set({ adminUsers: updatedUsers })
    } catch (error) {
      console.error('Failed to update user status:', error)
    }
  },

  // 사용자 구독 업데이트
  updateUserSubscription: async (userId: string, plan: 'free' | 'premium') => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ subscription_plan: plan })
        .eq('id', userId)

      if (error) throw error

      const { adminUsers } = get()
      const updatedUsers = adminUsers.map(user =>
        user.id === userId ? { ...user, subscriptionPlan: plan } : user
      )
      set({ adminUsers: updatedUsers })
    } catch (error) {
      console.error('Failed to update user subscription:', error)
    }
  }
}))