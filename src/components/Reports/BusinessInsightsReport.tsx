import React, { useState, useEffect } from 'react'
import { 
  Lightbulb, 
  Download,
  Loader2,
  Brain,
  RefreshCw,
  FileText
} from 'lucide-react'
import Button from '../UI/Button'
import Card, { CardContent, CardHeader, CardTitle } from '../UI/Card'
import { KiprisPatentDetailItem, AIAnalysisReport } from '../../types/kipris'
import { generateDynamicReportPDF } from '../../lib/pdfGenerator'
import { toast } from 'sonner'
import ReportLoadingState from './ReportLoadingState'
import ReportErrorState from './ReportErrorState'
import { useAuthStore } from '../../store/authStore'

interface BusinessInsightsReportProps {
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

export default function BusinessInsightsReport({ 
  patent, 
  analysis,
  loading: propLoading = false,
  error: propError = '',
  onGenerate,
  onGeneratePDF,
  pdfGenerating
}: BusinessInsightsReportProps) {
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuthStore()

  // 안전한 날짜 포맷팅 함수
  const formatGeneratedDate = (dateString: string) => {
    try {
      if (!dateString) return '날짜 정보 없음';
      
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        // ISO 문자열이 아닌 경우 현재 시간 사용
        return new Date().toLocaleString('ko-KR');
      }
      
      return date.toLocaleString('ko-KR');
    } catch (error) {
      console.error('날짜 포맷팅 오류:', error);
      return new Date().toLocaleString('ko-KR');
    }
  };

  // 컴포넌트 마운트 시 자동으로 리포트 생성
  useEffect(() => {
    if (patent && !reportData && !loading) {
      generateReport()
    }
  }, [patent])

  const generateReport = async () => {
    if (!patent) {
      toast.error('특허 데이터가 없습니다.');
      return;
    }

    console.log('🚀 비즈니스 인사이트 리포트 생성 시작');
    console.log('📋 특허 데이터 구조:', {
      keys: Object.keys(patent || {}),
      hasTitle: !!(patent?.biblioSummaryInfo?.inventionTitle),
      hasAbstract: !!(patent?.abstractInfo?.astrtCont),
      hasClaims: !!(patent?.claimInfo),
      applicationNumber: patent?.biblioSummaryInfo?.applicationNumber
    });
    
    setLoading(true);
    setError(null);

    const startTime = Date.now();

    try {
      const requestData = {
        patentData: patent,
        reportType: 'business',
        userId: user?.id
      };
      
      console.log('📡 API 요청 전송 중...');
      console.log('🔍 요청 URL:', '/api/generate-report');
      console.log('📦 요청 데이터 크기:', JSON.stringify(requestData).length, 'bytes');
      console.log('🎯 요청 타입:', requestData.reportType);
      
      const response = await fetch('http://localhost:3001/api/generate-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      const processingTime = Date.now() - startTime;
      console.log(`⏱️ API 응답 시간: ${processingTime}ms`);
      console.log('📊 응답 상태:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ API 응답 오류:', {
          status: response.status,
          statusText: response.statusText,
          errorData,
          url: response.url,
          type: response.type
        });

        // 상태 코드별 구체적인 에러 처리
        let errorMessage = '리포트 생성에 실패했습니다.';
        let errorType = 'general';

        switch (response.status) {
          case 400:
            errorMessage = errorData.message || '요청 데이터가 유효하지 않습니다.';
            errorType = 'validation';
            break;
          case 401:
            errorMessage = 'AI 서비스 인증 오류입니다. 관리자에게 문의하세요.';
            errorType = 'api';
            break;
          case 408:
            errorMessage = 'AI 분석 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.';
            errorType = 'timeout';
            break;
          case 429:
            errorMessage = 'AI 서비스 사용량 한도에 도달했습니다. 잠시 후 다시 시도해주세요.';
            errorType = 'quota';
            break;
          case 503:
            errorMessage = '네트워크 연결 오류입니다. 인터넷 연결을 확인해주세요.';
            errorType = 'network';
            break;
          default:
            errorMessage = errorData.message || `서버 오류 (${response.status})`;
            errorType = 'general';
        }

        const error = new Error(errorMessage) as any;
        error.type = errorType;
        error.status = response.status;
        throw error;
      }

      console.log('✅ API 응답 성공, 데이터 파싱 중...');
      const data = await response.json();
      console.log('📄 응답 데이터 구조:', {
        success: data.success,
        hasData: !!data.data,
        dataKeys: data.data ? Object.keys(data.data) : [],
        keys: Object.keys(data || {})
      });

      if (data.success && data.data) {
        console.log('✅ 리포트 생성 완료');
        setReportData(data.data.content);
        toast.success('비즈니스 인사이트 리포트가 생성되었습니다.');
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
        title="비즈니스 인사이트 리포트"
        description="AI가 특허 기술의 비즈니스 가치와 전략적 인사이트를 분석합니다"
        iconColor="bg-amber-100 dark:bg-amber-900"
        Icon={({ className }) => <Lightbulb className={`${className} text-amber-600 dark:text-amber-400`} />}
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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900 rounded-lg">
              <Lightbulb className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                비즈니스 인사이트 리포트
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                AI가 특허 기술의 비즈니스 가치와 전략적 인사이트를 분석합니다
              </p>
            </div>
          </div>
        </div>

        <Card className="border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="relative mb-6">
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 opacity-20 animate-pulse"></div>
              <FileText className="relative w-16 h-16 text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              리포트를 생성해주세요
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-center max-w-md mb-6">
              AI가 이 특허의 비즈니스 가치와 전략적 활용 방안을 분석하여 전문적인 리포트를 생성합니다.
            </p>
            <Button 
              onClick={generateReport} 
              className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700"
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900 dark:to-orange-900 rounded-xl shadow-sm">
            <Lightbulb className="w-7 h-7 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              비즈니스 인사이트 리포트
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              AI가 분석한 특허 기술의 비즈니스 가치와 전략적 인사이트
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={handleRetry}
            className="flex items-center gap-2 hover:bg-amber-50 dark:hover:bg-amber-900/20"
          >
            <RefreshCw className="w-4 h-4" />
            새로 생성
          </Button>
          <Button 
            onClick={handlePDFGeneration}
            disabled={pdfGenerating}
            className="flex items-center gap-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 shadow-lg"
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
          <Card key={index} className="shadow-sm hover:shadow-lg transition-all duration-300 border-l-4 border-l-amber-500">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">
                  {index + 1}
                </div>
                {section.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-gray dark:prose-invert max-w-none">
                {section.content.split('\n').map((paragraph, pIndex) => {
                  if (paragraph.trim() === '') return null
                  
                  // 볼드 텍스트 처리
                  if (paragraph.includes('**')) {
                    const parts = paragraph.split(/\*\*(.*?)\*\*/g)
                    return (
                      <p key={pIndex} className="mb-4 leading-relaxed">
                        {parts.map((part, partIndex) => 
                          partIndex % 2 === 1 ? (
                            <strong key={partIndex} className="font-semibold text-amber-900 dark:text-amber-100 bg-amber-50 dark:bg-amber-900/30 px-1 rounded">
                              {part}
                            </strong>
                          ) : (
                            part
                          )
                        )}
                      </p>
                    )
                  }
                  
                  // 리스트 아이템 처리
                  if (paragraph.trim().startsWith('-') || paragraph.trim().startsWith('•')) {
                    return (
                      <div key={pIndex} className="flex items-start gap-3 mb-3 p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                        <div className="w-2 h-2 bg-gradient-to-r from-amber-500 to-orange-600 rounded-full mt-2 flex-shrink-0"></div>
                        <span className="leading-relaxed text-gray-700 dark:text-gray-300">
                          {paragraph.replace(/^[-•]\s*/, '')}
                        </span>
                      </div>
                    )
                  }
                  
                  return (
                    <p key={pIndex} className="mb-4 leading-relaxed text-gray-700 dark:text-gray-300">
                      {paragraph}
                    </p>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Footer */}
      <Card className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-700">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-amber-600" />
              <span className="font-medium">AI 생성 리포트</span>
            </div>
            <span className="text-xs bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded-full">
               생성일시: {formatGeneratedDate(reportData.generatedAt)}
             </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}