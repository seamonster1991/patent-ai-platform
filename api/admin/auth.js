import { createClient } from '@supabase/supabase-js'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const jwtSecret = process.env.JWT_SECRET || 'patent-ai-admin-jwt-secret-key-2024-development'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export default async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  try {
    const { method } = req
    const path = req.url.split('?')[0]

    // POST /api/admin/auth - 관리자 로그인
    if (method === 'POST' && path.endsWith('/auth')) {
      const { email, password } = req.body

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: '이메일과 비밀번호를 입력해주세요.'
        })
      }

      // 관리자 계정 확인 (role 정보 포함)
      const { data: admin, error: adminError } = await supabase
        .from('admin_users')
        .select(`
          *,
          admin_roles (
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
        return res.status(401).json({
          success: false,
          error: '관리자 계정을 찾을 수 없습니다.'
        })
      }

      // 비밀번호 확인
      const isValidPassword = await bcrypt.compare(password, admin.password_hash)
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          error: '비밀번호가 올바르지 않습니다.'
        })
      }

      // JWT 토큰 생성
      const accessToken = jwt.sign(
        { 
          adminId: admin.id, 
          email: admin.email, 
          role: admin.admin_roles?.name || 'admin'
        },
        jwtSecret,
        { expiresIn: '1h' }
      )

      const refreshToken = jwt.sign(
        { 
          adminId: admin.id, 
          email: admin.email 
        },
        jwtSecret,
        { expiresIn: '7d' }
      )

      // 마지막 로그인 시간 업데이트
      await supabase
        .from('admin_users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', admin.id)

      return res.status(200).json({
        success: true,
        data: {
          access_token: accessToken,
          refresh_token: refreshToken,
          admin: {
            id: admin.id,
            email: admin.email,
            name: admin.name,
            role: admin.admin_roles?.name || 'admin',
            permissions: admin.admin_roles?.permissions || []
          }
        }
      })
    }

    // GET /api/admin/auth/me - 현재 관리자 정보 조회
    if (method === 'GET' && path.endsWith('/auth/me')) {
      const authHeader = req.headers.authorization
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          error: '인증 토큰이 필요합니다.'
        })
      }

      const token = authHeader.substring(7)
      
      try {
        const decoded = jwt.verify(token, jwtSecret)
        
        // 관리자 정보 조회 (role 정보 포함)
        const { data: admin, error: adminError } = await supabase
          .from('admin_users')
          .select(`
            id, email, name, is_active, created_at, last_login_at,
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

        if (adminError || !admin) {
          return res.status(401).json({
            success: false,
            error: '관리자 계정을 찾을 수 없습니다.'
          })
        }

        return res.status(200).json({
          success: true,
          data: {
            admin: {
              ...admin,
              role: admin.admin_roles?.name || 'admin',
              permissions: admin.admin_roles?.permissions || []
            }
          }
        })
      } catch (jwtError) {
        return res.status(401).json({
          success: false,
          error: '유효하지 않은 토큰입니다.'
        })
      }
    }

    // POST /api/admin/auth/refresh - 토큰 갱신
    if (method === 'POST' && path.endsWith('/auth/refresh')) {
      const { refresh_token } = req.body

      if (!refresh_token) {
        return res.status(400).json({
          success: false,
          error: '리프레시 토큰이 필요합니다.'
        })
      }

      try {
        const decoded = jwt.verify(refresh_token, jwtSecret)
        
        // 관리자 정보 확인 (role 정보 포함)
        const { data: admin, error: adminError } = await supabase
          .from('admin_users')
          .select(`
            *,
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

        if (adminError || !admin) {
          return res.status(401).json({
            success: false,
            error: '관리자 계정을 찾을 수 없습니다.'
          })
        }

        // 새 액세스 토큰 생성
        const accessToken = jwt.sign(
          { 
            adminId: admin.id, 
            email: admin.email, 
            role: admin.admin_roles?.name || 'admin' 
          },
          jwtSecret,
          { expiresIn: '1h' }
        )

        return res.status(200).json({
          success: true,
          data: {
            access_token: accessToken
          }
        })
      } catch (jwtError) {
        return res.status(401).json({
          success: false,
          error: '유효하지 않은 리프레시 토큰입니다.'
        })
      }
    }

    // POST /api/admin/auth/logout - 로그아웃
    if (method === 'POST' && path.endsWith('/auth/logout')) {
      // 클라이언트에서 토큰을 삭제하도록 응답
      return res.status(200).json({
        success: true,
        message: '로그아웃되었습니다.'
      })
    }

    return res.status(404).json({
      success: false,
      error: 'API 엔드포인트를 찾을 수 없습니다.'
    })

  } catch (error) {
    console.error('Admin auth API error:', error)
    return res.status(500).json({
      success: false,
      error: '서버 오류가 발생했습니다.'
    })
  }
}