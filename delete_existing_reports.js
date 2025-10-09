const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function deleteExistingReports() {
  try {
    console.log('🗑️ 기존 리포트 삭제 시작...');
    
    // 테스트용 특허번호에 대한 기존 리포트 삭제
    const { data: deletedReports, error: deleteError } = await supabase
      .from('ai_analysis_reports')
      .delete()
      .eq('application_number', '1020230010001')
      .select();
    
    if (deleteError) {
      console.error('❌ 리포트 삭제 실패:', deleteError);
      return;
    }
    
    console.log('✅ 삭제된 리포트:', deletedReports?.length || 0, '개');
    if (deletedReports && deletedReports.length > 0) {
      deletedReports.forEach(report => {
        console.log(`  - ${report.report_name} (ID: ${report.id})`);
      });
    }
    
    // 관련 활동 기록도 삭제
    const { data: deletedActivities, error: activityError } = await supabase
      .from('user_activities')
      .delete()
      .eq('activity_type', 'report_generate')
      .like('activity_data->>application_number', '1020230010001')
      .select();
    
    if (activityError) {
      console.warn('⚠️ 활동 기록 삭제 실패:', activityError);
    } else {
      console.log('✅ 삭제된 활동 기록:', deletedActivities?.length || 0, '개');
    }
    
    console.log('🎯 이제 리포트 생성 테스트를 다시 실행할 수 있습니다.');
    
  } catch (error) {
    console.error('❌ 삭제 작업 중 오류:', error);
  }
}

deleteExistingReports();