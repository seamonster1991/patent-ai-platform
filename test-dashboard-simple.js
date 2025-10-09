const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function testDashboard() {
  try {
    console.log('🔍 대시보드 API 테스트 시작...');
    
    // Supabase 클라이언트 생성
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase 환경변수가 설정되지 않았습니다.');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    // 1. 사용자 목록 조회
    console.log('📋 사용자 목록 조회...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, name, created_at')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (usersError) {
      console.error('❌ 사용자 조회 실패:', usersError);
      return;
    }
    
    console.log('✅ 사용자 목록:', users);
    
    if (!users || users.length === 0) {
      console.log('⚠️ 사용자가 없습니다. 테스트 사용자를 생성합니다...');
      
      // 테스트 사용자 생성
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert([{
          email: 'test@example.com',
          name: '테스트 사용자',
          subscription_plan: 'premium',
          role: 'user'
        }])
        .select()
        .single();
      
      if (createError) {
        console.error('❌ 테스트 사용자 생성 실패:', createError);
        return;
      }
      
      console.log('✅ 테스트 사용자 생성됨:', newUser);
      users.push(newUser);
    }
    
    const testUser = users[0];
    console.log('🎯 테스트 대상 사용자:', testUser);
    
    // 2. 대시보드 함수 직접 호출
    console.log('📊 대시보드 함수 호출...');
    const { data: dashboardData, error: dashboardError } = await supabase.rpc('get_dashboard_stats', {
      p_user_id: testUser.id,
      p_period: '30d'
    });
    
    if (dashboardError) {
      console.error('❌ 대시보드 함수 호출 실패:', dashboardError);
      return;
    }
    
    console.log('✅ 대시보드 데이터:', JSON.stringify(dashboardData, null, 2));
    
    // 3. 테스트 활동 데이터 생성 (데이터가 없는 경우)
    if (!dashboardData || !dashboardData.daily_trend || dashboardData.daily_trend.length === 0) {
      console.log('⚠️ 활동 데이터가 없습니다. 테스트 데이터를 생성합니다...');
      
      // 검색 기록 생성
      const searchData = [];
      const reportData = [];
      const activityData = [];
      
      for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        
        // 검색 기록
        searchData.push({
          user_id: testUser.id,
          query: `테스트 검색 ${i + 1}`,
          results_count: Math.floor(Math.random() * 100) + 10,
          created_at: date.toISOString()
        });
        
        // 리포트 기록
        reportData.push({
          user_id: testUser.id,
          title: `테스트 리포트 ${i + 1}`,
          invention_title: `발명 제목 ${i + 1}`,
          created_at: date.toISOString()
        });
        
        // 활동 기록
        activityData.push({
          user_id: testUser.id,
          activity_type: 'search',
          activity_data: { query: `테스트 검색 ${i + 1}` },
          created_at: date.toISOString()
        });
        
        activityData.push({
          user_id: testUser.id,
          activity_type: 'report',
          activity_data: { title: `테스트 리포트 ${i + 1}` },
          created_at: date.toISOString()
        });
      }
      
      // 데이터 삽입
      const { error: searchError } = await supabase
        .from('search_history')
        .insert(searchData);
      
      if (searchError) {
        console.error('❌ 검색 기록 생성 실패:', searchError);
      } else {
        console.log('✅ 검색 기록 생성 완료');
      }
      
      const { error: reportError } = await supabase
        .from('ai_analysis_reports')
        .insert(reportData);
      
      if (reportError) {
        console.error('❌ 리포트 기록 생성 실패:', reportError);
      } else {
        console.log('✅ 리포트 기록 생성 완료');
      }
      
      const { error: activityError } = await supabase
        .from('user_activities')
        .insert(activityData);
      
      if (activityError) {
        console.error('❌ 활동 기록 생성 실패:', activityError);
      } else {
        console.log('✅ 활동 기록 생성 완료');
      }
      
      // 다시 대시보드 데이터 조회
      console.log('🔄 대시보드 데이터 재조회...');
      const { data: newDashboardData, error: newDashboardError } = await supabase.rpc('get_dashboard_stats', {
        p_user_id: testUser.id,
        p_period: '30d'
      });
      
      if (newDashboardError) {
        console.error('❌ 대시보드 데이터 재조회 실패:', newDashboardError);
      } else {
        console.log('✅ 새로운 대시보드 데이터:', JSON.stringify(newDashboardData, null, 2));
      }
    }
    
    console.log('🎉 테스트 완료!');
    
  } catch (error) {
    console.error('❌ 테스트 실패:', error);
  }
}

testDashboard();