// 직접 로그인 테스트 스크립트
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// 환경변수 로드
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

console.log('=== 직접 로그인 테스트 ===')
console.log('URL:', supabaseUrl)
console.log('Key 존재:', !!supabaseAnonKey)

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ 환경변수가 설정되지 않았습니다')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testDirectLogin() {
  try {
    console.log('\n1. 로그인 시도: demo@example.com')
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'demo@example.com',
      password: 'demo123456'
    })

    if (error) {
      console.log('❌ 로그인 실패:', error.message)
      console.log('에러 상세:', error)
      return
    }

    console.log('✅ 로그인 성공!')
    console.log('사용자 ID:', data.user?.id)
    console.log('이메일:', data.user?.email)
    
    // 프로필 조회
    console.log('\n2. 프로필 조회 중...')
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single()

    if (profileError) {
      console.log('❌ 프로필 조회 실패:', profileError.message)
    } else {
      console.log('✅ 프로필 조회 성공:')
      console.log('이름:', profile.name)
      console.log('역할:', profile.role)
      console.log('구독 플랜:', profile.subscription_plan)
    }

    // 로그아웃
    console.log('\n3. 로그아웃 중...')
    await supabase.auth.signOut()
    console.log('✅ 로그아웃 완료')

  } catch (error) {
    console.error('❌ 테스트 중 예외 발생:', error)
  }
}

testDirectLogin()