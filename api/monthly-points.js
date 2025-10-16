// 월간 자동 포인트 지급 API
// 경로: /api/monthly-points
// 설명: 월간 포인트 지급 관리 및 스케줄링

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { action } = req.query;

    // 관리자 권한 확인 (스케줄러 제외)
    if (action !== 'scheduler') {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or invalid authorization header' });
      }

      const token = authHeader.split(' ')[1];
      
      // 사용자 인증 확인
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user) {
        return res.status(401).json({ error: 'Invalid token or user not found' });
      }

      // 관리자 권한 확인
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (userError || !userData || userData.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }
    }

    // 액션에 따른 처리 분기
    switch (action) {
      case 'grant-all':
        return await handleGrantAll(req, res);
      case 'grant-user':
        return await handleGrantUser(req, res);
      case 'status':
        return await handleStatus(req, res);
      case 'scheduler':
        return await handleScheduler(req, res);
      case 'history':
        return await handleHistory(req, res);
      default:
        return res.status(400).json({ 
          error: 'Invalid action. Use grant-all, grant-user, status, scheduler, or history' 
        });
    }

  } catch (error) {
    console.error('Monthly points API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}

// 모든 적격 사용자에게 월간 포인트 지급
async function handleGrantAll(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed for grant-all' });
  }

  try {
    const { grant_month } = req.body;
    
    const { data, error } = await supabase
      .rpc('grant_monthly_points_to_all', { 
        p_grant_month: grant_month || null 
      });

    if (error) {
      console.error('Grant all monthly points error:', error);
      return res.status(500).json({ 
        error: 'Failed to grant monthly points to all users',
        details: error.message 
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Monthly points granted to all eligible users',
      data: data
    });

  } catch (error) {
    console.error('Grant all monthly points error:', error);
    return res.status(500).json({ 
      error: 'Failed to grant monthly points to all users',
      details: error.message 
    });
  }
}

// 특정 사용자에게 월간 포인트 지급
async function handleGrantUser(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed for grant-user' });
  }

  try {
    const { user_id, grant_month } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }

    const { data, error } = await supabase
      .rpc('grant_monthly_points', { 
        p_user_id: user_id,
        p_grant_month: grant_month || null 
      });

    if (error) {
      console.error('Grant monthly points error:', error);
      return res.status(500).json({ 
        error: 'Failed to grant monthly points',
        details: error.message 
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Monthly points granted successfully',
      data: data
    });

  } catch (error) {
    console.error('Grant monthly points error:', error);
    return res.status(500).json({ 
      error: 'Failed to grant monthly points',
      details: error.message 
    });
  }
}

// 월간 포인트 지급 상태 확인
async function handleStatus(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed for status' });
  }

  try {
    const { grant_month } = req.query;

    const { data, error } = await supabase
      .rpc('check_monthly_point_grants_status', { 
        p_grant_month: grant_month || null 
      });

    if (error) {
      console.error('Check monthly points status error:', error);
      return res.status(500).json({ 
        error: 'Failed to check monthly points status',
        details: error.message 
      });
    }

    return res.status(200).json({
      success: true,
      data: data
    });

  } catch (error) {
    console.error('Check monthly points status error:', error);
    return res.status(500).json({ 
      error: 'Failed to check monthly points status',
      details: error.message 
    });
  }
}

// 스케줄러 (cron job용)
async function handleScheduler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed for scheduler' });
  }

  try {
    // 스케줄러 보안 키 확인 (선택사항)
    const schedulerKey = req.headers['x-scheduler-key'];
    if (process.env.SCHEDULER_SECRET_KEY && schedulerKey !== process.env.SCHEDULER_SECRET_KEY) {
      return res.status(401).json({ error: 'Invalid scheduler key' });
    }

    const { data, error } = await supabase
      .rpc('monthly_point_grant_scheduler');

    if (error) {
      console.error('Monthly point grant scheduler error:', error);
      return res.status(500).json({ 
        error: 'Failed to run monthly point grant scheduler',
        details: error.message 
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Monthly point grant scheduler executed successfully',
      data: data
    });

  } catch (error) {
    console.error('Monthly point grant scheduler error:', error);
    return res.status(500).json({ 
      error: 'Failed to run monthly point grant scheduler',
      details: error.message 
    });
  }
}

// 월간 포인트 지급 기록 조회
async function handleHistory(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed for history' });
  }

  try {
    const { 
      page = 1, 
      limit = 20, 
      user_id,
      grant_month,
      start_date,
      end_date
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = supabase
      .from('monthly_point_grants')
      .select(`
        id,
        user_id,
        grant_month,
        points_granted,
        granted_at,
        grant_type,
        status,
        created_at
      `)
      .order('granted_at', { ascending: false });

    if (user_id) {
      query = query.eq('user_id', user_id);
    }

    if (grant_month) {
      query = query.eq('grant_month', grant_month);
    }

    if (start_date) {
      query = query.gte('granted_at', start_date);
    }

    if (end_date) {
      query = query.lte('granted_at', end_date);
    }

    query = query.range(offset, offset + parseInt(limit) - 1);

    const { data: grants, error: grantsError } = await query;

    if (grantsError) {
      console.error('Monthly point grants history error:', grantsError);
      return res.status(500).json({ 
        error: 'Failed to fetch monthly point grants history',
        details: grantsError.message 
      });
    }

    // 총 개수 조회
    let countQuery = supabase
      .from('monthly_point_grants')
      .select('id', { count: 'exact', head: true });

    if (user_id) {
      countQuery = countQuery.eq('user_id', user_id);
    }

    if (grant_month) {
      countQuery = countQuery.eq('grant_month', grant_month);
    }

    if (start_date) {
      countQuery = countQuery.gte('granted_at', start_date);
    }

    if (end_date) {
      countQuery = countQuery.lte('granted_at', end_date);
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
      console.error('Monthly point grants count error:', countError);
      return res.status(500).json({ 
        error: 'Failed to count monthly point grants',
        details: countError.message 
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        grants: grants,
        pagination: {
          current_page: parseInt(page),
          per_page: parseInt(limit),
          total_count: count,
          total_pages: Math.ceil(count / parseInt(limit))
        },
        filters: {
          user_id: user_id || null,
          grant_month: grant_month || null,
          start_date: start_date || null,
          end_date: end_date || null
        }
      }
    });

  } catch (error) {
    console.error('Monthly point grants history error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch monthly point grants history',
      details: error.message 
    });
  }
}