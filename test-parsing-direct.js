const axios = require('axios');

async function testParsingDirect() {
  console.log('🧪 Direct Parsing Test 시작...');
  
  try {
    // API에서 실제 응답 받기
    const requestData = {
      patentData: {
        applicationNumber: `unique-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: "테스트 특허",
        abstract: "이것은 테스트용 특허 요약입니다.",
        claims: "청구항 1: 테스트 청구항입니다."
      },
      analysisType: 'market_analysis'
    };
    
    console.log('📤 API 호출 중...');
    const response = await axios.post('http://localhost:5173/api/ai-analysis', requestData, {
      timeout: 180000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const rawAnalysis = response.data.data.analysis.rawAnalysis;
    console.log('📊 Raw Analysis 길이:', rawAnalysis.length);
    console.log('📊 Raw Analysis 미리보기:', rawAnalysis.substring(0, 300) + '...');
    
    // 파싱 함수 직접 호출
    const { parseAnalysisResult } = require('./api/ai-analysis.js');
    console.log('🔄 파싱 함수 직접 호출...');
    const parsed = parseAnalysisResult(rawAnalysis, 'market_analysis');
    
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

testParsingDirect();