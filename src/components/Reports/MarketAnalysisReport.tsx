import React, { useState, useEffect } from 'react'
import { 
  TrendingUp, 
  Download,
  Loader2,
  Brain,
  RefreshCw,
  FileText,
  Star,
  Award
} from 'lucide-react'
import Button from '../UI/Button'
import Card, { CardContent, CardHeader, CardTitle } from '../UI/Card'
import { KiprisPatentDetailItem, AIAnalysisReport } from '../../types/kipris'
import { generateDynamicReportPDF } from '../../lib/pdfGenerator'
import { toast } from 'sonner'
import ReportLoadingState from './ReportLoadingState'
import ReportErrorState from './ReportErrorState'
import { useAuthStore } from '../../store/authStore'

interface MarketAnalysisReportProps {
  patent: KiprisPatentDetailItem
  analysis?: AIAnalysisReport
  loading?: boolean
  error?: string
  onGenerate?: () => Promise<void>
  onGeneratePDF: () => void
  pdfGenerating: boolean
}

interface ReportSection {
  title: string
  content: string
}

interface ReportData {
  reportType: string
  reportName: string
  sections: ReportSection[]
  generatedAt: string
}

// 평가 점수 추출 및 시각화 (기존 유지)
const extractRating = (content: string) => {
  const ratingPatterns = [
    /매우 높음|high|강함|우수|excellent|확고|확실/i,
    /중간|medium|평균|일반/i,
    /낮음|low|약함|부족|부정적/i
  ]
  
  for (let i = 0; i < ratingPatterns.length; i++) {
    if (ratingPatterns[i].test(content)) {
      return i === 0 ? 5 : i === 1 ? 3 : 1
    }
  }
  return null
}

// 별점 컴포넌트 (미니멀 디자인 색상 조정)
const StarRating = ({ rating }: { rating: number }) => {
  // **ms-olive** 대신 **미니멀 디자인**에 맞춘 **강조색** 사용
  const accentColor = 'var(--accent-color-minimal)'; // 가정된 CSS 변수
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-4 h-4 ${
            star <= rating 
              ? 'text-ms-accent fill-ms-accent' // 미니멀 강조색
              : 'text-gray-300'
          }`}
        />
      ))}
    </div>
  )
}

// 마크다운 테이블을 HTML 테이블로 변환하는 함수 (기존 유지)
const parseMarkdownTable = (content: string): string => {
  const tablePattern = /\|(.+)\|/g
  const lines = content.split('\n')
  const tableLines = lines.filter(line => line.includes('|') && line.trim() !== '')
  
  if (tableLines.length < 2) return content
  
  let html = '<div class="overflow-x-auto my-6"><table class="min-w-full border-collapse border border-gray-200 rounded overflow-hidden">'
  
  tableLines.forEach((line, index) => {
    const cells = line.split('|').filter(cell => cell.trim() !== '').map(cell => cell.trim())
    
    if (index === 0) {
      html += '<thead class="bg-gray-100"><tr>' // 라이트 모드에 맞게 조정
      cells.forEach(cell => {
        html += `<th class="border border-gray-200 px-4 py-3 text-left font-bold text-gray-800">${cell}</th>`
      })
      html += '</tr></thead><tbody>'
    } else if (index === 1 && line.includes('---')) {
      return
    } else {
      html += '<tr class="hover:bg-gray-50 transition-colors">'
      cells.forEach(cell => {
        html += `<td class="border border-gray-200 px-4 py-3 text-gray-700">${cell}</td>`
      })
      html += '</tr>'
    }
  })
  
  html += '</tbody></table></div>'
  const nonTableContent = lines.filter(line => !line.includes('|') || line.trim() === '').join('\n')
  
  return nonTableContent + html
}

// JSON 파싱은 백엔드에서 처리되므로 프론트엔드에서는 단순화
const parseComplexContent = (data: any): ReportSection[] => {
  if (!data || !data.sections || !Array.isArray(data.sections)) {
     // 파싱 실패 시, 원시 텍스트를 섹션으로 반환 (디버깅 용도)
    return [{ title: '분석 결과 (RAW/파싱 실패)', content: JSON.stringify(data, null, 2) }]
  }
  
  // 백엔드가 JSON 구조를 보장한다고 가정하고 매핑
  return data.sections.map((section: any) => ({
    title: String(section.title || '제목 없음').replace(/[#\d\.\-\s]+/g, '').trim(),
    content: String(section.content || '내용 없음')
  })).filter(s => s.content !== '내용 없음') // 내용 없는 섹션 제거
}

// 콘텐츠 렌더링 함수 (미니멀/고급스러움 강조)
const renderContent = (content: string) => {
  // 이모지, 불릿, 숫자, 기호 제거 함수
  const cleanText = (text: string) => {
    return text
      .replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '') // 이모지 제거
      .replace(/#{1,6}\s*/g, '') // 마크다운 헤더 기호 제거
      .replace(/`([^`]+)`/g, '$1') // 코드 블록 기호 제거
      .replace(/\[.*?\]/gi, '') // 플레이스홀더 제거
      .replace(/^[\s]*[-•*]\s*/gm, '') // 라인 시작 불릿 제거
      .replace(/^\s*[0-9]+\.\s*/gm, '') // 라인 시작 숫자 목록 제거
      .replace(/\s+/g, ' ') // 연속 공백 정리
      .trim()
  }
  
  // 마크다운 테이블 처리
  let processedContent = parseMarkdownTable(content)
  
  if (processedContent.includes('<table')) {
    return <div dangerouslySetInnerHTML={{ __html: processedContent }} />
  }
  
  // 텍스트 정리
  processedContent = cleanText(processedContent)
  
  const paragraphs = processedContent.split('\n')
    .map(p => p.trim())
    .filter(p => p.length > 5) // 짧은 줄 제거

  return (
    <div className="space-y-3">
      {paragraphs.map((paragraph, pIndex) => {
        // '---' 구분선 처리
        if (paragraph.trim() === '---') {
          return <div key={pIndex} className="my-5 border-t border-ms-line/50" />
        }
        
        // 볼드체 강조 (모든 볼드체는 전문 용어로 간주하고 텍스트 색상을 다르게 처리)
        const processedParagraph = paragraph.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-ms-text/90">$1</strong>')
        
        // 단답형 구조를 위해 <p> 태그 사용
        return (
          <p 
            key={pIndex} 
            className="text-sm leading-relaxed text-gray-700 font-medium" // 미니멀 디자인 폰트 강조
            dangerouslySetInnerHTML={{ __html: processedParagraph }}
          />
        )
      })}
    </div>
  )
}

// 섹션 컴포넌트
const SimpleSection = ({ section, index }: {
  section: ReportSection
  index: number
}) => {
  const rating = extractRating(section.content)
  let cleanTitle = section.title.replace(/\*{1,3}/g, '').replace(/[#\d\.\-\s]+/g, '').trim()

  // 상위 섹션 제목 (***제목*** 형태) 스타일링 - 가장 큰 헤딩
  const isTopSection = section.title.startsWith('***')
  
  // 하위 섹션 제목 (***제목*** 형태) 스타일링 - 중간 헤딩
  const isSubSection = section.title.startsWith('**') && !isTopSection

  if (!section.content.trim() && !isTopSection) return null // 내용이 없으면 숨김
  if (cleanTitle.length < 5) return null

  return (
    <div className="space-y-4">
      <Card className="border-none shadow-none bg-transparent pt-0">
        <CardHeader className={`pb-0 bg-transparent ${isTopSection ? 'pt-6' : 'pt-0'}`}>
          <CardTitle className={`font-bold text-ms-text`}>
            {/* Top Section (H3 역할) */}
            {isTopSection && (
              <h3 className="text-xl font-extrabold text-ms-text mb-2 pb-1 border-b border-ms-line/70">
                {cleanTitle}
              </h3>
            )}
            
            {/* Sub Section (H4 역할) */}
            {!isTopSection && (
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-base font-bold text-ms-olive`}>
                  {cleanTitle}
                </span>
                {rating && <StarRating rating={rating} />}
              </div>
            )}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="pt-2 pl-4 border-l-2 border-ms-accent/50 ml-1">
          {/* Top Section은 내용이 비어있을 수 있으므로 내용이 있을 때만 렌더링 */}
          {!isTopSection && renderContent(section.content)}
        </CardContent>
      </Card>
    </div>
  )
}

// ... (Rest of the component logic including useEffect, generateReport, handleRetry, handlePDFGeneration)

export default function MarketAnalysisReport({ 
  patent, 
  analysis,
  loading: propLoading = false,
  error: propError = '',
  onGenerate,
  onGeneratePDF,
  pdfGenerating
}: MarketAnalysisReportProps) {
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { user } = useAuthStore()

  const formatGeneratedDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return dateString
    }
  }

  useEffect(() => {
    if (analysis) {
      const sections = parseComplexContent(analysis)
      
      const newReportData: ReportData = {
        reportType: 'market_analysis',
        reportName: '시장 분석 리포트',
        sections: sections,
        generatedAt: typeof window !== 'undefined' ? new Date().toISOString() : ''
      }
      
      setReportData(newReportData)
    }
  }, [analysis])

  const generateReport = async () => {
    // ... (generateReport 함수의 기존 fetch 로직 유지)
    if (!patent || !user) {
      toast.error('특허 정보 또는 사용자 정보가 없습니다.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/ai-analysis-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patentData: patent, analysisType: 'market_analysis' }),
      })

      if (!response.ok) {
        let errorMessage = '리포트 생성에 실패했습니다.'
        let errorDetails = ''
        
        try {
          const errorData = await response.json()
          if (errorData.message) errorMessage = errorData.message
          if (errorData.error) {
             // ... (기존 에러 처리 switch-case 유지)
             switch (errorData.error) {
              case 'TIMEOUT_ERROR':
                errorMessage = 'AI 분석 요청이 시간 초과되었습니다. 특허 데이터가 복잡하거나 서버가 바쁠 수 있습니다.'
                errorDetails = '잠시 후 다시 시도하거나, 더 간단한 특허로 테스트해보세요.'
                break
              case 'AUTH_ERROR':
                errorMessage = 'AI 서비스 인증에 실패했습니다.'
                errorDetails = 'API 키 설정을 확인하거나 관리자에게 문의하세요.'
                break
              case 'QUOTA_ERROR':
                errorMessage = 'AI 서비스 사용량 한도에 도달했습니다.'
                errorDetails = '잠시 후 다시 시도하거나, 사용량 한도를 확인해보세요.'
                break
              case 'NETWORK_ERROR':
                errorMessage = '네트워크 연결에 문제가 있습니다.'
                errorDetails = '인터넷 연결을 확인하고 다시 시도해주세요.'
                break
              case 'PARSE_ERROR':
                errorMessage = 'AI 응답 처리 중 오류가 발생했습니다.'
                errorDetails = '잠시 후 다시 시도해주세요.'
                break
              case 'MODEL_ERROR':
                errorMessage = 'AI 모델 설정에 문제가 있습니다.'
                errorDetails = '관리자에게 문의해주세요.'
                break
            }
          }
        } catch (parseError) {
          // ... (기존 오류 응답 파싱 실패 처리 유지)
           switch (response.status) {
            case 400:
              errorMessage = '잘못된 요청입니다. 특허 번호를 확인해주세요.'
              break
            case 401:
              errorMessage = '인증이 필요합니다. 다시 로그인해주세요.'
              break
            case 408:
              errorMessage = '요청 시간이 초과되었습니다. 다시 시도해주세요.'
              break
            case 429:
              errorMessage = '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.'
              break
            case 500:
              errorMessage = '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
              break
            case 503:
              errorMessage = 'AI 서비스가 일시적으로 사용할 수 없습니다. 잠시 후 다시 시도해주세요.'
              break
            default:
              errorMessage = `서버 오류 (${response.status}): 잠시 후 다시 시도해주세요.`
          }
        }
        
        const fullErrorMessage = errorDetails ? `${errorMessage}\n\n${errorDetails}` : errorMessage
        throw new Error(fullErrorMessage)
      }

      const data = await response.json()
      
      // AIAnalysisReport 구조에 reportName과 sections가 바로 포함되도록 가정
      if (data.success && data.data && data.data.analysis) {
        const analysis = data.data.analysis
        
        const sections = parseComplexContent(analysis)
        
        const reportData: ReportData = {
          reportType: 'market_analysis',
          reportName: analysis.reportName || '시장 분석 리포트',
          sections: sections,
          generatedAt: new Date().toISOString()
        };
        
        setReportData(reportData);
        toast.success('시장 분석 리포트가 생성되었습니다.');
      } else {
        throw new Error(data.message || '리포트 데이터를 받지 못했습니다.');
      }

    } catch (error) {
      // ... (기존 에러 메시지 처리 및 finally 블록 유지)
      let displayError = error.message || '알 수 없는 오류가 발생했습니다.'
      
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        displayError = '네트워크 연결에 문제가 있습니다.\n\n해결 방법:\n• 인터넷 연결을 확인해주세요\n• 방화벽 설정을 확인해주세요\n• VPN 연결을 확인해주세요'
      } else if (error.message.includes('Failed to fetch')) {
        displayError = '서버에 연결할 수 없습니다.\n\n해결 방법:\n• 서버가 실행 중인지 확인해주세요\n• 네트워크 연결을 확인해주세요\n• 잠시 후 다시 시도해주세요'
      } else if (error.message.includes('timeout') || error.message.includes('시간 초과')) {
        displayError = '요청 시간이 초과되었습니다.\n\n해결 방법:\n• 잠시 후 다시 시도해주세요\n• 특허 데이터가 복잡할 수 있습니다\n• 네트워크 상태를 확인해주세요'
      }
      
      setError(displayError);
      
      const toastMessage = displayError.split('\n')[0] || '리포트 생성에 실패했습니다.'
      toast.error(toastMessage);
    } finally {
      setLoading(false);
    }
  }

  const handleRetry = async () => {
    if (onGenerate) {
      await onGenerate()
    } else {
      await generateReport()
    }
  }

  const handlePDFGeneration = () => {
    onGeneratePDF()
  }

  if (loading || propLoading) {
    return (
      <ReportLoadingState
        title="시장 분석 리포트"
        description="AI가 특허 기술의 시장 동향과 경쟁 환경을 분석합니다"
        iconColor="bg-ms-olive/10 dark:bg-ms-olive/20"
        Icon={({ className }) => <TrendingUp className={`${className} text-ms-olive`} />}
      />
    )
  }

  if (error || propError) {
    return (
      <ReportErrorState
        error={error || propError}
        onRetry={handleRetry}
      />
    )
  }

  if (!reportData) {
    return (
      <div className="report-container space-y-8">
        {/* Minimal header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h2 className="text-3xl font-bold text-ms-text">시장 분석 리포트</h2>
            <p className="text-sm text-gray-600">AI가 특허 기술의 시장 동향과 경쟁 환경을 분석합니다</p>
          </div>
          <Button 
            onClick={generateReport}
            className="inline-flex items-center gap-2 px-4 py-2 border border-ms-line text-ms-text hover:bg-white/60 bg-white"
          >
            <Brain className="w-4 h-4" />
            리포트 생성하기
          </Button>
        </div>

        {/* Minimal callout card */}
        <Card className="border border-ms-line shadow-sm bg-white/70">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="w-12 h-12 text-ms-text mb-6" />
            <h3 className="text-xl font-semibold text-ms-text mb-2">전문적인 시장 분석을 시작하세요</h3>
            <p className="text-gray-600 text-center max-w-2xl mb-8 leading-relaxed">
              AI가 이 특허의 시장 규모, 경쟁 환경, 성장 잠재력을 종합적으로 분석하여 전략적 시장 인사이트가 담긴 전문 리포트를 생성합니다.
            </p>
            <Button 
              onClick={generateReport}
              className="inline-flex items-center gap-2 px-5 py-2.5 border border-ms-line text-ms-text hover:bg-white/60 bg-white"
            >
              <Brain className="w-4 h-4" />
              리포트 생성하기
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="report-container space-y-10">
      {/* Minimal Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold text-ms-text">{reportData.reportName}</h2>
          <p className="text-sm text-gray-600">AI가 분석한 특허 기술의 시장 동향과 경쟁 환경</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={handleRetry}
            className="inline-flex items-center gap-2 px-3 py-2 border border-ms-line text-ms-text hover:bg-white/60 bg-white"
          >
            <RefreshCw className="w-4 h-4" />
            새로 생성
          </Button>
          <Button 
            onClick={handlePDFGeneration}
            disabled={pdfGenerating}
            className="inline-flex items-center gap-2 px-3 py-2 bg-ms-olive hover:bg-ms-olive/90 text-white"
          >
            {pdfGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            PDF 다운로드
          </Button>
        </div>
      </div>

      {/* Report Content - Minimalist Structure */}
      <div className="space-y-8">
        {reportData.sections.map((section, index) => (
          <SimpleSection
            key={index}
            section={section}
            index={index}
          />
        ))}
      </div>

      {/* Footer */}
      <Card className="border border-ms-line bg-white/70">
        <CardContent className="pt-5">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-ms-text" />
              <span className="font-medium text-ms-text">AI 생성 리포트</span>
              <div className="flex items-center gap-1">
                <Award className="w-3 h-3 text-ms-text" />
                <span className="text-xs">시장 분석</span>
              </div>
            </div>
            <span className="text-xs px-2 py-1 rounded border border-ms-line bg-white/60">
               생성일시: {formatGeneratedDate(reportData.generatedAt)}
             </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}