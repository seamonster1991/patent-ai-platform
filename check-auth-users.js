const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAuthUsers() {
  console.log('=== auth.users 테이블 확인 ===');
  
  const { data: authUsers, error } = await supabase
    .from('auth.users')
    .select('*');
    
  if (error) {
    console.error('auth.users 조회 오류:', error);
    
    // 다른 방법으로 시도
    console.log('\n=== RPC로 auth.users 확인 ===');
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('get_auth_users');
      
    if (rpcError) {
      console.error('RPC 오류:', rpcError);
    } else {
      console.log('RPC 결과:', rpcData);
    }
  } else {
    console.log('총 auth 사용자 수:', authUsers?.length || 0);
    authUsers?.forEach((user, i) => {
      console.log(`${i+1}. ID: ${user.id}`);
      console.log(`   이메일: ${user.email}`);
      console.log(`   생성일: ${user.created_at}`);
      console.log('');
    });
  }
  
  // 기존 활동 데이터 확인
  console.log('\n=== 기존 user_activities 확인 ===');
  const { data: activities, error: activitiesError } = await supabase
    .from('user_activities')
    .select('user_id')
    .limit(5);
    
  if (activitiesError) {
    console.error('활동 조회 오류:', activitiesError);
  } else {
    console.log('기존 활동의 user_id들:');
    activities?.forEach((activity, i) => {
      console.log(`${i+1}. ${activity.user_id}`);
    });
  }
}

checkAuthUsers().catch(console.error);