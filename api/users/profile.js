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
    console.log('✅ [users/profile.js] Supabase 클라이언트 초기화 성공');
  } else {
    console.warn('⚠️ [users/profile.js] Supabase 환경변수 누락:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseKey
    });
  }
} catch (error) {
  console.error('❌ [users/profile.js] Supabase 클라이언트 초기화 실패:', error.message);
  supabase = null;
}

module.exports = async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // OPTIONS 요청 처리
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
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

    // URL에서 userId 추출
    const { searchParams } = new URL(req.url, `http://${req.headers.host}`);
    const userId = searchParams.get('userId');

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId가 필요합니다.'
      });
    }

    console.log(`👤 [users/profile.js] 프로필 요청: ${req.method} - ${userId}`);

    // GET 요청: 프로필 조회
    if (req.method === 'GET') {
      return await getProfile(userId, res);
    }

    // PUT 요청: 프로필 업데이트
    if (req.method === 'PUT') {
      return await updateProfile(userId, req, res);
    }

    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      message: 'Only GET and PUT methods are allowed'
    });

  } catch (error) {
    console.error('❌ [users/profile.js] API 오류:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
};

// 프로필 조회
async function getProfile(userId, res) {
  try {
    console.log(`📋 프로필 조회 시작: ${userId}`);

    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name, phone, company, bio, role, subscription_plan, created_at, updated_at')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('프로필 조회 오류:', error);
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: '사용자를 찾을 수 없습니다.'
      });
    }

    console.log(`✅ 프로필 조회 완료: ${userId}`);

    return res.status(200).json({
      success: true,
      data: {
        profile: user
      }
    });

  } catch (error) {
    console.error('프로필 조회 실패:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get profile',
      message: '프로필 조회에 실패했습니다.'
    });
  }
}

// 프로필 업데이트
async function updateProfile(userId, req, res) {
  try {
    console.log(`📝 프로필 업데이트 시작: ${userId}`);
    console.log(`🔗 Supabase 연결 상태:`, !!supabase);
    console.log(`📨 요청 본문 타입:`, typeof req.body);
    console.log(`📨 요청 본문:`, req.body);

    // 요청 본문 파싱
    let body;
    if (typeof req.body === 'string') {
      body = JSON.parse(req.body);
    } else {
      body = req.body;
    }

    console.log(`📋 파싱된 데이터:`, body);
    const { name, phone, company, bio } = body;

    // 입력 검증: 이름만 필수, 전화번호는 선택 입력
    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: '이름은 필수 입력 항목입니다.'
      });
    }

    // 전화번호 정규화: 입력값에서 숫자만 남기고 3-4-4 형식으로 변환 (선택 입력)
    let normalizedPhone = null;
    if (phone !== undefined && phone !== null) {
      const digitsOnly = String(phone).replace(/\D/g, '');
      if (digitsOnly.length === 11) {
        normalizedPhone = `${digitsOnly.slice(0,3)}-${digitsOnly.slice(3,7)}-${digitsOnly.slice(7)}`;
      } else {
        // 형식 불일치 시 업데이트에서 제외 (오류 반환하지 않음)
        console.warn('⚠️ 전화번호 형식 불일치, 업데이트에서 제외');
      }
    }

    // 업데이트할 데이터 준비
    const updateData = {
      name: name.trim(),
      updated_at: new Date().toISOString()
    };

    // 전화번호가 정상적으로 정규화된 경우에만 업데이트에 포함
    if (normalizedPhone) {
      updateData.phone = normalizedPhone;
    }

    // 선택적 필드 추가
    if (company !== undefined) {
      updateData.company = company ? company.trim() : null;
    }
    if (bio !== undefined) {
      updateData.bio = bio ? bio.trim() : null;
    }

    console.log('업데이트 데이터:', updateData);

    // 데이터베이스 업데이트
    const { data: updatedUser, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select('id, email, name, phone, company, bio, role, subscription_plan, created_at, updated_at')
      .single();

    if (error) {
      console.error('프로필 업데이트 오류:', error);
      
      // 제약 조건 위반 처리: 전화번호 형식 오류는 비치명적으로 처리
      if (error.code === '23514') {
        console.warn('⚠️ 전화번호 제약 조건 위반, 전화번호 필드 제외 후 재시도')
        
        // 전화번호 제외하고 다른 필드만 업데이트
        const retryUpdateData = {
          name: name.trim(),
          updated_at: new Date().toISOString()
        };
        
        if (company !== undefined) {
          retryUpdateData.company = company ? company.trim() : null;
        }
        if (bio !== undefined) {
          retryUpdateData.bio = bio ? bio.trim() : null;
        }
        
        const { data: updatedUser2, error: retryError } = await supabase
          .from('users')
          .update(retryUpdateData)
          .eq('id', userId)
          .select('id, email, name, phone, company, bio, role, subscription_plan, created_at, updated_at')
          .single();

        if (!retryError) {
          return res.status(200).json({
            success: true,
            data: { profile: updatedUser2 },
            message: '프로필이 성공적으로 업데이트되었습니다. (전화번호는 형식 불일치로 업데이트되지 않음)'
          });
        }
        
        console.error('재시도 후에도 업데이트 실패:', retryError);
      }

      // 구체적인 에러 메시지 제공
      let errorMessage = '프로필 업데이트에 실패했습니다.';
      if (error.code === '23505') {
        errorMessage = '이미 사용 중인 정보입니다.';
      } else if (error.code === '23514') {
        errorMessage = '입력 형식이 올바르지 않습니다.';
      } else if (error.message) {
        errorMessage = `데이터베이스 오류: ${error.message}`;
      }

      return res.status(500).json({
        success: false,
        error: 'Database error',
        message: errorMessage
      });
    }

    console.log(`✅ 프로필 업데이트 완료: ${userId}`);

    return res.status(200).json({
      success: true,
      data: {
        profile: updatedUser
      },
      message: '프로필이 성공적으로 업데이트되었습니다.'
    });

  } catch (error) {
    console.error('프로필 업데이트 실패:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update profile',
      message: '프로필 업데이트에 실패했습니다.'
    });
  }
}