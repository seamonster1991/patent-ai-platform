// Debug script to test the parsing function directly
const sampleAIResponse = `## 특허 시장 분석 리포트: 인공지능 기반 자동화 시스템

---

### 발명 요약

본 특허 출원 '인공지능 기반 자동화 시스템'은 머신러닝 알고리즘을 활용하여 생산성 극대화 및 운영 효율성 개선을 목표로 하는 혁신적인 기술입니다.

---

## 기술 혁신 및 차별화 요소

### 핵심 기술 특징
- 실시간 데이터 분석 및 예측 모델링
- 딥러닝 알고리즘 기반 머신러닝 처리부
- 통합 제어 시스템

### 성능 지표
기존 시스템 대비 30% 이상의 성능 향상을 달성할 수 있는 혁신적 기술입니다.

## 시장 분석

### 시장 규모
AI 자동화 시장은 연평균 15% 성장하고 있으며, 2025년까지 500억 달러 규모로 예상됩니다.

### 경쟁 환경
주요 경쟁사로는 Google, Microsoft, Amazon 등이 있으나, 본 특허의 실시간 예측 기능은 차별화된 경쟁 우위를 제공합니다.`;

// Simple header pattern testing
function testHeaderPatterns(text) {
  console.log('🔍 헤더 패턴 테스트 시작\n');
  
  const headerPatterns = [
    /^#{1,6}\s+(.+)$/,           // # ~ ###### 헤더
    /^(.+)\n[=\-]{3,}$/,        // 밑줄 스타일 헤더
    /^\*\*(.+)\*\*$/,           // **굵은 글씨** 헤더
    /^__(.+)__$/,               // __굵은 글씨__ 헤더
  ];
  
  const lines = text.split('\n');
  console.log(`📝 총 라인 수: ${lines.length}\n`);
  
  lines.forEach((line, index) => {
    const trimmedLine = line.trim();
    if (trimmedLine.length === 0) return;
    
    let isHeader = false;
    let headerTitle = null;
    
    for (const pattern of headerPatterns) {
      const match = trimmedLine.match(pattern);
      if (match) {
        headerTitle = match[1].trim();
        isHeader = true;
        break;
      }
    }
    
    if (isHeader) {
      console.log(`✅ 헤더 발견 [${index + 1}]: "${trimmedLine}" → "${headerTitle}"`);
    } else if (trimmedLine.startsWith('#') || trimmedLine.includes('**')) {
      console.log(`❓ 헤더 후보 [${index + 1}]: "${trimmedLine}"`);
    }
  });
}

testHeaderPatterns(sampleAIResponse);