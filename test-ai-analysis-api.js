const fetch = require('node-fetch');

async function testAiAnalysisAPI() {
  console.log('🧪 AI 분석 API 테스트 시작...');
  
  const testData = {
    patentData: {
      biblioSummaryInfo: {
        inventionTitle: "테스트 특허",
        applicationNumber: "1020250130795",
        applicantName: "테스트 출원인"
      },
      abstractInfo: {
        abstractTextKor: "이것은 테스트용 특허 요약입니다."
      }
    },
    analysisType: "comprehensive"
  };

  try {
    console.log('📤 요청 데이터:', JSON.stringify(testData, null, 2));
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log('⏰ 60초 타임아웃으로 요청 중단');
      controller.abort();
    }, 60000); // 60초 타임아웃

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

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API 오류 응답:', errorText);
      return;
    }

    const data = await response.json();
    console.log('✅ API 응답 성공:', data);

  } catch (error) {
    console.error('❌ API 테스트 실패:', error.message);
    if (error.name === 'AbortError') {
      console.error('⏰ 요청이 타임아웃되었습니다.');
    }
  }
}

testAiAnalysisAPI();