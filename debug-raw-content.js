const axios = require('axios');

async function examineRawContent() {
  console.log('🔍 Raw Content 분석 시작...');
  
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
    const response = await axios.post('http://localhost:5173/api/ai-analysis', testData, {
      timeout: 60000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const rawAnalysis = response.data.data?.analysis?.rawAnalysis;
    if (rawAnalysis) {
      console.log('📄 Raw Analysis 전체 내용:');
      console.log('='.repeat(80));
      console.log(rawAnalysis);
      console.log('='.repeat(80));
      
      // 라인별로 분석
      const lines = rawAnalysis.split('\n');
      console.log(`\n📊 총 라인 수: ${lines.length}`);
      console.log('\n🔍 헤더 패턴 분석:');
      
      lines.forEach((line, index) => {
        const trimmed = line.trim();
        if (trimmed) {
          // 다양한 헤더 패턴 체크
          if (/^#{1,6}\s*(.+)$/.test(trimmed)) {
            console.log(`라인 ${index + 1}: MARKDOWN HEADER - "${trimmed}"`);
          } else if (/^\*\*(.+)\*\*$/.test(trimmed)) {
            console.log(`라인 ${index + 1}: BOLD HEADER - "${trimmed}"`);
          } else if (/^(.+):$/.test(trimmed)) {
            console.log(`라인 ${index + 1}: COLON HEADER - "${trimmed}"`);
          } else if (/^\d+\.\s*(.+)$/.test(trimmed)) {
            console.log(`라인 ${index + 1}: NUMBERED HEADER - "${trimmed}"`);
          }
        }
      });
    }

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
  }
}

examineRawContent();