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
const addKoreanFont = async (doc: jsPDF) => {
  console.log('🔤 한글 폰트 설정 시작')
  
  try {
    // Noto Sans KR 폰트를 Google Fonts에서 로드
    const fontUrl = 'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700&display=swap'
    
    // 폰트 로드를 위한 CSS 추가 (브라우저에서 폰트 사용 가능하도록)
    if (!document.querySelector(`link[href="${fontUrl}"]`)) {
      console.log('📥 Google Fonts 로드 중...')
      const link = document.createElement('link')
      link.href = fontUrl
      link.rel = 'stylesheet'
      document.head.appendChild(link)
      
      // 폰트 로드 대기 (document.fonts.ready 우선, 타임아웃 보강)
      try {
        if ((document as any).fonts && (document as any).fonts.ready) {
          await Promise.race([
            (document as any).fonts.ready,
            new Promise(resolve => setTimeout(resolve, 2000)) // 타임아웃 단축
          ])
          console.log('✅ Google Fonts 로드 완료')
        } else {
          await new Promise(resolve => {
            link.onload = () => {
              console.log('✅ 폰트 링크 로드 완료')
              resolve(undefined)
            }
            setTimeout(() => {
              console.log('⏰ 폰트 로드 타임아웃')
              resolve(undefined)
            }, 2000)
          })
        }
      } catch (fontError) {
        console.warn('⚠️ 폰트 로드 실패, fallback 사용:', fontError)
      }
    } else {
      console.log('✅ Google Fonts 이미 로드됨')
    }
    
    // 추가 한글 폰트 fallback 설정
    const style = document.createElement('style')
    style.textContent = `
      .korean-text {
        font-family: "Noto Sans KR", "Malgun Gothic", "맑은 고딕", "Apple SD Gothic Neo", "Helvetica Neue", Arial, sans-serif !important;
        font-feature-settings: "kern" 1;
        text-rendering: optimizeLegibility;
      }
    `
    if (!document.querySelector('style[data-korean-font]')) {
      style.setAttribute('data-korean-font', 'true')
      document.head.appendChild(style)
    }
    
    // jsPDF 기본 폰트 설정
    doc.setFont('helvetica')
    
  } catch (error) {
    console.warn('⚠️ 한글 폰트 설정 실패:', error)
    // 기본 폰트로 fallback
    doc.setFont('helvetica')
  }
}

// 기본 텍스트 렌더링 함수 (fallback용)
const addBasicText = (doc: jsPDF, text: string, x: number, y: number, options: any = {}): number => {
  const { fontSize = 12, fontWeight = 'normal', color = '#000000', maxWidth = 500 } = options
  
  doc.setFontSize(fontSize)
  doc.setTextColor(color)
  
  // 긴 텍스트 자동 줄바꿈 처리
  const lines = doc.splitTextToSize(text, maxWidth)
  doc.text(lines, x, y)
  
  return y + (lines.length * fontSize * 1.2) + 5
}

// 한국어 텍스트를 이미지로 변환하여 PDF에 추가하는 함수 (개선된 버전)
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

  // 텍스트가 비어있거나 너무 긴 경우 기본 텍스트 렌더링 사용
  if (!text || text.trim() === '' || text.length > 1000) {
    console.log('📝 기본 텍스트 렌더링 사용 (텍스트 길이 또는 빈 텍스트)')
    return addBasicText(doc, text, x, y, options)
  }

  let tempDiv: HTMLElement | null = null

  try {
    // 임시 div 요소 생성
    tempDiv = document.createElement('div')
    tempDiv.className = 'korean-text'
    tempDiv.style.cssText = `
      position: absolute;
      left: -9999px;
      top: -9999px;
      font-family: "Noto Sans KR", "Malgun Gothic", "맑은 고딕", "Apple SD Gothic Neo", "Helvetica Neue", Arial, sans-serif;
      font-size: ${fontSize}px;
      font-weight: ${fontWeight};
      color: ${color};
      line-height: ${lineHeight};
      max-width: ${maxWidth}px;
      word-wrap: break-word;
      white-space: pre-wrap;
      padding: 10px;
      background-color: white;
      font-feature-settings: "kern" 1;
      text-rendering: optimizeLegibility;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      border: 1px solid transparent;
    `
    tempDiv.textContent = text
    document.body.appendChild(tempDiv)

    // 짧은 대기 시간으로 DOM 렌더링 완료 대기
    await new Promise(resolve => setTimeout(resolve, 100))

    // html2canvas로 텍스트를 이미지로 변환 (타임아웃 설정)
    const canvasPromise = html2canvas(tempDiv, {
      backgroundColor: 'white',
      scale: 1.5, // 스케일 조정으로 성능 개선
      useCORS: true,
      allowTaint: false,
      foreignObjectRendering: false,
      removeContainer: false,
      logging: false,
      width: tempDiv.offsetWidth,
      height: tempDiv.offsetHeight
    })

    // 5초 타임아웃 설정
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Canvas 생성 타임아웃')), 5000)
    )

    const canvas = await Promise.race([canvasPromise, timeoutPromise]) as HTMLCanvasElement

    // 캔버스 유효성 검사
    if (!canvas || canvas.width === 0 || canvas.height === 0) {
      throw new Error('유효하지 않은 캔버스')
    }

    // 캔버스를 이미지 데이터로 변환
    const imgData = canvas.toDataURL('image/png', 0.8) // 품질 조정으로 성능 개선
    
    if (!imgData || imgData === 'data:,') {
      throw new Error('이미지 데이터 생성 실패')
    }
    
    // PDF에 이미지 추가
    const imgWidth = canvas.width / 1.5 // 스케일 1.5로 인한 조정
    const imgHeight = canvas.height / 1.5
    
    // PDF 좌표계에 맞게 크기 조정
    const pdfWidth = Math.min(imgWidth * 0.75, maxWidth)
    const pdfHeight = (imgHeight * pdfWidth) / imgWidth

    doc.addImage(imgData, 'PNG', x, y, pdfWidth, pdfHeight)
    
    return y + pdfHeight + 5
    
  } catch (error) {
    console.warn('⚠️ 한국어 텍스트 이미지 변환 실패, 기본 텍스트 사용:', error.message)
    return addBasicText(doc, text, x, y, options)
  } finally {
    // 임시 요소 안전하게 제거
    if (tempDiv && tempDiv.parentNode) {
      try {
        document.body.removeChild(tempDiv)
      } catch (removeError) {
        console.warn('임시 요소 제거 실패:', removeError)
      }
    }
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
const addPDFFooter = async (doc: jsPDF, pageNumber: number) => {
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  
  // 푸터 라인
  doc.setDrawColor(200, 200, 200)
  doc.line(20, pageHeight - 30, pageWidth - 20, pageHeight - 30)
  
  // 페이지 번호를 이미지로 렌더링 (한국어 지원)
  await addKoreanTextAsImage(doc, `페이지 ${pageNumber}`, pageWidth - 60, pageHeight - 20, {
    fontSize: 10,
    color: '#666666',
    maxWidth: 50
  })
  
  // 면책 조항을 이미지로 렌더링 (한국어 지원)
  await addKoreanTextAsImage(doc, '본 리포트는 AI 분석 결과이며, 투자 결정의 참고용으로만 사용하시기 바랍니다.', 20, pageHeight - 20, {
    fontSize: 10,
    color: '#666666',
    maxWidth: pageWidth - 100
  })
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

// 새로운 동적 리포트 PDF 생성 함수 (강화된 오류 처리)
export const generateDynamicReportPDF = async (
  patent: KiprisPatentDetailItem,
  reportData: DynamicReportData
): Promise<void> => {
  console.log('🔄 PDF 생성 시작:', { 
    reportType: reportData.reportType, 
    sectionsCount: reportData.sections.length,
    timestamp: new Date().toISOString()
  })
  
  // 입력 데이터 유효성 검사
  if (!patent || !reportData) {
    throw new Error('필수 데이터가 누락되었습니다 (patent 또는 reportData)')
  }
  
  if (!reportData.sections || reportData.sections.length === 0) {
    throw new Error('리포트 섹션 데이터가 없습니다')
  }
  
  let doc: jsPDF | null = null
  let currentY = 80
  
  try {
    // jsPDF 인스턴스 생성
    console.log('📄 jsPDF 인스턴스 생성 중...')
    doc = new jsPDF()
    console.log('✅ jsPDF 인스턴스 생성 완료')
    
    // 한글 폰트 설정 (타임아웃 적용)
    console.log('🔤 한글 폰트 설정 중...')
    const fontPromise = addKoreanFont(doc)
    const fontTimeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('폰트 로딩 타임아웃')), 10000)
    )
    
    try {
      await Promise.race([fontPromise, fontTimeout])
      console.log('✅ 한글 폰트 설정 완료')
    } catch (fontError) {
      console.warn('⚠️ 한글 폰트 설정 실패, 기본 폰트 사용:', fontError.message)
      // 폰트 설정 실패해도 계속 진행
    }
    
    // 리포트 타입에 따른 제목 설정
    const reportTitle = reportData.reportType === 'market_analysis'
      ? '기술/시장 분석 리포트'
      : '비즈니스 전략 인사이트 리포트'
    
    console.log('📋 PDF 헤더 생성 중...')
    // 헤더 추가 (오류 처리)
    try {
      await addPDFHeader(doc, reportTitle, patent)
      console.log('✅ PDF 헤더 생성 완료')
    } catch (headerError) {
      console.warn('⚠️ 헤더 생성 실패, 기본 제목 사용:', headerError.message)
      doc.setFontSize(20)
      doc.text(reportTitle, 20, 30)
      currentY = 50
    }
    
    console.log('📑 목차 생성 중...')
    // 목차 생성 (오류 처리)
    try {
      currentY = await addSectionTitle(doc, '목차', currentY)
      for (const [index, section] of reportData.sections.entries()) {
        if (section && section.title) {
          currentY = await addTextBlock(doc, `${index + 1}. ${section.title}`, 30, currentY, 150)
          currentY += 5
        }
      }
      console.log('✅ 목차 생성 완료')
    } catch (tocError) {
      console.warn('⚠️ 목차 생성 실패:', tocError.message)
      // 목차 생성 실패해도 계속 진행
    }
    
    // 새 페이지
    doc.addPage()
    currentY = 30
    
    console.log('📝 개요 섹션 생성 중...')
    // 개요 섹션 (오류 처리)
    try {
      currentY = await addSectionTitle(doc, '개요', currentY)
      const overview = `본 리포트는 "${patent.biblioSummaryInfo?.inventionTitle || '특허'}"에 대한 ${reportTitle.toLowerCase()}을 제공합니다. AI 기반 분석을 통해 생성된 전문적인 인사이트를 담고 있습니다.`
      currentY = await addTextBlock(doc, overview, 20, currentY, 170)
      currentY += 15
      console.log('✅ 개요 섹션 생성 완료')
    } catch (overviewError) {
      console.warn('⚠️ 개요 섹션 생성 실패:', overviewError.message)
      currentY += 20 // 공간 확보 후 계속 진행
    }
    
    console.log('📄 리포트 섹션 생성 중...')
    // 각 섹션 추가 (개별 오류 처리)
    for (const [index, section] of reportData.sections.entries()) {
      try {
        if (!section || !section.title || !section.content) {
          console.warn(`⚠️ 섹션 ${index + 1} 데이터 누락, 건너뜀`)
          continue
        }
        
        // 페이지 공간 확인
        if (currentY > 250) {
          doc.addPage()
          currentY = 30
        }
        
        console.log(`📝 섹션 ${index + 1} 처리 중: ${section.title}`)
        currentY = await addSectionTitle(doc, `${index + 1}. ${section.title}`, currentY)
        
        // 섹션 내용을 마크다운으로 렌더링
        try {
          currentY = await parseAndRenderMarkdown(doc, section.content, 20, currentY, 170)
          currentY += 10 // 섹션 간 여백
        } catch (sectionError) {
          console.warn(`섹션 마크다운 렌더링 실패, 기본 처리 사용:`, sectionError.message)
          
          // 기본 문단 처리로 fallback
          const paragraphs = section.content.split('\n').filter(p => p.trim())
          for (const paragraph of paragraphs) {
            if (!paragraph.trim()) {
              currentY += 5
              continue
            }

            try {
              // 페이지 공간 확인
              if (currentY > 260) {
                doc.addPage()
                currentY = 30
              }

              currentY = await addTextBlock(doc, paragraph, 20, currentY, 170)
              currentY += 8
            } catch (paragraphError) {
              console.warn(`문단 처리 실패, 기본 텍스트 사용:`, paragraphError.message)
              // 기본 텍스트 렌더링으로 fallback
              const lines = doc.splitTextToSize(paragraph.substring(0, 200), 170)
              for (const line of lines) {
                if (currentY > 270) {
                  doc.addPage()
                  currentY = 30
                }
                doc.text(line, 20, currentY)
                currentY += 6
              }
            }
          }
        }
        
        currentY += 10
        console.log(`✅ 섹션 ${index + 1} 완료`)
        
      } catch (sectionError) {
        console.warn(`⚠️ 섹션 ${index + 1} 처리 실패:`, sectionError.message)
        // 섹션 실패해도 다음 섹션 계속 처리
        currentY += 20
      }
    }
    
    console.log('📄 요약 섹션 생성 중...')
    // 요약 섹션 (있는 경우)
    if (reportData.summary && reportData.summary.trim() !== '') {
      try {
        if (currentY > 220) {
          doc.addPage()
          currentY = 30
        }
        
        currentY = await addSectionTitle(doc, '요약', currentY)
        currentY = await addTextBlock(doc, reportData.summary, 20, currentY, 170)
        console.log('✅ 요약 섹션 생성 완료')
      } catch (summaryError) {
        console.warn('⚠️ 요약 섹션 생성 실패:', summaryError.message)
      }
    }
    
    console.log('📄 푸터 생성 중...')
    // 푸터 추가 (오류 처리)
    try {
      const totalPages = doc.getNumberOfPages()
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i)
        await addPDFFooter(doc, i)
      }
      console.log('✅ 푸터 생성 완료')
    } catch (footerError) {
      console.warn('⚠️ 푸터 생성 실패:', footerError.message)
      // 푸터 실패해도 PDF 다운로드는 계속 진행
    }
    
    // 활동 추적 (실패해도 PDF 다운로드에 영향 없음)
    try {
      await activityTracker.trackDocumentDownload(
        patent.biblioSummaryInfo?.applicationNumber || 'unknown',
        `${reportData.reportType}_report_pdf`
      )
    } catch (trackingError) {
      console.warn('활동 추적 실패 (PDF 다운로드는 계속 진행):', trackingError.message)
    }

    // PDF 다운로드
    const reportTypeKorean = reportData.reportType === 'market_analysis' ? '시장분석' : '비즈니스인사이트'
    const fileName = `${reportTypeKorean}리포트_${patent.biblioSummaryInfo?.applicationNumber || 'unknown'}_${new Date().toISOString().split('T')[0]}.pdf`
    
    console.log('💾 PDF 파일 저장 시도:', fileName)
    
    // PDF 저장 (최종 단계)
    try {
      doc.save(fileName)
      console.log('✅ PDF 다운로드 완료')
    } catch (saveError) {
      console.error('❌ PDF 저장 실패:', saveError)
      
      // 대체 저장 방법 시도
      try {
        const pdfBlob = doc.output('blob')
        const url = URL.createObjectURL(pdfBlob)
        const link = document.createElement('a')
        link.href = url
        link.download = fileName
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
        console.log('✅ 대체 방법으로 PDF 다운로드 완료')
      } catch (alternativeError) {
        console.error('❌ 대체 저장 방법도 실패:', alternativeError)
        throw new Error(`PDF 저장에 실패했습니다: ${saveError.message}`)
      }
    }
    
  } catch (error) {
    console.error('❌ PDF 생성 중 치명적 오류 발생:', error)
    console.error('오류 상세:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      timestamp: new Date().toISOString()
    })
    
    // 사용자에게 더 친화적인 오류 메시지 제공
    let userMessage = 'PDF 생성 중 오류가 발생했습니다.'
    
    if (error.message.includes('타임아웃')) {
      userMessage = 'PDF 생성 시간이 초과되었습니다. 다시 시도해주세요.'
    } else if (error.message.includes('메모리')) {
      userMessage = 'PDF 생성 중 메모리 부족이 발생했습니다. 브라우저를 새로고침 후 다시 시도해주세요.'
    } else if (error.message.includes('권한')) {
      userMessage = 'PDF 다운로드 권한이 없습니다. 브라우저 설정을 확인해주세요.'
    }
    
    throw new Error(userMessage)
  }
}

// 간단한 PDF 생성 함수 (fallback용 - 기본 텍스트만 사용)
export const generateSimplePDF = async (
  patent: KiprisPatentDetailItem,
  reportData: DynamicReportData
): Promise<void> => {
  console.log('🔄 간단한 PDF 생성 시작 (fallback 모드)')
  
  try {
    const doc = new jsPDF()
    
    // 기본 폰트 설정
    doc.setFont('helvetica')
    doc.setFontSize(16)
    
    // 제목
    const reportTitle = reportData.reportType === 'market_analysis'
      ? '기술/시장 분석 리포트'
      : '비즈니스 전략 인사이트 리포트'
    
    doc.text(reportTitle, 20, 30)
    
    // 특허 정보
    doc.setFontSize(12)
    let currentY = 50
    
    if (patent.biblioSummaryInfo?.inventionTitle) {
      doc.text(`특허명: ${patent.biblioSummaryInfo.inventionTitle}`, 20, currentY)
      currentY += 10
    }
    
    if (patent.biblioSummaryInfo?.applicationNumber) {
      doc.text(`출원번호: ${patent.biblioSummaryInfo.applicationNumber}`, 20, currentY)
      currentY += 10
    }
    
    currentY += 10
    
    // 섹션 내용 (기본 텍스트만)
    for (const [index, section] of reportData.sections.entries()) {
      if (currentY > 250) {
        doc.addPage()
        currentY = 30
      }
      
      // 섹션 제목
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      const lines = doc.splitTextToSize(`${index + 1}. ${section.title}`, 170)
      doc.text(lines, 20, currentY)
      currentY += lines.length * 7 + 5
      
      // 섹션 내용
      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      
      if (section.content) {
        const contentLines = doc.splitTextToSize(section.content, 170)
        doc.text(contentLines, 20, currentY)
        currentY += contentLines.length * 5 + 10
      }
    }
    
    // 요약 (있는 경우)
    if (reportData.summary && reportData.summary.trim() !== '') {
      if (currentY > 220) {
        doc.addPage()
        currentY = 30
      }
      
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text('요약', 20, currentY)
      currentY += 10
      
      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      const summaryLines = doc.splitTextToSize(reportData.summary, 170)
      doc.text(summaryLines, 20, currentY)
    }
    
    // 푸터 (간단한 버전)
    const totalPages = doc.getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i)
      const pageHeight = doc.internal.pageSize.getHeight()
      doc.setFontSize(10)
      doc.text(`페이지 ${i}`, 20, pageHeight - 20)
      doc.text('본 리포트는 AI 분석 결과입니다.', 20, pageHeight - 10)
    }
    
    // PDF 저장
    const reportTypeKorean = reportData.reportType === 'market_analysis' ? '시장분석' : '비즈니스인사이트'
    const fileName = `${reportTypeKorean}리포트_간단버전_${patent.biblioSummaryInfo?.applicationNumber || 'unknown'}_${new Date().toISOString().split('T')[0]}.pdf`
    
    doc.save(fileName)
    console.log('✅ 간단한 PDF 다운로드 완료')
    
  } catch (error) {
    console.error('❌ 간단한 PDF 생성도 실패:', error)
    throw new Error('PDF 생성에 실패했습니다. 브라우저를 새로고침 후 다시 시도해주세요.')
  }
}

// 기존 시장 분석 리포트 PDF 생성 (호환성 유지)
export const generateMarketAnalysisPDF = async (
  patent: KiprisPatentDetailItem,
  analysis: MarketAnalysisReport
): Promise<void> => {
  const doc = new jsPDF()
  await addKoreanFont(doc)
  
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
    await addPDFFooter(doc, i)
  }
  
  // 활동 추적 - PDF 다운로드 기록
  try {
    await activityTracker.trackDocumentDownload(
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
  await addKoreanFont(doc)
  
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
    await addPDFFooter(doc, i)
  }
  
  // 활동 추적 - PDF 다운로드 기록
  try {
    await activityTracker.trackDocumentDownload(
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



// 개선된 마크다운 파싱 및 렌더링 함수
const parseAndRenderMarkdown = async (doc: jsPDF, content: string, x: number, y: number, maxWidth: number): Promise<number> => {
  const lines = content.split('\n')
  let currentY = y
  
  for (const line of lines) {
    const trimmedLine = line.trim()
    
    // 페이지 공간 확인
    if (currentY > 260) {
      doc.addPage()
      currentY = 30
    }
    
    if (!trimmedLine) {
      currentY += 6 // 빈 줄 간격
      continue
    }
    
    // ### 헤딩 (3단계)
    if (trimmedLine.startsWith('### ')) {
      const title = trimmedLine.replace('### ', '').trim()
      currentY += 12 // 헤딩 전 여백
      try {
        currentY = await addKoreanTextAsImage(doc, title, x, currentY, {
          fontSize: 16,
          fontWeight: 'bold',
          color: '#1f2937',
          maxWidth: maxWidth
        })
      } catch (error) {
        console.warn('⚠️ ### 헤딩 렌더링 실패, 기본 텍스트 사용:', error)
        currentY = addBasicText(doc, title, x, currentY, { fontSize: 16, fontWeight: 'bold' })
      }
      currentY += 8 // 헤딩 후 여백
      continue
    }
    
    // #### 헤딩 (4단계)
    if (trimmedLine.startsWith('#### ')) {
      const title = trimmedLine.replace('#### ', '').trim()
      currentY += 10 // 헤딩 전 여백
      try {
        currentY = await addKoreanTextAsImage(doc, title, x + 5, currentY, {
          fontSize: 14,
          fontWeight: 'bold',
          color: '#374151',
          maxWidth: maxWidth - 5
        })
      } catch (error) {
        console.warn('⚠️ #### 헤딩 렌더링 실패, 기본 텍스트 사용:', error)
        currentY = addBasicText(doc, title, x + 5, currentY, { fontSize: 14, fontWeight: 'bold' })
      }
      currentY += 6 // 헤딩 후 여백
      continue
    }
    
    // ##### 헤딩 (5단계)
    if (trimmedLine.startsWith('##### ')) {
      const title = trimmedLine.replace('##### ', '').trim()
      currentY += 8 // 헤딩 전 여백
      try {
        currentY = await addKoreanTextAsImage(doc, title, x + 10, currentY, {
          fontSize: 12,
          fontWeight: 'bold',
          color: '#4b5563',
          maxWidth: maxWidth - 10
        })
      } catch (error) {
        console.warn('⚠️ ##### 헤딩 렌더링 실패, 기본 텍스트 사용:', error)
        currentY = addBasicText(doc, title, x + 10, currentY, { fontSize: 12, fontWeight: 'bold' })
      }
      currentY += 5 // 헤딩 후 여백
      continue
    }
    
    // 불릿 포인트 리스트 (-, *, •)
    if (trimmedLine.match(/^[-*•]\s+/)) {
      const content = trimmedLine.replace(/^[-*•]\s+/, '').trim()
      const indentLevel = (line.match(/^(\s*)/)?.[1]?.length || 0) / 2
      const leftMargin = x + 15 + (indentLevel * 10)
      const bulletX = x + 5 + (indentLevel * 10)
      
      // 불릿 포인트 그리기
      try {
        doc.setFillColor(59, 130, 246)
        doc.circle(bulletX, currentY + 3, 1.2, 'F')
      } catch (bulletError) {
        console.warn('불릿 포인트 생성 실패:', bulletError.message)
      }
      
      // 볼드 텍스트 처리
      if (content.includes('**')) {
        const textParts = processBoldText(content)
        currentY = await renderTextWithBold(doc, textParts, leftMargin, currentY, maxWidth - (leftMargin - x))
      } else {
        try {
          currentY = await addKoreanTextAsImage(doc, content, leftMargin, currentY, {
            fontSize: 11,
            color: '#374151',
            maxWidth: maxWidth - (leftMargin - x)
          })
        } catch (error) {
          console.warn('⚠️ 불릿 텍스트 렌더링 실패, 기본 텍스트 사용:', error)
          currentY = addBasicText(doc, content, leftMargin, currentY, { fontSize: 11 })
        }
      }
      currentY += 4
      continue
    }
    
    // 번호 리스트 (1., 2., etc.)
    if (trimmedLine.match(/^\d+\.\s+/)) {
      const content = trimmedLine.replace(/^\d+\.\s+/, '').trim()
      const number = trimmedLine.match(/^(\d+)\./)?.[1] || '1'
      const indentLevel = (line.match(/^(\s*)/)?.[1]?.length || 0) / 2
      const leftMargin = x + 20 + (indentLevel * 10)
      const numberX = x + 5 + (indentLevel * 10)
      
      // 번호 그리기
      try {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(11)
        doc.setTextColor('#374151')
        doc.text(`${number}.`, numberX, currentY + 3)
        doc.setFont('helvetica', 'normal')
      } catch (numberError) {
        console.warn('번호 생성 실패:', numberError.message)
      }
      
      // 볼드 텍스트 처리
      if (content.includes('**')) {
        const textParts = processBoldText(content)
        currentY = await renderTextWithBold(doc, textParts, leftMargin, currentY, maxWidth - (leftMargin - x))
      } else {
        try {
          currentY = await addKoreanTextAsImage(doc, content, leftMargin, currentY, {
            fontSize: 11,
            color: '#374151',
            maxWidth: maxWidth - (leftMargin - x)
          })
        } catch (error) {
          console.warn('⚠️ 번호 텍스트 렌더링 실패, 기본 텍스트 사용:', error)
          currentY = addBasicText(doc, content, leftMargin, currentY, { fontSize: 11 })
        }
      }
      currentY += 4
      continue
    }
    
    // 일반 텍스트 (볼드 처리 포함)
    if (trimmedLine.includes('**')) {
      const textParts = processBoldText(trimmedLine)
      currentY = await renderTextWithBold(doc, textParts, x, currentY, maxWidth)
    } else {
      try {
        currentY = await addKoreanTextAsImage(doc, trimmedLine, x, currentY, {
          fontSize: 11,
          color: '#374151',
          maxWidth: maxWidth
        })
      } catch (error) {
        console.warn('⚠️ 일반 텍스트 렌더링 실패, 기본 텍스트 사용:', error)
        currentY = addBasicText(doc, trimmedLine, x, currentY, { fontSize: 11 })
      }
    }
    currentY += 6
  }
  
  return currentY
}

// 굵은 텍스트 처리 함수
const processBoldText = (text: string): Array<{text: string, bold: boolean}> => {
  const parts: Array<{text: string, bold: boolean}> = []
  const boldRegex = /\*\*(.*?)\*\*/g
  let lastIndex = 0
  let match
  
  while ((match = boldRegex.exec(text)) !== null) {
    // 굵은 텍스트 이전의 일반 텍스트
    if (match.index > lastIndex) {
      parts.push({
        text: text.substring(lastIndex, match.index),
        bold: false
      })
    }
    
    // 굵은 텍스트
    parts.push({
      text: match[1],
      bold: true
    })
    
    lastIndex = match.index + match[0].length
  }
  
  // 마지막 일반 텍스트
  if (lastIndex < text.length) {
    parts.push({
      text: text.substring(lastIndex),
      bold: false
    })
  }
  
  return parts
}

// 굵은 텍스트가 포함된 텍스트 렌더링 함수
const renderTextWithBold = async (
  doc: jsPDF, 
  textParts: Array<{text: string, bold: boolean}>, 
  x: number, 
  y: number, 
  maxWidth: number
): Promise<number> => {
  let currentX = x
  let currentY = y
  const lineHeight = 16
  
  for (const part of textParts) {
    if (!part.text.trim()) continue
    
    try {
      // 텍스트 너비 측정 (근사치)
      const textWidth = part.text.length * (part.bold ? 8 : 7)
      
      // 줄바꿈 체크
      if (currentX + textWidth > x + maxWidth && currentX > x) {
        currentX = x
        currentY += lineHeight
      }
      
      // 텍스트 렌더링
      const nextY = await addKoreanTextAsImage(doc, part.text, currentX, currentY, {
        fontSize: 12,
        fontWeight: part.bold ? 'bold' : 'normal',
        color: part.bold ? '#1f2937' : '#374151',
        maxWidth: Math.min(textWidth + 20, maxWidth)
      })
      
      currentX += textWidth + 5 // 텍스트 간격
      
      // Y 위치 업데이트 (가장 높은 Y 값 사용)
      if (nextY > currentY) {
        currentY = nextY
      }
      
    } catch (error) {
      console.warn('⚠️ 텍스트 파트 렌더링 실패:', error)
      // 기본 텍스트로 fallback
      currentY = addBasicText(doc, part.text, currentX, currentY, {
        fontSize: 12,
        fontWeight: part.bold ? 'bold' : 'normal'
      })
      currentX += part.text.length * 7
    }
  }
  
  return currentY + 8
}