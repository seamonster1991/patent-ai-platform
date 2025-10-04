const axios = require('axios');

// Test data with correct structure that matches extractPatentInfo expectations
const testPatentData = {
  biblioSummaryInfo: {
    applicationNumber: "1020250130795",
    inventionTitle: "인공지능 기반 자동화 시스템",
    inventionTitleEng: "AI-based Automation System",
    applicationDate: "2025-01-30",
    openDate: "2025-03-15",
    registerStatus: "출원",
    applicantName: "테스트 회사",
    inventorName: "김발명"
  },
  abstractInfo: {
    astrtCont: "본 발명은 인공지능 기술을 활용한 자동화 시스템에 관한 것으로, 머신러닝 알고리즘을 통해 생산성을 극대화하고 운영 효율성을 개선하는 혁신적인 기술이다. 특히 실시간 데이터 분석과 예측 모델링을 통해 기존 시스템 대비 30% 이상의 성능 향상을 달성할 수 있다."
  },
  claimInfo: {
    claimTextKor: "청구항 1: 인공지능 기반 자동화 시스템으로서, 데이터 수집부, 머신러닝 처리부, 제어부를 포함하는 시스템\n청구항 2: 상기 머신러닝 처리부는 딥러닝 알고리즘을 포함하는 청구항 1의 시스템\n청구항 3: 실시간 모니터링 및 예측 기능을 포함하는 청구항 1 또는 2의 시스템"
  },
  ipcInfo: [
    { ipcNumber: "G06N3/08" },
    { ipcNumber: "G05B19/418" }
  ],
  applicantInfo: [
    { name: "테스트 회사" }
  ],
  inventorInfo: [
    { name: "김발명" },
    { name: "이기술" }
  ]
};

async function testAIAnalysisFixed() {
  console.log('🧪 AI Analysis API 수정된 테스트 시작...\n');
  
  const baseURL = 'http://localhost:5173';
  
  // Clear cache first by using a unique patent number
  const uniquePatentData = {
    ...testPatentData,
    biblioSummaryInfo: {
      ...testPatentData.biblioSummaryInfo,
      applicationNumber: "1020250130795-" + Date.now()
    }
  };
  
  // Test Market Analysis with correct data structure
  console.log('📊 Market Analysis 테스트 (올바른 데이터 구조)');
  try {
    console.log('📤 요청 데이터:', {
      patentData: {
        applicationNumber: uniquePatentData.biblioSummaryInfo.applicationNumber,
        title: uniquePatentData.biblioSummaryInfo.inventionTitle,
        abstractLength: uniquePatentData.abstractInfo.astrtCont.length,
        claimsLength: uniquePatentData.claimInfo.claimTextKor.length
      },
      analysisType: 'market_analysis'
    });
    
    const startTime = Date.now();
    const marketResponse = await axios.post(`${baseURL}/api/ai-analysis`, {
      patentData: uniquePatentData,
      analysisType: 'market_analysis'
    }, {
      timeout: 120000, // 2 minutes for AI generation
      headers: {
        'Content-Type': 'application/json'
      }
    });
    const endTime = Date.now();
    
    console.log('✅ 응답 수신 완료');
    console.log('⏱️ 응답 시간:', `${endTime - startTime}ms`);
    console.log('📊 응답 상태:', marketResponse.status);
    
    // Detailed response analysis
    const responseData = marketResponse.data;
    console.log('\n📋 응답 데이터 구조 분석:');
    console.log('- success:', responseData.success);
    console.log('- cached:', responseData.cached);
    console.log('- responseKeys:', Object.keys(responseData || {}));
    
    if (responseData && responseData.data) {
      const actualData = responseData.data;
      console.log('- actualData keys:', Object.keys(actualData || {}));
      
      console.log('- analysis:', {
        exists: !!actualData.analysis,
        type: typeof actualData.analysis,
        isArray: Array.isArray(actualData.analysis),
        length: actualData.analysis?.length || 0
      });
      
      console.log('- rawAnalysis:', {
        exists: !!actualData.rawAnalysis,
        type: typeof actualData.rawAnalysis,
        length: actualData.rawAnalysis?.length || 0,
        preview: typeof actualData.rawAnalysis === 'string' ? actualData.rawAnalysis.substring(0, 300) + '...' : 'Not a string'
      });
      
      if (actualData.analysis && Array.isArray(actualData.analysis)) {
        console.log('✅ 분석 섹션 발견:');
        actualData.analysis.forEach((section, index) => {
          console.log(`  [${index + 1}] ${section.title || 'No title'}: ${section.content?.length || 0} chars`);
        });
      } else {
        console.log('❌ 분석 섹션이 배열이 아니거나 존재하지 않음');
      }
      
      // Check for errors
      if (actualData.error) {
        console.log('❌ 에러:', actualData.error);
      }
    }
    
    console.log('\n');
  } catch (error) {
    console.error('❌ Market Analysis 실패:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      message: error.message,
      responseData: error.response?.data
    });
    console.log('');
  }
  
  console.log('🏁 수정된 테스트 완료');
}

// Run the fixed test
testAIAnalysisFixed().catch(console.error);