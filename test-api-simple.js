const http = require('http'); // https 대신 http 사용

// 시장분석 테스트
const testMarketAnalysis = {
  patentData: {
    applicationNumber: "10-2023-0123456",
    inventionTitle: "인공지능 기반 특허 분석 시스템",
    applicantName: "테스트 회사",
    inventorName: "홍길동",
    applicationDate: "2023-09-15",
    publicationNumber: "10-2024-0001234",
    publicationDate: "2024-01-15",
    ipcCode: "G06F 17/30",
    abstract: "본 발명은 인공지능을 활용하여 특허 문서를 자동으로 분석하고 분류하는 시스템에 관한 것이다.",
    claims: "청구항 1: 특허 문서를 입력받는 단계; 청구항 2: AI 모델을 이용하여 분석하는 단계;",
    description: "상세한 설명: 본 발명의 시스템은 머신러닝 알고리즘을 사용하여..."
  },
  analysisType: "market"
};

// 비즈니스 인사이트 테스트
const testBusinessInsights = {
  patentData: {
    applicationNumber: "10-2023-0123456",
    inventionTitle: "인공지능 기반 특허 분석 시스템",
    applicantName: "테스트 회사",
    inventorName: "홍길동",
    applicationDate: "2023-09-15",
    publicationNumber: "10-2024-0001234",
    publicationDate: "2024-01-15",
    ipcCode: "G06F 17/30",
    abstract: "본 발명은 인공지능을 활용하여 특허 문서를 자동으로 분석하고 분류하는 시스템에 관한 것이다.",
    claims: "청구항 1: 특허 문서를 입력받는 단계; 청구항 2: AI 모델을 이용하여 분석하는 단계;",
    description: "상세한 설명: 본 발명의 시스템은 머신러닝 알고리즘을 사용하여..."
  },
  analysisType: "business"
};

async function testAPI(testData, testName) {
  return new Promise((resolve, reject) => {
    console.log(`\n=== ${testName} 테스트 시작 ===`);
    console.log('테스트 데이터:', JSON.stringify(testData, null, 2));

    const postData = JSON.stringify(testData);

    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/ai-analysis',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    console.log('요청 옵션:', options);

    const req = http.request(options, (res) => {
      console.log(`\n=== ${testName} 응답 수신 ===`);
      console.log(`상태 코드: ${res.statusCode}`);
      console.log(`상태 메시지: ${res.statusMessage}`);
      console.log(`헤더:`, res.headers);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`\n=== ${testName} 응답 데이터 ===`);
        console.log('Raw 응답:', data);
        
        try {
          const jsonData = JSON.parse(data);
          console.log(`\n=== ${testName} 파싱된 JSON ===`);
          console.log(JSON.stringify(jsonData, null, 2));
          
          if (jsonData.success) {
            console.log(`\n✅ ${testName} API 호출 성공!`);
            console.log('분석 타입:', jsonData.data?.analysisType);
            console.log('특허 번호:', jsonData.data?.patentNumber);
            console.log('분석 결과 존재:', !!jsonData.data?.analysis);
            
            if (jsonData.data?.analysis) {
              console.log('분석 결과 키:', Object.keys(jsonData.data.analysis));
              
              // 섹션 구조 확인
              const analysis = jsonData.data.analysis;
              if (analysis.sections && analysis.sections.length > 0) {
                console.log('\n=== 섹션 구조 확인 ===');
                analysis.sections.forEach((section, index) => {
                  console.log(`섹션 ${index + 1}: "${section.title}"`);
                });
              }
              
              // 시장분석인 경우 새로 추가된 필드 확인
              if (jsonData.data.analysisType === 'market') {
                console.log('\n=== 시장분석 필드 확인 ===');
                console.log('coreValue 존재:', !!analysis.coreValue);
                console.log('targetMarket 존재:', !!analysis.targetMarket);
                console.log('competitiveAdvantage 존재:', !!analysis.competitiveAdvantage);
                console.log('marketDriversAndRisks 존재:', !!analysis.marketDriversAndRisks);
                
                if (analysis.coreValue) {
                  console.log('coreValue 내용 (첫 100자):', analysis.coreValue.substring(0, 100) + '...');
                }
              }
              
              // 비즈니스 인사이트인 경우 새로 추가된 필드 확인
              if (jsonData.data.analysisType === 'business') {
                console.log('\n=== 비즈니스 인사이트 필드 확인 ===');
                console.log('businessOpportunities 존재:', !!analysis.businessOpportunities);
                console.log('competitorStrategy 존재:', !!analysis.competitorStrategy);
                console.log('rdStrategy 존재:', !!analysis.rdStrategy);
                console.log('revenueModel 존재:', !!analysis.revenueModel);
                
                if (analysis.businessOpportunities) {
                  console.log('businessOpportunities 내용 (첫 100자):', analysis.businessOpportunities.substring(0, 100) + '...');
                }
              }
            }
            
            resolve(jsonData);
          } else {
            console.log(`\n❌ ${testName} API 호출 실패!`);
            console.log('에러:', jsonData.error);
            console.log('메시지:', jsonData.message);
            reject(new Error(jsonData.message || 'API 호출 실패'));
          }
        } catch (parseError) {
          console.log(`\n❌ ${testName} JSON 파싱 오류:`, parseError.message);
          console.log('응답이 JSON 형식이 아닙니다.');
          reject(parseError);
        }
      });
    });

    req.on('error', (e) => {
      console.error(`\n❌ ${testName} 요청 오류: ${e.message}`);
      console.error('스택:', e.stack);
      reject(e);
    });

    req.on('timeout', () => {
      console.error(`\n❌ ${testName} 요청 타임아웃`);
      req.destroy();
      reject(new Error('요청 타임아웃'));
    });

    // 60초 타임아웃 설정 (AI 분석은 시간이 오래 걸릴 수 있음)
    req.setTimeout(60000);

    console.log(`\n=== ${testName} 요청 전송 중... ===`);
    req.write(postData);
    req.end();
  });
}

async function runTests() {
  try {
    console.log('🚀 API 테스트 시작');
    
    // 시장분석 테스트
    await testAPI(testMarketAnalysis, '시장분석');
    
    console.log('\n' + '='.repeat(80));
    
    // 비즈니스 인사이트 테스트
    await testAPI(testBusinessInsights, '비즈니스 인사이트');
    
    console.log('\n🎉 모든 테스트 완료!');
    
  } catch (error) {
    console.error('\n💥 테스트 실패:', error.message);
    process.exit(1);
  }
}

runTests();