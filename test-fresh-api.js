const axios = require('axios');

async function testFreshApi() {
  console.log('🧪 Fresh API Test (No Cache) 시작...');
  
  const requestData = {
    patentData: {
      applicationNumber: `unique-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: "혁신적인 AI 기반 데이터 처리 시스템",
      abstract: "본 발명은 인공지능을 활용한 대용량 데이터 처리 시스템에 관한 것으로, 기존 시스템 대비 처리 속도를 50% 향상시키고 에너지 효율성을 30% 개선한 혁신적인 기술입니다.",
      claims: "청구항 1: AI 알고리즘을 이용한 데이터 전처리 모듈\n청구항 2: 분산 처리를 위한 클러스터링 시스템\n청구항 3: 실시간 모니터링 및 최적화 인터페이스"
    },
    analysisType: 'market_analysis'
  };

  console.log('📤 요청 데이터:', {
    patentNumber: requestData.patentData.applicationNumber,
    analysisType: requestData.analysisType
  });

  try {
    const startTime = Date.now();
    const response = await axios.post('http://localhost:5173/api/ai-analysis', requestData, {
      timeout: 180000, // 3분 타임아웃
      headers: {
        'Content-Type': 'application/json'
      }
    });
    const endTime = Date.now();

    console.log('✅ 응답 수신 완료');
    console.log(`⏱️ 응답 시간: ${endTime - startTime}ms`);
    console.log(`📊 응답 상태: ${response.status}`);

    if (response.data.success) {
      const analysis = response.data.data?.analysis;
      if (analysis) {
        console.log('📋 Analysis 구조:');
        console.log(`- reportName: ${analysis.reportName}`);
        console.log(`- sections 길이: ${analysis.sections?.length}`);
        console.log(`- rawAnalysis 길이: ${analysis.rawAnalysis?.length}`);
        
        if (Array.isArray(analysis.sections)) {
          console.log('📝 섹션 목록:');
          analysis.sections.forEach((section, index) => {
            console.log(`  ${index + 1}. "${section.title}" (${section.content?.length || 0}자)`);
          });
        }
      }
    } else {
      console.log('❌ 실패: API 응답 실패');
      console.log('오류:', response.data.error);
    }

  } catch (error) {
    console.error('❌ 테스트 실패:', error.message);
    if (error.response) {
      console.error('응답 상태:', error.response.status);
      console.error('응답 데이터:', error.response.data);
    }
  }
}

testFreshApi()