import { supabase } from './supabase'

export interface UserActivity {
  id?: string
  user_id: string
  activity_type: 'search' | 'patent_view' | 'ai_analysis' | 'document_download' | 'login' | 'logout' | 
                'filter_change' | 'page_navigation' | 'profile_update' | 'report_generate' | 
                'dashboard_view' | 'settings_change' | 'export_data' | 'bookmark_add' | 'bookmark_remove' |
                'share_patent' | 'print_document' | 'api_call' | 'error_occurred' | 'session_start' | 'session_end'
  activity_data: Record<string, any>
  ip_address?: string
  user_agent?: string
  created_at?: string
}

export class ActivityTracker {
  private static instance: ActivityTracker
  private userId: string | null = null
  private sessionId: string | null = null
  private batchQueue: UserActivity[] = []
  private batchTimer: NodeJS.Timeout | null = null
  private readonly BATCH_SIZE = 10
  private readonly BATCH_TIMEOUT = 5000 // 5초

  private constructor() {}

  private isRlsError(err: any) {
    const msg = (err?.message || err?.toString() || '').toLowerCase()
    return msg.includes('row-level security') || msg.includes('rls') || msg.includes('violates row-level security')
  }

  public static getInstance(): ActivityTracker {
    if (!ActivityTracker.instance) {
      ActivityTracker.instance = new ActivityTracker()
    }
    return ActivityTracker.instance
  }

  public setUserId(userId: string | null) {
    this.userId = userId
  }

  public setSessionId(sessionId: string | null) {
    this.sessionId = sessionId
  }

  public getSessionId(): string {
    if (this.sessionId) return this.sessionId
    
    // 로컬 스토리지에서 세션 ID 가져오기
    const storedSessionId = localStorage.getItem('session_id')
    if (storedSessionId) {
      this.sessionId = storedSessionId
      return storedSessionId
    }
    
    // 새 세션 ID 생성
    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    this.sessionId = newSessionId
    localStorage.setItem('session_id', newSessionId)
    return newSessionId
  }

  private getClientInfo() {
    if (typeof window === 'undefined') return {}
    
    return {
      ip_address: null, // 서버에서 설정
      user_agent: navigator.userAgent,
      screen_resolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language
    }
  }

  private async trackActivity(activityType: UserActivity['activity_type'], activityData: Record<string, any>, immediate: boolean = false) {
    if (!this.userId) {
      console.warn('User ID not set, skipping activity tracking')
      return
    }

    const clientInfo = this.getClientInfo()
    const activity: UserActivity = {
      user_id: this.userId,
      activity_type: activityType,
      activity_data: {
        ...activityData,
        ...clientInfo,
        timestamp: new Date().toISOString()
      }
    }

    if (immediate) {
      await this.insertActivity(activity)
    } else {
      this.addToBatch(activity)
    }
  }

  private addToBatch(activity: UserActivity) {
    this.batchQueue.push(activity)
    
    if (this.batchQueue.length >= this.BATCH_SIZE) {
      this.processBatch()
    } else if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => {
        this.processBatch()
      }, this.BATCH_TIMEOUT)
    }
  }

  private async processBatch() {
    if (this.batchQueue.length === 0) return

    const activities = [...this.batchQueue]
    this.batchQueue = []
    
    if (this.batchTimer) {
      clearTimeout(this.batchTimer)
      this.batchTimer = null
    }

    try {
      const { error } = await supabase
        .from('user_activities')
        .insert(activities)

      if (error) {
        console.error('Failed to batch insert activities:', error)
        if (this.isRlsError(error)) {
          // RLS로 실패 시 개별 삽입 시도
          const failures: UserActivity[] = []
          for (const act of activities) {
            try {
              const sessionId = this.getSessionId()
              const { error: insertError } = await supabase
                .from('user_activities')
                .insert({
                  ...act,
                  session_id: sessionId,
                  ip_address: null,
                  user_agent: act.user_agent || navigator.userAgent,
                  metadata: {
                    timestamp: new Date().toISOString(),
                    source: 'batch_processor',
                    version: '2.0'
                  }
                })
              
              if (insertError) {
                console.error('[ActivityTracker] 배치 개별 삽입 실패:', insertError)
                failures.push(act)
              }
            } catch (insertEx) {
              console.error('[ActivityTracker] 배치 개별 삽입 예외:', insertEx)
              failures.push(act)
            }
          }
          if (failures.length) {
            // 실패한 경우 다시 큐에 추가
            this.batchQueue.unshift(...failures)
          }
        } else {
          // 기타 오류: 다시 큐에 추가
          this.batchQueue.unshift(...activities)
        }
      }
    } catch (error) {
      console.error('Batch activity tracking error:', error)
      // 실패한 경우 다시 큐에 추가
      this.batchQueue.unshift(...activities)
    }
  }

  private async insertActivity(activity: UserActivity) {
    try {
      // 세션 ID 가져오기
      const sessionId = this.getSessionId();
      
      // 브라우저 정보 추출
      const getBrowserInfo = () => {
        const ua = navigator.userAgent;
        if (ua.includes('Chrome')) return 'Chrome';
        if (ua.includes('Firefox')) return 'Firefox';
        if (ua.includes('Safari')) return 'Safari';
        if (ua.includes('Edge')) return 'Edge';
        return 'Other';
      };
      
      // 디바이스 정보 추출
      const getDeviceInfo = () => {
        const ua = navigator.userAgent;
        if (/Mobile|Android|iPhone|iPad/.test(ua)) return 'mobile';
        if (/Tablet|iPad/.test(ua)) return 'tablet';
        return 'desktop';
      };
      
      // RPC 함수 대신 직접 테이블에 삽입
      const { error } = await supabase
        .from('user_activities')
        .insert({
          ...activity,
          session_id: sessionId,
          ip_address: null, // 클라이언트에서는 IP를 직접 얻을 수 없음
          user_agent: activity.user_agent || navigator.userAgent,
          metadata: {
            timestamp: new Date().toISOString(),
            browser: getBrowserInfo(),
            device_type: getDeviceInfo(),
            platform: navigator.platform,
            language: navigator.language,
            screen_resolution: `${screen.width}x${screen.height}`,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            source: 'activity_tracker',
            version: '2.0'
          }
        })
      
      if (error) {
        console.error('[ActivityTracker] 활동 기록 실패:', error)
      } else {
        console.log('[ActivityTracker] 활동이 성공적으로 기록되었습니다')
      }
    } catch (error) {
      console.error('[ActivityTracker] 활동 기록 중 예상치 못한 오류:', error)
    }
  }

  // 페이지 언로드 시 남은 배치 처리
  public async flushBatch() {
    if (this.batchQueue.length > 0) {
      await this.processBatch()
    }
  }

  // 검색 활동 추적
  public async trackSearch(keyword: string, filters: Record<string, any>, resultsCount: number) {
    await this.trackActivity('search', {
      keyword,
      filters,
      results_count: resultsCount
    })
  }

  // 특허 상세 조회 추적
  public async trackPatentView(applicationNumber: string, patentTitle: string, additionalData?: Record<string, any>) {
    await this.trackActivity('patent_view', {
      application_number: applicationNumber,
      patent_title: patentTitle,
      ...additionalData
    })
  }

  // AI 분석 추적
  public async trackAIAnalysis(applicationNumber: string, analysisType: string, additionalData?: Record<string, any>) {
    await this.trackActivity('ai_analysis', {
      application_number: applicationNumber,
      analysis_type: analysisType,
      ...additionalData
    })
  }

  // 문서 다운로드 추적
  public async trackDocumentDownload(applicationNumber: string, documentType: string, fileSize?: number) {
    await this.trackActivity('document_download', {
      application_number: applicationNumber,
      document_type: documentType,
      file_size: fileSize
    })
  }

  // 로그인 추적 - user_activities 테이블만 사용
  public async trackLogin(data: Record<string, any> = {}, success: boolean = true) {
    // user_activities 테이블에 로그인 활동 기록
    await this.trackActivity('login', {
      login_method: data.method || 'email',
      success: success,
      ip_address: data.ip_address || '127.0.0.1',
      user_agent: data.user_agent || navigator.userAgent,
      ...data
    }, true) // 즉시 처리
  }

  // 로그아웃 추적
  public async trackLogout(data: Record<string, any> = {}) {
    await this.trackActivity('logout', {
      session_duration: data.sessionDuration,
      ...data
    }, true) // 즉시 처리
  }

  // 프로필 업데이트 추적
  public async trackProfileUpdate(data: Record<string, any>) {
    await this.trackActivity('profile_update', {
      updated_fields: data.updatedFields || [],
      ...data
    })
  }

  // 필터 변경 추적
  public async trackFilterChange(filters: Record<string, any>, previousFilters?: Record<string, any>) {
    await this.trackActivity('filter_change', {
      new_filters: filters,
      previous_filters: previousFilters
    })
  }

  // 페이지 이동 추적
  public async trackPageNavigation(fromPage: string, toPage: string, additionalData?: Record<string, any>) {
    await this.trackActivity('page_navigation', {
      from_page: fromPage,
      to_page: toPage,
      ...additionalData
    })
  }

  // 페이지 조회 추적
  public async trackPageView(pageName: string, additionalData?: Record<string, any>) {
    await this.trackActivity('page_navigation', {
      page_name: pageName,
      view_type: 'page_view',
      ...additionalData
    })
  }

  // 리포트 생성 추적
  public async trackReportGeneration(applicationNumber: string, reportType: string, data: Record<string, any> = {}) {
    await this.trackActivity('report_generate', {
      application_number: applicationNumber,
      report_type: reportType,
      ...data
    })
  }

  // 대시보드 조회 추적
  public async trackDashboardView(section?: string) {
    await this.trackActivity('dashboard_view', {
      section: section || 'main',
      view_duration: null // 나중에 업데이트 가능
    })
  }

  // 설정 변경 추적
  public async trackSettingsChange(settingType: string, oldValue: any, newValue: any) {
    await this.trackActivity('settings_change', {
      setting_type: settingType,
      old_value: oldValue,
      new_value: newValue
    })
  }

  // 데이터 내보내기 추적
  public async trackExportData(exportType: string, format: string, recordCount?: number) {
    await this.trackActivity('export_data', {
      export_type: exportType,
      format: format,
      record_count: recordCount
    })
  }

  // 북마크 추가 추적
  public async trackBookmarkAdd(applicationNumber: string, patentTitle: string) {
    await this.trackActivity('bookmark_add', {
      application_number: applicationNumber,
      patent_title: patentTitle
    })
  }

  // 북마크 제거 추적
  public async trackBookmarkRemove(applicationNumber: string) {
    await this.trackActivity('bookmark_remove', {
      application_number: applicationNumber
    })
  }

  // 특허 공유 추적
  public async trackSharePatent(applicationNumber: string, shareMethod: string) {
    await this.trackActivity('share_patent', {
      application_number: applicationNumber,
      share_method: shareMethod
    })
  }

  // 문서 인쇄 추적
  public async trackPrintDocument(documentType: string, applicationNumber?: string) {
    await this.trackActivity('print_document', {
      document_type: documentType,
      application_number: applicationNumber
    })
  }

  // API 호출 추적
  public async trackApiCall(endpoint: string, method: string, responseTime?: number, statusCode?: number) {
    await this.trackActivity('api_call', {
      endpoint: endpoint,
      method: method,
      response_time: responseTime,
      status_code: statusCode
    })
  }

  // 오류 발생 추적
  public async trackError(errorType: string, errorMessage: string, stackTrace?: string) {
    await this.trackActivity('error_occurred', {
      error_type: errorType,
      error_message: errorMessage,
      stack_trace: stackTrace
    }, true) // 즉시 처리
  }

  // 세션 시작 추적
  public async trackSessionStart() {
    await this.trackActivity('session_start', {
      session_id: crypto.randomUUID()
    }, true) // 즉시 처리
  }

  // 세션 종료 추적
  public async trackSessionEnd(sessionDuration: number) {
    await this.trackActivity('session_end', {
      session_duration: sessionDuration
    }, true) // 즉시 처리
  }

  // 로그인 통계 조회 - 새로운 RPC 함수 사용
  public async getUserLoginStats(userId: string) {
    try {
      const { data, error } = await supabase.rpc('get_user_login_stats', {
        p_user_id: userId
      })
      
      if (error) {
        console.error('Failed to get user login stats via RPC:', error)
        return null
      }
      
      return data
    } catch (error) {
      console.error('Error calling get_user_login_stats RPC:', error)
      return null
    }
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
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Failed to fetch user activity stats:', error)
        return null
      }

      // 활동 유형별 통계 계산
      const activityCounts = data.reduce((acc, activity) => {
        acc[activity.activity_type] = (acc[activity.activity_type] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      // 시간대별 활동 분석
      const hourlyActivity = Array(24).fill(0)
      const dailyActivity = Array(7).fill(0)
      
      data.forEach(activity => {
        const date = new Date(activity.created_at)
        hourlyActivity[date.getHours()]++
        dailyActivity[date.getDay()]++
      })

      // 최근 활동 트렌드 (일별)
      const dailyTrend = Array(days).fill(0)
      data.forEach(activity => {
        const activityDate = new Date(activity.created_at)
        const daysDiff = Math.floor((Date.now() - activityDate.getTime()) / (1000 * 60 * 60 * 24))
        if (daysDiff < days) {
          dailyTrend[days - 1 - daysDiff]++
        }
      })

      const stats = {
        total_activities: data.length,
        activity_counts: activityCounts,
        search_count: activityCounts.search || 0,
        patent_view_count: activityCounts.patent_view || 0,
        ai_analysis_count: activityCounts.ai_analysis || 0,
        document_download_count: activityCounts.document_download || 0,
        login_count: activityCounts.login || 0,
        filter_change_count: activityCounts.filter_change || 0,
        page_navigation_count: activityCounts.page_navigation || 0,
        profile_update_count: activityCounts.profile_update || 0,
        report_generate_count: activityCounts.report_generate || 0,
        dashboard_view_count: activityCounts.dashboard_view || 0,
        settings_change_count: activityCounts.settings_change || 0,
        export_data_count: activityCounts.export_data || 0,
        bookmark_add_count: activityCounts.bookmark_add || 0,
        bookmark_remove_count: activityCounts.bookmark_remove || 0,
        share_patent_count: activityCounts.share_patent || 0,
        print_document_count: activityCounts.print_document || 0,
        api_call_count: activityCounts.api_call || 0,
        error_occurred_count: activityCounts.error_occurred || 0,
        session_start_count: activityCounts.session_start || 0,
        session_end_count: activityCounts.session_end || 0,
        hourly_activity: hourlyActivity,
        daily_activity: dailyActivity,
        daily_trend: dailyTrend,
        recent_activities: data.slice(0, 20), // 최근 20개 활동
        most_active_hour: hourlyActivity.indexOf(Math.max(...hourlyActivity)),
        most_active_day: dailyActivity.indexOf(Math.max(...dailyActivity)),
        average_daily_activities: Math.round(data.length / days)
      }

      return stats
    } catch (error) {
      console.error('Error fetching user activity stats:', error)
      return null
    }
  }

  // 최근 활동 조회
  public async getRecentActivities(userId: string, limit: number = 10, activityType?: string) {
    try {
      let query = supabase
        .from('user_activities')
        .select('*')
        .eq('user_id', userId)

      if (activityType) {
        query = query.eq('activity_type', activityType)
      }

      const { data, error } = await query
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

  // 활동 유형별 통계 조회
  public async getActivityStatsByType(userId: string, activityType: string, days: number = 30) {
    try {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      const { data, error } = await supabase
        .from('user_activities')
        .select('*')
        .eq('user_id', userId)
        .eq('activity_type', activityType)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Failed to fetch activity stats by type:', error)
        return null
      }

      return {
        count: data.length,
        activities: data,
        first_activity: data[data.length - 1],
        last_activity: data[0]
      }
    } catch (error) {
      console.error('Error fetching activity stats by type:', error)
      return null
    }
  }

  // 활동 검색
  public async searchActivities(userId: string, searchTerm: string, limit: number = 50) {
    try {
      const { data, error } = await supabase
        .from('user_activities')
        .select('*')
        .eq('user_id', userId)
        .or(`activity_data->>keyword.ilike.%${searchTerm}%,activity_data->>patent_title.ilike.%${searchTerm}%,activity_data->>application_number.ilike.%${searchTerm}%`)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('Failed to search activities:', error)
        return []
      }

      return data
    } catch (error) {
      console.error('Error searching activities:', error)
      return []
    }
  }

  // 활동 데이터 내보내기
  public async exportActivities(userId: string, startDate?: Date, endDate?: Date) {
    try {
      let query = supabase
        .from('user_activities')
        .select('*')
        .eq('user_id', userId)

      if (startDate) {
        query = query.gte('created_at', startDate.toISOString())
      }

      if (endDate) {
        query = query.lte('created_at', endDate.toISOString())
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) {
        console.error('Failed to export activities:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error exporting activities:', error)
      return null
    }
  }

  // 페이지 언로드 시 이벤트 리스너 설정
  public setupPageUnloadListener() {
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.flushBatch()
      })

      window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          this.flushBatch()
        }
      })
    }
  }

  // 자동 페이지 추적 설정
  public setupAutoPageTracking() {
    if (typeof window !== 'undefined') {
      let currentPage = window.location.pathname
      
      // History API 감지
      const originalPushState = history.pushState
      const originalReplaceState = history.replaceState

      history.pushState = function(...args) {
        originalPushState.apply(history, args)
        const newPage = window.location.pathname
        activityTracker.trackPageNavigation(currentPage, newPage)
        currentPage = newPage
      }

      history.replaceState = function(...args) {
        originalReplaceState.apply(history, args)
        const newPage = window.location.pathname
        activityTracker.trackPageNavigation(currentPage, newPage)
        currentPage = newPage
      }

      // Popstate 이벤트 감지
      window.addEventListener('popstate', () => {
        const newPage = window.location.pathname
        activityTracker.trackPageNavigation(currentPage, newPage)
        currentPage = newPage
      })
    }
  }
}

// 싱글톤 인스턴스 내보내기
export const activityTracker = ActivityTracker.getInstance()