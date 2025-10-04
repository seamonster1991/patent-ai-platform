// 파싱 함수만 직접 테스트
const fs = require('fs');

// 샘플 AI 분석 결과 (실제 AI가 생성할 것 같은 형태)
const sampleAnalysisText = `
# 시장 분석 리포트

## 특허 정보
- 출원번호: TEST-123456
- 발명의 명칭: 테스트 특허

## 청구항 분석
이 특허의 주요 청구항은 다음과 같습니다:
- 청구항 1: 핵심 기술 요소
- 청구항 2: 부가적 기술 요소

## 기술 혁신 및 경쟁 우위
### 핵심 기술
이 특허는 혁신적인 기술을 포함하고 있습니다.

### 경쟁 우위
시장에서의 경쟁 우위는 다음과 같습니다.

## 시장 분석
### 시장 규모
현재 시장 규모는 상당합니다.

### 성장 전망
향후 성장 전망이 밝습니다.

## 비즈니스 기회
### 수익화 방안
다양한 수익화 방안이 있습니다.

### 파트너십 기회
전략적 파트너십을 통한 기회가 있습니다.

## 결론
이 특허는 상당한 시장 가치를 가지고 있습니다.
`;

function testParsingOnly() {
  console.log('🧪 Parsing Function Only Test 시작...');
  
  try {
    // 파싱 함수 로드 (모듈 시스템 우회)
    const aiAnalysisCode = fs.readFileSync('./api/ai-analysis.js', 'utf8');
    
    // parseAnalysisResult 함수 추출
    const parseAnalysisResultMatch = aiAnalysisCode.match(/function parseAnalysisResult\([\s\S]*?\n\}/);
    if (!parseAnalysisResultMatch) {
      throw new Error('parseAnalysisResult 함수를 찾을 수 없습니다');
    }
    
    // 함수 실행을 위한 eval 사용 (테스트 목적)
    eval(parseAnalysisResultMatch[0]);
    
    console.log('📊 샘플 텍스트 길이:', sampleAnalysisText.length);
    console.log('📊 샘플 텍스트 미리보기:', sampleAnalysisText.substring(0, 200) + '...');
    
    // 파싱 함수 직접 호출
    console.log('🔄 파싱 함수 직접 호출...');
    const parsed = parseAnalysisResult(sampleAnalysisText, 'market_analysis');
    
    console.log('📋 파싱 결과:');
    console.log('- reportName:', parsed.reportName);
    console.log('- sections 길이:', parsed.sections.length);
    console.log('- 섹션 목록:');
    parsed.sections.forEach((section, index) => {
      console.log(`  ${index + 1}. "${section.title}" (${section.content.length}자)`);
    });
    
  } catch (error) {
    console.error('❌ 테스트 실패:', error.message);
  }
}

testParsingOnly();