// Supabase 연결 테스트 스크립트
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// 환경변수 로드
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

console.log('=== Supabase 연결 테스트 시작 ===')
console.log('URL:', supabaseUrl)
console.log('Key 존재:', !!supabaseAnonKey)
console.log('Key 길이:', supabaseAnonKey?.length)

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ 환경변수가 설정되지 않았습니다')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testConnection() {
  try {
    console.log('\n1. 기본 연결 테스트...')
    const { data, error } = await supabase.auth.getSession()
    if (error) {
      console.log('⚠️ 세션 가져오기 오류:', error.message)
    } else {
      console.log('✅ 기본 연결 성공')
    }

    console.log('\n2. 데이터베이스 연결 테스트...')
    const { data: users, error: dbError } = await supabase
      .from('users')
      .select('id, email, role')
      .limit(5)
    
    if (dbError) {
      console.log('❌ 데이터베이스 연결 오류:', dbError.message)
    } else {
      console.log('✅ 데이터베이스 연결 성공')
      console.log('사용자 수:', users?.length || 0)
      if (users && users.length > 0) {
        console.log('사용자 목록:')
        users.forEach(user => {
          console.log(`  - ${user.email} (${user.role || 'user'})`)
        })
      }
    }

    console.log('\n3. 테스트 계정 확인...')
    const testEmails = ['demo@example.com', 'admin@p-ai.com']
    
    for (const email of testEmails) {
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, email, role')
        .eq('email', email)
        .single()
      
      if (userError) {
        console.log(`❌ ${email}: 계정 없음 (${userError.message})`)
      } else {
        console.log(`✅ ${email}: 계정 존재 (${user.role || 'user'})`)
      }
    }

    console.log('\n4. 로그인 테스트...')
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: 'demo@example.com',
      password: 'demo123456'
    })

    if (loginError) {
      console.log('❌ 로그인 실패:', loginError.message)
    } else {
      console.log('✅ 로그인 성공:', loginData.user?.email)
      
      // 로그아웃
      await supabase.auth.signOut()
      console.log('✅ 로그아웃 완료')
    }

  } catch (error) {
    console.error('❌ 테스트 중 예외 발생:', error)
  }
}

testConnection()