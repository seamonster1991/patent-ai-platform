const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkUsers() {
  console.log('=== 사용자 테이블 확인 ===');
  
  const { data: users, error } = await supabase
    .from('users')
    .select('*');
    
  if (error) {
    console.error('사용자 조회 오류:', error);
  } else {
    console.log('총 사용자 수:', users?.length || 0);
    users?.forEach((user, i) => {
      console.log(`${i+1}. ID: ${user.id}`);
      console.log(`   이메일: ${user.email}`);
      console.log(`   이름: ${user.name}`);
      console.log(`   생성일: ${user.created_at}`);
      console.log('');
    });
  }
}

checkUsers().catch(console.error);