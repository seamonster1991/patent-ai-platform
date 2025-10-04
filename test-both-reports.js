const axios = require('axios');

async function testBothReports() {
  console.log('🧪 Both Reports Test 시작...');
  
  const patentData = {
    applicationNumber: "1020250130795",
    title: "AI 기반 스마트 헬스케어 시스템",
    abstract: "본 발명은 인공지능을 활용한 개인 맞춤형 헬스케어 시스템에 관한 것으로, 사용자의 생체 데이터를 실시간으로 모니터링하고 분석하여 건강 상태를 예측하고 맞춤형 건강 관리 솔루션을 제공하는 혁신적인 기술입니다.",
    claims: "청구항 1: AI 알고리즘을 이용한 생체 데이터 분석 모듈\n청구항 2: 실시간 건강 모니터링 시스템\n청구항 3: 개인 맞춤형 건강 관리 추천 엔진\n청구항 4: 의료진과의 연동 인터페이스"
  };

  // 1. Market Analysis 테스트
  console.log('\n📊 1. Market Analysis 테스트...');
  try {
    const marketResponse = await axios.post('http://localhost:5173/api/ai-analysis', {
      patentData,
      analysisType: 'market_analysis'
    }, {
      timeout: 180000,
      headers: { 'Content-Type': 'application/json' }
    });

    console.log('✅ Market Analysis 응답 수신');
    console.log('📊 응답 상태:', marketResponse.status);
    console.log('📋 Analysis 구조:');
    console.log('- reportName:', marketResponse.data.data.analysis.reportName);
    console.log('- sections 길이:', marketResponse.data.data.analysis.sections.length);
    console.log('- rawAnalysis 길이:', marketResponse.data.data.analysis.rawAnalysis.length);
    console.log('📝 섹션 목록:');
    marketResponse.data.data.analysis.sections.forEach((section, index) => {
      console.log(`  ${index + 1}. "${section.title}" (${section.content.length}자)`);
    });
  } catch (error) {
    console.error('❌ Market Analysis 실패:', error.message);
  }

  // 2. Business Insights 테스트
  console.log('\n💼 2. Business Insights 테스트...');
  try {
    const businessResponse = await axios.post('http://localhost:5173/api/ai-analysis', {
      patentData,
      analysisType: 'business_insights'
    }, {
      timeout: 180000,
      headers: { 'Content-Type': 'application/json' }
    });

    console.log('✅ Business Insights 응답 수신');
    console.log('📊 응답 상태:', businessResponse.status);
    console.log('📋 Analysis 구조:');
    console.log('- reportName:', businessResponse.data.data.analysis.reportName);
    console.log('- sections 길이:', businessResponse.data.data.analysis.sections.length);
    console.log('- rawAnalysis 길이:', businessResponse.data.data.analysis.rawAnalysis.length);
    console.log('📝 섹션 목록:');
    businessResponse.data.data.analysis.sections.forEach((section, index) => {
      console.log(`  ${index + 1}. "${section.title}" (${section.content.length}자)`);
    });
  } catch (error) {
    console.error('❌ Business Insights 실패:', error.message);
  }

  console.log('\n🎯 테스트 완료!');
}

testBothReports();