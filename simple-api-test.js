const axios = require('axios');

async function testAPI() {
  console.log('🔍 Simple API Test');
  
  const testData = {
    patentData: {
      applicationNumber: "1020250130795",
      title: "AI 기반 엣지 컴퓨팅 시스템",
      abstract: "본 발명은 AI 기반 엣지 컴퓨팅 시스템에 관한 것으로...",
      claims: "청구항 1: AI 기반 엣지 컴퓨팅 시스템..."
    },
    analysisType: 'business_insights'
  };

  try {
    console.log('📡 API 호출 중...');
    const response = await axios.post('http://localhost:3001/api/ai-analysis', testData, {
      timeout: 120000 // 2분 타임아웃
    });

    console.log('✅ 응답 수신');
    console.log('📊 응답 상태:', response.status);
    
    if (response.data && response.data.success) {
      const analysis = response.data.data.analysis;
      console.log('📋 Analysis 구조:');
      console.log('- reportName:', analysis.reportName);
      console.log('- sections 길이:', analysis.sections?.length || 0);
      console.log('- rawAnalysis 길이:', analysis.rawAnalysis?.length || 0);
      
      if (analysis.sections && analysis.sections.length > 0) {
        console.log('\n📑 섹션 목록:');
        analysis.sections.forEach((section, index) => {
          console.log(`  ${index + 1}. ${section.title} (${section.content?.length || 0}자)`);
        });
      }
    } else {
      console.log('📋 응답 데이터:', JSON.stringify(response.data, null, 2));
    }
    
  } catch (error) {
    console.error('❌ 에러 발생:', error.message);
    if (error.response) {
      console.error('📊 응답 상태:', error.response.status);
      console.error('📋 응답 데이터:', error.response.data);
    }
  }
}

testAPI();