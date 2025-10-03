// React 애플리케이션과 동일한 환경에서 로그인 테스트 v2
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// 환경변수 로드
dotenv.config()

console.log('🔥 React 로그인 테스트 v2 시작')

// Vite 환경변수 시뮬레이션
const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

console.log('🔍 환경변수 확인:')
console.log('- VITE_SUPABASE_URL:', supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'undefined')
console.log('- VITE_SUPABASE_ANON_KEY:', supabaseKey ? `${supabaseKey.substring(0, 30)}...` : 'undefined')

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 환경변수가 설정되지 않았습니다')
  process.exit(1)
}

// Supabase 클라이언트 생성 (React와 동일한 방식)
console.log('🔧 Supabase 클라이언트 생성 중...')
const supabase = createClient(supabaseUrl, supabaseKey)
console.log('✅ Supabase 클라이언트 생성 완료')

// AuthStore signIn 함수 시뮬레이션 (단순화된 버전)
async function testSignIn(email, password) {
  console.warn('🔥 [AuthStore] signIn 시작:', { email });
  
  try {
    // 간단한 이메일 검증
    if (!email || !password) {
      console.warn('❌ [AuthStore] 이메일 또는 비밀번호 누락');
      return { error: '이메일과 비밀번호를 입력해주세요' }
    }

    console.warn('🔥 [AuthStore] Supabase 로그인 호출 시작');
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    console.warn('🔥 [AuthStore] Supabase 로그인 호출 완료:', { 
      hasData: !!data, 
      hasUser: !!data?.user, 
      hasError: !!error,
      errorMessage: error?.message 
    });

    if (error) {
      console.warn('❌ [AuthStore] 로그인 에러:', error.message);
      return { error: error.message }
    }

    if (data.user) {
      console.warn('✅ [AuthStore] 로그인 성공, 상태 업데이트');
      
      // 간단한 상태 업데이트 (프로필 조회 없이)
      const isAdmin = email === 'admin@p-ai.com'
      
      console.warn('✅ [AuthStore] 상태 업데이트 완료');
      return { user: data.user, isAdmin }
    }

    console.warn('❌ [AuthStore] 사용자 데이터 없음');
    return { error: '로그인에 실패했습니다' }
    
  } catch (error) {
    console.error('💥 [AuthStore] signIn 예외 발생:', error)
    return { error: '네트워크 연결을 확인해주세요' }
  }
}

// 로그인 테스트 실행
async function runTest() {
  console.log('\n🧪 로그인 테스트 실행')
  
  const testCases = [
    { email: 'demo@example.com', password: 'demo123456' },
    { email: 'admin@p-ai.com', password: 'admin123456' },
    { email: 'invalid@test.com', password: 'wrongpassword' }
  ]
  
  for (const testCase of testCases) {
    console.log(`\n--- 테스트: ${testCase.email} ---`)
    
    const result = await testSignIn(testCase.email, testCase.password)
    
    if (result.error) {
      console.log(`❌ 로그인 실패: ${result.error}`)
    } else {
      console.log(`✅ 로그인 성공: ${result.user.email} (관리자: ${result.isAdmin})`)
      
      // 로그아웃
      await supabase.auth.signOut()
      console.log('🔓 로그아웃 완료')
    }
  }
  
  console.log('\n🎯 테스트 완료')
}

runTest().catch(console.error)