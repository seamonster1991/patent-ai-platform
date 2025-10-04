const axios = require('axios');

async function testApiComprehensive() {
  console.log('🧪 Comprehensive AI Analysis API Test 시작...');
  
  const tests = [
    {
      name: 'Market Analysis Test',
      data: {
        patentData: {
          applicationNumber: `1020250130795-market-${Date.now()}`,
          title: '인공지능 기반 자동화 시스템',
          abstract: '본 발명은 인공지능을 활용한 자동화 시스템에 관한 것으로, 머신러닝 알고리즘을 통해 효율성을 극대화한다.',
          claims: '청구항 1: 인공지능 기반 자동화 시스템으로서, 데이터 처리부와 제어부를 포함한다.'
        },
        analysisType: 'market_analysis'
      }
    },
    {
      name: 'Business Insights Test',
      data: {
        patentData: {
          applicationNumber: `1020250130795-business-${Date.now()}`,
          title: '스마트 IoT 센서 네트워크',
          abstract: '본 발명은 IoT 센서들을 네트워크로 연결하여 실시간 데이터 수집 및 분석을 수행하는 시스템이다.',
          claims: '청구항 1: IoT 센서 네트워크 시스템으로서, 센서부, 통신부, 데이터 처리부를 포함한다.'
        },
        analysisType: 'business_insights'
      }
    }
  ];

  for (const test of tests) {
    console.log(`\n📊 ${test.name} 실행 중...`);
    console.log('📤 요청 데이터:', {
      patentNumber: test.data.patentData.applicationNumber,
      analysisType: test.data.analysisType
    });

    try {
      const startTime = Date.now();
      const response = await axios.post('http://localhost:5173/api/ai-analysis', test.data, {
        timeout: 60000,
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
          console.log(`- sections 타입: ${typeof analysis.sections}`);
          console.log(`- sections 배열 여부: ${Array.isArray(analysis.sections)}`);
          console.log(`- sections 길이: ${analysis.sections?.length}`);
          console.log(`- rawAnalysis 길이: ${analysis.rawAnalysis?.length}`);
          
          if (Array.isArray(analysis.sections) && analysis.sections.length > 0) {
            console.log('📝 섹션 목록:');
            analysis.sections.forEach((section, index) => {
              console.log(`  ${index + 1}. "${section.title}" (${section.content?.length || 0}자)`);
            });
            
            // 성공 기준 체크
            if (analysis.sections.length > 1) {
              console.log('✅ 성공: 여러 섹션이 올바르게 생성됨');
            } else {
              console.log('⚠️ 주의: 섹션이 1개만 생성됨 (파싱 개선 필요)');
            }
          } else {
            console.log('❌ 실패: 섹션이 올바르게 생성되지 않음');
          }
          
          // 품질 지표 체크
          const totalContentLength = analysis.sections?.reduce((sum, section) => sum + (section.content?.length || 0), 0) || 0;
          console.log(`📊 품질 지표: 총 ${totalContentLength}자`);
          
          if (totalContentLength < 1000) {
            console.log('⚠️ 주의: 생성된 내용이 부족함 (1000자 미만)');
          } else {
            console.log('✅ 품질: 충분한 내용 생성됨');
          }
        } else {
          console.log('❌ 실패: analysis 객체가 없음');
        }
      } else {
        console.log('❌ 실패: API 응답 실패');
        console.log('오류:', response.data.error);
      }

    } catch (error) {
      console.error(`❌ ${test.name} 실패:`, error.message);
      if (error.response) {
        console.error('응답 상태:', error.response.status);
        console.error('응답 데이터:', error.response.data);
      }
    }
  }

  console.log('\n🏁 Comprehensive Test 완료');
}

testApiComprehensive();