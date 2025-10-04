const axios = require('axios');

// Test data for API endpoint
const testPatentData = {
  applicationNumber: "1020250130795",
  title: "인공지능 기반 자동화 시스템",
  abstract: "본 발명은 인공지능 기술을 활용한 자동화 시스템에 관한 것으로, 머신러닝 알고리즘을 통해 효율성을 극대화하는 기술이다.",
  claims: "청구항 1: 인공지능 기반 자동화 시스템\n청구항 2: 머신러닝 알고리즘을 포함하는 시스템"
};

async function testAIAnalysisAPI() {
  console.log('🧪 AI Analysis API 테스트 시작...\n');
  
  const baseURL = 'http://localhost:5173';
  
  // Test 1: Market Analysis
  console.log('📊 Test 1: Market Analysis');
  try {
    const marketResponse = await axios.post(`${baseURL}/api/ai-analysis`, {
      patentData: testPatentData,
      analysisType: 'market_analysis'
    }, {
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Market Analysis - Status:', marketResponse.status);
    console.log('📝 Response structure:', {
      hasData: !!marketResponse.data,
      hasAnalysis: !!marketResponse.data?.analysis,
      analysisLength: marketResponse.data?.analysis?.length || 0,
      hasSections: !!marketResponse.data?.sections,
      sectionsCount: marketResponse.data?.sections?.length || 0
    });
    
    if (marketResponse.data?.sections) {
      console.log('📋 Sections found:');
      marketResponse.data.sections.forEach((section, index) => {
        console.log(`  ${index + 1}. ${section.title} (${section.content?.length || 0} chars)`);
      });
    }
    
    console.log('');
  } catch (error) {
    console.error('❌ Market Analysis failed:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      message: error.message,
      data: error.response?.data
    });
    console.log('');
  }
  
  // Test 2: Business Insights
  console.log('💼 Test 2: Business Insights');
  try {
    const businessResponse = await axios.post(`${baseURL}/api/ai-analysis`, {
      patentData: testPatentData,
      analysisType: 'business_insights'
    }, {
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Business Insights - Status:', businessResponse.status);
    console.log('📝 Response structure:', {
      hasData: !!businessResponse.data,
      hasAnalysis: !!businessResponse.data?.analysis,
      analysisLength: businessResponse.data?.analysis?.length || 0,
      hasSections: !!businessResponse.data?.sections,
      sectionsCount: businessResponse.data?.sections?.length || 0
    });
    
    if (businessResponse.data?.sections) {
      console.log('📋 Sections found:');
      businessResponse.data.sections.forEach((section, index) => {
        console.log(`  ${index + 1}. ${section.title} (${section.content?.length || 0} chars)`);
      });
    }
    
    console.log('');
  } catch (error) {
    console.error('❌ Business Insights failed:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      message: error.message,
      data: error.response?.data
    });
    console.log('');
  }
  
  console.log('🏁 API 테스트 완료');
}

// Run the test
testAIAnalysisAPI().catch(console.error);