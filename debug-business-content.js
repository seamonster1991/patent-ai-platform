const axios = require('axios');

async function debugBusinessContent() {
  console.log('🔍 Business Content Debug 시작...');
  
  const patentData = {
    applicationNumber: "1020250130795",
    title: "AI 기반 스마트 헬스케어 시스템",
    abstract: "본 발명은 인공지능을 활용한 개인 맞춤형 헬스케어 시스템에 관한 것으로, 사용자의 생체 데이터를 실시간으로 모니터링하고 분석하여 건강 상태를 예측하고 맞춤형 건강 관리 솔루션을 제공하는 혁신적인 기술입니다.",
    claims: "청구항 1: AI 알고리즘을 이용한 생체 데이터 분석 모듈\n청구항 2: 실시간 건강 모니터링 시스템\n청구항 3: 개인 맞춤형 건강 관리 추천 엔진\n청구항 4: 의료진과의 연동 인터페이스"
  };

  try {
    const response = await axios.post('http://localhost:5173/api/ai-analysis', {
      patentData,
      analysisType: 'business_insights'
    }, {
      timeout: 180000,
      headers: { 'Content-Type': 'application/json' }
    });

    const rawContent = response.data.data.analysis.rawAnalysis;
    console.log('📊 Raw Content 길이:', rawContent.length);
    console.log('📊 Raw Content 미리보기 (처음 500자):');
    console.log(rawContent.substring(0, 500));
    console.log('\n📊 Raw Content 중간 부분 (1000-1500자):');
    console.log(rawContent.substring(1000, 1500));
    console.log('\n📊 Raw Content 끝 부분 (마지막 500자):');
    console.log(rawContent.substring(rawContent.length - 500));
    
    // 헤더 패턴 찾기
    console.log('\n🔍 헤더 패턴 분석:');
    const lines = rawContent.split('\n');
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (trimmed.match(/^#{1,6}\s*(.+)$/) || 
          trimmed.match(/^\*\*(.+)\*\*$/) || 
          trimmed.match(/^(\d+단계:\s*.+)$/) ||
          trimmed.match(/^(구체적인\s*신사업\s*제안)$/i) ||
          trimmed.match(/^(최적의\s*수익\s*창출\s*경로)$/i)) {
        console.log(`라인 ${index + 1}: "${trimmed}"`);
      }
    });
    
  } catch (error) {
    console.error('❌ 테스트 실패:', error.message);
  }
}

debugBusinessContent();