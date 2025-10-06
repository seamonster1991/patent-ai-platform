const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkUser() {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, email')
      .eq('id', '95bd8fed-8ed3-443a-b9e4-becfa5171b8c');
    
    if (error) {
      console.error('사용자 조회 오류:', error);
    } else {
      console.log('사용자 조회 결과:', data);
      if (data.length === 0) {
        console.log('해당 ID의 사용자가 존재하지 않습니다.');
        
        // 실제 존재하는 사용자 확인
        const { data: allUsers, error: allError } = await supabase
          .from('users')
          .select('id, email')
          .limit(3);
        
        if (!allError) {
          console.log('실제 존재하는 사용자들:');
          allUsers.forEach(user => console.log(`  ${user.id} - ${user.email}`));
        }
      }
    }
  } catch (error) {
    console.error('실행 오류:', error.message);
  }
}

checkUser()