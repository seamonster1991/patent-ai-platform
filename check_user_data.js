const { createClient } = require('@supabase/supabase-js');

// Supabase 설정
const supabaseUrl = 'https://afzzubvlotobcaiflmia.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmenp1YnZsb3RvYmNhaWZsbWlhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTIzMzM2MiwiZXhwIjoyMDc0ODA5MzYyfQ.i7_KeTulGjmVaSB-MQftRLzha5EA9_yNkKI2-13PCJk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUserData() {
  try {
    console.log('=== 사용자 데이터 확인 ===');
    
    // 1. 테스트 사용자 확인
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'test@example.com');
    
    if (usersError) {
      console.error('사용자 조회 오류:', usersError);
      return;
    }
    
    if (!users || users.length === 0) {
      console.log('테스트 사용자가 없습니다.');
      return;
    }
    
    const testUser = users[0];
    console.log('테스트 사용자:', testUser.id, testUser.email);
    
    // 2. 사용자의 검색 기록 확인
    const { data: searches, error: searchError } = await supabase
      .from('search_history')
      .select('*')
      .eq('user_id', testUser.id)
      .order('created_at', { ascending: false })
      .limit(10);
    
    console.log('\n=== 검색 기록 ===');
    if (searchError) {
      console.error('검색 기록 오류:', searchError);
    } else {
      console.log(`총 검색 수: ${searches?.length || 0}`);
      if (searches && searches.length > 0) {
        searches.forEach((search, index) => {
          console.log(`${index + 1}. ${search.search_query} (${search.created_at})`);
        });
      }
    }
    
    // 3. 사용자의 리포트 확인
    const { data: reports, error: reportError } = await supabase
      .from('reports')
      .select('*')
      .eq('user_id', testUser.id)
      .order('created_at', { ascending: false })
      .limit(10);
    
    console.log('\n=== 리포트 ===');
    if (reportError) {
      console.error('리포트 오류:', reportError);
    } else {
      console.log(`총 리포트 수: ${reports?.length || 0}`);
      if (reports && reports.length > 0) {
        reports.forEach((report, index) => {
          console.log(`${index + 1}. ${report.title} (${report.created_at})`);
        });
      }
    }
    
    // 4. 사용자의 로그인 기록 확인
    const { data: logins, error: loginError } = await supabase
      .from('user_activity_logs')
      .select('*')
      .eq('user_id', testUser.id)
      .eq('activity_type', 'login')
      .order('created_at', { ascending: false })
      .limit(10);
    
    console.log('\n=== 로그인 기록 ===');
    if (loginError) {
      console.error('로그인 기록 오류:', loginError);
    } else {
      console.log(`총 로그인 수: ${logins?.length || 0}`);
      if (logins && logins.length > 0) {
        logins.forEach((login, index) => {
          console.log(`${index + 1}. ${login.created_at}`);
        });
      }
    }
    
    // 5. 기술 분야 데이터 확인
    const { data: dashboardData, error: dashboardError } = await supabase
      .rpc('get_dashboard_stats', {
        p_user_id: testUser.id,
        p_period: '30d'
      });
    
    console.log('\n=== API 응답 데이터 ===');
    if (dashboardError) {
      console.error('API 오류:', dashboardError);
    } else {
      console.log('API 응답:', JSON.stringify(dashboardData, null, 2));
    }
    
  } catch (error) {
    console.error('전체 오류:', error);
  }
}

checkUserData();