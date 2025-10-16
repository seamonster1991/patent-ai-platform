// 사용자 프로필 조회 및 업데이트 API
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

export default async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const { userId } = req.query

  if (!userId) {
    return res.status(400).json({
      success: false,
      error: 'userId가 필요합니다.'
    })
  }

  try {
    if (req.method === 'GET') {
      // 프로필 조회
      console.log('👤 [API] 사용자 프로필 조회:', userId)

      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('프로필 조회 오류:', error)
        return res.status(500).json({
          success: false,
          error: '프로필 조회에 실패했습니다.'
        })
      }

      if (!profile) {
        return res.status(404).json({
          success: false,
          error: '사용자 프로필을 찾을 수 없습니다.'
        })
      }

      return res.status(200).json({
        success: true,
        data: { profile }
      })

    } else if (req.method === 'PUT') {
      // 프로필 업데이트
      console.log('📝 [API] 사용자 프로필 업데이트:', userId)
      console.log('📝 [API] 업데이트 데이터:', req.body)

      const { name, phone, company, bio } = req.body

      // 필수 필드 검증
      if (!name || !phone) {
        return res.status(400).json({
          success: false,
          error: '이름과 전화번호는 필수 항목입니다.'
        })
      }

      // 전화번호 형식 검증 (한국 전화번호)
      const phoneRegex = /^01[0-9]-\d{3,4}-\d{4}$/
      if (!phoneRegex.test(phone)) {
        return res.status(400).json({
          success: false,
          error: '올바른 전화번호 형식이 아닙니다. (예: 010-1234-5678)'
        })
      }

      // 이름 길이 검증
      if (name.length < 2 || name.length > 50) {
        return res.status(400).json({
          success: false,
          error: '이름은 2자 이상 50자 이하로 입력해주세요.'
        })
      }

      const updateData = {
        name: name.trim(),
        phone: phone.trim(),
        company: company ? company.trim() : null,
        bio: bio ? bio.trim() : null,
        updated_at: new Date().toISOString()
      }

      const { data: updatedProfile, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId)
        .select('*')
        .single()

      if (error) {
        console.error('프로필 업데이트 오류:', error)
        return res.status(500).json({
          success: false,
          error: '프로필 업데이트에 실패했습니다.'
        })
      }

      if (!updatedProfile) {
        return res.status(404).json({
          success: false,
          error: '사용자를 찾을 수 없습니다.'
        })
      }

      console.log('✅ [API] 프로필 업데이트 성공:', updatedProfile)

      return res.status(200).json({
        success: true,
        message: '프로필이 성공적으로 업데이트되었습니다.',
        data: { profile: updatedProfile }
      })

    } else {
      return res.status(405).json({
        success: false,
        error: '지원하지 않는 HTTP 메서드입니다.'
      })
    }

  } catch (error) {
    console.error('❌ [API] 프로필 API 오류:', error)
    return res.status(500).json({
      success: false,
      error: '서버 내부 오류가 발생했습니다.'
    })
  }
}