const axios = require('axios');

async function testBothReportTypes() {
  console.log('🔍 Comprehensive API Test - Both Report Types');
  console.log('=' .repeat(60));
  
  const testData = {
    patentData: {
      applicationNumber: "1020250130795",
      title: "AI 기반 엣지 컴퓨팅 시스템",
      abstract: "본 발명은 AI 기반 엣지 컴퓨팅 시스템에 관한 것으로, 딥러닝 기반 산업용 IoT 센서 데이터 이상 감지 및 예측 유지보수 시스템을 제공한다.",
      claims: "청구항 1: AI 기반 엣지 컴퓨팅 시스템으로서, 산업용 IoT 센서로부터 수집된 데이터를 실시간으로 분석하여 설비의 이상 상태를 감지하고 예측 유지보수를 수행하는 시스템."
    }
  };

  // Test 1: Market Analysis Report
  console.log('\n📊 Test 1: Market Analysis Report');
  console.log('-'.repeat(40));
  
  try {
    const marketData = { ...testData, analysisType: 'market_analysis' };
    console.log('📡 Market Analysis API 호출 중...');
    
    const marketResponse = await axios.post('http://localhost:3001/api/ai-analysis', marketData, {
      timeout: 120000 // 2분 타임아웃
    });

    if (marketResponse.data && marketResponse.data.success) {
      const analysis = marketResponse.data.data.analysis;
      console.log('✅ Market Analysis 성공');
      console.log(`📋 리포트명: ${analysis.reportName}`);
      console.log(`📑 섹션 수: ${analysis.sections?.length || 0}`);
      console.log(`📝 총 콘텐츠 길이: ${analysis.rawAnalysis?.length || 0}자`);
      
      if (analysis.sections && analysis.sections.length > 0) {
        console.log('\n📑 Market Analysis 섹션 목록:');
        analysis.sections.slice(0, 5).forEach((section, index) => {
          console.log(`  ${index + 1}. ${section.title} (${section.content?.length || 0}자)`);
        });
        if (analysis.sections.length > 5) {
          console.log(`  ... 및 ${analysis.sections.length - 5}개 추가 섹션`);
        }
      }
    } else {
      console.log('❌ Market Analysis 실패:', marketResponse.data);
    }
  } catch (error) {
    console.error('❌ Market Analysis 에러:', error.message);
    if (error.response) {
      console.error('📊 응답 상태:', error.response.status);
      console.error('📋 응답 데이터:', error.response.data);
    }
  }

  // Test 2: Business Insights Report
  console.log('\n💼 Test 2: Business Insights Report');
  console.log('-'.repeat(40));
  
  try {
    const businessData = { ...testData, analysisType: 'business_insights' };
    console.log('📡 Business Insights API 호출 중...');
    
    const businessResponse = await axios.post('http://localhost:3001/api/ai-analysis', businessData, {
      timeout: 120000 // 2분 타임아웃
    });

    if (businessResponse.data && businessResponse.data.success) {
      const analysis = businessResponse.data.data.analysis;
      console.log('✅ Business Insights 성공');
      console.log(`📋 리포트명: ${analysis.reportName}`);
      console.log(`📑 섹션 수: ${analysis.sections?.length || 0}`);
      console.log(`📝 총 콘텐츠 길이: ${analysis.rawAnalysis?.length || 0}자`);
      
      if (analysis.sections && analysis.sections.length > 0) {
        console.log('\n📑 Business Insights 섹션 목록:');
        analysis.sections.slice(0, 5).forEach((section, index) => {
          console.log(`  ${index + 1}. ${section.title} (${section.content?.length || 0}자)`);
        });
        if (analysis.sections.length > 5) {
          console.log(`  ... 및 ${analysis.sections.length - 5}개 추가 섹션`);
        }
      }
    } else {
      console.log('❌ Business Insights 실패:', businessResponse.data);
    }
  } catch (error) {
    console.error('❌ Business Insights 에러:', error.message);
    if (error.response) {
      console.error('📊 응답 상태:', error.response.status);
      console.error('📋 응답 데이터:', error.response.data);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('🎯 테스트 완료');
}

testBothReportTypes();