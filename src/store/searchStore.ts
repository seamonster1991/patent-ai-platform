import { create } from 'zustand'
import { PatentSearchResult, SearchHistory, Report } from '../lib/supabase'

interface SearchFilters {
  // 기본 검색 필드
  word?: string // 자유검색
  inventionTitle?: string // 발명의명칭
  astrtCont?: string // 초록
  claimScope?: string // 청구범위
  ipcNumber?: string // IPC코드
  
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
      numOfRows: number
      pageNo: number
      totalCount: number
    }
  }
}

interface SearchState {
  // Search state
  filters: SearchFilters
  results: KiprisPatentItem[]
  loading: boolean
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
  
  // History actions
  loadSearchHistory: () => Promise<void>
  
  // Report actions
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
  totalCount: 0,
  currentPage: 1,
  searchHistory: [],
  reports: [],

  setFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters }
    }))
  },

  searchPatents: async (page = 1) => {
    const { filters } = get()
    
    // 검색 조건 검증 - 최소 하나의 검색 필드는 입력되어야 함
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
      return { error: '최소 하나의 검색 조건을 입력해주세요.' }
    }

    set({ loading: true, currentPage: page })

    try {
      // KIPRIS API 파라미터 준비
      const searchParams = {
        ...filters,
        pageNo: page,
        numOfRows: filters.numOfRows || 30,
        // 기존 keyword 필드를 word로 매핑 (호환성)
        word: filters.word || filters.keyword,
      }

      // Call API to search patents via KIPRIS
      const response = await fetch('/api/patents/kipris-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(searchParams),
      })

      const data = await response.json()

      if (!data.success) {
        set({ loading: false })
        return { error: data.message || '검색 중 오류가 발생했습니다.' }
      }

      const kiprisResponse: KiprisSearchResponse = data.data

      // KIPRIS API 응답 검증
      if (kiprisResponse.header.successYN !== 'Y') {
        set({ loading: false })
        return { error: kiprisResponse.header.resultMsg || 'KIPRIS API 오류가 발생했습니다.' }
      }

      set({
        results: kiprisResponse.body.items || [],
        totalCount: kiprisResponse.body.count?.totalCount || 0,
        loading: false,
      })

      return {}
    } catch (error) {
      set({ loading: false })
      return { error: '네트워크 오류가 발생했습니다.' }
    }
  },

  clearResults: () => {
    set({
      results: [],
      totalCount: 0,
      currentPage: 1,
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
  },

  loadSearchHistory: async () => {
    try {
      const response = await fetch('/api/user/search-history')
      const data = await response.json()

      if (data.success) {
        set({ searchHistory: data.data })
      }
    } catch (error) {
      console.error('Failed to load search history:', error)
    }
  },

  generateReport: async (patentId: string, type: 'market' | 'business') => {
    try {
      const response = await fetch('/api/reports/generate', {
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

      return { report: data.data }
    } catch (error) {
      return { error: '네트워크 오류가 발생했습니다.' }
    }
  },

  loadReports: async () => {
    try {
      const response = await fetch('/api/user/reports')
      const data = await response.json()

      if (data.success) {
        set({ reports: data.data })
      }
    } catch (error) {
      console.error('Failed to load reports:', error)
    }
  },
}))