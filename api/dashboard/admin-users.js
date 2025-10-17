import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
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

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    switch (req.method) {
      case 'GET':
        return await handleGetUsers(supabase, req, res);
      case 'POST':
        return await handleCreateUser(supabase, req, res);
      case 'PUT':
        return await handleUpdateUser(supabase, req, res);
      case 'DELETE':
        return await handleDeleteUser(supabase, req, res);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Admin users API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
}

// 사용자 목록 조회
async function handleGetUsers(supabase, req, res) {
  const { 
    page = 1, 
    limit = 20, 
    search = '', 
    status = 'all',
    sort_by = 'created_at',
    sort_order = 'desc'
  } = req.query;

  const offset = (parseInt(page) - 1) * parseInt(limit);

  // 기본 쿼리 구성
  let query = supabase
    .from('users')
    .select(`
      id,
      email,
      name,
      phone,
      company,
      role,
      subscription_plan,
      created_at,
      updated_at,
      deleted_at,
      last_login_at,
      total_logins,
      total_searches,
      total_reports
    `, { count: 'exact' });

  // 검색 조건 적용
  if (search) {
    query = query.or(`email.ilike.%${search}%,name.ilike.%${search}%,company.ilike.%${search}%`);
  }

  // 상태 필터 적용
  if (status === 'active') {
    query = query.is('deleted_at', null).eq('is_active', true);
  } else if (status === 'inactive') {
    query = query.is('deleted_at', null).eq('is_active', false);
  } else if (status === 'deleted') {
    query = query.not('deleted_at', 'is', null);
  } else if (status === 'all') {
    // 모든 사용자 (삭제된 사용자 제외)
    query = query.is('deleted_at', null);
  }

  // 정렬 적용
  query = query.order(sort_by, { ascending: sort_order === 'asc' });

  // 페이지네이션 적용
  query = query.range(offset, offset + parseInt(limit) - 1);

  const result = await query;

  if (result.error) {
    return res.status(500).json({ error: result.error.message });
  }

  // 각 사용자의 추가 통계 정보 조회
  const usersWithStats = await Promise.all(
    result.data.map(async (user) => {
      const [searchCount, reportCount, pointBalance] = await Promise.all([
        // 검색 횟수
        supabase
          .from('search_history')
          .select('id', { count: 'exact' })
          .eq('user_id', user.id),
        
        // 리포트 생성 횟수
        supabase
          .from('reports')
          .select('id', { count: 'exact' })
          .eq('user_id', user.id),
        
        // 포인트 잔액
        supabase
          .from('user_point_balances')
          .select('balance')
          .eq('user_id', user.id)
          .single()
      ]);

      return {
        ...user,
        search_count: searchCount.count || 0,
        report_count: reportCount.count || 0,
        point_balance: pointBalance.data?.balance || 0
      };
    })
  );

  return res.status(200).json({
    success: true,
    data: {
      users: usersWithStats,
      total_count: result.count,
      page: parseInt(page),
      limit: parseInt(limit),
      total_pages: Math.ceil(result.count / parseInt(limit))
    }
  });
}

// 사용자 생성
async function handleCreateUser(supabase, req, res) {
  const { email, name, phone, company, position, password } = req.body;

  if (!email || !name || !password) {
    return res.status(400).json({ 
      error: 'Missing required fields',
      details: 'Email, name, and password are required'
    });
  }

  // 이메일 중복 확인
  const existingUser = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .single();

  if (existingUser.data) {
    return res.status(409).json({ 
      error: 'Email already exists',
      details: 'A user with this email already exists'
    });
  }

  // 사용자 생성
  const result = await supabase
    .from('users')
    .insert({
      email,
      name,
      phone,
      company,
      position,
      password_hash: password, // 실제로는 해시화 필요
      is_active: true,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (result.error) {
    return res.status(500).json({ error: result.error.message });
  }

  // 포인트 잔액 초기화
  await supabase
    .from('user_point_balances')
    .insert({
      user_id: result.data.id,
      balance: 0,
      created_at: new Date().toISOString()
    });

  return res.status(201).json({
    success: true,
    data: result.data
  });
}

// 사용자 수정
async function handleUpdateUser(supabase, req, res) {
  const { user_id, name, phone, company, position, is_active } = req.body;

  if (!user_id) {
    return res.status(400).json({ 
      error: 'Missing user_id',
      details: 'User ID is required for update'
    });
  }

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
    .eq('id', user_id)
    .select()
    .single();

  if (result.error) {
    return res.status(500).json({ error: result.error.message });
  }

  return res.status(200).json({
    success: true,
    data: result.data
  });
}

// 사용자 삭제 (소프트 삭제)
async function handleDeleteUser(supabase, req, res) {
  const { user_id } = req.body;

  if (!user_id) {
    return res.status(400).json({ 
      error: 'Missing user_id',
      details: 'User ID is required for deletion'
    });
  }

  const result = await supabase
    .from('users')
    .update({
      deleted_at: new Date().toISOString()
    })
    .eq('id', user_id)
    .select()
    .single();

  if (result.error) {
    return res.status(500).json({ error: result.error.message });
  }

  return res.status(200).json({
    success: true,
    message: 'User deleted successfully',
    data: result.data
  });
}