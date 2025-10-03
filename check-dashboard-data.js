const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('환경변수가 설정되지 않았습니다.');
  console.log('VITE_SUPABASE_URL:', !!supabaseUrl);
  console.log('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkData() {
  console.log('=== 사용자 활동 데이터 확인 ===');
  
  // 모든 사용자 활동 조회
  const { data: activities, error } = await supabase
    .from('user_activities')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);
    
  if (error) {
    console.error('활동 데이터 오류:', error);
  } else {
    console.log('총 활동 수:', activities?.length || 0);
    console.log('최근 활동들:');
    activities?.forEach((activity, i) => {
      console.log(`${i+1}. ${activity.activity_type} - ${activity.created_at} - User: ${activity.user_id}`);
      if (activity.activity_data) {
        console.log('   데이터:', JSON.stringify(activity.activity_data, null, 2));
      }
    });
    
    // 활동 타입별 집계
    const breakdown = {};
    activities?.forEach(activity => {
      breakdown[activity.activity_type] = (breakdown[activity.activity_type] || 0) + 1;
    });
    console.log('\n활동 타입별 집계:', breakdown);
  }
  
  // 보고서 데이터 확인
  const { data: reports, error: reportsError } = await supabase
    .from('ai_analysis_reports')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);
    
  console.log('\n=== 보고서 데이터 확인 ===');
  if (reportsError) {
    console.error('보고서 데이터 오류:', reportsError);
  } else {
    console.log('총 보고서 수:', reports?.length || 0);
    reports?.forEach((report, i) => {
      console.log(`${i+1}. ${report.invention_title} - ${report.created_at} - User: ${report.user_id}`);
    });
  }
  
  // 사용자 목록 확인
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, email')
    .limit(5);
    
  console.log('\n=== 사용자 목록 ===');
  if (usersError) {
    console.error('사용자 데이터 오류:', usersError);
  } else {
    console.log('사용자 수:', users?.length || 0);
    users?.forEach((user, i) => {
      console.log(`${i+1}. ${user.email} - ID: ${user.id}`);
    });
  }
}

checkData().catch(console.error);