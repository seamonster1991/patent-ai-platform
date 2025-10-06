const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSeongwanUser() {
  const targetEmail = 'seongwankim@gmail.com';
  
  console.log(`=== ${targetEmail} 사용자 확인 ===`);
  
  try {
    // 1. auth.users 테이블에서 확인
    console.log('\n1. auth.users 테이블 확인...');
    const { data: authUser, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('Auth 사용자 조회 오류:', authError);
    } else {
      const foundAuthUser = authUser.users.find(user => user.email === targetEmail);
      if (foundAuthUser) {
        console.log('✅ auth.users에서 발견:');
        console.log(`   ID: ${foundAuthUser.id}`);
        console.log(`   이메일: ${foundAuthUser.email}`);
        console.log(`   생성일: ${foundAuthUser.created_at}`);
        console.log(`   확인됨: ${foundAuthUser.email_confirmed_at ? '예' : '아니오'}`);
      } else {
        console.log('❌ auth.users에서 찾을 수 없음');
      }
    }
    
    // 2. public.users 테이블에서 확인
    console.log('\n2. public.users 테이블 확인...');
    const { data: publicUser, error: publicError } = await supabase
      .from('users')
      .select('*')
      .eq('email', targetEmail)
      .single();
    
    if (publicError) {
      if (publicError.code === 'PGRST116') {
        console.log('❌ public.users에서 찾을 수 없음');
      } else {
        console.error('Public 사용자 조회 오류:', publicError);
      }
    } else {
      console.log('✅ public.users에서 발견:');
      console.log(`   ID: ${publicUser.id}`);
      console.log(`   이메일: ${publicUser.email}`);
      console.log(`   이름: ${publicUser.name}`);
      console.log(`   회사: ${publicUser.company || '없음'}`);
      console.log(`   전화번호: ${publicUser.phone || '없음'}`);
      console.log(`   구독 플랜: ${publicUser.subscription_plan}`);
      console.log(`   사용 횟수: ${publicUser.usage_count}`);
      console.log(`   역할: ${publicUser.role}`);
      console.log(`   생성일: ${publicUser.created_at}`);
    }
    
    // 3. 사용자 활동 데이터 확인
    if (publicUser) {
      console.log('\n3. 사용자 활동 데이터 확인...');
      
      // 검색 기록 확인
      const { data: searches, error: searchError } = await supabase
        .from('user_activities')
        .select('*')
        .eq('user_id', publicUser.id)
        .eq('activity_type', 'search')
        .limit(5);
      
      if (!searchError && searches) {
        console.log(`   검색 기록: ${searches.length}개`);
        searches.forEach((search, i) => {
          console.log(`   ${i+1}. ${search.activity_data?.query || '검색어 없음'} (${search.created_at})`);
        });
      }
      
      // AI 분석 리포트 확인
      const { data: reports, error: reportError } = await supabase
        .from('ai_analysis_reports')
        .select('*')
        .eq('user_id', publicUser.id)
        .limit(5);
      
      if (!reportError && reports) {
        console.log(`   AI 분석 리포트: ${reports.length}개`);
        reports.forEach((report, i) => {
          console.log(`   ${i+1}. ${report.invention_title || '제목 없음'} (${report.created_at})`);
        });
      }
    }
    
    console.log('\n=== 확인 완료 ===');
    
  } catch (error) {
    console.error('사용자 확인 중 오류:', error);
  }
}

checkSeongwanUser().catch(console.error);