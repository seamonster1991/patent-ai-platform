import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, 
  FileText, 
  Calendar, 
  Building, 
  User, 
  Globe,
  Scale,
  Image as ImageIcon,
  Download,
  Share2,
  Bookmark,
  ExternalLink,
  Clock,
  Hash,
  Users,
  Briefcase,
  BookOpen,
  Shield,
  Search,
  Award,
  Brain,
  Loader2,
  File,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  BarChart3,
  TrendingUp,
  DollarSign
} from 'lucide-react'
import Button from '../components/UI/Button'
import Card, { CardContent, CardHeader, CardTitle } from '../components/UI/Card'
import { LoadingPage } from '../components/UI/Loading'
import { KiprisPatentDetailItem, AIAnalysisReport, AIAnalysisStructure, DocumentType, DOCUMENT_TYPES, DocumentDownloadResponse } from '../types/kipris'
import { formatDate, formatDateSimple } from '../lib/utils'
import { toast } from 'sonner'

import { useSearchStore } from '../store/searchStore'
import { useAuthStore } from '../store/authStore'
import { activityTracker } from '../lib/activityTracker'
import { getApiUrl, apiRequest } from '../lib/api'
import MarketAnalysisReport from '../components/Reports/MarketAnalysisReport'
import BusinessInsightsReport from '../components/Reports/BusinessInsightsReport'


export default function PatentDetail() {
  console.log('[SEARCH] [PatentDetail] 컴포넌트 로드됨');
  
  const { applicationNumber } = useParams<{ applicationNumber: string }>()
  console.log('[SEARCH] [PatentDetail] applicationNumber:', applicationNumber);
  console.log('[SEARCH] [PatentDetail] 현재 URL:', window.location.href);
  
  const navigate = useNavigate()
  const { loadSearchState } = useSearchStore()
  const { user } = useAuthStore()
  const [patent, setPatent] = useState<KiprisPatentDetailItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 사용자 ID 설정
  useEffect(() => {
    if (user?.id) {
      activityTracker.setUserId(user.id)
    }
  }, [user?.id])

  const [activeTab, setActiveTab] = useState('summary')
  const [renderedTabs, setRenderedTabs] = useState<Set<string>>(new Set(['summary'])) // 렌더링된 탭 추적
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisReport | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [documentAvailability, setDocumentAvailability] = useState<Record<DocumentType, boolean>>({} as Record<DocumentType, boolean>)
  const [documentLoading, setDocumentLoading] = useState<Record<DocumentType, boolean>>({} as Record<DocumentType, boolean>)
  const [availabilityLoading, setAvailabilityLoading] = useState(false)


  useEffect(() => {
    console.log('[SEARCH] [PatentDetail] useEffect 실행됨, applicationNumber:', applicationNumber);
    if (applicationNumber) {
      console.log('[SEARCH] [PatentDetail] fetchPatentDetail 호출 시작');
      fetchPatentDetail(applicationNumber)
      // applicationNumber가 변경될 때 AI 분석 관련 상태 초기화
      setAiAnalysis(null)
      setAiError(null)
      setAiLoading(false)
      // 문서 관련 상태도 초기화
      setDocumentAvailability({} as Record<DocumentType, boolean>)
      setDocumentLoading({} as Record<DocumentType, boolean>)
      setAvailabilityLoading(false)

      // 탭을 기본값으로 리셋
      setActiveTab('summary')
      // 렌더링된 탭 목록 초기화
      setRenderedTabs(new Set(['summary']))
    }
  }, [applicationNumber])

  // 문서 탭이 활성화될 때 자동으로 문서 가용성 확인
  useEffect(() => {
    if (activeTab === 'documents' && applicationNumber && Object.keys(documentAvailability).length === 0) {
      checkDocumentAvailability()
    }
  }, [activeTab, applicationNumber, documentAvailability])

  const fetchPatentDetail = async (appNumber: string) => {
    try {
      setLoading(true)
      setError(null)
      
      console.log(`🔍 [PatentDetail] 특허 상세 정보 요청: ${appNumber}`)
      
      const apiUrl = getApiUrl(`/api/detail?applicationNumber=${appNumber}`)
      console.log(`🔗 [PatentDetail] API URL: ${apiUrl}`)
      
      const response = await apiRequest(apiUrl, {
        requireAuth: false, // 특허 상세 조회는 인증 불필요
        timeout: 30000,
        retries: 2
      })
      
      if (response.success && response.data) {
        setPatent(response.data.body.item)
        
        // 사용자 활동 추적 - 특허 상세 조회
        if (user?.id) {
          const patentData = response.data.body.item
          const biblioInfo = patentData.biblioSummaryInfoArray?.biblioSummaryInfo
          
          activityTracker.trackPatentView(appNumber, biblioInfo?.inventionTitle || '', {
            applicantName: biblioInfo?.applicantName || '',
            source: 'direct_access'
          })
        }
        
        console.log(`✅ [PatentDetail] 특허 상세 정보 로드 성공: ${appNumber}`)
      } else {
        throw new Error(response.error || 'No patent data found')
      }
    } catch (err: any) {
      console.error(`❌ [PatentDetail] 특허 상세 정보 로드 실패:`, err)
      setError(err.message)
      toast.error('특허 상세정보를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 특허 데이터가 로드되면 페이지 제목 설정
  useEffect(() => {
    console.log('[SEARCH] [PatentDetail] 페이지 제목 설정 useEffect 실행됨', { patent: !!patent, applicationNumber });
    
    if (patent) {
      const biblioInfo = patent.biblioSummaryInfoArray?.biblioSummaryInfo
      const patentTitle = biblioInfo?.inventionTitle
      
      console.log('[INFO] [PatentDetail] 특허 데이터 확인:', { 
        patentTitle, 
        biblioInfo: !!biblioInfo,
        applicationNumber: biblioInfo?.applicationNumber 
      });
      
      if (patentTitle && patentTitle.trim()) {
        // 로딩 메시지인지 확인
        const isLoadingMessage = patentTitle.includes('불러오는 중입니다') || 
                                patentTitle.includes('불러오는 중') ||
                                patentTitle.includes('로딩 중') || 
                                patentTitle.includes('Loading') ||
                                patentTitle.includes('특허 정보를 불러오는 중입니다') ||
                                patentTitle.includes('loading') ||
                                patentTitle.includes('특허 제목 정보를 불러오는 중') ||
                                patentTitle.includes('정보를 불러오는 중') ||
                                patentTitle.includes('데이터를 불러오는 중') ||
                                patentTitle.includes('처리 중') ||
                                patentTitle.includes('조회 중') ||
                                patentTitle.includes('검색 중') ||
                                patentTitle.includes('특허 정보를 불러오는 중입니다');
        
        let newTitle;
        if (isLoadingMessage) {
          // 로딩 메시지인 경우, 특허번호만 사용
          console.log('[WARN] [PatentDetail] 로딩 메시지 감지, 특허번호 기반 제목 사용');
          newTitle = `특허번호 ${applicationNumber} - 특허 정보`;
        } else if (patentTitle.startsWith('특허번호 ')) {
          // 이미 특허번호 형식인 경우
          newTitle = `${patentTitle} - 특허 정보`;
        } else {
          // 실제 특허 제목인 경우 "에 대한 특허 정보" 형식으로 표시
          newTitle = `${patentTitle}에 대한 특허 정보`;
        }
        
        console.log('[SUCCESS] [PatentDetail] 페이지 제목 설정:', newTitle);
        document.title = newTitle;
        
        // 강제로 제목 업데이트 확인
        setTimeout(() => {
          console.log('[UPDATE] [PatentDetail] 제목 설정 후 확인:', document.title);
        }, 100);
      } else {
        // 특허 제목이 없는 경우 기본값
        console.log('[WARN] [PatentDetail] 특허 제목이 없음, 기본값 사용');
        document.title = '특허 정보';
      }
    } else if (applicationNumber) {
      // 특허 데이터 로딩 중일 때
      console.log('[LOADING] [PatentDetail] 특허 데이터 로딩 중, 임시 제목 설정');
      document.title = `Patent Information for ${applicationNumber}`;
    }
    
    // 컴포넌트 언마운트 시 기본 제목으로 복원
    return () => {
      console.log('[CLEANUP] [PatentDetail] 컴포넌트 언마운트, 기본 제목으로 복원');
      document.title = 'IP Insight AI';
    }
  }, [patent, applicationNumber])

  // 추가적인 제목 강제 업데이트 (특허 제목이 변경될 때)
  useEffect(() => {
    if (patent?.biblioSummaryInfoArray?.biblioSummaryInfo?.inventionTitle) {
      const patentTitle = patent.biblioSummaryInfoArray.biblioSummaryInfo.inventionTitle;
      
      // 로딩 메시지인지 확인
      const isLoadingMessage = patentTitle.includes('불러오는 중입니다') || 
                              patentTitle.includes('불러오는 중') ||
                              patentTitle.includes('로딩 중') || 
                              patentTitle.includes('Loading') ||
                              patentTitle.includes('loading') ||
                              patentTitle.includes('특허 제목 정보를 불러오는 중') ||
                              patentTitle.includes('정보를 불러오는 중') ||
                              patentTitle.includes('데이터를 불러오는 중') ||
                              patentTitle.includes('처리 중') ||
                              patentTitle.includes('조회 중') ||
                              patentTitle.includes('검색 중');
      
      let newTitle;
      if (isLoadingMessage) {
        // 로딩 메시지인 경우, 특허번호만 사용
        newTitle = `특허번호 ${applicationNumber} - 특허 정보`;
      } else if (patentTitle.startsWith('특허번호 ')) {
        // 이미 특허번호 형식인 경우
        newTitle = `${patentTitle} - 특허 정보`;
      } else {
        // 실제 특허 제목인 경우 "에 대한 특허 정보" 형식으로 표시
        newTitle = `${patentTitle}에 대한 특허 정보`;
      }
      
      console.log('[UPDATE] [PatentDetail] 강제 제목 업데이트:', newTitle);
      
      // 즉시 업데이트
      document.title = newTitle;
      
      // 추가 확인을 위한 지연 업데이트
      const timeoutId = setTimeout(() => {
        document.title = newTitle;
        console.log('[SUCCESS] [PatentDetail] 지연 제목 업데이트 완료:', document.title);
      }, 500);
      
      return () => clearTimeout(timeoutId);
    }
  }, [patent?.biblioSummaryInfoArray?.biblioSummaryInfo?.inventionTitle, applicationNumber]);

  const handleShare = async () => {
    try {
      await navigator.share({
        title: patent?.biblioSummaryInfoArray?.biblioSummaryInfo?.inventionTitle || '특허 상세정보',
        url: window.location.href
      })
    } catch (err) {
      navigator.clipboard.writeText(window.location.href)
      toast.success('링크가 클립보드에 복사되었습니다.')
    }
  }

  // 브라우저 북마크 추가 함수
  const addToBrowserBookmarks = () => {
    const patentTitle = patent?.biblioSummaryInfoArray?.biblioSummaryInfo?.inventionTitle || '특허 상세정보'
    const currentUrl = window.location.href
    
    try {
      // Internet Explorer 지원
      if ((window as any).external && (window as any).external.AddFavorite) {
        (window as any).external.AddFavorite(currentUrl, patentTitle)
        toast.success('브라우저 북마크에 추가되었습니다.')
        return true
      }
      
      // 다른 브라우저들을 위한 안내
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
      const shortcut = isMac ? 'Cmd+D' : 'Ctrl+D'
      
      toast.info(`브라우저 북마크에 추가하려면 ${shortcut}를 눌러주세요.`, {
        duration: 4000
      })
      
      return false
    } catch (error) {
      console.error('브라우저 북마크 오류:', error)
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
      const shortcut = isMac ? 'Cmd+D' : 'Ctrl+D'
      
      toast.info(`브라우저 북마크에 추가하려면 ${shortcut}를 눌러주세요.`, {
        duration: 4000
      })
      
      return false
    }
  }

  const handleBookmark = async () => {
    if (!user?.id || !applicationNumber || !patent) {
      toast.error('북마크 기능을 사용하려면 로그인이 필요합니다.')
      return
    }

    let databaseBookmarkSuccess = false
    let browserBookmarkSuccess = false

    // 1. 데이터베이스 북마크 추가 (기존 기능)
    try {
      const result = await apiRequest(getApiUrl('/api/bookmarks'), {
        method: 'POST',
        requireAuth: true,
        timeout: 15000,
        retries: 2,
        body: JSON.stringify({
          userId: user.id,
          applicationNumber: applicationNumber,
          patentTitle: patent.biblioSummaryInfoArray?.biblioSummaryInfo?.inventionTitle || '제목 없음',
          applicantName: patent.applicantInfoArray?.applicantInfo?.[0]?.name || '출원인 없음',
          applicationDate: patent.biblioSummaryInfoArray?.biblioSummaryInfo?.applicationDate
        })
      })
      
      if (result.success) {
        databaseBookmarkSuccess = true
        toast.success('개인 북마크에 추가되었습니다.')
        
        // 대시보드 업데이트를 위한 이벤트 발생
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('bookmarkAdded', {
            detail: {
              applicationNumber: applicationNumber,
              patentTitle: patent.biblioSummaryInfoArray?.biblioSummaryInfo?.inventionTitle,
              applicantName: patent.applicantInfoArray?.applicantInfo?.[0]?.name,
              applicationDate: patent.biblioSummaryInfoArray?.biblioSummaryInfo?.applicationDate
            }
          }));
        }
        
        // 북마크 활동 추적
        if (user?.id) {
          activityTracker.trackBookmarkAdd(applicationNumber, patent.biblioSummaryInfoArray?.biblioSummaryInfo?.inventionTitle || '')
        }
      } else {
        toast.error(result.error || '개인 북마크 추가에 실패했습니다.')
      }
    } catch (error) {
      console.error('데이터베이스 북마크 오류:', error)
      toast.error('개인 북마크 기능에 오류가 발생했습니다.')
    }

    // 2. 브라우저 북마크 추가 (새로운 기능)
    try {
      browserBookmarkSuccess = addToBrowserBookmarks()
    } catch (error) {
      console.error('브라우저 북마크 오류:', error)
    }

    // 결과 요약 메시지
    if (databaseBookmarkSuccess && browserBookmarkSuccess) {
      toast.success('개인 북마크와 브라우저 북마크에 모두 추가되었습니다!')
    } else if (databaseBookmarkSuccess) {
      toast.success('개인 북마크에 추가되었습니다.')
    }
  }

  const handleBackToSearch = () => {
    // 이전 페이지 정보 확인 (브라우저 히스토리 기반)
    const referrer = document.referrer
    const currentOrigin = window.location.origin
    
    // 같은 도메인에서 온 경우 이전 페이지로 이동
    if (referrer && referrer.startsWith(currentOrigin)) {
      const referrerPath = new URL(referrer).pathname
      
      // 대시보드에서 온 경우 대시보드로 돌아가기
      if (referrerPath === '/dashboard' || referrerPath.startsWith('/dashboard/')) {
        navigate('/dashboard')
        return
      }
      
      // 검색 페이지에서 온 경우 검색 페이지로 돌아가기
      if (referrerPath === '/search') {
        const hasSearchState = loadSearchState()
        navigate('/search')
        return
      }
      
      // 기타 페이지에서 온 경우 히스토리 백
      if (window.history.length > 1) {
        navigate(-1)
        return
      }
    }
    
    // 기본값: 검색 페이지로 이동
    const hasSearchState = loadSearchState()
    navigate('/search')
  }

  const generateAIAnalysis = async () => {
    console.log('[ACTION] AI 분석 버튼 클릭됨!')
    if (!applicationNumber || !patent) {
      console.log('[ERROR] AI 분석 조건 미충족:', { applicationNumber, hasPatent: !!patent })
      return
    }
    
    // 이미 로딩 중이면 중복 실행 방지
    if (aiLoading) {
      console.log('[WARN] AI 분석이 이미 진행 중입니다.')
      return
    }
    
    try {
      console.log('[START] AI 분석 시작:', { applicationNumber, patentTitle: patent.biblioSummaryInfoArray?.biblioSummaryInfo?.inventionTitle })
      setAiLoading(true)
      setAiError(null)
      
      const requestBody = {
        patentData: patent,
        analysisType: 'comprehensive'
      }
      console.log('📤 AI 분석 요청 데이터:', requestBody)
      // AbortController를 사용해 요청 타임아웃 적용 - Vercel 환경 고려
      const controller = new AbortController()
      const timeoutMs = 120_000 // 120초로 대폭 증가 (복잡한 특허 분석과 대용량 응답 대비)
      const timeoutId = setTimeout(() => {
        console.warn(`[TIMEOUT] AI 분석 요청이 ${timeoutMs/1000}초를 초과하여 중단됩니다`)
        controller.abort()
      }, timeoutMs)

      const response = await apiRequest('/api/ai-analysis', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        signal: controller.signal
      })
      
      console.log('[API] AI 분석 응답:', response)
      
      if (!response.success) {
        const errorMessage = response.error || `API 요청 실패: ${response.status || 'Unknown error'}`
        throw new Error(errorMessage)
      }
      
      const data = response
      console.log('[DATA] AI 분석 응답 데이터:', data)
      
      if (data.success && data.data) {
        console.log('[SUCCESS] AI 분석 성공:', data.data)
        setAiAnalysis(data.data)
        toast.success('AI 분석이 완료되었습니다.')
        
        // 사용자 활동 추적 - AI 분석 생성
        if (user?.id) {
          try {
            activityTracker.trackAIAnalysis(applicationNumber, 'comprehensive', {
              analysisType: 'comprehensive',
              patentTitle: patent.biblioSummaryInfoArray?.biblioSummaryInfo?.inventionTitle || '',
              success: true
            })
          } catch (error) {
            console.error('AI 분석 활동 추적 오류:', error)
            // 활동 추적 실패는 AI 분석 기능에 영향을 주지 않음
          }
        }
      } else {
        console.error('[ERROR] AI 분석 데이터 구조 오류:', data)
        throw new Error(data.message || data.error || 'AI 분석 데이터를 받을 수 없습니다.')
      }
    } catch (err: any) {
      // 요청 타임아웃/중단 처리
      if (err?.name === 'AbortError') {
        console.error('[TIMEOUT] AI 분석 요청 시간 초과로 중단됨')
        setAiError('AI 분석 요청이 시간 초과(120초)로 중단되었습니다. 복잡한 특허 데이터 분석에는 시간이 오래 걸릴 수 있습니다. 네트워크 상태를 확인하고 잠시 후 다시 시도해주세요.')
        toast.error('AI 분석 요청이 시간 초과되었습니다. 잠시 후 다시 시도해주세요.')
      } else {
        console.error('[ERROR] AI 분석 전체 오류:', err)
        const errorMessage = err.message || 'AI 분석 생성 중 오류가 발생했습니다.'
        
        // 포인트 부족 에러 처리
        if (errorMessage.includes('포인트가 부족') || errorMessage.includes('Insufficient points')) {
          setAiError('포인트가 부족합니다. AI 분석 리포트 생성에는 600 포인트가 필요합니다.')
          toast.error('포인트가 부족합니다. 포인트를 충전한 후 다시 시도해주세요.', {
            action: {
              label: '포인트 충전',
              onClick: () => navigate('/payment')
            }
          })
        } else {
          setAiError(`${errorMessage}\n\n해결 방법:\n• 페이지를 새로고침 후 재시도\n• 브라우저 캐시를 삭제해보세요\n• 다른 브라우저에서 시도해보세요\n• 문제가 지속되면 관리자에게 문의하세요`)
          toast.error(`AI 분석 생성에 실패했습니다: ${errorMessage}`)
        }
      }
    } finally {
      // 로딩 해제
      setAiLoading(false)
    }
  }



  const checkDocumentAvailability = async () => {
    if (!applicationNumber) return
    
    const cacheKey = `doc_availability_${applicationNumber}`
    
    // 캐시된 데이터 확인 (24시간 유효) - 클라이언트 사이드에서만 실행
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        try {
          const { data, timestamp } = JSON.parse(cached)
          const isValid = Date.now() - timestamp < 24 * 60 * 60 * 1000 // 24시간
          if (isValid) {
            setDocumentAvailability(data)
            return
          }
        } catch (e) {
          // 캐시 데이터가 손상된 경우 삭제
          localStorage.removeItem(cacheKey)
        }
      }
    }
    
    try {
      setAvailabilityLoading(true)
      
      // 각 문서 타입별로 가용성 확인
      const availability: Record<DocumentType, boolean> = {} as Record<DocumentType, boolean>
      
      for (const docType of DOCUMENT_TYPES) {
        try {
          const data = await apiRequest(`/api/documents?applicationNumber=${applicationNumber}&documentType=${docType.type}`)
          
          console.log(`[checkDocumentAvailability] ${docType.type} 응답:`, data)
          
          // API 응답 구조에 맞게 수정
          if (data.success && data.data && data.data.files && data.data.files.length > 0) {
            availability[docType.type] = true
          } else {
            availability[docType.type] = false
          }
        } catch (err) {
          console.error(`[checkDocumentAvailability] ${docType.type} 오류:`, err)
          // 개별 문서 타입 확인 실패 시 false로 설정
          availability[docType.type] = false
        }
      }
      
      setDocumentAvailability(availability)
      
      // 결과를 캐시에 저장 - 클라이언트 사이드에서만 실행
      if (typeof window !== 'undefined') {
        localStorage.setItem(cacheKey, JSON.stringify({
          data: availability,
          timestamp: Date.now()
        }))
      }
    } catch (err: any) {
      console.error('Error checking document availability:', err)
      toast.error('문서 가용성 확인에 실패했습니다.')
    } finally {
      setAvailabilityLoading(false)
    }
  }

  const downloadDocument = async (documentType: DocumentType) => {
    if (!applicationNumber) return
    
    try {
      setDocumentLoading(prev => ({ ...prev, [documentType]: true }))
      
      const data = await apiRequest(`/api/documents?applicationNumber=${applicationNumber}&documentType=${documentType}`)
      
      console.log('[DOWNLOAD] 문서 다운로드 API 응답:', data)
      
      // API 응답 구조에 맞게 수정
      if (data.success && data.data && data.data.files && data.data.files.length > 0) {
        const document = data.data.files[0] // 첫 번째 파일 사용
        const downloadUrl = document.downloadUrl || document.path
        
        if (downloadUrl) {
          // 새 창에서 파일 다운로드
          window.open(downloadUrl, '_blank')
          toast.success(`${DOCUMENT_TYPES.find(dt => dt.type === documentType)?.name} 다운로드가 시작되었습니다.`)
          
          // 사용자 활동 추적 - 문서 다운로드
          if (user?.id) {
            const docTypeName = DOCUMENT_TYPES.find(dt => dt.type === documentType)?.name || documentType
            activityTracker.trackDocumentDownload(applicationNumber, docTypeName, document.fileSize || 0)
          }
        } else {
          throw new Error('다운로드 링크를 받을 수 없습니다.')
        }
      } else if (data.success === false) {
        // KIPRIS API에서 실패한 경우
        throw new Error(data.error || '문서를 찾을 수 없습니다.')
      } else {
        throw new Error('다운로드할 문서를 찾을 수 없습니다.')
      }
    } catch (err: any) {
      console.error('Error downloading document:', err)
      toast.error(`문서 다운로드에 실패했습니다: ${err.message}`)
    } finally {
      setDocumentLoading(prev => ({ ...prev, [documentType]: false }))
    }
  }



  if (loading) {
    return <LoadingPage />
  }

  if (error || !patent) {
    return (
      <div className="container mx-auto px-4 py-8">
          <div className="ms-card text-center max-w-md mx-auto">
            <h1 className="text-2xl font-semibold text-ms-text mb-4">
              특허 정보를 찾을 수 없습니다
            </h1>
            <p className="text-ms-text-muted mb-6">
              {error || '요청하신 특허 정보가 존재하지 않습니다.'}
            </p>
            <Button onClick={handleBackToSearch} className="bg-ms-olive hover:bg-ms-olive/90 text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              검색으로 돌아가기
            </Button>
          </div>
        </div>
    )
  }

  const biblioInfo = patent.biblioSummaryInfoArray?.biblioSummaryInfo
  const tabs = [
    { id: 'summary', label: '서지정보', icon: FileText },
    { id: 'abstract', label: '초록', icon: BookOpen },
    { id: 'claims', label: '청구항', icon: Scale },
    { id: 'applicant', label: '출원인', icon: Building },
    { id: 'inventor', label: '발명자', icon: User },
    { id: 'ipc', label: 'IPC분류', icon: Hash },
    { id: 'cpc', label: 'CPC분류', icon: Hash },
    { id: 'priority', label: '우선권정보', icon: Clock },
    { id: 'international', label: '국제출원정보', icon: Globe },
    { id: 'agent', label: '대리인정보', icon: Users },
    { id: 'designated', label: '지정국', icon: Globe },
    { id: 'prior-art', label: '선행기술조사문헌', icon: Search },
    { id: 'rnd', label: '국가연구개발사업정보', icon: Award },
    { id: 'legal', label: '행정처리', icon: Shield },
    { id: 'family', label: '패밀리', icon: Globe },
    { id: 'images', label: '도면', icon: ImageIcon },
    { id: 'documents', label: '문서 다운로드', icon: Download },
    { id: 'market-analysis', label: 'AI 시장분석', icon: TrendingUp },
    { id: 'business-insights', label: 'AI 비즈니스 인사이트', icon: DollarSign }
  ]

  return (
    <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button 
            variant="outline" 
            onClick={handleBackToSearch}
            className="flex items-center gap-2 border-ms-line-soft text-ms-text hover:bg-ms-soft hover:border-ms-burgundy transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            검색으로 돌아가기
          </Button>
          
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              onClick={handleShare} 
              className="border-ms-line-soft text-ms-text-muted hover:bg-ms-soft hover:text-ms-burgundy hover:border-ms-burgundy transition-colors"
            >
              <Share2 className="w-4 h-4 mr-2" />
              공유
            </Button>
            <Button 
              variant="outline" 
              onClick={handleBookmark} 
              className="border-ms-line-soft text-ms-text-muted hover:bg-ms-soft hover:text-ms-burgundy hover:border-ms-burgundy transition-colors"
            >
              <Bookmark className="w-4 h-4 mr-2" />
              북마크
            </Button>
          </div>
        </div>

        {/* Title Section - 특허 제목을 메인으로 표시 */}
        <Card className="ms-card mb-6">
          <CardHeader className="pb-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                {/* 특허 제목 - 가장 눈에 띄게 표시 */}
                <CardTitle className="text-3xl font-bold text-ms-text mb-4 leading-tight">
                  {biblioInfo?.inventionTitle || '제목 정보 없음'}
                  {biblioInfo?.applicationNumber && (
                    <span className="text-xl font-medium text-ms-text-muted ml-3">
                      (특허번호: {biblioInfo.applicationNumber})
                    </span>
                  )}
                </CardTitle>
                
                {/* 영문 제목 */}
                {biblioInfo?.inventionTitleEng && (
                  <p className="text-xl text-ms-text-muted mb-4 font-light italic">
                    {biblioInfo.inventionTitleEng}
                  </p>
                )}
                
                {/* 등록번호 - 서브 정보로 표시 */}
                {biblioInfo?.registerNumber && (
                  <div className="mb-4 p-3 bg-ms-soft/30 rounded-lg border border-ms-line-soft">
                    <div className="flex items-center gap-3">
                      <Hash className="w-5 h-5 text-ms-olive" />
                      <div>
                        <span className="text-sm font-medium text-ms-text-muted">등록번호</span>
                        <p className="text-lg font-semibold text-ms-olive tracking-wide">
                          {biblioInfo.registerNumber}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* 기타 정보 - 등록일과 상태만 표시 */}
                <div className="flex flex-wrap gap-4 text-sm text-ms-text-muted">
                  {biblioInfo?.registerDate && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-ms-text-light" />
                      <span className="font-medium">등록일:</span> 
                      {formatDateSimple(biblioInfo.registerDate)}
                    </div>
                  )}
                  {biblioInfo?.openDate && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-ms-text-light" />
                      <span className="font-medium">공개일:</span> 
                      {formatDateSimple(biblioInfo.openDate)}
                    </div>
                  )}
                  {biblioInfo?.publicationDate && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-ms-text-light" />
                      <span className="font-medium">공고일:</span> 
                      {formatDateSimple(biblioInfo.publicationDate)}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-ms-text-light" />
                    <span className="font-medium">상태:</span> 
                    {biblioInfo?.finalDisposal || biblioInfo?.registerStatus || '등록'}
                  </div>
                </div>
              </div>
              <div className="ml-6">
                <span className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  (biblioInfo?.finalDisposal === '등록' || biblioInfo?.registerStatus === '등록')
                    ? 'bg-ms-olive/10 text-ms-olive border border-ms-olive/20'
                    : 'bg-ms-burgundy/10 text-ms-burgundy border border-ms-burgundy/20'
                }`}>
                  {biblioInfo?.finalDisposal || biblioInfo?.registerStatus || '등록'}
                </span>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Tabs */}
        <div className="mb-8">
          <div className="border-b border-ms-line-soft">
            <nav className="-mb-px flex flex-wrap gap-x-2 gap-y-3 justify-start items-center overflow-hidden">
              {tabs.map((tab) => {
                const Icon = tab.icon
                const isSpecialTab = tab.id === 'market-analysis' || tab.id === 'business-insights'
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      console.log('[TAB] [PatentDetail] 탭 클릭:', tab.id, tab.label)
                      setActiveTab(tab.id)
                      setRenderedTabs(prev => new Set([...prev, tab.id]))
                      
                      // 탭 변경 활동 추적
                      if (user?.id && applicationNumber) {
                        activityTracker.trackPageNavigation(`/patent/${applicationNumber}#${tab.id}`, tab.label)
                      }
                    }}
                    className={`flex items-center gap-2 py-3 px-4 border-b-2 font-medium text-sm whitespace-nowrap transition-all duration-200 ${
                      activeTab === tab.id
                        ? isSpecialTab 
                          ? 'border-2 border-red-900 text-white bg-gradient-to-r from-red-900 to-red-800 rounded-lg shadow-lg hover:shadow-xl'
                          : 'border-ms-burgundy text-ms-burgundy bg-ms-burgundy/5'
                        : isSpecialTab
                          ? 'border-2 border-red-800/40 rounded-lg px-4 py-2 bg-gradient-to-r from-red-50 to-red-100 hover:from-red-100 hover:to-red-200 text-red-900 shadow-md hover:shadow-lg'
                          : 'border-transparent text-ms-text-muted hover:text-ms-text hover:border-ms-line hover:bg-ms-soft'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                )
              })}
            </nav>
          </div>
        </div>

        {/* Tab Content - 방문한 탭만 렌더링하고 상태 유지 */}
        <div className="space-y-6">
          {renderedTabs.has('summary') && (
            <div className={activeTab === 'summary' ? 'block' : 'hidden'}>
              <SummaryTab patent={patent} />
            </div>
          )}
          
          {renderedTabs.has('abstract') && (
            <div className={activeTab === 'abstract' ? 'block' : 'hidden'}>
              <AbstractTab patent={patent} />
            </div>
          )}
          
          {renderedTabs.has('claims') && (
            <div className={activeTab === 'claims' ? 'block' : 'hidden'}>
              <ClaimsTab patent={patent} />
            </div>
          )}
          
          {renderedTabs.has('applicant') && (
            <div className={activeTab === 'applicant' ? 'block' : 'hidden'}>
              <ApplicantTab patent={patent} />
            </div>
          )}
          
          {renderedTabs.has('inventor') && (
            <div className={activeTab === 'inventor' ? 'block' : 'hidden'}>
              <InventorTab patent={patent} />
            </div>
          )}
          
          {renderedTabs.has('ipc') && (
            <div className={activeTab === 'ipc' ? 'block' : 'hidden'}>
              <IpcTab patent={patent} />
            </div>
          )}
          
          {renderedTabs.has('cpc') && (
            <div className={activeTab === 'cpc' ? 'block' : 'hidden'}>
              <CpcTab patent={patent} />
            </div>
          )}
          
          {renderedTabs.has('priority') && (
            <div className={activeTab === 'priority' ? 'block' : 'hidden'}>
              <PriorityTab patent={patent} />
            </div>
          )}
          
          {renderedTabs.has('international') && (
            <div className={activeTab === 'international' ? 'block' : 'hidden'}>
              <InternationalTab patent={patent} />
            </div>
          )}
          
          {renderedTabs.has('agent') && (
            <div className={activeTab === 'agent' ? 'block' : 'hidden'}>
              <AgentTab patent={patent} />
            </div>
          )}
          
          {renderedTabs.has('designated') && (
            <div className={activeTab === 'designated' ? 'block' : 'hidden'}>
              <DesignatedStateTab patent={patent} />
            </div>
          )}
          
          {renderedTabs.has('prior-art') && (
            <div className={activeTab === 'prior-art' ? 'block' : 'hidden'}>
              <PriorArtTab patent={patent} />
            </div>
          )}
          
          {renderedTabs.has('rnd') && (
            <div className={activeTab === 'rnd' ? 'block' : 'hidden'}>
              <RndTab patent={patent} />
            </div>
          )}
          
          {renderedTabs.has('legal') && (
            <div className={activeTab === 'legal' ? 'block' : 'hidden'}>
              <LegalTab patent={patent} />
            </div>
          )}
          
          {renderedTabs.has('family') && (
            <div className={activeTab === 'family' ? 'block' : 'hidden'}>
              <FamilyTab patent={patent} />
            </div>
          )}
          
          {renderedTabs.has('images') && (
            <div className={activeTab === 'images' ? 'block' : 'hidden'}>
              <ImagesTab patent={patent} />
            </div>
          )}
          
          {renderedTabs.has('documents') && (
            <div className={activeTab === 'documents' ? 'block' : 'hidden'}>
              <DocumentsTab 
                patent={patent}
                availability={documentAvailability}
                loading={documentLoading}
                availabilityLoading={availabilityLoading}
                onCheckAvailability={checkDocumentAvailability}
                onDownload={downloadDocument}
              />
            </div>
          )}
          
          {renderedTabs.has('market-analysis') && (
            <div className={activeTab === 'market-analysis' ? 'block' : 'hidden'}>
              <MarketAnalysisReport 
                patent={patent} 
                analysis={aiAnalysis}
                loading={aiLoading}
                error={aiError}
                onGenerate={generateAIAnalysis}
              />
            </div>
          )}
          
          {renderedTabs.has('business-insights') && (
            <div className={activeTab === 'business-insights' ? 'block' : 'hidden'}>
              <BusinessInsightsReport 
                patent={patent} 
                analysis={aiAnalysis}
                loading={aiLoading}
                error={aiError}
                onGenerate={generateAIAnalysis}
              />
            </div>
          )}
        </div>
      </div>
  )
}

// Tab Components
function SummaryTab({ patent }: { patent: KiprisPatentDetailItem }) {
  const biblioInfo = patent.biblioSummaryInfoArray?.biblioSummaryInfo
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="ms-card">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-ms-text font-semibold">
            <FileText className="w-5 h-5 text-ms-burgundy" />
            기본 정보
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-ms-text-muted block mb-1">출원번호</label>
            <p className="text-ms-text font-medium">{biblioInfo?.applicationNumber || '-'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-ms-text-muted block mb-1">등록일</label>
            <p className="text-ms-text font-medium">{biblioInfo?.registerDate || biblioInfo?.applicationDate || '-'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-ms-text-muted block mb-1">등록번호</label>
            <p className="text-ms-text font-medium">{biblioInfo?.registerNumber || '-'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-ms-text-muted block mb-1">등록상태</label>
            <p className="text-ms-text font-medium">{biblioInfo?.registerStatus || biblioInfo?.finalDisposal || '심사중'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-ms-text-muted block mb-1">공개번호</label>
            <p className="text-ms-text">{biblioInfo?.openNumber || '-'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-ms-text-muted block mb-1">공개일</label>
            <p className="text-ms-text">{biblioInfo?.openDate || '-'}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="ms-card">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-ms-text font-semibold">
            <Award className="w-5 h-5 text-ms-olive" />
            심사 정보
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-ms-text-muted block mb-1">심사관</label>
            <p className="text-ms-text">{biblioInfo?.examinerName || '-'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-ms-text-muted block mb-1">최종처분</label>
            <p className="text-ms-text">{biblioInfo?.finalDisposal || '-'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-ms-text-muted block mb-1">청구항 수</label>
            <p className="text-ms-text font-medium">{biblioInfo?.claimCount || '-'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-ms-text-muted block mb-1">심사청구일</label>
            <p className="text-ms-text">{biblioInfo?.originalExaminationRequestDate || '-'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-ms-text-muted block mb-1">출원구분</label>
            <p className="text-ms-text">{biblioInfo?.originalApplicationKind || '-'}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

interface DocumentsTabProps {
  patent: KiprisPatentDetailItem
  availability: Record<DocumentType, boolean>
  loading: Record<DocumentType, boolean>
  availabilityLoading: boolean
  onCheckAvailability: () => void
  onDownload: (documentType: DocumentType) => void
}

function DocumentsTab({ 
  patent, 
  availability, 
  loading, 
  availabilityLoading, 
  onCheckAvailability, 
  onDownload 
}: DocumentsTabProps) {
  const hasAvailabilityData = Object.keys(availability).length > 0

  return (
    <div className="space-y-6">
      <Card className="ms-card">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-ms-text font-semibold">
              <Download className="w-5 h-5 text-ms-burgundy" />
              문서 다운로드
            </CardTitle>
            <Button 
              onClick={onCheckAvailability}
              disabled={availabilityLoading}
              className="border-ms-line-soft text-ms-text hover:bg-ms-soft hover:border-ms-burgundy hover:text-ms-burgundy"
              variant="outline"
              size="sm"
            >
              {availabilityLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  확인 중...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  문서 가용성 확인
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!hasAvailabilityData && !availabilityLoading && (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-ms-text-muted mx-auto mb-4" />
              <p className="text-ms-text-muted mb-4">
                문서 가용성을 확인하려면 위의 버튼을 클릭하세요.
              </p>
            </div>
          )}

          {hasAvailabilityData && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {DOCUMENT_TYPES.map((docType) => {
                const isAvailable = availability[docType.type]
                const isLoading = loading[docType.type]
                
                return (
                  <div
                    key={docType.type}
                    className="border border-ms-line-soft rounded-lg p-4 hover:bg-ms-soft transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <File className="w-5 h-5 text-ms-text-muted" />
                        <div>
                          <h3 className="font-medium text-sm text-ms-text">{docType.name}</h3>
                          <p className="text-xs text-ms-text-muted mt-1">{docType.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        {isAvailable ? (
                          <CheckCircle className="w-5 h-5 text-ms-olive" />
                        ) : (
                          <XCircle className="w-5 h-5 text-ms-burgundy" />
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        isAvailable 
                          ? 'bg-ms-olive/10 text-ms-olive border border-ms-olive/20'
                          : 'bg-ms-olive/10 text-ms-olive border border-ms-olive/20'
                      }`}>
                        {isAvailable ? '다운로드 가능' : '다운로드 불가'}
                      </span>
                      
                      <Button
                        size="sm"
                        className={isAvailable 
                          ? "bg-ms-olive hover:bg-ms-olive/90 text-white" 
                          : "border-ms-line-soft text-ms-text-muted hover:bg-ms-soft"
                        }
                        variant={isAvailable ? "primary" : "outline"}
                        disabled={!isAvailable || isLoading}
                        onClick={() => onDownload(docType.type)}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            다운로드 중...
                          </>
                        ) : (
                          <>
                            <Download className="w-3 h-3 mr-1" />
                            다운로드
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div className="mt-6 p-4 bg-ms-bg-soft rounded-lg border border-ms-line-soft">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-ms-burgundy mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-ms-text mb-1">
                  문서 다운로드 안내
                </p>
                <ul className="text-ms-text-muted space-y-1">
                  <li>• 문서는 KIPRIS 서버에서 직접 제공됩니다.</li>
                  <li>• 일부 문서는 특허 상태에 따라 제공되지 않을 수 있습니다.</li>
                  <li>• 다운로드 링크는 새 창에서 열립니다.</li>
                  <li>• 파일 형식은 주로 PDF입니다.</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function AbstractTab({ patent }: { patent: KiprisPatentDetailItem }) {
  const abstractInfo = patent.abstractInfoArray?.abstractInfo
  
  return (
    <Card className="ms-card">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-ms-text font-semibold">
          <BookOpen className="w-5 h-5 text-ms-burgundy" />
          초록
        </CardTitle>
      </CardHeader>
      <CardContent>
        {abstractInfo?.astrtCont ? (
          <div className="prose max-w-none">
            <p className="text-ms-text leading-relaxed whitespace-pre-wrap">
              {abstractInfo.astrtCont}
            </p>
          </div>
        ) : (
          <p className="text-ms-text-muted">초록 정보가 없습니다.</p>
        )}
      </CardContent>
    </Card>
  )
}

function ClaimsTab({ patent }: { patent: KiprisPatentDetailItem }) {
  const claims = patent.claimInfoArray?.claimInfo || []
  
  return (
    <Card className="ms-card">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-ms-text font-semibold">
          <Scale className="w-5 h-5 text-ms-burgundy" />
          청구항 ({claims.length}개)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {claims.length > 0 ? (
          <div className="space-y-6">
            {claims.map((claim, index) => (
              <div key={index} className="border-l-4 border-ms-burgundy pl-4 py-2">
                <h4 className="font-medium text-ms-text mb-2">
                  청구항 {index + 1}
                </h4>
                <p className="text-ms-text leading-relaxed whitespace-pre-wrap">
                  {claim.claim}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-ms-text-muted">청구항 정보가 없습니다.</p>
        )}
      </CardContent>
    </Card>
  )
}

function ApplicantTab({ patent }: { patent: KiprisPatentDetailItem }) {
  const applicants = patent.applicantInfoArray?.applicantInfo || []
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building className="w-5 h-5" />
          출원인 정보 ({applicants.length}명)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {applicants.length > 0 ? (
          <div className="space-y-4">
            {applicants.map((applicant, index) => (
              <div key={index} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">출원인명 (한글)</label>
                    <p className="text-gray-900 dark:text-white">{applicant.name || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">출원인명 (영문)</label>
                    <p className="text-gray-900 dark:text-white">{applicant.engName || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">주소</label>
                    <p className="text-gray-900 dark:text-white">{applicant.address || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">국가</label>
                    <p className="text-gray-900 dark:text-white">{applicant.country || '-'}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400">출원인 정보가 없습니다.</p>
        )}
      </CardContent>
    </Card>
  )
}

function InventorTab({ patent }: { patent: KiprisPatentDetailItem }) {
  const inventors = patent.inventorInfoArray?.inventorInfo || []
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5" />
          발명자 정보 ({inventors.length}명)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {inventors.length > 0 ? (
          <div className="space-y-4">
            {inventors.map((inventor, index) => (
              <div key={index} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">발명자명 (한글)</label>
                    <p className="text-gray-900 dark:text-white">{inventor.name || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">발명자명 (영문)</label>
                    <p className="text-gray-900 dark:text-white">{inventor.engName || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">주소</label>
                    <p className="text-gray-900 dark:text-white">{inventor.address || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">국가</label>
                    <p className="text-gray-900 dark:text-white">{inventor.country || '-'}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400">발명자 정보가 없습니다.</p>
        )}
      </CardContent>
    </Card>
  )
}

function IpcTab({ patent }: { patent: KiprisPatentDetailItem }) {
  const ipcInfo = patent.ipcInfoArray?.ipcInfo || []
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Hash className="w-5 h-5" />
          IPC 분류 ({ipcInfo.length}개)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {ipcInfo.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ipcInfo.map((ipc, index) => (
              <div key={index} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="text-center">
                  <p className="text-lg font-mono font-bold text-blue-600 dark:text-blue-400">
                    {ipc.ipcNumber}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {ipc.ipcDate}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400">IPC 분류 정보가 없습니다.</p>
        )}
      </CardContent>
    </Card>
  )
}

function LegalTab({ patent }: { patent: KiprisPatentDetailItem }) {
  const legalStatus = patent.legalStatusInfoArray?.legalStatusInfo || []
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          법적 상태 ({legalStatus.length}건)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {legalStatus.length > 0 ? (
          <div className="space-y-4">
            {legalStatus.map((status, index) => (
              <div key={index} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">처리상태</label>
                    <p className="text-gray-900 dark:text-white">{status.commonCodeName || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">접수일자</label>
                    <p className="text-gray-900 dark:text-white">{status.receiptDate || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">서류명</label>
                    <p className="text-gray-900 dark:text-white">{status.documentName || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">접수번호</label>
                    <p className="text-gray-900 dark:text-white">{status.receiptNumber || '-'}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400">법적 상태 정보가 없습니다.</p>
        )}
      </CardContent>
    </Card>
  )
}

function FamilyTab({ patent }: { patent: KiprisPatentDetailItem }) {
  const familyInfo = patent.familyInfoArray?.familyInfo && 'familyApplicationNumber' in patent.familyInfoArray.familyInfo 
    ? [patent.familyInfoArray.familyInfo] 
    : []
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="w-5 h-5" />
          패밀리 특허 ({familyInfo.length}건)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {familyInfo.length > 0 ? (
          <div className="space-y-4">
            {familyInfo.map((family, index) => (
              <div key={index} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <p className="text-gray-900 dark:text-white font-mono">
                  {('familyApplicationNumber' in family ? family.familyApplicationNumber : '정보 없음') as string}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400">패밀리 특허 정보가 없습니다.</p>
        )}
      </CardContent>
    </Card>
  )
}

function ImagesTab({ patent }: { patent: KiprisPatentDetailItem }) {
  const [imageLoading, setImageLoading] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [showImageModal, setShowImageModal] = useState(false)
  const [selectedImageUrl, setSelectedImageUrl] = useState('')
  
  const imageInfo = patent.imagePathInfo
  
  const handleViewImage = (imageUrl: string) => {
    if (imageUrl) {
      setSelectedImageUrl(imageUrl)
      setShowImageModal(true)
    } else {
      toast.error('이미지 URL이 유효하지 않습니다.')
    }
  }

  const handleDownloadImage = async (imageUrl: string, fileName: string) => {
    if (!imageUrl) {
      toast.error('다운로드할 이미지 URL이 없습니다.')
      return
    }

    try {
      setImageLoading(true)
      
      // 이미지를 새 탭에서 열기 (직접 다운로드)
      const link = document.createElement('a')
      link.href = imageUrl
      link.target = '_blank'
      link.download = fileName || 'patent_image.jpg'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      toast.success('이미지 다운로드가 시작되었습니다.')
    } catch (error) {
      console.error('Image download error:', error)
      toast.error('이미지 다운로드 중 오류가 발생했습니다.')
    } finally {
      setImageLoading(false)
    }
  }

  if (!imageInfo?.path) {
    return (
      <Card variant="default">
        <CardContent className="p-6">
          <div className="text-center text-secondary-500 dark:text-secondary-400">
            <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>도면 정보가 없습니다.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card variant="default">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-secondary-900 dark:text-secondary-100">
            <ImageIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            특허 도면
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* 도면 미리보기 */}
            {imageInfo.path && (
              <div className="border border-secondary-200 dark:border-secondary-700 rounded-lg overflow-hidden">
                <img 
                  src={imageInfo.path}
                  alt={`${patent.biblioSummaryInfoArray?.biblioSummaryInfo?.inventionTitle || '특허'} 도면`}
                  className="w-full h-64 object-contain bg-secondary-50 dark:bg-secondary-800"
                  onError={() => setImageError(true)}
                  onLoad={() => setImageError(false)}
                />
                {imageError && (
                  <div className="w-full h-64 bg-secondary-100 dark:bg-secondary-800 flex items-center justify-center">
                    <div className="text-center text-secondary-500 dark:text-secondary-400">
                      <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>이미지를 불러올 수 없습니다</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 도면 정보 테이블 */}
            <div className="bg-secondary-50 dark:bg-secondary-800 p-4 rounded-lg ms-line-frame">
              <h4 className="font-medium mb-3 text-secondary-900 dark:text-secondary-100">도면 정보</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <tbody className="space-y-2">
                    <tr>
                      <td className="font-medium text-secondary-600 dark:text-secondary-400 py-1 pr-4 whitespace-nowrap">문서명:</td>
                      <td className="text-secondary-900 dark:text-secondary-100 py-1 break-all">
                        {imageInfo.docName || '정보 없음'}
                      </td>
                    </tr>
                    <tr>
                      <td className="font-medium text-secondary-600 dark:text-secondary-400 py-1 pr-4 whitespace-nowrap">이미지 경로:</td>
                      <td className="text-secondary-900 dark:text-secondary-100 py-1">
                        <div className="max-w-md break-all text-xs bg-secondary-100 dark:bg-secondary-700 p-2 rounded font-mono">
                          {imageInfo.path}
                        </div>
                      </td>
                    </tr>
                    {imageInfo.largePath && (
                      <tr>
                        <td className="font-medium text-secondary-600 dark:text-secondary-400 py-1 pr-4 whitespace-nowrap">고해상도 경로:</td>
                        <td className="text-secondary-900 dark:text-secondary-100 py-1">
                          <div className="max-w-md break-all text-xs bg-secondary-100 dark:bg-secondary-700 p-2 rounded font-mono">
                            {imageInfo.largePath}
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* 액션 버튼들 */}
            <div className="flex flex-wrap gap-3">
              <Button 
                variant="outline" 
                onClick={() => handleViewImage(imageInfo.largePath || imageInfo.path)}
                disabled={!imageInfo.path}
                aria-label="도면 크게 보기"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                도면 보기
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => handleDownloadImage(
                  imageInfo.largePath || imageInfo.path, 
                  `patent_${patent.biblioSummaryInfoArray?.biblioSummaryInfo?.applicationNumber}_drawing.jpg`
                )}
                disabled={imageLoading || !imageInfo.path}
                aria-label="도면 다운로드"
              >
                {imageLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    다운로드 중...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    다운로드
                  </>
                )}
              </Button>

              {imageInfo.largePath && (
                <Button 
                  variant="outline" 
                  onClick={() => handleDownloadImage(
                    imageInfo.largePath, 
                    `patent_${patent.biblioSummaryInfoArray?.biblioSummaryInfo?.applicationNumber}_drawing_hd.jpg`
                  )}
                  disabled={imageLoading}
                  aria-label="고해상도 도면 다운로드"
                >
                  {imageLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      다운로드 중...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      고해상도 다운로드
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* 안내 메시지 */}
            <div className="p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-primary-500 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-primary-900 dark:text-primary-100 mb-1">
                    도면 이용 안내
                  </p>
                  <ul className="text-primary-700 dark:text-primary-300 space-y-1">
                    <li>• 도면은 KIPRIS에서 제공하는 원본 이미지입니다.</li>
                    <li>• 고해상도 이미지가 있는 경우 더 선명한 화질로 제공됩니다.</li>
                    <li>• 이미지를 클릭하면 새 창에서 원본 크기로 볼 수 있습니다.</li>
                    <li>• 다운로드한 이미지는 개인적인 용도로만 사용해주세요.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 이미지 모달 */}
      {showImageModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setShowImageModal(false)}
        >
          <div className="relative max-w-4xl max-h-full">
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute -top-10 right-0 text-white hover:text-secondary-300 transition-colors"
              aria-label="이미지 닫기"
            >
              <XCircle className="w-8 h-8" />
            </button>
            <img 
              src={selectedImageUrl}
              alt="특허 도면 확대보기"
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </>
  )
}

// CPC 분류 정보 탭
function CpcTab({ patent }: { patent: KiprisPatentDetailItem }) {
  const cpcInfo = patent.cpcInfoArray?.cpcInfo || []

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Award className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold">CPC 분류 정보</h3>
      </div>
      
      {cpcInfo.length > 0 ? (
        <div className="grid gap-4">
          {cpcInfo.map((cpc, index) => (
            <Card key={index}>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-600">CPC 코드</span>
                    <p className="font-medium">{cpc.cpcNumber || '-'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">CPC 개정일자</span>
                    <p className="font-medium">{formatDate(cpc.cpcDate) || '-'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          CPC 분류 정보가 없습니다.
        </div>
      )}
    </div>
  )
}

// 우선권 정보 탭
function PriorityTab({ patent }: { patent: KiprisPatentDetailItem }) {
  const priorityInfo = patent.priorityInfoArray?.priorityInfo || []

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold">우선권 정보</h3>
      </div>
      
      {priorityInfo.length > 0 ? (
        <div className="grid gap-4">
          {priorityInfo.map((priority, index) => (
            <Card key={index}>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <span className="text-sm text-gray-600">우선권주장국가</span>
                    <p className="font-medium">{priority.priorityApplicationCountry || '-'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">우선권주장번호</span>
                    <p className="font-medium">{priority.priorityApplicationNumber || '-'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">우선권주장일자</span>
                    <p className="font-medium">{formatDate(priority.priorityApplicationDate) || '-'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          우선권 정보가 없습니다.
        </div>
      )}
    </div>
  )
}

// 국제출원 정보 탭
function InternationalTab({ patent }: { patent: KiprisPatentDetailItem }) {
  const internationalInfo = patent.internationalInfoArray?.internationalInfo || []

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Globe className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold">국제출원 정보</h3>
      </div>
      
      {internationalInfo.length > 0 ? (
        <div className="grid gap-4">
          {internationalInfo.map((intl, index) => (
            <Card key={index}>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-600">국제출원번호</span>
                    <p className="font-medium">{intl.internationalApplicationNumber || '-'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">국제출원일자</span>
                    <p className="font-medium">{formatDate(intl.internationalApplicationDate) || '-'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">국제공개번호</span>
                    <p className="font-medium">{intl.internationOpenNumber || '-'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">국제공개일자</span>
                    <p className="font-medium">{formatDate(intl.internationOpenDate) || '-'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          국제출원 정보가 없습니다.
        </div>
      )}
    </div>
  )
}

// 대리인 정보 탭
function AgentTab({ patent }: { patent: KiprisPatentDetailItem }) {
  const agentInfo = patent.agentInfoArray?.agentInfo || []

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Briefcase className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold">대리인 정보</h3>
      </div>
      
      {agentInfo.length > 0 ? (
        <div className="grid gap-4">
          {agentInfo.map((agent, index) => (
            <Card key={index}>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-600">대리인명 (한글)</span>
                    <p className="font-medium">{agent.name || '-'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">대리인명 (영문)</span>
                    <p className="font-medium">{agent.engName || '-'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">대리인번호</span>
                    <p className="font-medium">{agent.code || '-'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">대리인국가</span>
                    <p className="font-medium">{agent.country || '-'}</p>
                  </div>
                  <div className="md:col-span-2">
                    <span className="text-sm text-gray-600">대리인주소</span>
                    <p className="font-medium">{agent.address || '-'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          대리인 정보가 없습니다.
        </div>
      )}
    </div>
  )
}

// 지정국 정보 탭
function DesignatedStateTab({ patent }: { patent: KiprisPatentDetailItem }) {
  const designatedStateInfo = patent.designatedStateInfoArray?.designatedStateInfo || []

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Globe className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold">지정국 정보</h3>
      </div>
      
      {designatedStateInfo.length > 0 ? (
        <div className="grid gap-4">
          {designatedStateInfo.map((state, index) => (
            <Card key={index}>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-600">지정국가</span>
                    <p className="font-medium">{state.country || '-'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">지정국가그룹</span>
                    <p className="font-medium">{state.kind || '-'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          지정국 정보가 없습니다.
        </div>
      )}
    </div>
  )
}

// 선행기술조사문헌 탭
function PriorArtTab({ patent }: { patent: KiprisPatentDetailItem }) {
  const priorArtInfo = patent.priorArtDocumentsInfoArray?.priorArtDocumentsInfo || []

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Search className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold">선행기술조사문헌</h3>
      </div>
      
      {priorArtInfo.length > 0 ? (
        <div className="grid gap-4">
          {priorArtInfo.map((doc, index) => (
            <Card key={index}>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-600">선행기술조사문헌번호</span>
                    <p className="font-medium">{doc.documentsNumber || '-'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">심사관인용여부</span>
                    <p className="font-medium">
                      {doc.examinerQuotationFlag === 'Y' ? '인용' : 
                       doc.examinerQuotationFlag === 'N' ? '미인용' : '-'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          선행기술조사문헌 정보가 없습니다.
        </div>
      )}
    </div>
  )
}

// 국가연구개발사업 정보 탭
function RndTab({ patent }: { patent: KiprisPatentDetailItem }) {
  const rndInfo = patent.rndInfoArray?.rndInfo || []

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Award className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold">국가연구개발사업 정보</h3>
      </div>
      
      {rndInfo.length > 0 ? (
        <div className="grid gap-4">
          {rndInfo.map((rnd, index) => (
            <Card key={index}>
              <CardContent className="p-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-gray-600">연구부처명</span>
                      <p className="font-medium">{rnd.rndDepartmentName || '-'}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">연구사업명</span>
                      <p className="font-medium">{rnd.rndProjectName || '-'}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-gray-600">주관기관명</span>
                      <p className="font-medium">{rnd.rndManagingInstituteName || '-'}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">연구관리전문기관명</span>
                      <p className="font-medium">{rnd.rndSpecialInstituteName || '-'}</p>
                    </div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">연구과제명</span>
                    <p className="font-medium">{rnd.rndTaskName || '-'}</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-gray-600">연구개발과제번호</span>
                      <p className="font-medium">{rnd.rndTaskNumber || '-'}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">연구과제기여율내용</span>
                      <p className="font-medium">{rnd.rndTaskContribution || '-'}</p>
                    </div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">연구기관내용</span>
                    <p className="font-medium">{rnd.rndDuration || '-'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          국가연구개발사업 정보가 없습니다.
        </div>
      )}
    </div>
  )
}

// AI 분석이 필요할 때 자동으로 생성하는 로직을 각 보고서 컴포넌트에서 처리
// 기존 AIAnalysisTab 컴포넌트는 제거되고 새로운 독립적인 보고서 컴포넌트들로 대체됨