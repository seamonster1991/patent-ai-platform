const axios = require('axios');

// 테스트용 특허 데이터 (특허 번호: 1020250130795)
const testPatentData = {
  inventionTitle: "인공지능 기반 특허 분석 시스템",
  applicationNumber: "1020250130795",
  applicantName: "테스트 출원인",
  abstract: "본 발명은 인공지능 기술을 활용하여 특허 문서를 자동으로 분석하고 시장성을 평가하는 시스템에 관한 것이다. 특허 데이터베이스에서 수집된 정보를 기반으로 머신러닝 알고리즘을 통해 기술의 혁신성, 시장 잠재력, 경쟁 환경을 종합적으로 분석한다.",
  claims: "청구항 1: 특허 문서를 입력받는 입력부; 인공지능 모델을 이용하여 특허 문서를 분석하는 분석부; 분석 결과를 출력하는 출력부를 포함하는 특허 분석 시스템."
};

async function testReportAPI(reportType) {
  const startTime = Date.now();
  
  try {
    console.log(`\n=== ${reportType.toUpperCase()} 리포트 생성 테스트 시작 ===`);
    console.log('요청 데이터:', {
      patentData: {
        title: testPatentData.inventionTitle,
        applicationNumber: testPatentData.applicationNumber
      },
      reportType
    });
    
    const response = await axios.post('https://p-ai-seongwankim-1691-re-chip.vercel.app/api/generate-report', {
      patentData: testPatentData,
      reportType: reportType,
      userId: 'test-user-123'
    }, {
      timeout: 15000, // 15초 타임아웃
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`✅ ${reportType.toUpperCase()} 리포트 생성 성공!`);
    console.log('응답 시간:', `${duration}ms (${(duration/1000).toFixed(1)}초)`);
    console.log('응답 상태:', response.status);
    console.log('응답 데이터 구조:', {
      success: response.data.success,
      reportType: response.data.data?.reportType,
      sectionsCount: response.data.data?.content?.sections?.length || 0,
      generatedAt: response.data.data?.generatedAt
    });
    
    if (response.data.data?.content?.sections) {
      console.log('섹션 제목들:');
      response.data.data.content.sections.forEach((section, index) => {
        console.log(`  ${index + 1}. ${section.title}`);
      });
    }
    
    return {
      success: true,
      duration,
      sectionsCount: response.data.data?.content?.sections?.length || 0
    };
    
  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.error(`❌ ${reportType.toUpperCase()} 리포트 생성 실패!`);
    console.error('소요 시간:', `${duration}ms (${(duration/1000).toFixed(1)}초)`);
    
    if (error.response) {
      console.error('응답 상태:', error.response.status);
      console.error('응답 데이터:', error.response.data);
    } else if (error.request) {
      console.error('요청 오류:', error.message);
    } else {
      console.error('설정 오류:', error.message);
    }
    
    return {
      success: false,
      duration,
      error: error.message
    };
  }
}

async function runTests() {
  console.log('🚀 최적화된 리포트 생성 API 테스트 시작');
  console.log('대상 URL: https://p-ai-seongwankim-1691-re-chip.vercel.app/api/generate-report');
  console.log('특허 번호:', testPatentData.applicationNumber);
  
  const results = [];
  
  // 시장 분석 리포트 테스트
  const marketResult = await testReportAPI('market');
  results.push({ type: 'market', ...marketResult });
  
  // 잠시 대기
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // 비즈니스 인사이트 리포트 테스트
  const businessResult = await testReportAPI('business');
  results.push({ type: 'business', ...businessResult });
  
  // 결과 요약
  console.log('\n=== 테스트 결과 요약 ===');
  results.forEach(result => {
    const status = result.success ? '✅ 성공' : '❌ 실패';
    const time = `${(result.duration/1000).toFixed(1)}초`;
    const sections = result.sectionsCount ? `(${result.sectionsCount}개 섹션)` : '';
    console.log(`${result.type.toUpperCase()}: ${status} - ${time} ${sections}`);
  });
  
  const successCount = results.filter(r => r.success).length;
  const avgTime = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
  
  console.log(`\n총 성공률: ${successCount}/${results.length} (${(successCount/results.length*100).toFixed(1)}%)`);
  console.log(`평균 응답 시간: ${(avgTime/1000).toFixed(1)}초`);
  
  if (successCount === results.length && avgTime < 10000) {
    console.log('🎉 모든 테스트 통과! API 최적화 성공!');
  } else if (successCount === results.length) {
    console.log('⚠️ 모든 테스트 통과했지만 응답 시간이 10초를 초과했습니다.');
  } else {
    console.log('❌ 일부 테스트 실패. 추가 최적화가 필요합니다.');
  }
}

// 테스트 실행
runTests().catch(console.error);