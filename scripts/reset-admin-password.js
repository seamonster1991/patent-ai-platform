import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import { config } from 'dotenv'

config()

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function resetAdminPassword() {
  try {
    const email = 'admin@p-ai.co.kr'
    const newPassword = 'admin123'

    // 기존 관리자 계정 확인
    const { data: existingAdmin, error: findError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('email', email)
      .single()

    if (findError || !existingAdmin) {
      console.log('관리자 계정을 찾을 수 없습니다:', email)
      return
    }

    console.log('기존 관리자 계정 정보:')
    console.log('ID:', existingAdmin.id)
    console.log('Email:', existingAdmin.email)
    console.log('Name:', existingAdmin.name)
    console.log('Role ID:', existingAdmin.role_id)
    console.log('Is Active:', existingAdmin.is_active)

    // 새 비밀번호 해시 생성
    const saltRounds = 12
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds)

    // 비밀번호 업데이트
    const { data: updatedAdmin, error: updateError } = await supabase
      .from('admin_users')
      .update({
        password_hash: newPasswordHash,
        password_changed_at: new Date().toISOString(),
        failed_login_attempts: 0,
        locked_until: null
      })
      .eq('email', email)
      .select()
      .single()

    if (updateError) {
      console.error('비밀번호 업데이트 오류:', updateError)
      return
    }

    console.log('관리자 비밀번호가 성공적으로 재설정되었습니다!')
    console.log('이메일:', email)
    console.log('새 비밀번호:', newPassword)

    // 비밀번호 검증
    const isValid = await bcrypt.compare(newPassword, newPasswordHash)
    console.log('비밀번호 검증:', isValid ? '성공' : '실패')

  } catch (error) {
    console.error('오류 발생:', error)
  }
}

resetAdminPassword()