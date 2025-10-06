const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function getUsers() {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, email')
      .limit(5);
    
    if (error) {
      console.error('Error:', error);
      return;
    }
    
    console.log('사용자 목록:');
    data.forEach(user => {
      console.log(`ID: ${user.id}, Email: ${user.email}`);
    });
    
    if (data.length > 0) {
      console.log(`\n첫 번째 사용자 ID 사용: ${data[0].id}`);
    }
  } catch (error) {
    console.error('실행 오류:', error.message);
  }
}

getUsers();