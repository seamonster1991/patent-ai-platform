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
import Layout from '../components/Layout/Layout'
import Button from '../components/UI/Button'
import Card, { CardContent, CardHeader, CardTitle } from '../components/UI/Card'
import { LoadingPage } from '../components/UI/Loading'
import { KiprisPatentDetailItem, AIAnalysisReport, AIAnalysisStructure, DocumentType, DOCUMENT_TYPES, DocumentDownloadResponse } from '../types/kipris'
import { formatDate } from '../lib/utils'
import { toast } from 'sonner'

import { useSearchStore } from '../store/searchStore'
import { useAuthStore } from '../store/authStore'
import { ActivityTracker } from '../lib/activityTracker'
import MarketAnalysisReport from '../components/Reports/MarketAnalysisReport'
import BusinessInsightsReport from '../components/Reports/BusinessInsightsReport'


export default function PatentDetail() {
  console.log('🔍 [PatentDetail] 컴포넌트 로드됨');
  
  const { applicationNumber } = useParams<{ applicationNumber: string }>()
  console.log('🔍 [PatentDetail] applicationNumber:', applicationNumber);
  console.log('🔍 [PatentDetail] 현재 URL:', window.location.href);
  
  const navigate = useNavigate()
  const { loadSearchState } = useSearchStore()
  const [patent, setPatent] = useState<KiprisPatentDetailItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [activeTab, setActiveTab] = useState('summary')
  const [renderedTabs, setRenderedTabs] = useState<Set<string>>(new Set(['summary'])) // 렌더링된 탭 추적
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisReport | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [documentAvailability, setDocumentAvailability] = useState<Record<DocumentType, boolean>>({} as Record<DocumentType, boolean>)
  const [documentLoading, setDocumentLoading] = useState<Record<DocumentType, boolean>>({} as Record<DocumentType, boolean>)
  const [availabilityLoading, setAvailabilityLoading] = useState(false)


  useEffect(() => {
    console.log('🔍 [PatentDetail] useEffect 실행됨, applicationNumber:', applicationNumber);
    if (applicationNumber) {
      console.log('🔍 [PatentDetail] fetchPatentDetail 호출 시작');
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
      
      const response = await fetch(`/api/detail?applicationNumber=${appNumber}`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch patent details')
      }
      
      if (data.success && data.data) {
        setPatent(data.data.body.item)
        
        // 사용자 활동 추적 - 특허 상세 조회
        try {
          const { user } = useAuthStore.getState()
          if (user) {
            const activityTracker = ActivityTracker.getInstance()
            activityTracker.setUserId(user.id)
            await activityTracker.trackPatentView(
              appNumber,
              data.data.body.item.biblioSummaryInfo?.inventionTitle || '제목 없음'
            )
          }
        } catch (error) {
          console.error('특허 조회 활동 추적 오류:', error)
          // 활동 추적 실패는 특허 조회 기능에 영향을 주지 않음
        }
      } else {
        throw new Error('No patent data found')
      }
    } catch (err: any) {
      setError(err.message)
      toast.error('특허 상세정보를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleShare = async () => {
    try {
      await navigator.share({
        title: patent?.biblioSummaryInfo?.inventionTitle || '특허 상세정보',
        url: window.location.href
      })
    } catch (err) {
      navigator.clipboard.writeText(window.location.href)
      toast.success('링크가 클립보드에 복사되었습니다.')
    }
  }

  const handleBookmark = () => {
    toast.success('북마크에 추가되었습니다.')
  }

  const handleBackToSearch = () => {
    // 검색 페이지로 이동하기 전에 저장된 검색 상태가 있는지 확인
    const hasSearchState = loadSearchState()
    navigate('/search')
  }

  const generateAIAnalysis = async () => {
    console.log('🔥 AI 분석 버튼 클릭됨!')
    if (!applicationNumber || !patent) {
      console.log('❌ AI 분석 조건 미충족:', { applicationNumber, hasPatent: !!patent })
      return
    }
    
    // 이미 로딩 중이면 중복 실행 방지
    if (aiLoading) {
      console.log('⚠️ AI 분석이 이미 진행 중입니다.')
      return
    }
    
    try {
      console.log('🚀 AI 분석 시작:', { applicationNumber, patentTitle: patent.biblioSummaryInfo?.inventionTitle })
      setAiLoading(true)
      setAiError(null)
      
      const requestBody = {
        patentData: patent,
        analysisType: 'comprehensive'
      }
      console.log('📤 AI 분석 요청 데이터:', requestBody)
      // AbortController를 사용해 요청 타임아웃 적용 - Vercel 환경 고려
      const controller = new AbortController()
      const timeoutMs = 30_000 // 30초 (복잡한 특허 분석을 위한 충분한 시간)
      const timeoutId = setTimeout(() => {
        console.warn(`⏱️ AI 분석 요청이 ${timeoutMs/1000}초를 초과하여 중단됩니다`)
        controller.abort()
      }, timeoutMs)

      const response = await fetch('/api/ai-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      })
      
      console.log('📡 AI 분석 응답 상태:', response.status, response.statusText)
      
      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`
        try {
          const errorData = await response.text()
          if (errorData) {
            try {
              const parsedError = JSON.parse(errorData)
              errorMessage = parsedError.message || parsedError.error || errorMessage
            } catch {
              errorMessage = errorData || errorMessage
            }
          }
        } catch (e) {
          console.log('❌ 에러 응답 파싱 실패:', e)
        }
        throw new Error(errorMessage)
      }
      
      const data = await response.json()
      console.log('📊 AI 분석 응답 데이터:', data)
      
      if (data.success && data.data) {
        console.log('✅ AI 분석 성공:', data.data)
        setAiAnalysis(data.data)
        toast.success('AI 분석이 완료되었습니다.')
        
        // 사용자 활동 추적 - AI 분석 생성
        try {
          const { user } = useAuthStore.getState()
          if (user) {
            const activityTracker = ActivityTracker.getInstance()
            activityTracker.setUserId(user.id)
            await activityTracker.trackAIAnalysis(
              applicationNumber,
              'comprehensive'
            )
          }
        } catch (error) {
          console.error('AI 분석 활동 추적 오류:', error)
          // 활동 추적 실패는 AI 분석 기능에 영향을 주지 않음
        }
      } else {
        console.error('❌ AI 분석 데이터 구조 오류:', data)
        throw new Error(data.message || data.error || 'AI 분석 데이터를 받을 수 없습니다.')
      }
    } catch (err: any) {
      // 요청 타임아웃/중단 처리
      if (err?.name === 'AbortError') {
        console.error('⏱️ AI 분석 요청 시간 초과로 중단됨')
        setAiError('AI 분석 요청이 시간 초과(30초)로 중단되었습니다. 복잡한 특허 데이터 분석에는 시간이 오래 걸릴 수 있습니다. 네트워크 상태를 확인하고 잠시 후 다시 시도해주세요.')
        toast.error('AI 분석 요청이 시간 초과되었습니다. 잠시 후 다시 시도해주세요.')
      } else {
        console.error('❌ AI 분석 전체 오류:', err)
        const errorMessage = err.message || 'AI 분석 생성 중 오류가 발생했습니다.'
        setAiError(`${errorMessage}\n\n해결 방법:\n• 페이지를 새로고침 후 재시도\n• 브라우저 캐시를 삭제해보세요\n• 다른 브라우저에서 시도해보세요\n• 문제가 지속되면 관리자에게 문의하세요`)
        toast.error(`AI 분석 생성에 실패했습니다: ${errorMessage}`)
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
          const response = await fetch(`/api/documents?applicationNumber=${applicationNumber}&documentType=${docType.type}`)
          const data = await response.json()
          
          // 성공적으로 응답을 받고 파일 정보가 있으면 사용 가능
          availability[docType.type] = response.ok && data.success && data.data && data.data.length > 0
        } catch (err) {
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
      
      const response = await fetch(`/api/documents?applicationNumber=${applicationNumber}&documentType=${documentType}`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || '문서 다운로드에 실패했습니다.')
      }
      
      if (data.success && data.data && data.data.length > 0) {
        const document = data.data[0] // 첫 번째 문서 사용
        if (document.downloadUrl || document.path) {
          // 새 창에서 파일 다운로드
          const downloadUrl = document.downloadUrl || document.path
          window.open(downloadUrl, '_blank')
          toast.success(`${DOCUMENT_TYPES.find(dt => dt.type === documentType)?.name} 다운로드가 시작되었습니다.`)
          
          // 사용자 활동 추적 - 문서 다운로드
          try {
            const { user } = useAuthStore.getState()
            if (user) {
              const activityTracker = ActivityTracker.getInstance()
              activityTracker.setUserId(user.id)
              await activityTracker.trackDocumentDownload(
                applicationNumber,
                documentType
              )
            }
          } catch (error) {
            console.error('문서 다운로드 활동 추적 오류:', error)
            // 활동 추적 실패는 문서 다운로드 기능에 영향을 주지 않음
          }
        } else {
          throw new Error('다운로드 링크를 받을 수 없습니다.')
        }
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
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              특허 정보를 찾을 수 없습니다
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {error || '요청하신 특허 정보가 존재하지 않습니다.'}
            </p>
            <Button onClick={handleBackToSearch}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              검색으로 돌아가기
            </Button>
          </div>
        </div>
      </Layout>
    )
  }

  const biblioInfo = patent.biblioSummaryInfo
  const tabs = [
    { id: 'summary', label: '서지정보', icon: FileText },
    { id: 'abstract', label: '초록', icon: BookOpen },
    { id: 'claims', label: '청구항', icon: Scale },
    { id: 'applicant', label: '출원인', icon: Building },
    { id: 'inventor', label: '발명자', icon: User },
    { id: 'ipc', label: 'IPC분류', icon: Hash },
    { id: 'legal', label: '법적상태', icon: Shield },
    { id: 'family', label: '패밀리', icon: Globe },
    { id: 'images', label: '도면', icon: ImageIcon },
    { id: 'documents', label: '문서 다운로드', icon: Download },
    { id: 'market-analysis', label: '시장 분석', icon: TrendingUp },
    { id: 'business-insights', label: '비즈니스 인사이트', icon: DollarSign }
  ]

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button 
            variant="outline" 
            onClick={handleBackToSearch}
            className="flex items-center gap-2 ms-olive-text ms-olive-hover"
          >
            <ArrowLeft className="w-4 h-4" />
            검색으로 돌아가기
          </Button>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleShare} className="ms-olive-text ms-olive-hover">
              <Share2 className="w-4 h-4 mr-2" />
              공유
            </Button>
            <Button variant="outline" onClick={handleBookmark} className="ms-olive-text ms-olive-hover">
              <Bookmark className="w-4 h-4 mr-2" />
              북마크
            </Button>
          </div>
        </div>

        {/* Title Section */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-2xl mb-2">
                  {biblioInfo?.inventionTitle || '제목 없음'}
                </CardTitle>
                {biblioInfo?.inventionTitleEng && (
                  <p className="text-lg text-gray-600 dark:text-gray-400 mb-4">
                    {biblioInfo.inventionTitleEng}
                  </p>
                )}
                <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-1">
                    <Hash className="w-4 h-4" />
                    출원번호: {biblioInfo?.applicationNumber}
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    출원일: {biblioInfo?.applicationDate}
                  </div>
                  <div className="flex items-center gap-1">
                    <FileText className="w-4 h-4" />
                    상태: {biblioInfo?.registerStatus || '미등록'}
                  </div>
                </div>
              </div>
              <div className="ml-4">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  biblioInfo?.registerStatus === '등록' 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                }`}>
                  {biblioInfo?.registerStatus || '미등록'}
                </span>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8 overflow-x-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      console.log('🔄 [PatentDetail] 탭 클릭:', tab.id, tab.label)
                      setActiveTab(tab.id)
                      setRenderedTabs(prev => new Set([...prev, tab.id]))
                    }}
                    className={`flex items-center gap-2 py-2 px-1 border-b-2 font-bold text-sm whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'border-ms-olive text-ms-olive'
                        : 'border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
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
    </Layout>
  )
}

// Tab Components
function SummaryTab({ patent }: { patent: KiprisPatentDetailItem }) {
  const biblioInfo = patent.biblioSummaryInfo
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card variant="default">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-secondary-900 dark:text-secondary-100">
            <FileText className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            기본 정보
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-secondary-600 dark:text-secondary-400 block mb-1">출원번호</label>
            <p className="text-secondary-900 dark:text-secondary-100 font-medium">{biblioInfo?.applicationNumber || '-'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-secondary-600 dark:text-secondary-400 block mb-1">출원일</label>
            <p className="text-secondary-900 dark:text-secondary-100">{biblioInfo?.applicationDate || '-'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-secondary-600 dark:text-secondary-400 block mb-1">공개번호</label>
            <p className="text-secondary-900 dark:text-secondary-100">{biblioInfo?.openNumber || '-'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-secondary-600 dark:text-secondary-400 block mb-1">공개일</label>
            <p className="text-secondary-900 dark:text-secondary-100">{biblioInfo?.openDate || '-'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-secondary-600 dark:text-secondary-400 block mb-1">등록번호</label>
            <p className="text-secondary-900 dark:text-secondary-100 font-medium">{biblioInfo?.registerNumber || '-'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-secondary-600 dark:text-secondary-400 block mb-1">등록일</label>
            <p className="text-secondary-900 dark:text-secondary-100">{biblioInfo?.registerDate || '-'}</p>
          </div>
        </CardContent>
      </Card>

      <Card variant="default">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-secondary-900 dark:text-secondary-100">
            <Award className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            심사 정보
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-secondary-600 dark:text-secondary-400 block mb-1">심사관</label>
            <p className="text-secondary-900 dark:text-secondary-100">{biblioInfo?.examinerName || '-'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-secondary-600 dark:text-secondary-400 block mb-1">최종처분</label>
            <p className="text-secondary-900 dark:text-secondary-100">{biblioInfo?.finalDisposal || '-'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-secondary-600 dark:text-secondary-400 block mb-1">청구항 수</label>
            <p className="text-secondary-900 dark:text-secondary-100 font-medium">{biblioInfo?.claimCount || '-'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-secondary-600 dark:text-secondary-400 block mb-1">심사청구일</label>
            <p className="text-secondary-900 dark:text-secondary-100">{biblioInfo?.originalExaminationRequestDate || '-'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-secondary-600 dark:text-secondary-400 block mb-1">출원구분</label>
            <p className="text-secondary-900 dark:text-secondary-100">{biblioInfo?.originalApplicationKind || '-'}</p>
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
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Download className="w-5 h-5" />
              문서 다운로드
            </CardTitle>
            <Button 
              onClick={onCheckAvailability}
              disabled={availabilityLoading}
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
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 mb-4">
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
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <File className="w-5 h-5 text-gray-500" />
                        <div>
                          <h3 className="font-medium text-sm">{docType.name}</h3>
                          <p className="text-xs text-gray-500 mt-1">{docType.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        {isAvailable ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-500" />
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        isAvailable 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}>
                        {isAvailable ? '다운로드 가능' : '다운로드 불가'}
                      </span>
                      
                      <Button
                        size="sm"
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

          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                  문서 다운로드 안내
                </p>
                <ul className="text-blue-700 dark:text-blue-300 space-y-1">
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
  const abstractInfo = patent.abstractInfo
  
  return (
    <Card variant="default">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-secondary-900 dark:text-secondary-100">
          <BookOpen className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          초록
        </CardTitle>
      </CardHeader>
      <CardContent>
        {abstractInfo?.astrtCont ? (
          <div className="prose dark:prose-invert max-w-none">
            <p className="text-secondary-900 dark:text-secondary-100 leading-relaxed whitespace-pre-wrap">
              {abstractInfo.astrtCont}
            </p>
          </div>
        ) : (
          <p className="text-secondary-500 dark:text-secondary-400">초록 정보가 없습니다.</p>
        )}
      </CardContent>
    </Card>
  )
}

function ClaimsTab({ patent }: { patent: KiprisPatentDetailItem }) {
  const claims = patent.claimInfo || []
  
  return (
    <Card variant="default">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-secondary-900 dark:text-secondary-100">
          <Scale className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          청구항 ({claims.length}개)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {claims.length > 0 ? (
          <div className="space-y-6">
            {claims.map((claim, index) => (
              <div key={index} className="border-l-4 border-primary-500 dark:border-primary-400 pl-4 py-2">
                <h4 className="font-medium text-secondary-900 dark:text-secondary-100 mb-2">
                  청구항 {index + 1}
                </h4>
                <p className="text-secondary-700 dark:text-secondary-300 leading-relaxed whitespace-pre-wrap">
                  {claim.claim}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-secondary-500 dark:text-secondary-400">청구항 정보가 없습니다.</p>
        )}
      </CardContent>
    </Card>
  )
}

function ApplicantTab({ patent }: { patent: KiprisPatentDetailItem }) {
  const applicants = patent.applicantInfo || []
  
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
  const inventors = patent.inventorInfo || []
  
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
  const ipcInfo = patent.ipcInfo || []
  
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
  const legalStatus = patent.legalStatusInfo || []
  
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
  const familyInfo = patent.familyInfo || []
  
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
                  {family.familyApplicationNumber}
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
                  alt={`${patent.biblioSummaryInfo?.inventionTitle || '특허'} 도면`}
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
                  `patent_${patent.biblioSummaryInfo?.applicationNumber}_drawing.jpg`
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
                    `patent_${patent.biblioSummaryInfo?.applicationNumber}_drawing_hd.jpg`
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

// AI 분석이 필요할 때 자동으로 생성하는 로직을 각 보고서 컴포넌트에서 처리
// 기존 AIAnalysisTab 컴포넌트는 제거되고 새로운 독립적인 보고서 컴포넌트들로 대체됨