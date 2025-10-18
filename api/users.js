// Users API - 사용자 관련 모든 기능 통합
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

// 공통 헤더 설정
function setCommonHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
}

// 사용자 조회
async function handleGetUser(req, res, userId) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return res.status(404).json({ 
        error: 'User not found',
        details: 'The specified user does not exist'
      });
    }

    // 민감한 정보 제거
    const { password_hash, ...safeUser } = user;

    return res.status(200).json({
      success: true,
      data: safeUser
    });

  } catch (error) {
    console.error('Get user error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
}

// 사용자 정보 업데이트
async function handleUpdateUser(req, res, userId) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const updateData = req.body;
    
    // 업데이트 불가능한 필드 제거
    const { id, created_at, password_hash: excludedPasswordHash, ...allowedUpdates } = updateData;

    const { data: updatedUser, error } = await supabase
      .from('users')
      .update({
        ...allowedUpdates,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Update user error:', error);
      return res.status(500).json({
        error: 'Failed to update user',
        details: error.message
      });
    }

    // 민감한 정보 제거
    const { password_hash: userPasswordHash, ...safeUser } = updatedUser;

    return res.status(200).json({
      success: true,
      data: safeUser
    });

  } catch (error) {
    console.error('Update user error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
}

// 사용자 삭제 (소프트 삭제)
async function handleDeleteUser(req, res, userId) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { data: deletedUser, error } = await supabase
      .from('users')
      .update({
        deleted_at: new Date().toISOString(),
        is_active: false
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Delete user error:', error);
      return res.status(500).json({
        error: 'Failed to delete user',
        details: error.message
      });
    }

    return res.status(200).json({
      success: true,
      message: 'User deleted successfully',
      data: { id: userId, deleted_at: deletedUser.deleted_at }
    });

  } catch (error) {
    console.error('Delete user error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
}

// 사용자 복원
async function handleRestoreUser(req, res, userId) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // 삭제된 사용자 확인
    const { data: userCheck, error: checkError } = await supabase
      .from('users')
      .select('id, email, name, deleted_at')
      .eq('id', userId)
      .single();

    if (checkError || !userCheck) {
      return res.status(404).json({ 
        error: 'User not found',
        details: 'The specified user does not exist'
      });
    }

    if (!userCheck.deleted_at) {
      return res.status(400).json({ 
        error: 'User not deleted',
        details: 'The user is not in deleted state'
      });
    }

    // 사용자 복원
    const { data: restoredUser, error } = await supabase
      .from('users')
      .update({
        deleted_at: null,
        is_active: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Restore user error:', error);
      return res.status(500).json({
        error: 'Failed to restore user',
        details: error.message
      });
    }

    return res.status(200).json({
      success: true,
      message: 'User restored successfully',
      data: {
        id: restoredUser.id,
        email: restoredUser.email,
        name: restoredUser.name,
        restored_at: restoredUser.updated_at
      }
    });

  } catch (error) {
    console.error('Restore user error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
}

// 사용자 프로필 조회/업데이트
async function handleProfile(req, res, userId) {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  try {
    if (req.method === 'GET') {
      console.log('👤 [API] 사용자 프로필 조회:', userId);

      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('프로필 조회 오류:', error);
        return res.status(500).json({
          success: false,
          error: '프로필 조회에 실패했습니다.'
        });
      }

      if (!profile) {
        return res.status(404).json({
          success: false,
          error: '사용자 프로필을 찾을 수 없습니다.'
        });
      }

      // 민감한 정보 제거
      const { password_hash: profilePasswordHash, ...safeProfile } = profile;

      return res.status(200).json({
        success: true,
        data: safeProfile
      });

    } else if (req.method === 'PUT') {
      console.log('👤 [API] 사용자 프로필 업데이트:', userId);

      const updateData = req.body;
      const { id, created_at, password_hash: updatePasswordHash, ...allowedUpdates } = updateData;

      const { data: updatedProfile, error } = await supabase
        .from('users')
        .update({
          ...allowedUpdates,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        console.error('프로필 업데이트 오류:', error);
        return res.status(500).json({
          success: false,
          error: '프로필 업데이트에 실패했습니다.'
        });
      }

      // 민감한 정보 제거
      const { password_hash: updatedProfilePasswordHash, ...safeProfile } = updatedProfile;

      return res.status(200).json({
        success: true,
        data: safeProfile
      });
    }

  } catch (error) {
    console.error('Profile API error:', error);
    return res.status(500).json({
      success: false,
      error: '서버 오류가 발생했습니다.'
    });
  }
}

export default async function handler(req, res) {
  setCommonHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;
    const searchParams = url.searchParams;

    // userId 추출
    const userId = searchParams.get('userId') || req.query.userId;

    if (!userId) {
      return res.status(400).json({ 
        error: 'Missing user ID',
        details: 'User ID is required'
      });
    }

    // 라우팅 처리
    if (pathname.endsWith('/users')) {
      const action = searchParams.get('action');
      
      switch (action) {
        case 'profile':
          return await handleProfile(req, res, userId);
        case 'restore':
          if (req.method === 'POST') {
            return await handleRestoreUser(req, res, userId);
          }
          break;
        default:
          // 기본 CRUD 작업
          switch (req.method) {
            case 'GET':
              return await handleGetUser(req, res, userId);
            case 'PUT':
              return await handleUpdateUser(req, res, userId);
            case 'DELETE':
              return await handleDeleteUser(req, res, userId);
          }
      }
    }

    return res.status(404).json({
      success: false,
      error: 'API 엔드포인트를 찾을 수 없습니다.'
    });

  } catch (error) {
    console.error('Users API error:', error);
    return res.status(500).json({
      success: false,
      error: '서버 오류가 발생했습니다.'
    });
  }
}