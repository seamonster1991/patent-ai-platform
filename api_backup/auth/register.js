const { createClient } = require('@supabase/supabase-js');

// 환경변수 로드
require('dotenv').config();

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
let supabase = null;

try {
  if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('✅ [auth/register.js] Supabase 클라이언트 초기화 성공');
  } else {
    console.warn('⚠️ [auth/register.js] Supabase 환경변수 누락:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseKey
    });
  }
} catch (error) {
  console.error('❌ [auth/register.js] Supabase 클라이언트 초기화 실패:', error.message);
  supabase = null;
}

module.exports = async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // OPTIONS 요청 처리
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // POST 요청만 허용
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      message: 'Only POST method is allowed'
    });
  }

  try {
    // Supabase 연결 확인
    if (!supabase) {
      console.error('❌ Supabase 클라이언트가 초기화되지 않음');
      return res.status(500).json({
        success: false,
        error: 'Database connection error',
        message: 'Database connection is not available'
      });
    }

    console.log('📝 [auth/register.js] 회원가입 요청 시작');

    // 요청 본문 파싱
    let body;
    if (typeof req.body === 'string') {
      body = JSON.parse(req.body);
    } else {
      body = req.body;
    }

    const { email, password, name, phone, company } = body;

    // 입력 검증
    if (!email || !password || !name || !phone) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: '이메일, 비밀번호, 이름, 전화번호는 필수 입력 항목입니다.'
      });
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: '올바른 이메일 형식을 입력해주세요.'
      });
    }

    // 전화번호 형식 검증 (000-0000-0000)
    const phoneRegex = /^\d{3}-\d{4}-\d{4}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: '전화번호는 000-0000-0000 형식으로 입력해주세요.'
      });
    }

    // 비밀번호 강도 검증
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: '비밀번호는 최소 8자 이상이어야 합니다.'
      });
    }

    console.log('✅ 입력 검증 완료');

    // 사용자 생성 (Supabase Auth)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password: password,
      options: {
        data: {
          name: name.trim(),
          phone: phone.trim(),
          company: company ? company.trim() : null
        }
      }
    });

    if (authError) {
      console.error('Supabase Auth 회원가입 오류:', authError);
      
      // 이미 존재하는 사용자 처리
      if (authError.message.includes('already registered')) {
        return res.status(409).json({
          success: false,
          error: 'User already exists',
          message: '이미 등록된 이메일입니다.'
        });
      }

      return res.status(400).json({
        success: false,
        error: 'Registration failed',
        message: authError.message || '회원가입에 실패했습니다.'
      });
    }

    const user = authData.user;
    if (!user) {
      return res.status(500).json({
        success: false,
        error: 'Registration failed',
        message: '사용자 생성에 실패했습니다.'
      });
    }

    console.log('✅ Supabase Auth 사용자 생성 완료:', user.id);

    // users 테이블에 추가 정보 저장
    const { error: profileError } = await supabase
      .from('users')
      .upsert({
        id: user.id,
        email: user.email,
        name: name.trim(),
        phone: phone.trim(),
        company: company ? company.trim() : null,
        role: 'user',
        subscription_plan: 'free',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (profileError) {
      console.error('사용자 프로필 저장 오류:', profileError);
      
      // Auth 사용자는 생성되었지만 프로필 저장 실패
      // 이 경우 사용자에게 성공 응답을 보내되, 로그에 오류 기록
      console.warn('⚠️ 프로필 저장 실패했지만 Auth 사용자는 생성됨:', user.id);
    } else {
      console.log('✅ 사용자 프로필 저장 완료');
    }

    // 사용자 활동 로그 기록
    try {
      await supabase
        .from('user_activities')
        .insert({
          user_id: user.id,
          activity_type: 'registration',
          activity_data: {
            email: user.email,
            registration_method: 'email'
          },
          created_at: new Date().toISOString()
        });
      console.log('✅ 회원가입 활동 로그 기록 완료');
    } catch (logError) {
      console.warn('⚠️ 활동 로그 기록 실패:', logError.message);
    }

    console.log(`✅ [auth/register.js] 회원가입 완료: ${user.email}`);

    return res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: name.trim(),
          phone: phone.trim(),
          company: company ? company.trim() : null,
          role: 'user',
          subscription_plan: 'free'
        }
      },
      message: '회원가입이 성공적으로 완료되었습니다.'
    });

  } catch (error) {
    console.error('❌ [auth/register.js] 회원가입 처리 실패:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: '회원가입 처리 중 오류가 발생했습니다.'
    });
  }
};