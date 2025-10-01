import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Get the current origin for redirect URLs
const getRedirectUrl = () => {
  if (typeof window !== 'undefined') {
    return window.location.origin
  }
  // Fallback for SSR or development
  return import.meta.env.DEV ? 'http://localhost:5173' : 'https://p-ai-seongwankim-1691-re-chip.vercel.app'
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  }
})

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