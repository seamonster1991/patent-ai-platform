import React, { useState, useEffect } from 'react'
import { 
  TrendingUp, 
  Loader2,
  Brain,
  RefreshCw,
  FileText,
  Star,
  Award,
  Target,
  DollarSign,
  Users,
  Lightbulb
} from 'lucide-react'
import Button from '../UI/Button'
import Card, { CardContent, CardHeader, CardTitle } from '../UI/Card'
import { KiprisPatentDetailItem, AIAnalysisReport } from '../../types/kipris'
import { toast } from 'sonner'
import ReportLoadingState from './ReportLoadingState'
import ReportErrorState from './ReportErrorState'
import { useAuthStore } from '../../store/authStore'
import { useNavigate } from 'react-router-dom'
import { handleReportGeneratedFromAPI } from '../../utils/eventUtils';

interface BusinessInsightsReportProps {
  patent: KiprisPatentDetailItem
  analysis?: AIAnalysisReport
  loading?: boolean
  error?: string
  onGenerate?: () => Promise<void>
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
      html += '<thead class="bg-gray-100"><tr>'
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

// rawAnalysis 텍스트를 구조화된 섹션으로 파싱하는 함수
const parseRawAnalysis = (rawText: string): ReportSection[] => {
    if (!rawText || typeof rawText !== 'string') {
      return [{ title: '분석 결과 없음', content: '분석 데이터가 없습니다.' }]
    }

    const sections: ReportSection[] = []
    
    // 마크다운 헤딩으로 섹션 분리 (###, ##, #)
    const sectionRegex = /^(#{1,3})\s+(.+)$/gm
    const matches = [...rawText.matchAll(sectionRegex)]
    
    if (matches.length === 0) {
      // 헤딩이 없는 경우 숫자 기반 섹션으로 분리
      const lines = rawText.split('\n')
      let currentSection = null
      let currentContent = []
      
      for (const line of lines) {
        const numberMatch = line.match(/^(\d+(?:\.\d+)*\.?\s+)(.+)$/)
        
        if (numberMatch) {
          // 이전 섹션 저장
          if (currentSection) {
            sections.push({
              title: currentSection,
              content: currentContent.join('\n').trim()
            })
          }
          
          // 새 섹션 시작
          currentSection = numberMatch[2].trim()
          currentContent = []
        } else if (currentSection && line.trim()) {
          // 현재 섹션에 내용 추가
          currentContent.push(line)
        }
      }
      
      // 마지막 섹션 저장
      if (currentSection) {
        sections.push({
          title: currentSection,
          content: currentContent.join('\n').trim()
        })
      }
      
      if (sections.length === 0) {
        // 단순 텍스트인 경우 단락으로 분리
        const paragraphs = rawText.split('\n\n').filter(p => p.trim())
        paragraphs.forEach((paragraph, index) => {
          const lines = paragraph.trim().split('\n')
          const title = lines[0].length > 50 ? `분석 내용 ${index + 1}` : lines[0]
          const content = lines.length > 1 ? lines.slice(1).join('\n') : paragraph
          
          sections.push({
            title: title.replace(/^[#\d\.\-\s]+/, '').trim(),
            content: content.trim()
          })
        })
      }
    } else {
      // 마크다운 헤딩 기반 파싱
      for (let i = 0; i < matches.length; i++) {
        const currentMatch = matches[i]
        const nextMatch = matches[i + 1]
        
        const title = currentMatch[2].trim()
        const startIndex = currentMatch.index! + currentMatch[0].length
        const endIndex = nextMatch ? nextMatch.index! : rawText.length
        const content = rawText.slice(startIndex, endIndex).trim()
        
        sections.push({
          title: title.replace(/^[#\d\.\-\s]+/, '').trim(),
          content: content
        })
      }
    }
    
    return sections.length > 0 ? sections : [
      { title: '분석 결과', content: rawText.trim() }
    ]
  }

const parseComplexContent = (data: any): ReportSection[] => {
  console.log('🔍 [BusinessInsights] parseComplexContent 시작:', {
    dataType: typeof data,
    isArray: Array.isArray(data),
    hasAnalysis: !!data?.analysis,
    hasSections: !!data?.analysis?.sections,
    sectionsLength: data?.analysis?.sections?.length,
    keys: Object.keys(data || {}),
    analysisKeys: Object.keys(data?.analysis || {})
  });

  try {
    // 1. 새로운 API 응답 구조 처리 (data.analysis.sections)
    if (data?.analysis?.sections && Array.isArray(data.analysis.sections)) {
      console.log('✅ [BusinessInsights] 새로운 API 구조 감지 - data.analysis.sections 사용');
      const sections = data.analysis.sections.map((section: any, index: number) => {
        console.log(`📄 [BusinessInsights] 섹션 ${index + 1}:`, {
          title: section.title?.substring(0, 50),
          contentLength: section.content?.length,
          hasTitle: !!section.title,
          hasContent: !!section.content
        });
        
        return {
          title: section.title || `섹션 ${index + 1}`,
          content: section.content || ''
        };
      });
      
      console.log('✅ [BusinessInsights] 새로운 API 구조 파싱 완료:', sections.length, '개 섹션');
      return sections;
    }

    // 2. 기존 구조화된 데이터 처리 (data.sections)
    if (data?.sections && Array.isArray(data.sections)) {
      console.log('✅ [BusinessInsights] 기존 구조화된 데이터 감지 - data.sections 사용');
      const sections = data.sections.map((section: any, index: number) => ({
        title: section.title || `섹션 ${index + 1}`,
        content: section.content || ''
      }));
      
      console.log('✅ [BusinessInsights] 기존 구조화된 데이터 파싱 완료:', sections.length, '개 섹션');
      return sections;
    }

    // 3. 원시 분석 텍스트 처리 (data.rawAnalysis)
    if (data?.rawAnalysis && typeof data.rawAnalysis === 'string') {
      console.log('✅ [BusinessInsights] 원시 분석 텍스트 감지 - parseRawAnalysis 사용');
      const sections = parseRawAnalysis(data.rawAnalysis);
      console.log('✅ [BusinessInsights] 원시 분석 텍스트 파싱 완료:', sections.length, '개 섹션');
      return sections;
    }

    // 4. 일반적인 문자열/객체 데이터 처리
    if (typeof data === 'string') {
      console.log('✅ [BusinessInsights] 문자열 데이터 감지 - parseRawAnalysis 사용');
      const sections = parseRawAnalysis(data);
      console.log('✅ [BusinessInsights] 문자열 데이터 파싱 완료:', sections.length, '개 섹션');
      return sections;
    }

    // 5. 객체에서 텍스트 추출 시도
    if (data && typeof data === 'object') {
      console.log('✅ [BusinessInsights] 객체 데이터 감지 - 텍스트 추출 시도');
      const textContent = JSON.stringify(data, null, 2);
      const sections = parseRawAnalysis(textContent);
      console.log('✅ [BusinessInsights] 객체 데이터 파싱 완료:', sections.length, '개 섹션');
      return sections;
    }

    // 6. 모든 방법이 실패한 경우 기본값 반환
    console.warn('⚠️ [BusinessInsights] 모든 파싱 방법 실패 - 기본 섹션 반환');
    return [{
      title: '분석 결과',
      content: '데이터를 파싱할 수 없습니다. 다시 시도해주세요.'
    }];

  } catch (error) {
    console.error('❌ [BusinessInsights] parseComplexContent 오류:', error);
    console.error('❌ [BusinessInsights] 오류 발생 데이터:', data);
    
    return [{
      title: '오류 발생',
      content: `데이터 파싱 중 오류가 발생했습니다: ${error.message}`
    }];
  }
};

// 콘텐츠 렌더링 함수 (마크다운 리스트/강조 보존)
const renderContent = (content: string) => {
  let processed = parseMarkdownTable(content)
  if (processed.includes('<table')) {
    return <div dangerouslySetInnerHTML={{ __html: processed }} />
  }

  const toHtml = (text: string) => text
    .replace(/#{1,6}\s*/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-ms-text/90">$1</strong>')
    .trim()

  const lines = processed
    .replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '') // 이모지 제거
    .replace(/\[.*?\]/gi, '') // 플레이스홀더 제거
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)

  const elements: React.ReactNode[] = []
  let ul: string[] = []
  let ol: string[] = []

  const flush = () => {
    if (ul.length) {
      elements.push(
        <ul className="list-disc ml-6 space-y-1">
          {ul.map((item, i) => (
            <li key={`ul-${i}`} className="text-sm leading-relaxed text-gray-700 font-medium" dangerouslySetInnerHTML={{ __html: toHtml(item) }} />
          ))}
        </ul>
      )
      ul = []
    }
    if (ol.length) {
      elements.push(
        <ol className="list-decimal ml-6 space-y-1">
          {ol.map((item, i) => (
            <li key={`ol-${i}`} className="text-sm leading-relaxed text-gray-700 font-medium" dangerouslySetInnerHTML={{ __html: toHtml(item) }} />
          ))}
        </ol>
      )
      ol = []
    }
  }

  for (const line of lines) {
    if (/^[-•*]\s+/.test(line)) { // 불릿 리스트
      ol.length && flush()
      ul.push(line.replace(/^[-•*]\s+/, ''))
      continue
    }
    if (/^\d+\.\s+/.test(line)) { // 번호 매긴 리스트
      ul.length && flush()
      ol.push(line.replace(/^\d+\.\s+/, ''))
      continue
    }
    if (line === '---') { // 구분선
      flush()
      elements.push(<div key={`divider-${elements.length}`} className="my-5 border-t border-ms-line/50" />)
      continue
    }
    if (line.length > 3) { // 일반 문단
      flush()
      elements.push(
        <p key={`p-${elements.length}`} className="text-sm leading-relaxed text-gray-700 font-medium" dangerouslySetInnerHTML={{ __html: toHtml(line) }} />
      )
    }
  }
  flush()

  return <div className="space-y-3">{elements}</div>
}

// 섹션 컴포넌트
const SimpleSection = ({ section, index }: {
  section: ReportSection
  index: number
}) => {
  const rating = extractRating(section.content)
  let cleanTitle = section.title.replace(/\*{1,3}/g, '').replace(/[#\d\.\-\s]+/g, '').trim()

  const isTopSection = section.title.startsWith('***')
  
  if (!section.content.trim() && !isTopSection) return null 
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
          {!isTopSection && renderContent(section.content)}
        </CardContent>
      </Card>
    </div>
  )
}

// ... (export default BusinessInsightsReport 유지)

export default function BusinessInsightsReport({ 
  patent, 
  analysis,
  loading: propLoading = false,
  error: propError = '',
  onGenerate
}: BusinessInsightsReportProps) {
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { user } = useAuthStore()
  const navigate = useNavigate()

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
        reportType: 'business_insights',
        reportName: '비즈니스 인사이트 리포트',
        sections: sections,
        generatedAt: typeof window !== 'undefined' ? new Date().toISOString() : ''
      }
      
      setReportData(newReportData)
    }
  }, [analysis])

  const generateReport = async () => {
    if (!patent || !user) {
      // 안전한 toast 호출 - setTimeout 사용
      setTimeout(() => {
        toast.error('특허 정보 또는 사용자 정보가 없습니다.')
      }, 0)
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('http://localhost:3005/api/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patentData: patent, reportType: 'business' }),
      })

      if (!response.ok) {
        let errorMessage = '리포트 생성에 실패했습니다.'
        let errorDetails = ''
        
        try {
          const errorData = await response.json()
          if (errorData.message) errorMessage = errorData.message
          if (errorData.error) {
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
          switch (response.status) {
            case 400:
              errorMessage = '잘못된 요청입니다. 특허 번호를 확인해주세요.'
              break
            case 401:
              errorMessage = '인증에 실패했습니다. 로그인 상태를 확인해주세요.'
              break
            case 403:
              errorMessage = '접근 권한이 없습니다.'
              break
            case 404:
              errorMessage = '요청한 리소스를 찾을 수 없습니다.'
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
      
      if (data.success && data.data) {
        const reportData: ReportData = {
          reportType: data.data.reportType || 'business',
          reportName: data.data.reportName || '비즈니스 인사이트 리포트',
          sections: data.data.sections || [],
          generatedAt: data.data.generatedAt || new Date().toISOString()
        };
        
        setReportData(reportData);
        // 안전한 toast 호출 - setTimeout 사용
        setTimeout(() => {
          toast.success('비즈니스 인사이트 리포트가 생성되었습니다.');
        }, 0);
        
        // 데이터베이스에 리포트 생성 활동 추적
        try {
          const { supabase } = await import('../../lib/supabase')
          await supabase
            .from('ai_analysis_reports')
            .insert({
              user_id: user.id,
              patent_application_number: patent.biblioSummaryInfoArray?.biblioSummaryInfo?.applicationNumber,
              invention_title: patent.biblioSummaryInfoArray?.biblioSummaryInfo?.inventionTitle,
              analysis_type: 'business',
              report_name: reportData.reportName,
              report_content: JSON.stringify(reportData.sections),
              status: 'completed'
            })
          console.log('✅ [BusinessInsightsReport] 데이터베이스 추적 완료')
        } catch (error) {
          console.error('❌ [BusinessInsightsReport] 데이터베이스 추적 실패:', error)
        }
        
        // 대시보드 업데이트를 위한 이벤트 발생
        if (typeof window !== 'undefined') {
          console.log('🔧 [BusinessInsightsReport] 이벤트 디스패치 준비 중...', {
            hasWindow: typeof window !== 'undefined',
            shouldDispatchEvent: data.shouldDispatchEvent,
            hasEventData: !!data.eventData,
            currentPath: window.location.pathname
          });
          
          // eventUtils를 사용하여 이벤트 발생
          const eventDispatched = handleReportGeneratedFromAPI(data, {
            reportType: 'business',
            reportTitle: reportData.reportName,
            patentTitle: patent.biblioSummaryInfoArray?.biblioSummaryInfo?.inventionTitle || '특허 제목',
            patentNumber: patent.biblioSummaryInfoArray?.biblioSummaryInfo?.applicationNumber || '특허 번호'
          });
          
          console.log('✅ [BusinessInsightsReport] 이벤트 발생 완료:', eventDispatched);

          // 백엔드에서 제공하는 이벤트 데이터 사용
          let eventDetail;
          if (data.shouldDispatchEvent && data.eventData) {
            eventDetail = data.eventData;
            console.log('📊 [BusinessInsightsReport] 백엔드 제공 이벤트 데이터 사용:', eventDetail);
          } else {
            // 폴백: 기존 방식
            eventDetail = {
              type: 'reportGenerated',
              reportType: 'business',
              reportTitle: reportData.reportName,
              patentTitle: patent.biblioSummaryInfoArray?.biblioSummaryInfo?.inventionTitle,
              patentNumber: patent.biblioSummaryInfoArray?.biblioSummaryInfo?.applicationNumber,
              timestamp: reportData.generatedAt
            };
            console.log('📊 [BusinessInsightsReport] 폴백 이벤트 데이터 사용:', eventDetail);
          }
          
          console.log('📊 [BusinessInsightsReport] reportGenerated 이벤트 발생 준비:', {
            eventType: 'reportGenerated',
            eventDetail: eventDetail,
            timestamp: new Date().toISOString()
          });
          
          // 이벤트 디스패치 전 현재 등록된 리스너 확인
          const listeners = 'N/A'; // getEventListeners는 개발자 도구에서만 사용 가능
          console.log('🔍 [BusinessInsightsReport] 현재 등록된 이벤트 리스너:', listeners);
          
          const customEvent = new CustomEvent('reportGenerated', {
            detail: eventDetail,
            bubbles: true,
            cancelable: true
          });
          
          console.log('📤 [BusinessInsightsReport] 이벤트 디스패치 실행...');
          const dispatched = window.dispatchEvent(customEvent);
          
          console.log('✅ [BusinessInsightsReport] reportGenerated 이벤트 디스패치 완료:', {
            dispatched: dispatched,
            eventType: customEvent.type,
            bubbles: customEvent.bubbles,
            cancelable: customEvent.cancelable,
            timestamp: new Date().toISOString()
          });
          
          // 이벤트가 제대로 디스패치되었는지 추가 확인
          setTimeout(() => {
            console.log('🔍 [BusinessInsightsReport] 이벤트 디스패치 후 상태 확인 (1초 후)');
          }, 1000);

          // 리포트 생성 완료 알림
          requestAnimationFrame(() => {
            toast.success('리포트가 생성되었습니다!', {
              duration: 3000
            });
          });
        } else {
          console.warn('⚠️ [BusinessInsightsReport] window 객체를 사용할 수 없습니다.');
        }
      } else {
        throw new Error(data.message || '리포트 데이터를 받지 못했습니다.');
      }

    } catch (error) {
      console.error('❌ [BusinessInsightsReport] 리포트 생성 오류:', {
        error: error.message,
        stack: error.stack,
        patentNumber: patent?.biblioSummaryInfoArray?.biblioSummaryInfo?.applicationNumber,
        timestamp: new Date().toISOString()
      });
      
      let displayError = error.message || '알 수 없는 오류가 발생했습니다.'
      let errorIcon = '❌'
      let errorType = 'error'
      
      // 에러 타입별 상세 처리
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        displayError = '🌐 네트워크 연결에 문제가 있습니다.\n\n💡 해결 방법:\n• 인터넷 연결을 확인해주세요\n• 방화벽 설정을 확인해주세요\n• VPN 연결을 확인해주세요'
        errorIcon = '🌐'
        errorType = 'network'
      } else if (error.message.includes('Failed to fetch')) {
        displayError = '🔌 서버에 연결할 수 없습니다.\n\n💡 해결 방법:\n• 서버가 실행 중인지 확인해주세요\n• 네트워크 연결을 확인해주세요\n• 잠시 후 다시 시도해주세요'
        errorIcon = '🔌'
        errorType = 'connection'
      } else if (error.message.includes('timeout') || error.message.includes('시간 초과')) {
        displayError = '⏰ AI 분석 시간이 초과되었습니다.\n\n💡 해결 방법:\n• 잠시 후 다시 시도해주세요 (5분 후 권장)\n• 특허 데이터가 복잡하여 처리 시간이 오래 걸릴 수 있습니다\n• 네트워크 상태를 확인해주세요\n• 브라우저를 새로고침 후 재시도해주세요'
        errorIcon = '⏰'
        errorType = 'timeout'
      } else if (error.message.includes('AI 서비스')) {
        displayError = '🤖 AI 서비스에 문제가 발생했습니다.\n\n💡 해결 방법:\n• 잠시 후 다시 시도해주세요\n• 서비스가 일시적으로 과부하 상태일 수 있습니다\n• 문제가 지속되면 관리자에게 문의해주세요'
        errorIcon = '🤖'
        errorType = 'ai_service'
      } else if (error.message.includes('인증')) {
        displayError = '🔐 인증에 문제가 발생했습니다.\n\n💡 해결 방법:\n• 로그인 상태를 확인해주세요\n• 페이지를 새로고침 후 재시도해주세요\n• 문제가 지속되면 관리자에게 문의해주세요'
        errorIcon = '🔐'
        errorType = 'auth'
      }
      
      setError(displayError);
      
      // 토스트 메시지는 첫 번째 줄만 표시 - Wrap in requestAnimationFrame
      const toastMessage = `${errorIcon} ${displayError.split('\n')[0].replace(/^[🌐🔌⏰🤖🔐❌]\s*/, '')}`;
      requestAnimationFrame(() => {
        toast.error(toastMessage, {
          duration: errorType === 'timeout' ? 6000 : 4000, // 타임아웃 에러는 더 오래 표시
        });
      });
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



  if (loading || propLoading) {
    return (
      <ReportLoadingState
        title="비즈니스 인사이트 리포트"
        description="AI가 특허 기술의 비즈니스 가치와 전략적 인사이트를 분석합니다"
        iconColor="bg-amber-100"
        Icon={({ className }) => <Lightbulb className={`${className} text-amber-600`} />}
        estimatedTime={300} // 5분 (300초)
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
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-ms-text">
              비즈니스 인사이트 리포트
            </h2>
            <p className="text-gray-600 text-sm">
              AI가 특허 기술의 비즈니스 가치와 전략적 인사이트를 분석합니다
            </p>
          </div>
          <Button 
            onClick={generateReport}
            className="inline-flex items-center gap-2 px-4 py-2 border border-ms-line text-ms-text hover:bg-white/60 bg-white"
          >
            <Brain className="w-4 h-4" />
            리포트 생성하기
          </Button>
        </div>

        <Card className="border border-ms-line shadow-sm bg-white/70">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="w-12 h-12 text-ms-text mb-6" />
            <h3 className="text-xl font-semibold text-ms-text mb-2">
              전문적인 비즈니스 분석을 시작하세요
            </h3>
            <p className="text-gray-600 text-center max-w-2xl mb-8 leading-relaxed">
              AI가 이 특허의 비즈니스 가치, 시장성, 경쟁력을 종합적으로 분석하여 
              전략적 인사이트가 담긴 전문 리포트를 생성합니다.
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
          <p className="text-sm text-gray-600">AI가 분석한 특허 기술의 비즈니스 가치와 전략적 인사이트</p>
        </div>
        <Button 
          variant="outline" 
          onClick={handleRetry}
          className="inline-flex items-center gap-2 px-3 py-2 border border-ms-line text-ms-text hover:bg-white/60 bg-white"
        >
          <RefreshCw className="w-4 h-4" />
          새로 생성
        </Button>
      </div>

      {/* Report Content */}
      <div className="space-y-8">
        {reportData.sections.map((section, index) => (
          <SimpleSection
            key={index}
            section={section}
            index={index}
          />
        ))}
      </div>

      {/* AI Disclaimer */}
      <Card className="border border-amber-200 bg-amber-50/70">
        <CardContent className="pt-5">
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-amber-600 text-xs font-bold">!</span>
            </div>
            <div className="text-sm text-amber-800">
              <p className="font-medium mb-1">AI 생성 리포트 안내</p>
              <p>AI는 실수할 수 있습니다. 이 리포트는 아이디어 생성 목적으로만 사용되며, 참고용으로 활용해주세요.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <Card className="border border-ms-line bg-white/70">
        <CardContent className="pt-5">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-ms-text" />
              <span className="font-medium text-ms-text">AI 생성 리포트</span>
              <div className="flex items-center gap-1">
                <Award className="w-3 h-3 text-ms-text" />
                <span className="text-xs">전문 분석</span>
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