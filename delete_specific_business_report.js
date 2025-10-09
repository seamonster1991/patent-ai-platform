require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function deleteSpecificBusinessReport() {
  try {
    console.log('🗑️ 특정 비즈니스 리포트 삭제 시작...');
    
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // 특정 비즈니스 리포트 삭제 (1020230010002)
    const { data: reports, error: fetchError } = await supabase
      .from('ai_analysis_reports')
      .select('*')
      .eq('application_number', '1020230010002')
      .eq('analysis_type', 'business');

    if (fetchError) {
      console.error('❌ 리포트 조회 실패:', fetchError);
      return;
    }

    console.log('📋 찾은 비즈니스 리포트:', reports.length, '개');

    for (const report of reports) {
      console.log(`🗑️ 삭제 중: ${report.report_name} (ID: ${report.id})`);
      
      // 관련 활동 기록 삭제
      const { error: activityError } = await supabase
        .from('user_activities')
        .delete()
        .eq('report_id', report.id);

      if (activityError) {
        console.error('❌ 활동 기록 삭제 실패:', activityError);
      }

      // 리포트 삭제
      const { error: reportError } = await supabase
        .from('ai_analysis_reports')
        .delete()
        .eq('id', report.id);

      if (reportError) {
        console.error('❌ 리포트 삭제 실패:', reportError);
      } else {
        console.log(`✅ 삭제 완료: ${report.report_name}`);
      }
    }

    console.log('🎯 특정 비즈니스 리포트 삭제 완료');

  } catch (error) {
    console.error('❌ 삭제 중 오류:', error);
  }
}

deleteSpecificBusinessReport()