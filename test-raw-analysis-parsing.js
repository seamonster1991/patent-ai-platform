// rawAnalysis 파싱 테스트 스크립트
const testRawAnalysis = `3. 기술/시장 심층 구조 분석
3.1. 기술 혁신 및 근본적 경쟁 우위
3.1.1. 해결된 핵심 기술 난제
- 사용자 인증 정확도 향상 및 보안성 강화가 핵심 난제.
- 모방 난이도는 중간으로 평가.
3.1.2. 기존 기술 대비 정량적 성능 지표
- CoGS 절감률: 5%.
- 효율 향상: 10%.
- 통합 용이성: 기존 시스템과의 호환성 확보.
3.1.3. 특허 권리 범위 및 방어력 진단
- 원천성 수준: 낮음.
- 회피 설계 난이도: 용이함.
3.2. 목표 시장 및 기술 확산 전략
3.2.1. 시장 규모 및 성장 잠재력
- 타겟 시장 규모: 약 100억 달러
- 연평균 성장률: 15%
- 주요 성장 동력: 보안 강화 요구 증가`

// parseRawAnalysis 함수 (리포트 컴포넌트와 동일한 로직)
const parseRawAnalysis = (rawText) => {
  if (!rawText || typeof rawText !== 'string') {
    return [{ title: '분석 결과 없음', content: '분석 데이터가 없습니다.' }]
  }

  const sections = []
  
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
      const startIndex = currentMatch.index + currentMatch[0].length
      const endIndex = nextMatch ? nextMatch.index : rawText.length
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

// 테스트 실행
console.log('🧪 rawAnalysis 파싱 테스트 시작...')
console.log('원본 데이터:')
console.log(testRawAnalysis)
console.log('\n' + '='.repeat(50) + '\n')

const parsedSections = parseRawAnalysis(testRawAnalysis)

console.log('파싱된 섹션들:')
parsedSections.forEach((section, index) => {
  console.log(`\n📋 섹션 ${index + 1}:`)
  console.log(`제목: "${section.title}"`)
  console.log(`내용: "${section.content.substring(0, 100)}${section.content.length > 100 ? '...' : ''}"`)
})

console.log('\n' + '='.repeat(50))
console.log(`✅ 총 ${parsedSections.length}개 섹션으로 파싱 완료`)

// JSON 형태 데이터 테스트
const testJsonData = {
  "analysisType": "market",
  "patentNumber": "10-2025-0130795",
  "patentTitle": "복합 커버 요소를 포함하는 생체인식 입력 시스템을 갖는 전자 디바이스",
  "analysisDate": "2025-10-04T06:50:13.797Z",
  "rawAnalysis": testRawAnalysis
}

console.log('\n🧪 JSON 데이터에서 rawAnalysis 추출 테스트...')
const parseComplexContent = (data) => {
  // 1. 구조화된 데이터가 있는 경우
  if (data && data.sections && Array.isArray(data.sections)) {
    return data.sections.map((section) => ({
      title: String(section.title || '제목 없음').replace(/[#\d\.\-\s]+/g, '').trim(),
      content: String(section.content || '내용 없음')
    })).filter(s => s.content !== '내용 없음')
  }
  
  // 2. rawAnalysis가 있는 경우
  if (data && data.rawAnalysis && typeof data.rawAnalysis === 'string') {
    return parseRawAnalysis(data.rawAnalysis)
  }
  
  // 3. 문자열 데이터인 경우
  if (typeof data === 'string') {
    return parseRawAnalysis(data)
  }
  
  // 4. 기타 객체 형태인 경우
  if (data && typeof data === 'object') {
    const textContent = JSON.stringify(data, null, 2)
    return parseRawAnalysis(textContent)
  }
  
  // 5. 모든 파싱 실패 시
  return [{ title: '분석 결과 없음', content: '분석 데이터를 불러올 수 없습니다.' }]
}

const jsonParsedSections = parseComplexContent(testJsonData)
console.log(`✅ JSON 데이터에서 ${jsonParsedSections.length}개 섹션 추출 완료`)
jsonParsedSections.forEach((section, index) => {
  console.log(`📋 섹션 ${index + 1}: "${section.title}"`)
})