const axios = require('axios');

// 테스트용 특허 데이터
const testPatentData = {
  biblioSummaryInfo: {
    applicationNumber: "10-2023-0123456",
    inventionTitle: "인공지능 기반 특허 분석 시스템",
    applicationDate: "2023.09.15",
    applicantName: "테스트 회사"
  },
  abstractInfo: {
    abstractTextKor: "본 발명은 인공지능 기술을 활용하여 특허 문서를 자동으로 분석하고 시장성을 평가하는 시스템에 관한 것이다. 딥러닝 알고리즘을 통해 특허의 기술적 특징을 추출하고, 시장 동향 데이터와 결합하여 상업적 가치를 예측한다."
  },
  claimInfo: {
    claimText: "청구항 1: 특허 문서를 입력받는 입력부; 인공지능 모델을 이용하여 특허 문서를 분석하는 분석부; 분석 결과를 출력하는 출력부를 포함하는 특허 분석 시스템."
  }
};

async function testReportGeneration() {
  console.log('🧪 리포트 생성 API 테스트 시작...');
  
  try {
    const response = await axios.post('http://localhost:3001/api/generate-report', {
      patentData: testPatentData,
      reportType: 'market'
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 70000 // 70초 타임아웃
    });
    
    console.log('✅ API 응답 성공:', {
      status: response.status,
      statusText: response.statusText,
      dataKeys: Object.keys(response.data || {}),
      success: response.data?.success,
      reportType: response.data?.data?.reportType,
      contentSections: response.data?.data?.content?.sections?.length || 0
    });
    
    if (response.data?.data?.content?.sections) {
      console.log('📊 리포트 섹션들:');
      response.data.data.content.sections.forEach((section, index) => {
        console.log(`  ${index + 1}. ${section.title} (${section.content?.length || 0} 글자)`);
      });
    }
    
  } catch (error) {
    console.error('❌ API 테스트 실패:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      code: error.code
    });
  }
}

testReportGeneration();