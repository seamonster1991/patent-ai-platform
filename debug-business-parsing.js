const axios = require('axios');

async function testBusinessInsightsParsing() {
  console.log('🔍 Business Insights Parsing Debug Test');
  
  const testData = {
    patentData: {
      applicationNumber: "1020250130795",
      title: "AI 기반 엣지 컴퓨팅 시스템",
      abstract: "본 발명은 AI 기반 엣지 컴퓨팅 시스템에 관한 것으로...",
      claims: "청구항 1: AI 기반 엣지 컴퓨팅 시스템..."
    },
    analysisType: 'business_insights'
  };

  try {
    console.log('📡 API 호출 중...');
    const response = await axios.post('http://localhost:5173/api/ai-analysis', testData, {
      timeout: 120000 // 2분 타임아웃
    });

    console.log('✅ 응답 수신');
    console.log('📊 응답 상태:', response.status);
    
    if (response.data && response.data.success) {
      const analysis = response.data.data.analysis;
      console.log('📋 Analysis 구조:');
      console.log('- reportName:', analysis.reportName);
      console.log('- sections 길이:', analysis.sections?.length || 0);
      console.log('- rawAnalysis 길이:', analysis.rawAnalysis?.length || 0);
      
      if (analysis.sections && analysis.sections.length > 0) {
        console.log('📝 섹션 목록:');
        analysis.sections.forEach((section, index) => {
          console.log(`  ${index + 1}. "${section.title}" (${section.content?.length || 0}자)`);
        });
      }
      
      // 원시 분석 텍스트의 첫 1000자 출력
      if (analysis.rawAnalysis) {
        console.log('\n🔍 원시 분석 텍스트 (첫 1000자):');
        console.log(analysis.rawAnalysis.substring(0, 1000));
        console.log('...\n');
        
        // 헤더 패턴 확인
        const lines = analysis.rawAnalysis.split('\n');
        console.log('🔍 헤더 패턴 분석:');
        lines.forEach((line, index) => {
          const trimmed = line.trim();
          if (trimmed.match(/^#{1,6}\s*(.+)$/) || 
              trimmed.match(/^\*\*(.+)\*\*$/) ||
              trimmed.match(/^([가-힣\s]{2,30})\s*(분석|현황|전망|요약|개요|리포트|특징|환경|전략|방안)/)) {
            console.log(`라인 ${index + 1}: "${trimmed}"`);
          }
        });
      }
      
    } else {
      console.error('❌ API 응답 실패:', response.data);
    }
    
  } catch (error) {
    console.error('❌ 테스트 실패:', error.message);
    if (error.response) {
      console.error('응답 상태:', error.response.status);
      console.error('응답 데이터:', error.response.data);
    }
  }
}

testBusinessInsightsParsing();