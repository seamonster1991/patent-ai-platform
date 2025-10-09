const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Supabase 환경변수가 설정되지 않았습니다.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updateUserTotals() {
  console.log('🔄 사용자 총계 업데이트 시작...\n');

  const testUserId = '50a3f2fa-abc6-4b44-a714-fb260df25752';

  try {
    // 1. 현재 users 테이블의 값 확인
    console.log('1. 현재 users 테이블 값 확인:');
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('total_searches, total_reports, total_logins')
      .eq('id', testUserId)
      .single();

    if (userError) {
      console.error('❌ 사용자 조회 오류:', userError);
      return;
    }

    console.log('✅ 현재 users 테이블 값:', currentUser);

    // 2. 실제 테이블에서 계산된 값 확인
    console.log('\n2. 실제 테이블에서 계산된 값:');
    
    // patent_search_analytics에서 검색 수 계산
    const { count: searchCount, error: searchError } = await supabase
      .from('patent_search_analytics')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', testUserId);

    if (searchError) {
      console.error('❌ 검색 수 계산 오류:', searchError);
    } else {
      console.log('✅ 실제 검색 수:', searchCount);
    }

    // ai_analysis_reports에서 리포트 수 계산
    const { count: reportCount, error: reportError } = await supabase
      .from('ai_analysis_reports')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', testUserId);

    if (reportError) {
      console.error('❌ 리포트 수 계산 오류:', reportError);
    } else {
      console.log('✅ 실제 리포트 수:', reportCount);
    }

    // user_activities에서 활동 수 계산
    const { data: activityCount, error: activityError } = await supabase
      .from('user_activities')
      .select('activity_type', { count: 'exact' })
      .eq('user_id', testUserId);

    if (activityError) {
      console.error('❌ 활동 수 계산 오류:', activityError);
    } else {
      console.log('✅ 실제 활동 수:', activityCount);
    }

    // 3. users 테이블 업데이트
    console.log('\n3. users 테이블 업데이트:');
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({
        total_searches: searchCount || 0,
        total_reports: reportCount || 0
      })
      .eq('id', testUserId)
      .select();

    if (updateError) {
      console.error('❌ 사용자 업데이트 오류:', updateError);
    } else {
      console.log('✅ 사용자 업데이트 완료:', updatedUser);
    }

    // 4. 업데이트 후 대시보드 상태 확인
    console.log('\n4. 업데이트 후 대시보드 상태 확인:');
    const { data: dashboardData, error: dashboardError } = await supabase
      .rpc('get_dashboard_stats', {
        p_user_id: testUserId,
        p_period: '30d'
      });

    if (dashboardError) {
      console.error('❌ 대시보드 데이터 조회 오류:', dashboardError);
    } else {
      console.log('✅ 업데이트된 대시보드 데이터:');
      console.log('  - 검색 수:', dashboardData.efficiency_metrics.total_searches);
      console.log('  - 리포트 수:', dashboardData.efficiency_metrics.total_reports);
      console.log('  - 로그인 수:', dashboardData.efficiency_metrics.total_logins);
    }

  } catch (error) {
    console.error('❌ 업데이트 중 오류 발생:', error);
  }
}

updateUserTotals()