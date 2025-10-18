require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAdminHash() {
  try {
    console.log('🔍 관리자 계정 해시 확인 중...');
    
    // admin_users 테이블에서 관리자 정보 조회
    const { data: adminData, error: adminError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('email', 'admin@patent-ai.com')
      .single();
    
    if (adminError) {
      console.error('❌ 관리자 조회 오류:', adminError);
      return;
    }
    
    if (!adminData) {
      console.log('❌ 관리자 계정을 찾을 수 없습니다.');
      return;
    }
    
    console.log('✅ 관리자 계정 찾음:', {
      id: adminData.id,
      email: adminData.email,
      name: adminData.name,
      password_hash: adminData.password_hash ? adminData.password_hash.substring(0, 20) + '...' : 'null'
    });
    
    // 비밀번호 검증 테스트
    const testPassword = 'admin123';
    console.log(`🔑 비밀번호 "${testPassword}" 검증 중...`);
    
    if (!adminData.password_hash) {
      console.log('❌ 비밀번호 해시가 없습니다.');
      return;
    }
    
    const isValid = await bcrypt.compare(testPassword, adminData.password_hash);
    console.log(`🔍 비밀번호 검증 결과: ${isValid ? '✅ 성공' : '❌ 실패'}`);
    
    // 새로운 해시 생성 및 비교
    console.log('\n🔄 새로운 해시 생성 테스트...');
    const newHash = await bcrypt.hash(testPassword, 12);
    console.log('새 해시:', newHash.substring(0, 20) + '...');
    
    const newHashValid = await bcrypt.compare(testPassword, newHash);
    console.log(`새 해시 검증: ${newHashValid ? '✅ 성공' : '❌ 실패'}`);
    
  } catch (error) {
    console.error('❌ 오류 발생:', error);
  }
}

checkAdminHash().catch(console.error);