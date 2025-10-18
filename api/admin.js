import { createClient } from '@supabase/supabase-js'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const jwtSecret = process.env.JWT_SECRET || 'patent-ai-admin-jwt-secret-key-2024-development'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// 공통 헤더 설정
function setCommonHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
}

// JWT 토큰 검증
function verifyAdminToken(token) {
  try {
    return jwt.verify(token, jwtSecret)
  } catch (error) {
    return null
  }
}

// 관리자 인증 처리
async function handleAuth(req, res) {
  console.log('🔐 [Admin Auth] 로그인 시도:', { email: req.body?.email, hasPassword: !!req.body?.password })
  
  const { email, password } = req.body

  if (!email || !password) {
    console.log('❌ [Admin Auth] 이메일 또는 비밀번호 누락')
    return res.status(400).json({
      success: false,
      error: '이메일과 비밀번호를 입력해주세요.'
    })
  }

  try {
    // 관리자 계정 확인 (role 정보 포함)
    const { data: admin, error: adminError } = await supabase
      .from('admin_users')
      .select(`
        id,
        email,
        password_hash,
        name,
        role_id,
        is_active,
        last_login_at,
        created_at,
        admin_roles!admin_users_role_id_fkey (
          id,
          name,
          description,
          permissions
        )
      `)
      .eq('email', email)
      .eq('is_active', true)
      .single()

    if (adminError || !admin) {
      console.log('❌ [Admin Auth] 관리자 계정을 찾을 수 없음:', adminError)
      return res.status(401).json({
        success: false,
        error: '관리자 계정을 찾을 수 없습니다.'
      })
    }
    
    console.log('✅ [Admin Auth] 관리자 계정 찾음:', { id: admin.id, email: admin.email })

    // 비밀번호 확인
    console.log('🔑 [Admin Auth] 비밀번호 검증 중...')
    const isValidPassword = await bcrypt.compare(password, admin.password_hash)
    if (!isValidPassword) {
      console.log('❌ [Admin Auth] 비밀번호 불일치')
      return res.status(401).json({
        success: false,
        error: '비밀번호가 올바르지 않습니다.'
      })
    }
    
    console.log('✅ [Admin Auth] 비밀번호 검증 성공')

    // JWT 토큰 생성
    const accessToken = jwt.sign(
      { 
        adminId: admin.id, 
        email: admin.email,
        role: admin.admin_roles?.name || 'admin'
      },
      jwtSecret,
      { expiresIn: '24h' }
    )

    const refreshToken = jwt.sign(
      { adminId: admin.id },
      jwtSecret,
      { expiresIn: '7d' }
    )

    // 마지막 로그인 시간 업데이트
    await supabase
      .from('admin_users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', admin.id)

    // 로그인 로그 기록
    await supabase
      .from('admin_login_logs')
      .insert({
        admin_id: admin.id,
        ip_address: req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip || 'unknown',
        user_agent: req.headers['user-agent'],
        login_at: new Date().toISOString()
      })

    return res.status(200).json({
      success: true,
      data: {
        admin: {
          id: admin.id,
          email: admin.email,
          name: admin.name,
          role: admin.admin_roles?.name || 'admin',
          permissions: admin.admin_roles?.permissions || []
        },
        access_token: accessToken,
        refresh_token: refreshToken
      }
    })

  } catch (error) {
    console.error('Admin login error:', error)
    return res.status(500).json({
      success: false,
      error: '로그인 처리 중 오류가 발생했습니다.'
    })
  }
}

// 관리자 정보 조회
async function handleMe(req, res) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: '인증 토큰이 필요합니다.'
    })
  }

  const token = authHeader.substring(7)
  const decoded = verifyAdminToken(token)

  if (!decoded) {
    return res.status(401).json({
      success: false,
      error: '유효하지 않은 토큰입니다.'
    })
  }

  try {
    const { data: admin, error } = await supabase
      .from('admin_users')
      .select(`
        id,
        email,
        name,
        is_active,
        created_at,
        last_login_at,
        admin_roles (
          id,
          name,
          description,
          permissions
        )
      `)
      .eq('id', decoded.adminId)
      .eq('is_active', true)
      .single()

    if (error || !admin) {
      return res.status(404).json({
        success: false,
        error: '관리자 정보를 찾을 수 없습니다.'
      })
    }

    return res.status(200).json({
      success: true,
      data: {
        admin: {
          id: admin.id,
          email: admin.email,
          name: admin.name,
          role: admin.admin_roles?.name || 'admin',
          permissions: admin.admin_roles?.permissions || [],
          last_login_at: admin.last_login_at,
          created_at: admin.created_at
        }
      }
    })

  } catch (error) {
    console.error('Get admin info error:', error)
    return res.status(500).json({
      success: false,
      error: '관리자 정보 조회 중 오류가 발생했습니다.'
    })
  }
}

// 포인트 관리 처리
async function handlePointManagement(req, res) {
  const { userId, amount, type, reason, adminId } = req.body

  // 입력값 검증
  if (!userId || !amount || !type || !reason || !adminId) {
    return res.status(400).json({ error: '필수 파라미터가 누락되었습니다.' })
  }

  if (type !== 'add' && type !== 'subtract') {
    return res.status(400).json({ error: '유효하지 않은 타입입니다. (add 또는 subtract)' })
  }

  if (amount <= 0) {
    return res.status(400).json({ error: '포인트는 0보다 커야 합니다.' })
  }

  try {
    // 현재 사용자 포인트 조회
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('point_balance')
      .eq('id', userId)
      .single()

    if (userError || !currentUser) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' })
    }

    const currentBalance = currentUser.point_balance || 0
    let newBalance

    if (type === 'add') {
      newBalance = currentBalance + amount
    } else {
      newBalance = Math.max(0, currentBalance - amount)
    }

    // 포인트 업데이트
    const { error: updateError } = await supabase
      .from('users')
      .update({ point_balance: newBalance })
      .eq('id', userId)

    if (updateError) {
      throw updateError
    }

    // 포인트 히스토리 기록
    const { error: historyError } = await supabase
      .from('point_transactions')
      .insert({
        user_id: userId,
        amount: type === 'add' ? amount : -amount,
        type: type === 'add' ? 'admin_grant' : 'admin_deduct',
        description: reason,
        admin_id: adminId,
        created_at: new Date().toISOString()
      })

    if (historyError) {
      console.error('포인트 히스토리 기록 실패:', historyError)
    }

    return res.status(200).json({
      success: true,
      data: {
        userId,
        previousBalance: currentBalance,
        newBalance,
        amount,
        type,
        reason
      }
    })

  } catch (error) {
    console.error('포인트 관리 오류:', error)
    return res.status(500).json({ error: '포인트 관리 중 오류가 발생했습니다.' })
  }
}

async function handler(req, res) {
  console.log('🚀 [Admin API] 요청 시작:', { method: req.method, url: req.url })
  setCommonHeaders(res)

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  try {
    const { method } = req
    const url = new URL(req.url, `http://${req.headers.host}`)
    const pathname = url.pathname
    const searchParams = url.searchParams
    
    console.log('🔍 [Admin API] 요청 분석:', { method, pathname, action: searchParams.get('action') })

    // Express already parses the body, so we don't need to parse it again
    if (!req.body) {
      req.body = {}
    }

    // 라우팅 처리
    if (method === 'POST' && pathname.endsWith('/admin')) {
      const action = searchParams.get('action')
      
      switch (action) {
        case 'auth':
        case 'login':
          return await handleAuth(req, res)
        case 'point-management':
          return await handlePointManagement(req, res)
        default:
          return await handleAuth(req, res) // 기본값은 로그인
      }
    }

    if (method === 'GET' && pathname.endsWith('/admin')) {
      const action = searchParams.get('action')
      
      if (action === 'me') {
        return await handleMe(req, res)
      }
    }

    return res.status(404).json({
      success: false,
      error: 'API 엔드포인트를 찾을 수 없습니다.'
    })

  } catch (error) {
    console.error('❌ [Admin API] 서버 에러:', error)
    console.error('❌ [Admin API] 에러 스택:', error.stack)
    return res.status(500).json({
      success: false,
      error: '서버 오류가 발생했습니다.'
    })
  }
}

export default handler;