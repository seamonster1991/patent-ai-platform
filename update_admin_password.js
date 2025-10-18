import bcrypt from 'bcryptjs'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// 환경 변수 로드
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function updateAdminPassword() {
  try {
    const email = 'admin@patent-ai.com'
    const password = 'admin123'
    
    console.log('🔐 관리자 비밀번호 업데이트 시작...')
    console.log('이메일:', email)
    
    // 비밀번호 해시 생성
    const saltRounds = 12
    const passwordHash = await bcrypt.hash(password, saltRounds)
    
    console.log('✅ 비밀번호 해시 생성 완료')
    
    // 데이터베이스 업데이트
    const { data, error } = await supabase
      .from('admin_users')
      .update({ 
        password_hash: passwordHash,
        updated_at: new Date().toISOString()
      })
      .eq('email', email)
      .select()
    
    if (error) {
      console.error('❌ 데이터베이스 업데이트 실패:', error)
      return
    }
    
    if (data && data.length > 0) {
      console.log('✅ 관리자 비밀번호 업데이트 성공!')
      console.log('업데이트된 관리자:', { id: data[0].id, email: data[0].email })
    } else {
      console.log('❌ 관리자 계정을 찾을 수 없습니다.')
    }
    
  } catch (error) {
    console.error('❌ 에러 발생:', error)
  }
}

updateAdminPassword()