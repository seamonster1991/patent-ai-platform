import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { KiprisPatentDetail, KiprisPatentDetailItem, MarketAnalysisReport, BusinessInsightReport } from '../types/kipris'

// 한글 폰트 지원을 위한 설정
const addKoreanFont = (doc: jsPDF) => {
  // 기본 폰트로 설정 (브라우저에서 지원하는 한글 폰트 사용)
  doc.setFont('helvetica')
}

// 공통 PDF 헤더 생성
const addPDFHeader = (doc: jsPDF, title: string, patent: KiprisPatentDetailItem) => {
  const pageWidth = doc.internal.pageSize.getWidth()
  
  // 헤더 배경
  doc.setFillColor(41, 98, 255) // 파란색 배경
  doc.rect(0, 0, pageWidth, 40, 'F')
  
  // 제목
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(20)
  doc.text(title, 20, 25)
  
  // 날짜
  doc.setFontSize(12)
  const currentDate = new Date().toLocaleDateString('ko-KR')
  doc.text(`생성일: ${currentDate}`, pageWidth - 80, 25)
  
  // 특허 정보
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(14)
  const patentTitle = patent.biblioSummaryInfo?.inventionTitle || '제목 없음'
  const applicationNumber = patent.biblioSummaryInfo?.applicationNumber || 'N/A'
  
  doc.text(`특허명: ${patentTitle.substring(0, 50)}${patentTitle.length > 50 ? '...' : ''}`, 20, 60)
  doc.text(`출원번호: ${applicationNumber}`, 20, 75)
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
const addSectionTitle = (doc: jsPDF, title: string, yPosition: number): number => {
  doc.setFontSize(16)
  doc.setTextColor(41, 98, 255)
  doc.text(title, 20, yPosition)
  
  // 제목 아래 라인
  doc.setDrawColor(41, 98, 255)
  doc.line(20, yPosition + 5, 180, yPosition + 5)
  
  return yPosition + 20
}

// 텍스트 블록 추가 (자동 줄바꿈)
const addTextBlock = (doc: jsPDF, text: string, x: number, y: number, maxWidth: number): number => {
  doc.setFontSize(11)
  doc.setTextColor(0, 0, 0)
  
  const lines = doc.splitTextToSize(text, maxWidth)
  doc.text(lines, x, y)
  
  return y + (lines.length * 6)
}

// 시장 분석 리포트 PDF 생성
export const generateMarketAnalysisPDF = async (
  patent: KiprisPatentDetailItem,
  analysis: MarketAnalysisReport
): Promise<void> => {
  const doc = new jsPDF()
  addKoreanFont(doc)
  
  let currentY = 90
  
  // 헤더 추가
  addPDFHeader(doc, '시장 분석 리포트', patent)
  
  // 목차
  currentY = addSectionTitle(doc, '목차', currentY)
  const tocItems = [
    '1. 개요',
    '2. 시장 침투도 분석',
    '3. 경쟁 환경 분석',
    '4. 시장 성장 동력',
    '5. 위험 요소',
    '6. 결론 및 권고사항'
  ]
  
  tocItems.forEach(item => {
    currentY = addTextBlock(doc, item, 30, currentY, 150)
    currentY += 5
  })
  
  // 새 페이지
  doc.addPage()
  currentY = 30
  
  // 1. 개요
  currentY = addSectionTitle(doc, '1. 개요', currentY)
  currentY = addTextBlock(doc, 
    `본 리포트는 "${patent.biblioSummaryInfo?.inventionTitle || '특허'}"에 대한 시장 분석을 제공합니다. ` +
    `AI 기반 분석을 통해 시장 기회와 위험 요소를 평가하였습니다.`,
    20, currentY, 170
  )
  currentY += 15
  
  // 2. 시장 침투도 분석
  currentY = addSectionTitle(doc, '2. 시장 침투도 분석', currentY)
  if (analysis.marketPenetration) {
    currentY = addTextBlock(doc, analysis.marketPenetration, 20, currentY, 170)
  }
  currentY += 15
  
  // 3. 경쟁 환경 분석
  if (currentY > 250) {
    doc.addPage()
    currentY = 30
  }
  currentY = addSectionTitle(doc, '3. 경쟁 환경 분석', currentY)
  if (analysis.competitiveLandscape) {
    currentY = addTextBlock(doc, analysis.competitiveLandscape, 20, currentY, 170)
  }
  currentY += 15
  
  // 4. 시장 성장 동력
  if (currentY > 250) {
    doc.addPage()
    currentY = 30
  }
  currentY = addSectionTitle(doc, '4. 시장 성장 동력', currentY)
  if (analysis.marketGrowthDrivers) {
    currentY = addTextBlock(doc, analysis.marketGrowthDrivers, 20, currentY, 170)
  }
  currentY += 15
  
  // 5. 위험 요소
  if (currentY > 250) {
    doc.addPage()
    currentY = 30
  }
  currentY = addSectionTitle(doc, '5. 위험 요소', currentY)
  if (analysis.riskFactors) {
    currentY = addTextBlock(doc, analysis.riskFactors, 20, currentY, 170)
  }
  
  // 푸터 추가
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    addPDFFooter(doc, i)
  }
  
  // PDF 다운로드
  const fileName = `시장분석리포트_${patent.biblioSummaryInfo?.applicationNumber || 'unknown'}_${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(fileName)
}

// 비즈니스 인사이트 리포트 PDF 생성
export const generateBusinessInsightPDF = async (
  patent: KiprisPatentDetailItem,
  analysis: BusinessInsightReport
): Promise<void> => {
  const doc = new jsPDF()
  addKoreanFont(doc)
  
  let currentY = 90
  
  // 헤더 추가
  addPDFHeader(doc, '비즈니스 인사이트 리포트', patent)
  
  // 목차
  currentY = addSectionTitle(doc, '목차', currentY)
  const tocItems = [
    '1. 개요',
    '2. 수익 모델 분석',
    '3. 로열티 마진 분석',
    '4. 신규 사업 기회',
    '5. 경쟁사 대응 전략',
    '6. 실행 로드맵'
  ]
  
  tocItems.forEach(item => {
    currentY = addTextBlock(doc, item, 30, currentY, 150)
    currentY += 5
  })
  
  // 새 페이지
  doc.addPage()
  currentY = 30
  
  // 1. 개요
  currentY = addSectionTitle(doc, '1. 개요', currentY)
  currentY = addTextBlock(doc, 
    `본 리포트는 "${patent.biblioSummaryInfo?.inventionTitle || '특허'}"의 비즈니스 가치와 ` +
    `상업화 전략에 대한 인사이트를 제공합니다.`,
    20, currentY, 170
  )
  currentY += 15
  
  // 2. 수익 모델 분석
  currentY = addSectionTitle(doc, '2. 수익 모델 분석', currentY)
  if (analysis.revenueModel) {
    currentY = addTextBlock(doc, analysis.revenueModel, 20, currentY, 170)
  }
  currentY += 15
  
  // 3. 로열티 마진 분석
  if (currentY > 250) {
    doc.addPage()
    currentY = 30
  }
  currentY = addSectionTitle(doc, '3. 로열티 마진 분석', currentY)
  if (analysis.royaltyMargin) {
    currentY = addTextBlock(doc, analysis.royaltyMargin, 20, currentY, 170)
  }
  currentY += 15
  
  // 4. 신규 사업 기회
  if (currentY > 250) {
    doc.addPage()
    currentY = 30
  }
  currentY = addSectionTitle(doc, '4. 신규 사업 기회', currentY)
  if (analysis.newBusinessOpportunities) {
    currentY = addTextBlock(doc, analysis.newBusinessOpportunities, 20, currentY, 170)
  }
  currentY += 15
  
  // 5. 경쟁사 대응 전략
  if (currentY > 250) {
    doc.addPage()
    currentY = 30
  }
  currentY = addSectionTitle(doc, '5. 경쟁사 대응 전략', currentY)
  if (analysis.competitorResponseStrategy) {
    currentY = addTextBlock(doc, analysis.competitorResponseStrategy, 20, currentY, 170)
  }
  
  // 푸터 추가
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    addPDFFooter(doc, i)
  }
  
  // PDF 다운로드
  const fileName = `비즈니스인사이트리포트_${patent.biblioSummaryInfo?.applicationNumber || 'unknown'}_${new Date().toISOString().split('T')[0]}.pdf`
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