const fetch = require('node-fetch');

async function testAIAnalysis() {
  console.log('🧪 AI 분석 API 직접 테스트 시작...');
  
  const testPatentData = {
    biblioSummaryInfo: {
      applicationNumber: "1020200123456",
      inventionTitle: "인공지능 기반 특허 분석 시스템",
      applicantName: "테스트 회사",
      inventorName: "홍길동",
      applicationDate: "20200101",
      publicationNumber: "1020210123456",
      publicationDate: "20210101"
    },
    abstractInfo: {
      abstractTextKor: "본 발명은 인공지능을 활용한 특허 분석 시스템에 관한 것으로, 특허 문서를 자동으로 분석하여 기술적 특징과 시장성을 평가하는 시스템을 제공한다."
    },
    claimInfo: {
      claimTextKor: "청구항 1: 특허 문서를 입력받는 입력부; 인공지능 모델을 이용하여 특허 문서를 분석하는 분석부; 분석 결과를 출력하는 출력부를 포함하는 특허 분석 시스템."
    }
  };

  try {
    const response = await fetch('http://localhost:3001/api/ai-analysis', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        patentData: testPatentData,
        analysisType: 'comprehensive'
      })
    });

    console.log('📡 응답 상태:', response.status, response.statusText);
    
    const responseText = await response.text();
    console.log('📄 응답 내용 (첫 500자):', responseText.substring(0, 500));
    
    if (response.ok) {
      try {
        const data = JSON.parse(responseText);
        console.log('✅ AI 분석 성공!');
        console.log('📊 분석 결과 구조:', Object.keys(data));
        if (data.data) {
          console.log('📈 분석 데이터 구조:', Object.keys(data.data));
        }
      } catch (parseError) {
        console.error('❌ JSON 파싱 오류:', parseError.message);
      }
    } else {
      console.error('❌ AI 분석 실패:', responseText);
    }
    
  } catch (error) {
    console.error('❌ 요청 오류:', error.message);
  }
}

testAIAnalysis();