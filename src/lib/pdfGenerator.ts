import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { KiprisPatentDetail, KiprisPatentDetailItem, MarketAnalysisReport, BusinessInsightReport } from '../types/kipris'
import { activityTracker } from './activityTracker'

// 새로운 동적 리포트 데이터 구조
interface ReportSection {
  title: string
  content: string
}

interface DynamicReportData {
  reportType: string
  sections: ReportSection[]
  summary: string
  generatedAt: string
}

// 한글 폰트 지원을 위한 설정
const addKoreanFont = (doc: jsPDF) => {
  // Noto Sans KR 폰트를 Google Fonts에서 로드
  const fontUrl = 'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700&display=swap'
  
  // 폰트 로드를 위한 CSS 추가 (브라우저에서 폰트 사용 가능하도록)
  if (!document.querySelector(`link[href="${fontUrl}"]`)) {
    const link = document.createElement('link')
    link.href = fontUrl
    link.rel = 'stylesheet'
    document.head.appendChild(link)
  }
  
  // jsPDF 기본 폰트 설정
  doc.setFont('helvetica')
}

// 한국어 텍스트를 이미지로 변환하여 PDF에 추가하는 함수
const addKoreanTextAsImage = async (
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  options: {
    fontSize?: number
    fontWeight?: string
    color?: string
    maxWidth?: number
    lineHeight?: number
  } = {}
): Promise<number> => {
  const {
    fontSize = 12,
    fontWeight = 'normal',
    color = '#000000',
    maxWidth = 500,
    lineHeight = 1.5
  } = options

  // 임시 div 요소 생성
  const tempDiv = document.createElement('div')
  tempDiv.style.position = 'absolute'
  tempDiv.style.left = '-9999px'
  tempDiv.style.top = '-9999px'
  tempDiv.style.fontFamily = '"Noto Sans KR", "Malgun Gothic", "맑은 고딕", sans-serif'
  tempDiv.style.fontSize = `${fontSize}px`
  tempDiv.style.fontWeight = fontWeight
  tempDiv.style.color = color
  tempDiv.style.lineHeight = lineHeight.toString()
  tempDiv.style.maxWidth = `${maxWidth}px`
  tempDiv.style.wordWrap = 'break-word'
  tempDiv.style.whiteSpace = 'pre-wrap'
  tempDiv.style.padding = '10px'
  tempDiv.style.backgroundColor = 'white'
  tempDiv.textContent = text

  document.body.appendChild(tempDiv)

  try {
    // html2canvas로 텍스트를 이미지로 변환
    const canvas = await html2canvas(tempDiv, {
      backgroundColor: 'white',
      scale: 2, // 고해상도를 위해 스케일 증가
      useCORS: true,
      allowTaint: true
    })

    // 캔버스를 이미지 데이터로 변환
    const imgData = canvas.toDataURL('image/png')
    
    // PDF에 이미지 추가
    const imgWidth = canvas.width / 2 // 스케일 2로 인한 조정
    const imgHeight = canvas.height / 2
    
    // PDF 좌표계에 맞게 크기 조정
    const pdfWidth = Math.min(imgWidth * 0.75, maxWidth) // 0.75는 픽셀을 포인트로 변환하는 비율
    const pdfHeight = (imgHeight * pdfWidth) / imgWidth

    doc.addImage(imgData, 'PNG', x, y, pdfWidth, pdfHeight)
    
    return y + pdfHeight + 5 // 다음 요소를 위한 Y 좌표 반환
  } catch (error) {
    console.warn('한국어 텍스트 이미지 변환 실패:', error)
    // 실패 시 기본 텍스트로 대체
    doc.text(text, x, y)
    return y + fontSize + 5
  } finally {
    // 임시 요소 제거
    document.body.removeChild(tempDiv)
  }
}

// 공통 PDF 헤더 생성
const addPDFHeader = async (doc: jsPDF, title: string, patent: KiprisPatentDetailItem) => {
  const pageWidth = doc.internal.pageSize.getWidth()
  
  // 배경 그라데이션 효과
  doc.setFillColor(59, 130, 246) // blue-500
  doc.rect(0, 0, pageWidth, 60, 'F')
  
  // 제목을 이미지로 렌더링 (한국어 지원)
  await addKoreanTextAsImage(doc, title, 20, 15, {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    maxWidth: pageWidth - 40
  })
  
  // 특허 정보를 이미지로 렌더링
  const patentInfo = `특허명: ${patent.biblioSummaryInfo?.inventionTitle || 'N/A'}`
  await addKoreanTextAsImage(doc, patentInfo, 20, 35, {
    fontSize: 12,
    color: '#ffffff',
    maxWidth: pageWidth - 100
  })
  
  const applicationInfo = `출원번호: ${patent.biblioSummaryInfo?.applicationNumber || 'N/A'}`
  await addKoreanTextAsImage(doc, applicationInfo, 20, 45, {
    fontSize: 12,
    color: '#ffffff',
    maxWidth: pageWidth - 100
  })
  
  // 생성 일시
  const currentDate = new Date().toLocaleDateString('ko-KR')
  const dateInfo = `생성일: ${currentDate}`
  await addKoreanTextAsImage(doc, dateInfo, pageWidth - 120, 35, {
    fontSize: 12,
    color: '#ffffff',
    maxWidth: 100
  })
}

// 공통 PDF 푸터 생성
const addPDFFooter = (doc: jsPDF, pageNumber: number) => {
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  
  // 푸터 라인
  doc.setDrawColor(200, 200, 200)
  doc.line(20, pageHeight - 30, pageWidth - 20, pageHeight - 30)
  
  // 페이지 번호
  doc.setFontSize(10)
  doc.setTextColor(100, 100, 100)
  doc.text(`페이지 ${pageNumber}`, pageWidth - 40, pageHeight - 15)
  
  // 면책 조항
  doc.text('본 리포트는 AI 분석 결과이며, 투자 결정의 참고용으로만 사용하시기 바랍니다.', 20, pageHeight - 15)
}

// 섹션 제목 추가
const addSectionTitle = async (doc: jsPDF, title: string, y: number): Promise<number> => {
  return await addKoreanTextAsImage(doc, title, 20, y, {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3b82f6',
    maxWidth: 550
  })
}

// 텍스트 블록 추가 (자동 줄바꿈 지원)
const addTextBlock = async (doc: jsPDF, text: string, x: number, y: number, maxWidth: number): Promise<number> => {
  return await addKoreanTextAsImage(doc, text, x, y, {
    fontSize: 11,
    color: '#000000',
    maxWidth: maxWidth,
    lineHeight: 1.6
  })
}

// 새로운 동적 리포트 PDF 생성 함수
export const generateDynamicReportPDF = async (
  patent: KiprisPatentDetailItem,
  reportData: DynamicReportData
): Promise<void> => {
  const doc = new jsPDF()
  addKoreanFont(doc)
  
  let currentY = 80
  
  // 리포트 타입에 따른 제목 설정
  const reportTitle = reportData.reportType === 'market' 
    ? '기술/시장 분석 리포트' 
    : '비즈니스 전략 인사이트 리포트'
  
  // 헤더 추가
  await addPDFHeader(doc, reportTitle, patent)
  
  // 목차 생성
  currentY = await addSectionTitle(doc, '목차', currentY)
  for (const [index, section] of reportData.sections.entries()) {
    currentY = await addTextBlock(doc, `${index + 1}. ${section.title}`, 30, currentY, 150)
    currentY += 5
  }
  
  // 새 페이지
  doc.addPage()
  currentY = 30
  
  // 개요 섹션
  currentY = await addSectionTitle(doc, '개요', currentY)
  const overview = `본 리포트는 "${patent.biblioSummaryInfo?.inventionTitle || '특허'}"에 대한 ${reportTitle.toLowerCase()}을 제공합니다. AI 기반 분석을 통해 생성된 전문적인 인사이트를 담고 있습니다.`
  currentY = await addTextBlock(doc, overview, 20, currentY, 170)
  currentY += 15
  
  // 각 섹션 추가
  for (const [index, section] of reportData.sections.entries()) {
    // 페이지 공간 확인
    if (currentY > 250) {
      doc.addPage()
      currentY = 30
    }
    
    currentY = await addSectionTitle(doc, `${index + 1}. ${section.title}`, currentY)
    
    // 섹션 내용을 문단별로 처리
    const paragraphs = section.content.split('\n').filter(p => p.trim() !== '')
    
    for (const paragraph of paragraphs) {
      // 페이지 공간 재확인
      if (currentY > 260) {
        doc.addPage()
        currentY = 30
      }
      
      // 볼드 텍스트 처리
      if (paragraph.includes('**')) {
        // 볼드 마크다운을 제거하고 일반 텍스트로 처리
        const cleanText = paragraph.replace(/\*\*(.*?)\*\*/g, '$1')
        currentY = await addTextBlock(doc, cleanText, 20, currentY, 170)
      } 
      // 리스트 아이템 처리
      else if (paragraph.trim().startsWith('-') || paragraph.trim().startsWith('•')) {
        const cleanText = paragraph.replace(/^[-•]\s*/, '')
        
        // 불릿 포인트 추가
        doc.setFillColor(59, 130, 246)
        doc.circle(25, currentY + 5, 1, 'F')
        
        currentY = await addTextBlock(doc, `• ${cleanText}`, 30, currentY, 165)
        currentY += 3
      }
      // 일반 문단 처리
      else {
        currentY = await addTextBlock(doc, paragraph, 20, currentY, 170)
        currentY += 8
      }
    }
    
    currentY += 10
  }
  
  // 요약 섹션 (있는 경우)
  if (reportData.summary && reportData.summary.trim() !== '') {
    if (currentY > 220) {
      doc.addPage()
      currentY = 30
    }
    
    currentY = await addSectionTitle(doc, '요약', currentY)
    currentY = await addTextBlock(doc, reportData.summary, 20, currentY, 170)
  }
  
  // 푸터 추가
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    addPDFFooter(doc, i)
  }
  
  // 활동 추적 - PDF 다운로드 기록
  try {
    const tracker = activityTracker()
    await tracker.trackDocumentDownload(
      patent.biblioSummaryInfo?.applicationNumber || 'unknown',
      `${reportData.reportType}_report_pdf`
    )
  } catch (error) {
    console.error('PDF 다운로드 활동 추적 오류:', error)
    // 활동 추적 실패는 PDF 다운로드에 영향을 주지 않음
  }

  // PDF 다운로드
  const reportTypeKorean = reportData.reportType === 'market' ? '시장분석' : '비즈니스인사이트'
  const fileName = `${reportTypeKorean}리포트_${patent.biblioSummaryInfo?.applicationNumber || 'unknown'}_${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(fileName)
}

// 기존 시장 분석 리포트 PDF 생성 (호환성 유지)
export const generateMarketAnalysisPDF = async (
  patent: KiprisPatentDetailItem,
  analysis: MarketAnalysisReport
): Promise<void> => {
  const doc = new jsPDF()
  addKoreanFont(doc)
  
  let currentY = 90
  
  // 헤더 추가
  await addPDFHeader(doc, '시장 분석 리포트', patent)
  
  // 목차
  currentY = await addSectionTitle(doc, '목차', currentY)
  const tocItems = [
    '1. 개요',
    '2. 시장 침투도 분석',
    '3. 경쟁 환경 분석',
    '4. 시장 성장 동력',
    '5. 위험 요소',
    '6. 결론 및 권고사항'
  ]
  
  for (const item of tocItems) {
    currentY = await addTextBlock(doc, item, 30, currentY, 150)
    currentY += 5
  }
  
  // 새 페이지
  doc.addPage()
  currentY = 30
  
  // 1. 개요
  currentY = await addSectionTitle(doc, '1. 개요', currentY)
  currentY = await addTextBlock(doc, 
    `본 리포트는 "${patent.biblioSummaryInfo?.inventionTitle || '특허'}"에 대한 시장 분석을 제공합니다. ` +
    `AI 기반 분석을 통해 시장 기회와 위험 요소를 평가하였습니다.`,
    20, currentY, 170
  )
  currentY += 15
  
  // 2. 시장 침투도 분석
  currentY = await addSectionTitle(doc, '2. 시장 침투도 분석', currentY)
  if (analysis.marketPenetration) {
    currentY = await addTextBlock(doc, analysis.marketPenetration, 20, currentY, 170)
  }
  currentY += 15
  
  // 3. 경쟁 환경 분석
  if (currentY > 250) {
    doc.addPage()
    currentY = 30
  }
  currentY = await addSectionTitle(doc, '3. 경쟁 환경 분석', currentY)
  if (analysis.competitiveLandscape) {
    currentY = await addTextBlock(doc, analysis.competitiveLandscape, 20, currentY, 170)
  }
  currentY += 15
  
  // 4. 시장 성장 동력
  if (currentY > 250) {
    doc.addPage()
    currentY = 30
  }
  currentY = await addSectionTitle(doc, '4. 시장 성장 동력', currentY)
  if (analysis.marketGrowthDrivers) {
    currentY = await addTextBlock(doc, analysis.marketGrowthDrivers, 20, currentY, 170)
  }
  currentY += 15
  
  // 5. 위험 요소
  if (currentY > 250) {
    doc.addPage()
    currentY = 30
  }
  currentY = await addSectionTitle(doc, '5. 위험 요소', currentY)
  if (analysis.riskFactors) {
    currentY = await addTextBlock(doc, analysis.riskFactors, 20, currentY, 170)
  }
  
  // 푸터 추가
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    addPDFFooter(doc, i)
  }
  
  // 활동 추적 - PDF 다운로드 기록
  try {
    const tracker = activityTracker()
    await tracker.trackDocumentDownload(
      patent.biblioSummaryInfo?.applicationNumber || 'unknown',
      'market_analysis_pdf'
    )
  } catch (error) {
    console.error('PDF 다운로드 활동 추적 오류:', error)
    // 활동 추적 실패는 PDF 다운로드에 영향을 주지 않음
  }

  // PDF 다운로드
  const fileName = `시장분석리포트_${patent.biblioSummaryInfo?.applicationNumber || 'unknown'}_${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(fileName)
}

// 기존 비즈니스 인사이트 리포트 PDF 생성 (호환성 유지)
export const generateBusinessInsightPDF = async (
  patent: KiprisPatentDetailItem,
  analysis: BusinessInsightReport
): Promise<void> => {
  const doc = new jsPDF()
  addKoreanFont(doc)
  
  let currentY = 90
  
  // 헤더 추가
  await addPDFHeader(doc, '비즈니스 인사이트 리포트', patent)
  
  // 목차
  currentY = await addSectionTitle(doc, '목차', currentY)
  const tocItems = [
    '1. 개요',
    '2. 수익 모델 분석',
    '3. 로열티 마진 분석',
    '4. 신규 사업 기회',
    '5. 경쟁사 대응 전략',
    '6. 실행 로드맵'
  ]
  
  for (const item of tocItems) {
    currentY = await addTextBlock(doc, item, 30, currentY, 150)
    currentY += 5
  }
  
  // 새 페이지
  doc.addPage()
  currentY = 30
  
  // 1. 개요
  currentY = await addSectionTitle(doc, '1. 개요', currentY)
  currentY = await addTextBlock(doc, 
    `본 리포트는 "${patent.biblioSummaryInfo?.inventionTitle || '특허'}"의 비즈니스 가치와 ` +
    `상업화 전략에 대한 인사이트를 제공합니다.`,
    20, currentY, 170
  )
  currentY += 15
  
  // 2. 수익 모델 분석
  currentY = await addSectionTitle(doc, '2. 수익 모델 분석', currentY)
  if (analysis.revenueModel) {
    currentY = await addTextBlock(doc, analysis.revenueModel, 20, currentY, 170)
  }
  currentY += 15
  
  // 3. 로열티 마진 분석
  if (currentY > 250) {
    doc.addPage()
    currentY = 30
  }
  currentY = await addSectionTitle(doc, '3. 로열티 마진 분석', currentY)
  if (analysis.royaltyMargin) {
    currentY = await addTextBlock(doc, analysis.royaltyMargin, 20, currentY, 170)
  }
  currentY += 15
  
  // 4. 신규 사업 기회
  if (currentY > 250) {
    doc.addPage()
    currentY = 30
  }
  currentY = await addSectionTitle(doc, '4. 신규 사업 기회', currentY)
  if (analysis.newBusinessOpportunities) {
    currentY = await addTextBlock(doc, analysis.newBusinessOpportunities, 20, currentY, 170)
  }
  currentY += 15
  
  // 5. 경쟁사 대응 전략
  if (currentY > 250) {
    doc.addPage()
    currentY = 30
  }
  currentY = await addSectionTitle(doc, '5. 경쟁사 대응 전략', currentY)
  if (analysis.competitorResponseStrategy) {
    currentY = await addTextBlock(doc, analysis.competitorResponseStrategy, 20, currentY, 170)
  }
  
  // 푸터 추가
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    addPDFFooter(doc, i)
  }
  
  // 활동 추적 - PDF 다운로드 기록
  try {
    const tracker = activityTracker()
    await tracker.trackDocumentDownload(
      patent.biblioSummaryInfo?.applicationNumber || 'unknown',
      'business_insight_pdf'
    )
  } catch (error) {
    console.error('PDF 다운로드 활동 추적 오류:', error)
    // 활동 추적 실패는 PDF 다운로드에 영향을 주지 않음
  }

  // PDF 다운로드
  const fileName = `시장분석리포트_${patent.biblioSummaryInfo?.applicationNumber || 'unknown'}_${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(fileName)
}

// 차트를 이미지로 변환하여 PDF에 추가하는 함수
export const addChartToPDF = async (
  doc: jsPDF,
  chartElement: HTMLElement,
  x: number,
  y: number,
  width: number,
  height: number
): Promise<void> => {
  try {
    const canvas = await html2canvas(chartElement, {
      backgroundColor: '#ffffff',
      scale: 2
    })
    
    const imgData = canvas.toDataURL('image/png')
    doc.addImage(imgData, 'PNG', x, y, width, height)
  } catch (error) {
    console.error('차트를 PDF에 추가하는 중 오류 발생:', error)
  }
}