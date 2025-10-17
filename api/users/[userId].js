import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ 
      error: 'Database configuration error',
      details: 'Missing environment variables'
    });
  }

  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ 
      error: 'Missing user ID',
      details: 'User ID is required'
    });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    switch (req.method) {
      case 'GET':
        return await handleGetUser(supabase, req, res, userId);
      case 'PUT':
        return await handleUpdateUser(supabase, req, res, userId);
      case 'DELETE':
        return await handleDeleteUser(supabase, req, res, userId);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('User API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
}

// 사용자 조회
async function handleGetUser(supabase, req, res, userId) {
  const result = await supabase
    .from('users')
    .select(`
      *,
      user_point_balances(balance)
    `)
    .eq('id', userId)
    .single();

  if (result.error) {
    return res.status(404).json({ 
      error: 'User not found',
      details: result.error.message 
    });
  }

  // 추가 통계 정보 조회
  const [searchCount, reportCount] = await Promise.all([
    // 검색 횟수
    supabase
      .from('search_history')
      .select('id', { count: 'exact' })
      .eq('user_id', userId),
    
    // 리포트 생성 횟수
    supabase
      .from('reports')
      .select('id', { count: 'exact' })
      .eq('user_id', userId)
  ]);

  const userData = {
    ...result.data,
    search_count: searchCount.count || 0,
    report_count: reportCount.count || 0,
    point_balance: result.data.user_point_balances?.[0]?.balance || 0
  };

  return res.status(200).json({
    success: true,
    data: userData
  });
}

// 사용자 수정
async function handleUpdateUser(supabase, req, res, userId) {
  const { name, phone, company, position, is_active } = req.body;

  const updateData = {
    updated_at: new Date().toISOString()
  };

  if (name !== undefined) updateData.name = name;
  if (phone !== undefined) updateData.phone = phone;
  if (company !== undefined) updateData.company = company;
  if (position !== undefined) updateData.position = position;
  if (is_active !== undefined) updateData.is_active = is_active;

  const result = await supabase
    .from('users')
    .update(updateData)
    .eq('id', userId)
    .select()
    .single();

  if (result.error) {
    return res.status(500).json({ 
      error: 'Failed to update user',
      details: result.error.message 
    });
  }

  return res.status(200).json({
    success: true,
    data: result.data
  });
}

// 사용자 삭제 (소프트 삭제)
async function handleDeleteUser(supabase, req, res, userId) {
  try {
    // 사용자 존재 확인
    const userCheck = await supabase
      .from('users')
      .select('id, email, name')
      .eq('id', userId)
      .single();

    if (userCheck.error || !userCheck.data) {
      return res.status(404).json({ 
        error: 'User not found',
        details: 'The specified user does not exist'
      });
    }

    // 소프트 삭제 실행
    const result = await supabase
      .from('users')
      .update({
        deleted_at: new Date().toISOString(),
        is_active: false
      })
      .eq('id', userId)
      .select()
      .single();

    if (result.error) {
      return res.status(500).json({ 
        error: 'Failed to delete user',
        details: result.error.message 
      });
    }

    return res.status(200).json({
      success: true,
      message: 'User deleted successfully',
      user_id: userId,
      data: result.data
    });
  } catch (error) {
    console.error('Delete user error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
}