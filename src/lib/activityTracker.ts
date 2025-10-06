import { supabase } from './supabase'

export interface UserActivity {
  id?: string
  user_id: string
  activity_type: 'search' | 'patent_view' | 'ai_analysis' | 'document_download' | 'login' | 'logout' | 'filter_change' | 'page_navigation' | 'profile_update' | 'report_generate'
  activity_data: Record<string, any>
  created_at?: string
}

export class ActivityTracker {
  private static instance: ActivityTracker
  private userId: string | null = null

  private constructor() {}

  public static getInstance(): ActivityTracker {
    if (!ActivityTracker.instance) {
      ActivityTracker.instance = new ActivityTracker()
    }
    return ActivityTracker.instance
  }

  public setUserId(userId: string | null) {
    this.userId = userId
  }

  private async trackActivity(activityType: UserActivity['activity_type'], activityData: Record<string, any>) {
    if (!this.userId) {
      console.warn('User ID not set, skipping activity tracking')
      return
    }

    try {
      const { error } = await supabase
        .from('user_activities')
        .insert({
          user_id: this.userId,
          activity_type: activityType,
          activity_data: activityData
        })

      if (error) {
        console.error('Failed to track activity:', error)
      }
    } catch (error) {
      console.error('Activity tracking error:', error)
    }
  }

  // 검색 활동 추적
  public async trackSearch(keyword: string, filters: Record<string, any>, resultsCount: number) {
    await this.trackActivity('search', {
      keyword,
      filters,
      results_count: resultsCount,
      timestamp: typeof window !== 'undefined' ? new Date().toISOString() : new Date().toISOString()
    })
  }

  // 특허 상세 조회 추적
  public async trackPatentView(applicationNumber: string, patentTitle: string) {
    await this.trackActivity('patent_view', {
      application_number: applicationNumber,
      patent_title: patentTitle,
      timestamp: typeof window !== 'undefined' ? new Date().toISOString() : new Date().toISOString()
    })
  }

  // AI 분석 추적
  public async trackAIAnalysis(applicationNumber: string, analysisType: string) {
    await this.trackActivity('ai_analysis', {
      application_number: applicationNumber,
      analysis_type: analysisType,
      timestamp: typeof window !== 'undefined' ? new Date().toISOString() : new Date().toISOString()
    })
  }

  // 문서 다운로드 추적
  public async trackDocumentDownload(applicationNumber: string, documentType: string) {
    await this.trackActivity('document_download', {
      application_number: applicationNumber,
      document_type: documentType,
      timestamp: typeof window !== 'undefined' ? new Date().toISOString() : new Date().toISOString()
    })
  }

  // 로그인 추적
  public async trackUserLogin() {
    await this.trackActivity('login', {
      timestamp: typeof window !== 'undefined' ? new Date().toISOString() : new Date().toISOString()
    })
  }

  // 로그아웃 추적
  public async trackUserLogout() {
    await this.trackActivity('logout', {
      timestamp: typeof window !== 'undefined' ? new Date().toISOString() : new Date().toISOString()
    })
  }

  public async trackLogin(data: Record<string, any>) {
    await this.trackActivity('login', {
      timestamp: typeof window !== 'undefined' ? new Date().toISOString() : new Date().toISOString(),
      ...data
    })
  }

  public async trackLogout(data: Record<string, any>) {
    await this.trackActivity('logout', {
      timestamp: typeof window !== 'undefined' ? new Date().toISOString() : new Date().toISOString(),
      ...data
    })
  }



  public async trackProfileUpdate(data: Record<string, any>) {
    await this.trackActivity('profile_update', {
      timestamp: typeof window !== 'undefined' ? new Date().toISOString() : new Date().toISOString(),
      ...data
    })
  }

  // 필터 변경 추적
  public async trackFilterChange(filters: Record<string, any>, previousFilters?: Record<string, any>) {
    await this.trackActivity('filter_change', {
      new_filters: filters,
      previous_filters: previousFilters,
      timestamp: typeof window !== 'undefined' ? new Date().toISOString() : new Date().toISOString()
    })
  }

  // 페이지 이동 추적
  public async trackPageNavigation(fromPage: string, toPage: string, additionalData?: Record<string, any>) {
    await this.trackActivity('page_navigation', {
      from_page: fromPage,
      to_page: toPage,
      timestamp: typeof window !== 'undefined' ? new Date().toISOString() : new Date().toISOString(),
      ...additionalData
    })
  }

  // 리포트 생성 추적 (기존 메서드 개선)
  public async trackReportGeneration(applicationNumber: string, reportType: string, data: Record<string, any>) {
    await this.trackActivity('report_generate', {
      application_number: applicationNumber,
      report_type: reportType,
      timestamp: typeof window !== 'undefined' ? new Date().toISOString() : new Date().toISOString(),
      ...data
    })
  }

  // 사용자 활동 통계 조회
  public async getUserActivityStats(userId: string, days: number = 30) {
    try {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      const { data, error } = await supabase
        .from('user_activities')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', typeof window !== 'undefined' ? startDate.toISOString() : startDate.toISOString())
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Failed to fetch user activity stats:', error)
        return null
      }

      // 활동 유형별 통계 계산
      const stats = {
        total_activities: data.length,
        search_count: data.filter(a => a.activity_type === 'search').length,
        patent_view_count: data.filter(a => a.activity_type === 'patent_view').length,
        ai_analysis_count: data.filter(a => a.activity_type === 'ai_analysis').length,
        document_download_count: data.filter(a => a.activity_type === 'document_download').length,
        login_count: data.filter(a => a.activity_type === 'login').length,
        filter_change_count: data.filter(a => a.activity_type === 'filter_change').length,
        page_navigation_count: data.filter(a => a.activity_type === 'page_navigation').length,
        profile_update_count: data.filter(a => a.activity_type === 'profile_update').length,
        report_generate_count: data.filter(a => a.activity_type === 'report_generate').length,
        recent_activities: data.slice(0, 10) // 최근 10개 활동
      }

      return stats
    } catch (error) {
      console.error('Error fetching user activity stats:', error)
      return null
    }
  }

  // 최근 활동 조회
  public async getRecentActivities(userId: string, limit: number = 10) {
    try {
      const { data, error } = await supabase
        .from('user_activities')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('Failed to fetch recent activities:', error)
        return []
      }

      return data
    } catch (error) {
      console.error('Error fetching recent activities:', error)
      return []
    }
  }
}

// 싱글톤 인스턴스 내보내기
export const activityTracker = ActivityTracker.getInstance()