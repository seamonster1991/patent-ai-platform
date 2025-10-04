const axios = require('axios');

async function debugRawAnalysis() {
  console.log('🔍 Raw Analysis Debug 시작...');
  
  const testData = {
    patentData: {
      applicationNumber: `1020250130795-debug-${Date.now()}`,
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
      console.log('\n=== Raw Analysis 전체 내용 ===');
      console.log(rawAnalysis);
      console.log('\n=== 헤더 패턴 분석 ===');
      
      const lines = rawAnalysis.split('\n');
      console.log(`총 라인 수: ${lines.length}`);
      
      // 헤더 패턴들
      const headerPatterns = [
        { name: 'Markdown Header', pattern: /^#{1,6}\s*(.+)$/ },
        { name: 'Bold Header', pattern: /^\*\*(.+)\*\*$/ },
        { name: 'Korean Analysis', pattern: /^([가-힣\s]{2,30})\s*분석/ },
        { name: 'Korean Features', pattern: /^([가-힣\s]{2,30})\s*특징/ },
        { name: 'Korean Environment', pattern: /^([가-힣\s]{2,30})\s*환경/ }
      ];
      
      lines.forEach((line, index) => {
        const trimmed = line.trim();
        if (trimmed) {
          headerPatterns.forEach(({ name, pattern }) => {
            const match = trimmed.match(pattern);
            if (match) {
              console.log(`라인 ${index + 1}: ${name} - "${trimmed}"`);
            }
          });
        }
      });
    }

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
  }
}

debugRawAnalysis();