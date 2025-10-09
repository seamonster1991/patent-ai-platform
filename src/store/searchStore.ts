import { create } from 'zustand'
import { PatentSearchResult, SearchHistory, Report } from '../lib/supabase'
import { useAuthStore } from './authStore'
import { ActivityTracker } from '../lib/activityTracker'
import { searchPatents as apiSearchPatents, getApiUrl } from '../lib/api'

interface SearchFilters {
  // 기본 검색 필드
  word?: string // 자유검색
  inventionTitle?: string // 발명의명칭
  astrtCont?: string // 초록
  claimScope?: string // 청구범위
  ipcNumber?: string // IPC코드
  cpcNumber?: string // CPC코드
  
  // 번호 검색
  applicationNumber?: string // 출원번호
  openNumber?: string // 공개번호
  publicationNumber?: string // 공고번호
  registerNumber?: string // 등록번호
  priorityApplicationNumber?: string // 우선권주장번호
  internationalApplicationNumber?: string // 국제출원번호
  internationOpenNumber?: string // 국제공개번호
  
  // 날짜 검색
  applicationDate?: string // 출원일자
  openDate?: string // 공개일자
  publicationDate?: string // 공고일자
  registerDate?: string // 등록일자
  priorityApplicationDate?: string // 우선권주장일자
  internationalApplicationDate?: string // 국제출원일자
  internationOpenDate?: string // 국제공개일자
  
  // 인물 정보
  applicant?: string // 출원인명/특허고객번호
  inventors?: string // 발명자명/특허고객번호
  agent?: string // 대리인명/대리인코드
  rightHoler?: string // 등록권자(특허권자)
  
  // 특허 유형
  patent?: boolean // 특허 포함 여부
  utility?: boolean // 실용신안 포함 여부
  
  // 행정처분 상태
  lastvalue?: string // 전체:공백, 공개:A, 취하:C, 소멸:F, 포기:G, 무효:I, 거절:J, 등록:R
  
  // 페이지네이션 및 정렬
  pageNo?: number // 페이지번호
  numOfRows?: number // 페이지당건수 (기본: 30, 최대: 500)
  sortSpec?: string // 정렬기준 (PD-공고일자, AD-출원일자, GD-등록일자, OPD-공개일자, FD-국제출원일자, FOD-국제공개일자, RD-우선권주장일자)
  descSort?: boolean // 정렬방식 (asc: false, desc: true)
  
  // 기존 호환성을 위한 필드
  keyword?: string
  applicationDateFrom?: string
  applicationDateTo?: string
}

// KIPRIS API 응답 형식에 맞는 특허 데이터 인터페이스
interface KiprisPatentItem {
  indexNo: string // 일련번호
  registerStatus: string // 등록상태
  inventionTitle: string // 발명의명칭
  ipcNumber: string // IPC코드
  registerNumber: string // 등록번호
  registerDate: string // 등록일자
  applicationNumber: string // 출원번호
  applicationDate: string // 출원일자
  openNumber: string // 공개번호
  openDate: string // 공개일자
  publicationNumber: string // 공고번호
  publicationDate: string // 공고일자
  astrtCont: string // 초록
  drawing: string // 이미지경로
  bigDrawing: string // 큰이미지경로
  applicantName: string // 출원인
}

interface KiprisSearchResponse {
  header: {
    requestMsgID: string
    responseTime: string
    responseMsgID: string
    successYN: string
    resultCode: string
    resultMsg: string
  }
  body: {
    items: KiprisPatentItem[]
    count: {
      totalCount: number | string
      pageNo: number | string
      numOfRows: number | string
    }
  }
  totalCount?: number // 백엔드에서 추가된 총 검색건수 (레거시 호환)
}

interface SearchState {
  // Search state
  filters: SearchFilters
  results: KiprisPatentItem[]
  loading: boolean
  error: string | null
  totalCount: number
  currentPage: number
  
  // Search history
  searchHistory: SearchHistory[]
  
  // Reports
  reports: Report[]
  
  // Actions
  setFilters: (filters: Partial<SearchFilters>) => void
  searchPatents: (page?: number) => Promise<{ error?: string }>
  clearResults: () => void
  resetFilters: () => void
  
  // Search state persistence
  saveSearchState: () => void
  loadSearchState: () => boolean
  clearSavedState: () => void
  
  // History actions
  loadSearchHistory: () => Promise<void>
  saveSearchToHistory: (keyword: string, resultsCount: number) => Promise<void>

  // Report management
  generateReport: (patentId: string, type: 'market' | 'business') => Promise<{ error?: string; report?: Report }>
  loadReports: () => Promise<void>
}

export const useSearchStore = create<SearchState>((set, get) => ({
  // Initial state
  filters: {
    // 기본 검색 필드
    word: '',
    inventionTitle: '',
    astrtCont: '',
    claimScope: '',
    ipcNumber: '',
    cpcNumber: '',
    
    // 번호 검색
    applicationNumber: '',
    openNumber: '',
    publicationNumber: '',
    registerNumber: '',
    priorityApplicationNumber: '',
    internationalApplicationNumber: '',
    internationOpenNumber: '',
    
    // 날짜 검색
    applicationDate: '',
    openDate: '',
    publicationDate: '',
    registerDate: '',
    priorityApplicationDate: '',
    internationalApplicationDate: '',
    internationOpenDate: '',
    
    // 인물 정보
    applicant: '',
    inventors: '',
    agent: '',
    rightHoler: '',
    
    // 특허 유형
    patent: true,
    utility: true,
    
    // 행정처분 상태
    lastvalue: '',
    
    // 페이지네이션 및 정렬
    pageNo: 1,
    numOfRows: 30,
    sortSpec: 'AD', // 기본값: 출원일자
    descSort: true, // 기본값: 내림차순
    
    // 기존 호환성을 위한 필드
    keyword: '',
    applicationDateFrom: '',
    applicationDateTo: '',
  },
  results: [],
  loading: false,
  error: null,
  totalCount: 0,
  currentPage: 1,
  searchHistory: [],
  reports: [],

  setFilters: (newFilters) => {
    const { filters: currentFilters } = get()
    
    // 필터 변경 추적
    const activityTracker = ActivityTracker.getInstance()
    const { user } = useAuthStore.getState()
    
    if (user) {
      activityTracker.trackFilterChange(currentFilters, { ...currentFilters, ...newFilters })
    }
    
    set((state) => ({
      filters: { ...state.filters, ...newFilters }
    }))
  },

  searchPatents: async (page = 1) => {
    const { filters } = get()
    
    // 검색 조건 검증
    const hasSearchTerm = filters.word?.trim() || 
                         filters.inventionTitle?.trim() || 
                         filters.astrtCont?.trim() || 
                         filters.claimScope?.trim() || 
                         filters.ipcNumber?.trim() ||
                         filters.applicationNumber?.trim() ||
                         filters.openNumber?.trim() ||
                         filters.publicationNumber?.trim() ||
                         filters.registerNumber?.trim() ||
                         filters.applicant?.trim() ||
                         filters.inventors?.trim() ||
                         filters.agent?.trim() ||
                         filters.keyword?.trim() // 기존 호환성

    if (!hasSearchTerm) {
      set({ error: '최소 하나의 검색 조건을 입력해주세요.' })
      return { error: '최소 하나의 검색 조건을 입력해주세요.' }
    }

    set({ loading: true, error: null, currentPage: page })

    try {
      // 현재 사용자 정보 가져오기
      const { user } = useAuthStore.getState()
      
      // KIPRIS API 파라미터 준비
      const searchParams = {
        ...filters,
        // 기존 keyword 필드를 word로 매핑 (호환성)
        word: filters.word || filters.keyword,
        pageNo: page,
        numOfRows: filters.numOfRows || 30,
        // 사용자 ID 추가
        userId: user?.id,
      }

      console.log('🔍 [SearchStore] API 호출 시작:', { searchParams });

      // 새로운 API 유티리티 사용
      const data = await apiSearchPatents(searchParams)

      console.log('🔍 [SearchStore] API 응답 데이터:', data);

      if (!data.success) {
        const errorMessage = data.error || data.message || '검색 중 오류가 발생했습니다.'
        set({ loading: false, error: errorMessage })
        return { error: errorMessage }
      }

      // 백엔드에서 처리된 응답 구조
      const responseData = data.data

      if (!responseData) {
        const errorMessage = '검색 결과 데이터가 없습니다.'
        set({ loading: false, error: errorMessage })
        return { error: errorMessage }
      }

      // 응답 데이터에서 필요한 정보 추출 (객체 형태 { items, count }를 안전하게 처리)
      const bodyObj: any = (responseData as any).body || {};
      const items: KiprisPatentItem[] = Array.isArray(bodyObj)
        ? (bodyObj as KiprisPatentItem[]) // 레거시: body가 배열인 경우
        : (bodyObj.items || []);
      const countObject: any = Array.isArray(bodyObj) ? {} : (bodyObj.count || {});
      const totalCountRaw = (countObject.totalCount ?? (responseData as any).totalCount ?? 0) as number | string;
      const pageNoRaw = (countObject.pageNo ?? get().filters.pageNo ?? 1) as number | string;
      const numOfRowsRaw = (countObject.numOfRows ?? get().filters.numOfRows ?? 30) as number | string;

      const totalCount = typeof totalCountRaw === 'string' ? parseInt(totalCountRaw, 10) || 0 : totalCountRaw;
      const pageNo = typeof pageNoRaw === 'string' ? parseInt(pageNoRaw, 10) || 1 : pageNoRaw;
      const numOfRows = typeof numOfRowsRaw === 'string' ? parseInt(numOfRowsRaw, 10) || 30 : numOfRowsRaw;

      // 상태 업데이트
       set({
         results: items,
         totalCount: totalCount, // 추출된 totalCount 사용
         currentPage: pageNo,
         loading: false,
         error: null
       });
      
      

      // 검색 성공 시 상태 자동 저장
      get().saveSearchState()
      
      // 검색 기록을 데이터베이스에 저장 (기술 분야 정보는 별도로 처리됨)
      get().saveSearchToHistory(filters.word || filters.keyword || '', totalCount)

      // 활동 추적 (한 번만 실행)
      try {
        const { user } = useAuthStore.getState()
        if (user) {
          const activityTracker = ActivityTracker.getInstance()
          activityTracker.setUserId(user.id)
          await activityTracker.trackSearch(
            filters.word || filters.keyword || '',
            {
              page: page,
              filters: filters,
              searchType: 'patent_search'
            },
            totalCount
          )
          
          // 중복 제거: supabase.rpc 호출 제거
          // 데이터베이스에 검색 활동 추적
          // const { supabase } = await import('../lib/supabase')
          // await supabase.rpc('track_search_activity', {
          //   p_user_id: user.id,
          //   p_keyword: filters.word || filters.keyword || '',
          //   p_technology_field: null, // 기술 분야는 별도 분석 후 업데이트
          //   p_ipc_class: filters.ipcNumber || null,
          //   p_result_count: totalCount
          // })
        }
      } catch (error) {
        console.error('활동 추적 오류:', error)
        // 활동 추적 실패는 검색 기능에 영향을 주지 않음
      }

      // 검색 완료 후 대시보드 새로고침 이벤트 발생
      try {
        window.dispatchEvent(new CustomEvent('dashboardRefresh'))
        console.log('🔄 [SearchStore] 대시보드 새로고침 이벤트 발생')
      } catch (error) {
        console.error('대시보드 새로고침 이벤트 발생 오류:', error)
      }

      return { error: null }
    } catch (error) {
      console.error('🔍 [SearchStore] 검색 오류:', error)
      const errorMessage = error instanceof Error ? error.message : '검색 중 오류가 발생했습니다.'
      set({ loading: false, error: errorMessage })
      return { error: errorMessage }
    }
  },

  clearResults: () => {
    set({
      results: [],
      totalCount: 0,
      currentPage: 1,
      error: null,
    })
  },

  resetFilters: () => {
    set({
      filters: {
        // 기본 검색 필드
        word: '',
        inventionTitle: '',
        astrtCont: '',
        claimScope: '',
        ipcNumber: '',
        
        // 번호 검색
        applicationNumber: '',
        openNumber: '',
        publicationNumber: '',
        registerNumber: '',
        priorityApplicationNumber: '',
        internationalApplicationNumber: '',
        internationOpenNumber: '',
        
        // 날짜 검색
        applicationDate: '',
        openDate: '',
        publicationDate: '',
        registerDate: '',
        priorityApplicationDate: '',
        internationalApplicationDate: '',
        internationOpenDate: '',
        
        // 인물 정보
        applicant: '',
        inventors: '',
        agent: '',
        rightHoler: '',
        
        // 특허 유형
        patent: true,
        utility: true,
        
        // 행정처분 상태
        lastvalue: '',
        
        // 페이지네이션 및 정렬
        pageNo: 1,
        numOfRows: 30,
        sortSpec: 'AD',
        descSort: true,
        
        // 기존 호환성을 위한 필드
        keyword: '',
        applicationDateFrom: '',
        applicationDateTo: '',
      }
    })
    
    // 저장된 검색 상태도 함께 초기화
    get().clearSavedState()
  },

  // 검색 상태 저장 기능
  saveSearchState: () => {
    if (typeof window === 'undefined') return
    
    const { filters, results, totalCount, currentPage } = get()
    const searchState = {
      filters,
      results,
      totalCount,
      currentPage,
      timestamp: Date.now()
    }
    
    try {
      localStorage.setItem('patent_search_state', JSON.stringify(searchState))
    } catch (error) {
      console.error('Failed to save search state:', error)
    }
  },

  // 검색 상태 복원 기능
  loadSearchState: () => {
    if (typeof window === 'undefined') return false
    
    try {
      const savedState = localStorage.getItem('patent_search_state')
      if (savedState) {
        const searchState = JSON.parse(savedState)
        
        // 저장된 상태가 24시간 이내인지 확인 (선택적)
        const isRecent = Date.now() - searchState.timestamp < 24 * 60 * 60 * 1000
        
        if (isRecent) {
          set({
            filters: searchState.filters || get().filters,
            results: searchState.results || [],
            totalCount: searchState.totalCount || 0,
            currentPage: searchState.currentPage || 1,
          })
          
          // 검색 결과가 있으면 true, 없으면 false 반환
          return searchState.results && searchState.results.length > 0
        }
      }
    } catch (error) {
      console.error('Failed to load search state:', error)
    }
    return false
  },

  // 저장된 검색 상태 삭제
  clearSavedState: () => {
    if (typeof window === 'undefined') return
    
    try {
      localStorage.removeItem('patent_search_state')
    } catch (error) {
      console.error('Failed to clear saved search state:', error)
    }
  },

  loadSearchHistory: async () => {
    try {
      const { user } = useAuthStore.getState()
      if (!user) return

      const apiUrl = getApiUrl(`/api/users/search-history/${user.id}`);
      const response = await fetch(apiUrl)
      const data = await response.json()

      if (data.success) {
        set({ searchHistory: data.data.history || data.data })
      }
    } catch (error) {
      console.error('Failed to load search history:', error)
    }
  },

  saveSearchToHistory: async (keyword: string, resultsCount: number, technologyField?: string, fieldConfidence?: number) => {
    try {
      const { user } = useAuthStore.getState()
      if (!user || !keyword.trim()) return

      const { filters } = get()
      
      const apiUrl = getApiUrl('/api/users/search-history');
      await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.id,
          keyword: keyword.trim(),
          filters: filters,
          results_count: resultsCount,
          technology_field: technologyField,
          field_confidence: fieldConfidence
        }),
      })
      
      // 검색 기록 저장 후 목록 새로고침
      get().loadSearchHistory()
    } catch (error) {
      console.error('Failed to save search to history:', error)
    }
  },

  generateReport: async (patentId: string, type: 'market' | 'business') => {
    try {
      const apiUrl = getApiUrl('/api/reports/generate');
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patentId,
          reportType: type,
        }),
      })

      const data = await response.json()

      if (!data.success) {
        return { error: data.message || '리포트 생성 중 오류가 발생했습니다.' }
      }

      // Add to reports list
      set((state) => ({
        reports: [data.data, ...state.reports]
      }))

      // 리포트 생성 완료 후 대시보드 새로고침 이벤트 발생
      try {
        window.dispatchEvent(new CustomEvent('reportGenerated'))
        window.dispatchEvent(new CustomEvent('dashboardRefresh'))
        console.log('🔄 [SearchStore] 리포트 생성 완료 - 대시보드 새로고침 이벤트 발생')
      } catch (error) {
        console.error('대시보드 새로고침 이벤트 발생 오류:', error)
      }

      return { report: data.data }
    } catch (error) {
      return { error: '네트워크 오류가 발생했습니다.' }
    }
  },

  loadReports: async () => {
    try {
      const { user } = useAuthStore.getState()
      if (!user) return

      const apiUrl = getApiUrl(`/api/users/reports/${user.id}`);
      const response = await fetch(apiUrl)
      const data = await response.json()

      if (data.success) {
        set({ reports: data.data.reports || data.data })
      }
    } catch (error) {
      console.error('Failed to load reports:', error)
    }
  },
}))