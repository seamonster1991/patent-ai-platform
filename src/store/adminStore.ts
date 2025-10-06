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
  error: string | null
  
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
  error: null,

  // 시스템 메트릭 조회
  fetchSystemMetrics: async () => {
    try {
      set({ isLoading: true });
      
      const response = await fetch('/api/admin/statistics?type=system-metrics');
      if (!response.ok) {
        throw new Error('시스템 메트릭 조회 실패');
      }
      
      const result = await response.json();
      if (result.success) {
        set({ systemMetrics: result.data });
      } else {
        throw new Error(result.error || '시스템 메트릭 조회 실패');
      }
    } catch (error) {
      console.error('시스템 메트릭 조회 실패:', error);
      set({ error: '시스템 메트릭을 불러오는데 실패했습니다.' });
    } finally {
      set({ isLoading: false });
    }
  },

  // 사용자 통계 조회
  fetchUserStats: async () => {
    try {
      set({ isLoading: true });
      
      const response = await fetch('/api/admin/statistics?type=user-stats');
      if (!response.ok) {
        throw new Error('사용자 통계 조회 실패');
      }
      
      const result = await response.json();
      if (result.success) {
        set({ userStats: result.data });
      } else {
        throw new Error(result.error || '사용자 통계 조회 실패');
      }
    } catch (error) {
      console.error('사용자 통계 조회 실패:', error);
      set({ error: '사용자 통계를 불러오는데 실패했습니다.' });
    } finally {
      set({ isLoading: false });
    }
  },

  // 수익 메트릭 조회
  fetchRevenueMetrics: async () => {
    try {
      set({ isLoading: true });
      
      const response = await fetch('/api/admin/statistics?type=revenue-metrics');
      if (!response.ok) {
        throw new Error('수익 메트릭 조회 실패');
      }
      
      const result = await response.json();
      if (result.success) {
        set({ revenueMetrics: result.data });
      } else {
        throw new Error(result.error || '수익 메트릭 조회 실패');
      }
    } catch (error) {
      console.error('수익 메트릭 조회 실패:', error);
      set({ error: '수익 메트릭을 불러오는데 실패했습니다.' });
    } finally {
      set({ isLoading: false });
    }
  },

  // 검색 키워드 통계 조회
  fetchSearchKeywords: async () => {
    try {
      set({ isLoading: true });
      
      const response = await fetch('/api/admin/statistics?type=search-keywords');
      if (!response.ok) {
        throw new Error('검색 키워드 통계 조회 실패');
      }
      
      const result = await response.json();
      if (result.success) {
        set({ searchKeywords: result.data });
      } else {
        throw new Error(result.error || '검색 키워드 조회 실패');
      }
    } catch (error) {
      console.error('검색 키워드 조회 실패:', error);
      set({ error: '검색 키워드를 불러오는데 실패했습니다.' });
    } finally {
      set({ isLoading: false });
    }
  },

  // 기술 분포 가져오기
  fetchTechDistribution: async () => {
    try {
      set({ isLoading: true });
      
      const response = await fetch('/api/admin/statistics?type=tech-distribution');
      if (!response.ok) {
        throw new Error('기술 분포 통계 조회 실패');
      }
      
      const result = await response.json();
      if (result.success) {
        set({ techDistribution: result.data });
      } else {
        throw new Error(result.error || '기술 분포 조회 실패');
      }
    } catch (error) {
      console.error('기술 분포 조회 실패:', error);
      set({ error: '기술 분포를 불러오는데 실패했습니다.' });
    } finally {
      set({ isLoading: false });
    }
  },

  // 인기 특허 가져오기
  fetchTopPatents: async () => {
    try {
      set({ isLoading: true });
      
      const response = await fetch('/api/admin/statistics?type=top-patents');
      if (!response.ok) {
        throw new Error('인기 특허 통계 조회 실패');
      }
      
      const result = await response.json();
      if (result.success) {
        set({ topPatents: result.data });
      } else {
        throw new Error(result.error || '인기 특허 조회 실패');
      }
    } catch (error) {
      console.error('인기 특허 조회 실패:', error);
      set({ error: '인기 특허를 불러오는데 실패했습니다.' });
    } finally {
      set({ isLoading: false });
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