import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// 강제 디버깅 로그
console.warn('🔧 [Supabase] 환경변수 로드됨:', {
  url: supabaseUrl,
  hasKey: !!supabaseAnonKey,
  keyLength: supabaseAnonKey?.length,
  isDev: import.meta.env.DEV
})

// 환경변수 검증을 더 안전하게 처리
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ [Supabase] Missing environment variables:', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey
  })
  // 개발 환경에서만 에러를 던지고, 프로덕션에서는 더미 클라이언트 생성
  if (import.meta.env.DEV) {
    throw new Error('Missing Supabase environment variables')
  }
}

// Get the current origin for redirect URLs
const getRedirectUrl = () => {
  // 서버 렌더링 시 기본값 사용
  const fallbackUrl = import.meta.env.DEV ? 'http://localhost:5173' : 'https://p-ai-seongwankim-1691-re-chip.vercel.app'
  
  // 클라이언트에서만 window.location 사용
  try {
    return typeof window !== 'undefined' && window.location ? window.location.origin : fallbackUrl
  } catch {
    return fallbackUrl
  }
}

console.warn('🔧 [Supabase] 클라이언트 생성 중...')

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    // 토큰 갱신 설정 개선
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    storageKey: 'supabase.auth.token'
  },
  global: {
    headers: {
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    fetch: (url, options = {}) => {
      return fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, Origin'
        }
      })
    }
  },
  db: {
    schema: 'public'
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
})

console.warn('✅ [Supabase] 클라이언트 생성 완료')

// Supabase 연결 상태 확인 함수
export const checkSupabaseConnection = async () => {
  try {
    const { data, error } = await supabase.from('users').select('count').limit(1)
    if (error) {
      console.error('❌ [Supabase] 연결 테스트 실패:', error)
      return { connected: false, error: error.message }
    }
    console.log('✅ [Supabase] 연결 테스트 성공')
    return { connected: true, error: null }
  } catch (err) {
    console.error('❌ [Supabase] 연결 테스트 예외:', err)
    return { connected: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

// 사용자 데이터 초기화 함수 (새 사용자용)
export const initializeUserData = async (userId: string, email: string, name: string) => {
  try {
    // 사용자가 이미 존재하는지 확인
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single()

    if (!existingUser) {
      // 새 사용자 생성
      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: userId,
          email,
          name,
          subscription_plan: 'free',
          usage_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (userError) {
        console.error('❌ [Supabase] 사용자 생성 실패:', userError)
        return { success: false, error: userError.message }
      }

      console.log('✅ [Supabase] 새 사용자 생성 완료:', userId)
    }

    return { success: true, error: null }
  } catch (err) {
    console.error('❌ [Supabase] 사용자 초기화 예외:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

// Database types
export interface User {
  id: string
  email: string
  name: string
  company?: string
  phone?: string
  bio?: string
  subscription_plan: 'free' | 'premium'
  usage_count: number
  role?: 'user' | 'admin' | 'super_admin'
  total_searches?: number
  total_detail_views?: number
  total_logins?: number
  total_usage_cost?: number
  last_login_at?: string
  total_reports?: number
  created_at: string
  updated_at: string
}

export interface SearchHistory {
  id: string
  user_id: string
  keyword: string
  applicant?: string
  application_date_from?: string
  application_date_to?: string
  search_results?: any
  results_count: number
  created_at: string
}

export interface Report {
  id: string
  user_id: string
  search_history_id?: string
  patent_id: string
  title: string
  report_type: 'market' | 'business'
  analysis_content: string
  metadata?: any
  created_at: string
  updated_at: string
}

export interface PatentSearchResult {
  id: string
  title: string
  applicationNumber: string
  applicant: string
  applicationDate: string
  abstract: string
  status: string
}

export interface PatentDetail extends PatentSearchResult {
  claims: string
  description: string
  drawings?: string[]
  inventors: string[]
  ipcClassification: string[]
}

export interface AnalysisReport {
  id: string
  type: 'market' | 'business'
  content: string
  summary: string
  keyInsights: string[]
  charts?: any[]
  generatedAt: string
}