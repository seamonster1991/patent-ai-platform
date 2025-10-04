const axios = require('axios');

async function testApiDirect() {
  console.log('🧪 Direct API Test 시작...');
  
  const testData = {
    patentData: {
      applicationNumber: `1020250130795-${Date.now()}`,
      title: '인공지능 기반 자동화 시스템',
      abstract: '본 발명은 인공지능을 활용한 자동화 시스템에 관한 것으로, 머신러닝 알고리즘을 통해 효율성을 극대화한다.',
      claims: '청구항 1: 인공지능 기반 자동화 시스템으로서, 데이터 처리부와 제어부를 포함한다.'
    },
    analysisType: 'market_analysis'
  };

  try {
    console.log('📤 API 호출 중...');
    const response = await axios.post('http://localhost:5173/api/ai-analysis', testData, {
      timeout: 60000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ 응답 수신:', response.status);
    console.log('📊 응답 데이터:');
    console.log('- success:', response.data.success);
    console.log('- cached:', response.data.cached);
    
    const analysis = response.data.data?.analysis;
    if (analysis) {
      console.log('📋 Analysis 구조:');
      console.log('- reportName:', analysis.reportName);
      console.log('- sections 타입:', typeof analysis.sections);
      console.log('- sections 배열 여부:', Array.isArray(analysis.sections));
      console.log('- sections 길이:', analysis.sections?.length);
      
      if (Array.isArray(analysis.sections)) {
        console.log('📝 섹션 목록:');
        analysis.sections.forEach((section, index) => {
          console.log(`  ${index + 1}. "${section.title}" (${section.content?.length || 0}자)`);
        });
      }
      
      console.log('📄 Raw Analysis 길이:', analysis.rawAnalysis?.length);
      console.log('📄 Raw Analysis 미리보기:');
      console.log(analysis.rawAnalysis?.substring(0, 500) + '...');
    }

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    if (error.response) {
      console.error('응답 상태:', error.response.status);
      console.error('응답 데이터:', error.response.data);
    }
  }
}

testApiDirect();