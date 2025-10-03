const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createSampleData() {
  console.log('=== 샘플 대시보드 데이터 생성 ===');
  
  // 기존 활동에서 사용되는 user_id 사용
  const userId = '276975db-635b-4c77-87a0-548f91b14231';
  console.log('사용자 ID:', userId);
  
  // 기존 활동 삭제 (중복 방지)
  const { error: deleteError } = await supabase
    .from('user_activities')
    .delete()
    .eq('user_id', userId);
    
  if (deleteError) {
    console.error('기존 활동 삭제 오류:', deleteError);
  } else {
    console.log('기존 활동 삭제 완료');
  }
  
  // 1. 다양한 검색 활동 생성
  const searchActivities = [
    { keyword: '인공지능', field: 'AI/머신러닝', results: 150 },
    { keyword: '딥러닝', field: 'AI/머신러닝', results: 89 },
    { keyword: '블록체인', field: '통신/네트워크', results: 67 },
    { keyword: '자율주행', field: '자동차/모빌리티', results: 234 },
    { keyword: '반도체', field: '전자/반도체', results: 456 },
    { keyword: '바이오센서', field: '바이오/의료', results: 123 },
    { keyword: '태양광', field: '에너지/환경', results: 78 },
    { keyword: '로봇', field: '기계/제조', results: 189 },
    { keyword: '클라우드', field: '소프트웨어/IT', results: 267 },
    { keyword: '5G통신', field: '통신/네트워크', results: 145 }
  ];
  
  console.log('검색 활동 생성 중...');
  for (let i = 0; i < searchActivities.length; i++) {
    const search = searchActivities[i];
    const date = new Date();
    date.setDate(date.getDate() - (i * 3)); // 3일씩 간격
    
    const { error } = await supabase
      .from('user_activities')
      .insert({
        user_id: userId,
        activity_type: 'search',
        activity_data: {
          keyword: search.keyword,
          field: search.field,
          results_count: search.results,
          total_count: search.results
        },
        created_at: date.toISOString()
      });
      
    if (error) {
      console.error(`검색 활동 생성 오류 (${search.keyword}):`, error);
    } else {
      console.log(`✓ 검색 활동 생성: ${search.keyword}`);
    }
  }
  
  // 2. AI 분석 활동 생성
  console.log('AI 분석 활동 생성 중...');
  for (let i = 0; i < 5; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (i * 2));
    
    const { error } = await supabase
      .from('user_activities')
      .insert({
        user_id: userId,
        activity_type: 'ai_analysis',
        activity_data: {
          analysis_type: 'comprehensive',
          patent_id: `patent_${i + 1}`,
          application_number: `1020240${String(i + 1).padStart(6, '0')}`
        },
        created_at: date.toISOString()
      });
      
    if (error) {
      console.error(`AI 분석 활동 생성 오류 (${i + 1}):`, error);
    } else {
      console.log(`✓ AI 분석 활동 생성: ${i + 1}`);
    }
  }
  
  // 3. 문서 다운로드 활동 생성
  console.log('문서 다운로드 활동 생성 중...');
  for (let i = 0; i < 8; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (i * 1));
    
    const { error } = await supabase
      .from('user_activities')
      .insert({
        user_id: userId,
        activity_type: 'document_download',
        activity_data: {
          document_type: 'pdf',
          document_name: `특허문서_${i + 1}.pdf`,
          application_number: `1020240${String(i + 1).padStart(6, '0')}`
        },
        created_at: date.toISOString()
      });
      
    if (error) {
      console.error(`문서 다운로드 활동 생성 오류 (${i + 1}):`, error);
    } else {
      console.log(`✓ 문서 다운로드 활동 생성: ${i + 1}`);
    }
  }
  
  // 4. 보고서 생성 활동 생성
  console.log('보고서 생성 활동 생성 중...');
  for (let i = 0; i < 6; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (i * 2));
    
    const { error } = await supabase
      .from('user_activities')
      .insert({
        user_id: userId,
        activity_type: 'report_generate',
        activity_data: {
          report_type: 'market_analysis',
          report_title: `시장 분석 보고서 ${i + 1}`,
          application_number: `1020240${String(i + 1).padStart(6, '0')}`
        },
        created_at: date.toISOString()
      });
      
    if (error) {
      console.error(`보고서 생성 활동 생성 오류 (${i + 1}):`, error);
    } else {
      console.log(`✓ 보고서 생성 활동 생성: ${i + 1}`);
    }
  }
  
  // 5. 기존 보고서에 user_id 업데이트
  console.log('기존 보고서에 user_id 업데이트 중...');
  const { data: reports, error: reportsError } = await supabase
    .from('ai_analysis_reports')
    .select('id')
    .limit(5);
    
  if (!reportsError && reports) {
    for (const report of reports) {
      const { error } = await supabase
        .from('ai_analysis_reports')
        .update({ user_id: userId })
        .eq('id', report.id);
        
      if (error) {
        console.error(`보고서 user_id 업데이트 오류 (${report.id}):`, error);
      } else {
        console.log(`✓ 보고서 user_id 업데이트: ${report.id}`);
      }
    }
  }
  
  console.log('\n=== 샘플 데이터 생성 완료 ===');
  console.log('사용자 ID:', userId);
  console.log('생성된 활동: 검색 10개, AI분석 5개, 다운로드 8개, 보고서 6개');
}

createSampleData().catch(console.error);