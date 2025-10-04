const axios = require('axios');

// Test data for API endpoint
const testPatentData = {
  applicationNumber: "1020250130795",
  title: "인공지능 기반 자동화 시스템",
  abstract: "본 발명은 인공지능 기술을 활용한 자동화 시스템에 관한 것으로, 머신러닝 알고리즘을 통해 효율성을 극대화하는 기술이다.",
  claims: "청구항 1: 인공지능 기반 자동화 시스템\n청구항 2: 머신러닝 알고리즘을 포함하는 시스템"
};

async function testAIAnalysisDetailed() {
  console.log('🧪 AI Analysis API 상세 테스트 시작...\n');
  
  const baseURL = 'http://localhost:5173';
  
  // Test Market Analysis with detailed logging
  console.log('📊 Market Analysis 상세 테스트');
  try {
    console.log('📤 요청 데이터:', {
      patentData: {
        applicationNumber: testPatentData.applicationNumber,
        title: testPatentData.title,
        abstractLength: testPatentData.abstract.length,
        claimsLength: testPatentData.claims.length
      },
      analysisType: 'market_analysis'
    });
    
    const startTime = Date.now();
    const marketResponse = await axios.post(`${baseURL}/api/ai-analysis`, {
      patentData: testPatentData,
      analysisType: 'market_analysis'
    }, {
      timeout: 60000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    const endTime = Date.now();
    
    console.log('✅ 응답 수신 완료');
    console.log('⏱️ 응답 시간:', `${endTime - startTime}ms`);
    console.log('📊 응답 상태:', marketResponse.status);
    console.log('📝 응답 헤더:', marketResponse.headers['content-type']);
    
    // Detailed response analysis
    const responseData = marketResponse.data;
    console.log('\n📋 응답 데이터 구조 분석:');
    console.log('- hasData:', !!responseData);
    console.log('- responseKeys:', Object.keys(responseData || {}));
    console.log('- fullResponse:', JSON.stringify(responseData, null, 2));
    
    if (responseData && responseData.data) {
      const actualData = responseData.data;
      console.log('- actualData keys:', Object.keys(actualData || {}));
      console.log('- analysis:', {
        exists: !!actualData.analysis,
        type: typeof actualData.analysis,
        isArray: Array.isArray(actualData.analysis),
        length: actualData.analysis?.length || 0,
        preview: typeof actualData.analysis === 'string' ? actualData.analysis.substring(0, 100) : 'Not a string'
      });
      
      console.log('- rawAnalysis:', {
        exists: !!actualData.rawAnalysis,
        type: typeof actualData.rawAnalysis,
        length: actualData.rawAnalysis?.length || 0,
        preview: typeof actualData.rawAnalysis === 'string' ? actualData.rawAnalysis.substring(0, 200) : 'Not a string'
      });
      
      console.log('- sections:', {
        exists: !!responseData.sections,
        type: typeof responseData.sections,
        isArray: Array.isArray(responseData.sections),
        length: responseData.sections?.length || 0
      });
      
      if (responseData.sections && Array.isArray(responseData.sections)) {
        console.log('- sectionsDetail:');
        responseData.sections.forEach((section, index) => {
          console.log(`  [${index}] ${section.title || 'No title'}: ${section.content?.length || 0} chars`);
        });
      } else if (actualData.analysis && Array.isArray(actualData.analysis)) {
        console.log('- analysis is array with sections:');
        actualData.analysis.forEach((section, index) => {
          console.log(`  [${index}] ${section.title || 'No title'}: ${section.content?.length || 0} chars`);
        });
      }
      
      // Check for any error messages
      if (responseData.error) {
        console.log('❌ 에러 메시지:', responseData.error);
      }
      
      if (responseData.message) {
        console.log('💬 메시지:', responseData.message);
      }
    }
    
    console.log('\n');
  } catch (error) {
    console.error('❌ Market Analysis 실패:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      message: error.message,
      responseData: error.response?.data,
      stack: error.stack?.split('\n')[0]
    });
    console.log('');
  }
  
  console.log('🏁 상세 테스트 완료');
}

// Run the detailed test
testAIAnalysisDetailed().catch(console.error);