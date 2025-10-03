import React, { useState, useEffect } from 'react'
import { 
  TrendingUp, 
  Download,
  Loader2,
  Brain,
  RefreshCw,
  FileText,
  BarChart3,
  Target,
  Users,
  Globe,
  Zap,
  Award,
  Star,
  DollarSign,
  Building2,
  Cpu,
  Shield,
  PieChart,
  LineChart
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
  sections: ReportSection[]
  summary: string
  generatedAt: string
}

// 섹션별 아이콘 매핑 (시장 분석 테마)
const getSectionIcon = (title: string, index: number) => {
  const titleLower = title.toLowerCase()
  
  if (titleLower.includes('시장') || titleLower.includes('market') || titleLower.includes('규모')) {
    return <BarChart3 className="w-5 h-5" />
  }
  if (titleLower.includes('경쟁') || titleLower.includes('competitive') || titleLower.includes('competitor')) {
    return <Target className="w-5 h-5" />
  }
  if (titleLower.includes('고객') || titleLower.includes('사용자') || titleLower.includes('user') || titleLower.includes('customer')) {
    return <Users className="w-5 h-5" />
  }
  if (titleLower.includes('글로벌') || titleLower.includes('global') || titleLower.includes('지역') || titleLower.includes('region')) {
    return <Globe className="w-5 h-5" />
  }
  if (titleLower.includes('기회') || titleLower.includes('opportunity') || titleLower.includes('잠재')) {
    return <Zap className="w-5 h-5" />
  }
  if (titleLower.includes('가치') || titleLower.includes('value') || titleLower.includes('수익') || titleLower.includes('revenue')) {
    return <DollarSign className="w-5 h-5" />
  }
  if (titleLower.includes('산업') || titleLower.includes('industry') || titleLower.includes('분야')) {
    return <Building2 className="w-5 h-5" />
  }
  if (titleLower.includes('기술') || titleLower.includes('technology') || titleLower.includes('tech')) {
    return <Cpu className="w-5 h-5" />
  }
  if (titleLower.includes('위험') || titleLower.includes('risk') || titleLower.includes('리스크')) {
    return <Shield className="w-5 h-5" />
  }
  if (titleLower.includes('분석') || titleLower.includes('analysis') || titleLower.includes('데이터')) {
    return <PieChart className="w-5 h-5" />
  }
  if (titleLower.includes('전망') || titleLower.includes('예측') || titleLower.includes('forecast') || titleLower.includes('trend')) {
    return <LineChart className="w-5 h-5" />
  }
  
  // 기본 아이콘들
  const defaultIcons = [<TrendingUp className="w-5 h-5" />, <BarChart3 className="w-5 h-5" />, <Target className="w-5 h-5" />, <Award className="w-5 h-5" />]
  return defaultIcons[index % defaultIcons.length]
}

// 평가 점수 추출 및 시각화
const extractRating = (content: string) => {
  const ratingPatterns = [
    /높음|high|강함|우수|excellent/i,
    /보통|medium|중간|평균|average/i,
    /낮음|low|약함|부족|poor/i
  ]
  
  for (let i = 0; i < ratingPatterns.length; i++) {
    if (ratingPatterns[i].test(content)) {
      return i === 0 ? 5 : i === 1 ? 3 : 1
    }
  }
  return null
}

// 별점 컴포넌트
const StarRating = ({ rating }: { rating: number }) => {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-4 h-4 ${
            star <= rating 
              ? 'text-blue-400 fill-blue-400' 
              : 'text-gray-300 dark:text-gray-600'
          }`}
        />
      ))}
      <span className="ml-2 text-sm font-medium text-gray-600 dark:text-gray-400">
        {rating}/5
      </span>
    </div>
  )
}

// 마크다운 테이블을 HTML 테이블로 변환하는 함수
const parseMarkdownTable = (content: string): string => {
  // 테이블 패턴 감지
  const tablePattern = /\|(.+)\|/g
  const lines = content.split('\n')
  const tableLines = lines.filter(line => line.includes('|') && line.trim() !== '')
  
  if (tableLines.length < 2) return content
  
  let html = '<div class="overflow-x-auto my-6"><table class="min-w-full border-collapse border border-blue-200 dark:border-blue-700 rounded-lg overflow-hidden shadow-sm">'
  
  tableLines.forEach((line, index) => {
    const cells = line.split('|').filter(cell => cell.trim() !== '').map(cell => cell.trim())
    
    if (index === 0) {
      // 헤더 행
      html += '<thead class="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30"><tr>'
      cells.forEach(cell => {
        html += `<th class="border border-blue-200 dark:border-blue-700 px-6 py-4 text-left font-bold text-blue-900 dark:text-blue-100">${cell}</th>`
      })
      html += '</tr></thead><tbody>'
    } else if (index === 1 && line.includes('---')) {
      // 구분선은 건너뛰기
      return
    } else {
      // 데이터 행
      html += '<tr class="hover:bg-blue-25 dark:hover:bg-blue-900/10 transition-colors">'
      cells.forEach(cell => {
        html += `<td class="border border-blue-200 dark:border-blue-700 px-6 py-4 text-gray-700 dark:text-gray-300">${cell}</td>`
      })
      html += '</tr>'
    }
  })
  
  html += '</tbody></table></div>'
  
  // 테이블이 아닌 나머지 텍스트도 포함
  const nonTableContent = lines.filter(line => !line.includes('|') || line.trim() === '').join('\n')
  
  return nonTableContent + html
}

// 복잡한 JSON 구조를 파싱하는 함수
const parseComplexContent = (data: any): ReportSection[] => {
  console.log('🔍 파싱할 데이터:', data)
  
  if (!data) return []
  
  // 문자열로 된 JSON 데이터인 경우 파싱
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data)
    } catch (e) {
      console.log('JSON 파싱 실패, 문자열로 처리')
      return [{ title: '분석 결과', content: data }]
    }
  }
  
  // sections 배열이 있는 경우
  if (data.sections && Array.isArray(data.sections)) {
    return data.sections.map((section: any) => ({
      title: section.title || section.name || '제목 없음',
      content: typeof section.content === 'string' ? section.content : JSON.stringify(section.content, null, 2)
    }))
  }
  
  // 객체의 각 키를 섹션으로 변환
  if (typeof data === 'object' && data !== null) {
    return Object.entries(data).map(([key, value]) => ({
      title: key,
      content: typeof value === 'string' ? value : JSON.stringify(value, null, 2)
    }))
  }
  
  // 기본 처리
  return [{ title: '분석 결과', content: String(data) }]
}

// 콘텐츠 렌더링 함수
const renderContent = (content: string) => {
  // 이모지 제거 함수
  const removeEmojis = (text: string) => {
    return text.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '')
  }
  
  // 불필요한 마크다운 기호 정리
  const cleanMarkdown = (text: string) => {
    return text
      .replace(/#{1,6}\s*/g, '') // 헤더 기호 제거
      .replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1') // 볼드/이탤릭 기호만 제거하고 내용 유지
      .replace(/`([^`]+)`/g, '$1') // 코드 블록 기호 제거
      .trim()
  }
  
  // 마크다운 테이블 처리
  let processedContent = parseMarkdownTable(content)
  
  // HTML 테이블이 포함된 경우 직접 렌더링
  if (processedContent.includes('<table')) {
    return <div dangerouslySetInnerHTML={{ __html: processedContent }} />
  }
  
  // 이모지 제거 및 텍스트 정리
  processedContent = removeEmojis(processedContent)
  
  // 일반 텍스트 처리 - 빈 줄과 의미없는 내용 필터링
  const paragraphs = processedContent.split('\n')
    .map(p => p.trim())
    .filter(p => {
      // 빈 줄 제거
      if (!p) return false
      // 의미없는 번호나 기호만 있는 줄 제거
      if (/^[\d\.\-\*\s]+$/.test(p)) return false
      // 너무 짧은 의미없는 텍스트 제거
      if (p.length < 3) return false
      return true
    })
  
  // 중복 제거
  const uniqueParagraphs = paragraphs.filter((paragraph, index) => {
    const cleanedParagraph = cleanMarkdown(paragraph).toLowerCase()
    return paragraphs.findIndex(p => cleanMarkdown(p).toLowerCase() === cleanedParagraph) === index
  })
  
  return (
    <div className="space-y-2">
      {uniqueParagraphs.map((paragraph, pIndex) => {
        const cleanedParagraph = cleanMarkdown(paragraph)
        
        // 볼드 텍스트 처리 (제목용)
        const processedParagraph = cleanedParagraph.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-blue-700 dark:text-blue-300">$1</strong>')
        
        // 리스트 아이템 처리
        if (paragraph.trim().startsWith('-') || paragraph.trim().startsWith('•') || paragraph.trim().startsWith('*')) {
          const listContent = processedParagraph.replace(/^[-•\*]\s*/, '')
          if (!listContent.trim()) return null
          
          return (
            <div key={pIndex} className="flex items-start gap-3 mb-2 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border-l-4 border-blue-400">
              <div className="w-1.5 h-1.5 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full mt-2 flex-shrink-0"></div>
              <span 
                className="text-sm leading-relaxed text-gray-700 dark:text-gray-300 flex-1"
                dangerouslySetInnerHTML={{ __html: listContent }}
              />
            </div>
          )
        }
        
        // 제목 스타일 처리 (숫자로 시작하거나 콜론이 포함된 경우)
        if (/^\d+\./.test(paragraph.trim()) || paragraph.includes(':')) {
          return (
            <h4 
              key={pIndex} 
              className="text-base font-bold text-blue-800 dark:text-blue-200 mb-2 pb-1 border-b border-blue-200 dark:border-blue-700"
              dangerouslySetInnerHTML={{ __html: processedParagraph }}
            />
          )
        }
        
        // 빈 내용 체크
        if (!processedParagraph.trim()) return null
        
        return (
          <p 
            key={pIndex} 
            className="mb-2 text-sm leading-relaxed text-gray-700 dark:text-gray-300"
            dangerouslySetInnerHTML={{ __html: processedParagraph }}
          />
        )
      })}
    </div>
  )
}

// 이모티콘 제거 함수
const removeEmojisFromTitle = (title: string) => {
  return title.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '').trim()
}

// 단순한 섹션 컴포넌트 (항상 펼쳐진 상태)
const SimpleSection = ({ section, index }: {
  section: ReportSection
  index: number
}) => {
  const rating = extractRating(section.content)
  const cleanTitle = removeEmojisFromTitle(section.title)
  
  // 빈 내용이거나 의미없는 제목인 경우 렌더링하지 않음
  if (!section.content.trim() || 
      !cleanTitle || 
      cleanTitle.length < 2 ||
      cleanTitle.match(/^[\d\.\-\s]*$/) || // 숫자, 점, 대시, 공백만 있는 경우
      cleanTitle.toLowerCase().includes('undefined') ||
      cleanTitle.toLowerCase().includes('null') ||
      section.content.trim().length < 10) { // 내용이 너무 짧은 경우
    return null
  }
  
  return (
    <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-blue-50/30 dark:from-gray-800 dark:to-blue-900/10">
      <CardHeader className="pb-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-b border-blue-100 dark:border-blue-800">
        <CardTitle className="text-base font-bold text-gray-900 dark:text-white">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg">
              {getSectionIcon(cleanTitle, index)}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded-full">
                  {index + 1}
                </span>
                <span>{cleanTitle}</span>
              </div>
              {rating && (
                <div className="mt-2">
                  <StarRating rating={rating} />
                </div>
              )}
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pt-6">
        {renderContent(section.content)}
      </CardContent>
    </Card>
  )
}

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
      console.log('🔍 받은 analysis 데이터:', analysis)
      
      // analysis 데이터를 파싱하여 reportData로 변환
      const sections = parseComplexContent(analysis)
      
      const newReportData: ReportData = {
        reportType: 'market_analysis',
        sections: sections,
        summary: typeof analysis === 'object' && analysis.analysis?.summary ? analysis.analysis.summary : '시장 분석이 완료되었습니다.',
        generatedAt: new Date().toISOString()
      }
      
      console.log('🔍 변환된 리포트 데이터:', newReportData)
      setReportData(newReportData)
    }
  }, [analysis])

  const getValue = (obj: any, keys: string[], defaultValue: string = '') => {
    for (const key of keys) {
      if (obj && obj[key]) {
        const value = obj[key]
        if (typeof value === 'object') {
          return JSON.stringify(value, null, 2)
        }
        return String(value)
      }
    }
    return defaultValue
  }

  const generateReport = async () => {
    if (!patent || !user) {
      toast.error('특허 정보 또는 사용자 정보가 없습니다.')
      return
    }

    setLoading(true)
    setError('')
    console.log('🚀 시장 분석 리포트 생성 시작')

    try {
      const response = await fetch('/api/ai-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patentData: patent,
          analysisType: 'market_analysis'
        }),
      })

      console.log('📡 API 응답 상태:', response.status)

      if (!response.ok) {
        let errorMessage = '리포트 생성에 실패했습니다.'
        
        if (response.status === 400) {
          errorMessage = '잘못된 요청입니다. 특허 번호를 확인해주세요.'
        } else if (response.status === 401) {
          errorMessage = '인증이 필요합니다. 다시 로그인해주세요.'
        } else if (response.status === 408) {
          errorMessage = '요청 시간이 초과되었습니다. 다시 시도해주세요.'
        } else if (response.status === 429) {
          errorMessage = '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.'
        } else if (response.status === 503) {
          errorMessage = 'AI 서비스가 일시적으로 사용할 수 없습니다. 잠시 후 다시 시도해주세요.'
        }
        
        throw new Error(errorMessage)
      }

      const data = await response.json()
      console.log('📊 받은 데이터:', data)

      if (data.success && data.data && data.data.analysis) {
        const analysis = data.data.analysis
        console.log('🔍 분석 데이터:', analysis)
        
        // 복잡한 JSON 구조 파싱
        const sections = parseComplexContent(analysis)
        
        const reportData: ReportData = {
          reportType: 'market_analysis',
          sections: sections,
          summary: getValue(analysis, ['summary', '요약', 'conclusion'], '시장 분석이 완료되었습니다.'),
          generatedAt: new Date().toISOString()
        };
        
        console.log('🔍 최종 리포트 데이터:', reportData);
        setReportData(reportData);
        // 항상 펼쳐진 단순 섹션으로 표시하므로 확장 상태 관리 제거
        toast.success('시장 분석 리포트가 생성되었습니다.');
      } else {
        console.error('❌ 응답 데이터 형식 오류:', data);
        throw new Error(data.message || '리포트 데이터를 받지 못했습니다.');
      }

    } catch (error) {
      console.error('❌ 리포트 생성 실패:', {
        message: error.message,
        type: error.type,
        status: error.status,
        stack: error.stack
      });
      
      setError(error.message);
      
      toast.error(error.message);
    } finally {
      setLoading(false);
      console.log('🏁 리포트 생성 프로세스 완료');
    }
  }

  const handleRetry = () => {
    setReportData(null)
    generateReport()
  }

  const handlePDFGeneration = async () => {
    if (!reportData || !patent) return

    try {
      await generateDynamicReportPDF(patent, reportData)
      toast.success('PDF가 성공적으로 다운로드되었습니다.')
    } catch (error) {
      console.error('PDF 생성 오류:', error)
      toast.error('PDF 생성에 실패했습니다.')
    }
  }

  if (loading || propLoading) {
    return (
      <ReportLoadingState
        title="시장 분석 리포트"
        description="AI가 특허 기술의 시장 동향과 경쟁 환경을 분석합니다"
        iconColor="bg-blue-100 dark:bg-blue-900"
        Icon={({ className }) => <TrendingUp className={`${className} text-blue-600 dark:text-blue-400`} />}
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
          <div className="flex items-center gap-4">
            <div className="p-4 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900 dark:to-indigo-900 rounded-2xl shadow-lg">
              <TrendingUp className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                시장 분석 리포트
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                AI가 특허 기술의 시장 동향과 경쟁 환경을 분석합니다
              </p>
            </div>
          </div>
        </div>

        <Card className="border-2 border-dashed border-blue-300 dark:border-blue-600 bg-gradient-to-br from-blue-50 via-indigo-50 to-cyan-50 dark:from-blue-900/20 dark:via-indigo-900/20 dark:to-cyan-900/20 shadow-xl">
          <CardContent className="flex flex-col items-center justify-center py-20">
            <div className="relative mb-8">
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-400 to-indigo-500 opacity-20 animate-pulse"></div>
              <div className="absolute inset-2 rounded-full bg-gradient-to-r from-blue-300 to-indigo-400 opacity-30 animate-pulse animation-delay-150"></div>
              <FileText className="relative w-20 h-20 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
              전문적인 시장 분석을 시작하세요
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-center max-w-lg mb-8 leading-relaxed">
              AI가 이 특허의 시장 규모, 경쟁 환경, 성장 잠재력을 종합적으로 분석하여 
              전략적 시장 인사이트가 담긴 전문 리포트를 생성합니다.
            </p>
            <Button 
              onClick={generateReport} 
              className="flex items-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <Brain className="w-5 h-5" />
              리포트 생성하기
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900 dark:to-indigo-900 rounded-2xl shadow-lg">
            <TrendingUp className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
              시장 분석 리포트
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              AI가 분석한 특허 기술의 시장 동향과 경쟁 환경
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={handleRetry}
            className="flex items-center gap-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 border-blue-200 dark:border-blue-700"
          >
            <RefreshCw className="w-4 h-4" />
            새로 생성
          </Button>
          <Button 
            onClick={handlePDFGeneration}
            disabled={pdfGenerating}
            className="flex items-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-300"
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

      {/* Report Content */}
      <div className="space-y-6">
        {reportData.sections.map((section, index) => (
          <SimpleSection
            key={index}
            section={section}
            index={index}
          />
        ))}
      </div>

      {/* Footer */}
      <Card className="bg-gradient-to-r from-blue-50 via-indigo-50 to-cyan-50 dark:from-blue-900/20 dark:via-indigo-900/20 dark:to-cyan-900/20 border-blue-200 dark:border-blue-700 shadow-lg">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-3">
              <Brain className="w-5 h-5 text-blue-600" />
              <span className="font-semibold text-blue-700 dark:text-blue-300">AI 생성 리포트</span>
              <div className="flex items-center gap-1">
                <Award className="w-4 h-4 text-blue-500" />
                <span className="text-xs">시장 분석</span>
              </div>
            </div>
            <span className="text-xs bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 px-3 py-2 rounded-full font-medium">
               생성일시: {formatGeneratedDate(reportData.generatedAt)}
             </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}