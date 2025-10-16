require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkData() {
  console.log('=== 데이터베이스 분야 분석 데이터 확인 ===');
  
  try {
    // 1. 검색 기록에서 technology_field 확인
    const { data: searchData, error: searchError } = await supabase
      .from('search_history')
      .select('id, keyword, technology_field, ipc_codes, created_at')
      .limit(5);
      
    console.log('검색 기록 샘플:', searchData?.length || 0, '개');
    if (searchData && searchData.length > 0) {
      console.log('검색 기록 예시:');
      searchData.forEach((item, i) => {
        console.log(`  ${i+1}. keyword: ${item.keyword}, tech_field: ${item.technology_field}`);
      });
    }
    
    // 2. AI 리포트에서 technology_field 확인
    const { data: reportData, error: reportError } = await supabase
      .from('ai_analysis_reports')
      .select('id, invention_title, technology_field, ipc_codes, created_at')
      .limit(5);
      
    console.log('\nAI 리포트 샘플:', reportData?.length || 0, '개');
    if (reportData && reportData.length > 0) {
      console.log('AI 리포트 예시:');
      reportData.forEach((item, i) => {
        console.log(`  ${i+1}. title: ${item.invention_title}, tech_field: ${item.technology_field}`);
      });
    }
    
    // 3. technology_field가 null이 아닌 데이터 개수 확인
    const { count: searchFieldCount } = await supabase
      .from('search_history')
      .select('*', { count: 'exact', head: true })
      .not('technology_field', 'is', null);
      
    const { count: reportFieldCount } = await supabase
      .from('ai_analysis_reports')
      .select('*', { count: 'exact', head: true })
      .not('technology_field', 'is', null);
      
    console.log('\ntechnology_field가 있는 검색 기록:', searchFieldCount, '개');
    console.log('technology_field가 있는 AI 리포트:', reportFieldCount, '개');
    
    // 4. 전체 데이터 개수 확인
    const { count: totalSearchCount } = await supabase
      .from('search_history')
      .select('*', { count: 'exact', head: true });
      
    const { count: totalReportCount } = await supabase
      .from('ai_analysis_reports')
      .select('*', { count: 'exact', head: true });
      
    console.log('\n전체 검색 기록:', totalSearchCount, '개');
    console.log('전체 AI 리포트:', totalReportCount, '개');
    
  } catch (error) {
    console.error('데이터 확인 중 오류:', error);
  }
}

checkData();