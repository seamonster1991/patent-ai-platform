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
    console.log('✅ [auth/reset-password.js] Supabase 클라이언트 초기화 성공');
  } else {
    console.warn('⚠️ [auth/reset-password.js] Supabase 환경변수 누락:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseKey
    });
  }
} catch (error) {
  console.error('❌ [auth/reset-password.js] Supabase 클라이언트 초기화 실패:', error.message);
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

    console.log('🔐 [auth/reset-password.js] 비밀번호 재설정 요청 시작');

    // 요청 본문 파싱
    let body;
    if (typeof req.body === 'string') {
      body = JSON.parse(req.body);
    } else {
      body = req.body;
    }

    const { email } = body;

    // 입력 검증
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: '이메일을 입력해주세요.'
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

    console.log('✅ 입력 검증 완료:', email);

    // 사용자 존재 여부 확인
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', email.trim().toLowerCase())
      .single();

    if (userError || !userData) {
      console.log('⚠️ 사용자를 찾을 수 없음:', email);
      // 보안상 사용자 존재 여부를 노출하지 않음
      return res.status(200).json({
        success: true,
        message: '비밀번호 재설정 링크가 이메일로 전송되었습니다. 이메일을 확인해주세요.'
      });
    }

    console.log('✅ 사용자 확인 완료:', userData.id);

    // Supabase Auth를 통한 비밀번호 재설정 이메일 발송
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      {
        redirectTo: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password`
      }
    );

    if (resetError) {
      console.error('비밀번호 재설정 이메일 발송 오류:', resetError);
      
      // 일반적인 오류 메시지 반환 (보안상 구체적인 오류 노출 안함)
      return res.status(500).json({
        success: false,
        error: 'Reset email failed',
        message: '비밀번호 재설정 이메일 발송에 실패했습니다. 잠시 후 다시 시도해주세요.'
      });
    }

    // 사용자 활동 로그 기록
    try {
      await supabase
        .from('user_activities')
        .insert({
          user_id: userData.id,
          activity_type: 'password_reset_request',
          activity_data: {
            email: email.trim().toLowerCase(),
            request_time: new Date().toISOString()
          },
          created_at: new Date().toISOString()
        });
      console.log('✅ 비밀번호 재설정 요청 활동 로그 기록 완료');
    } catch (logError) {
      console.warn('⚠️ 활동 로그 기록 실패:', logError.message);
    }

    console.log(`✅ [auth/reset-password.js] 비밀번호 재설정 이메일 발송 완료: ${email}`);

    return res.status(200).json({
      success: true,
      message: '비밀번호 재설정 링크가 이메일로 전송되었습니다. 이메일을 확인해주세요.'
    });

  } catch (error) {
    console.error('❌ [auth/reset-password.js] 비밀번호 재설정 처리 실패:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: '비밀번호 재설정 처리 중 오류가 발생했습니다.'
    });
  }
};