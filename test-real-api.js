const fetch = require('node-fetch');

async function testRealAiAnalysisAPI() {
  console.log('🧪 실제 특허 데이터로 AI 분석 API 테스트 시작...');
  
  // 실제 특허 데이터 구조 (프론트엔드에서 전송하는 형식과 동일)
  const testData = {
    patentData: {
      biblioSummaryInfo: {
        inventionTitle: "인공지능 기반 특허 분석 시스템",
        applicationNumber: "1020250130795",
        applicantName: "테스트 출원인",
        applicationDate: "2025-01-01",
        registerStatus: "출원"
      },
      abstractInfo: {
        abstractTextKor: "본 발명은 인공지능을 활용하여 특허 문서를 자동으로 분석하고 분류하는 시스템에 관한 것이다. 머신러닝 알고리즘을 사용하여 특허의 기술 분야, 혁신성, 시장성을 평가한다."
      },
      claimInfo: [
        {
          claimText: "특허 문서를 입력받는 단계; AI 모델을 이용하여 분석하는 단계; 분석 결과를 출력하는 단계를 포함하는 특허 분석 방법."
        }
      ],
      applicantInfo: [
        {
          name: "테스트 출원인"
        }
      ],
      inventorInfo: [
        {
          name: "홍길동"
        }
      ],
      ipcInfo: [
        {
          ipcNumber: "G06F 17/30"
        }
      ]
    },
    analysisType: "comprehensive"
  };

  try {
    console.log('📤 요청 데이터:', JSON.stringify(testData, null, 2));
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log('⏰ 15초 타임아웃으로 요청 중단');
      controller.abort();
    }, 15000); // 15초 타임아웃

    const response = await fetch('https://p-ai-seongwankim-1691-re-chip.vercel.app/api/ai-analysis', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    console.log('📡 응답 상태:', response.status, response.statusText);
    console.log('📋 응답 헤더:', Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log('📄 원시 응답:', responseText);

    if (!response.ok) {
      console.error('❌ API 오류 응답:', responseText);
      return;
    }

    try {
      const data = JSON.parse(responseText);
      console.log('✅ API 응답 성공:', JSON.stringify(data, null, 2));
    } catch (parseError) {
      console.error('❌ JSON 파싱 실패:', parseError.message);
      console.error('원시 응답:', responseText);
    }

  } catch (error) {
    console.error('❌ API 테스트 실패:', error.message);
    if (error.name === 'AbortError') {
      console.error('⏰ 요청이 타임아웃되었습니다.');
    }
  }
}

testRealAiAnalysisAPI();