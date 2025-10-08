const { createClient } = require('@supabase/supabase-js');

async function testDashboardAPI() {
  console.log('🧪 Testing Dashboard API in Production Environment');
  
  // Supabase 설정
  const supabaseUrl = 'https://afzzubvlotobcaiflmia.supabase.co';
  const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmenp1YnZsb3RvYmNhaWZsbWlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyMzMzNjIsImV4cCI6MjA3NDgwOTM2Mn0.zxDq8gPReAKYxGb3F7Kaxelw271IsMWWyFVXGtIgAHQ';
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  try {
    // 1. 테스트 사용자로 로그인 시도
    console.log('🔐 Attempting to sign in with test user...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'testpassword123'
    });
    
    if (authError) {
      console.log('❌ Auth failed (expected):', authError.message);
      
      // 2. 기존 사용자 확인
      console.log('🔍 Checking existing users...');
      const { data: users, error: usersError } = await supabase
        .from('auth.users')
        .select('id, email')
        .limit(1);
        
      if (usersError) {
        console.log('❌ Cannot access users table:', usersError.message);
      } else {
        console.log('✅ Found users:', users);
      }
      
      return;
    }
    
    console.log('✅ Auth successful:', authData.user.id);
    
    // 3. 토큰으로 API 테스트
    const token = authData.session.access_token;
    console.log('🎫 Token obtained:', token.substring(0, 20) + '...');
    
    // 4. Dashboard API 호출
    const apiUrl = 'https://p-coqhionja-re-chip.vercel.app/api/dashboard-stats';
    const params = new URLSearchParams({
      user_id: authData.user.id,
      period: '90d'
    });
    
    console.log('📡 Calling Dashboard API...');
    const response = await fetch(`${apiUrl}?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    const result = await response.json();
    console.log('📊 API Response:', {
      status: response.status,
      success: result.success,
      error: result.error,
      data: result.data ? 'Data received' : 'No data'
    });
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
  }
}

testDashboardAPI();