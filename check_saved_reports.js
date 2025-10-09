const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSavedReports() {
  try {
    console.log('🔍 저장된 리포트 확인 중...');
    
    // 최근 생성된 리포트 확인
    const { data: reports, error } = await supabase
      .from('ai_analysis_reports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (error) {
      console.error('❌ 리포트 조회 실패:', error);
      return;
    }
    
    console.log('📋 최근 리포트 목록:');
    if (reports && reports.length > 0) {
      reports.forEach((report, index) => {
        console.log(`${index + 1}. ${report.report_name || '이름 없음'}`);
        console.log(`   - ID: ${report.id}`);
        console.log(`   - 특허번호: ${report.application_number}`);
        console.log(`   - 타입: ${report.analysis_type}`);
        console.log(`   - 생성일: ${report.created_at}`);
        console.log(`   - 사용자: ${report.user_id}`);
        console.log('');
      });
    } else {
      console.log('📭 저장된 리포트가 없습니다.');
    }
    
    // 특정 특허번호로 검색
    const testPatents = ['1020230010001', '1020230010002'];
    for (const patentNumber of testPatents) {
      const { data: patentReports, error: patentError } = await supabase
        .from('ai_analysis_reports')
        .select('*')
        .eq('application_number', patentNumber);
      
      if (!patentError && patentReports) {
        console.log(`🎯 특허 ${patentNumber}에 대한 리포트: ${patentReports.length}개`);
        patentReports.forEach(report => {
          console.log(`  - ${report.analysis_type}: ${report.report_name}`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ 확인 작업 중 오류:', error);
  }
}

checkSavedReports()