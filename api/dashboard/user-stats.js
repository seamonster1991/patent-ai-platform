import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ error: 'Missing Supabase environment variables' });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 쿼리 파라미터 추출
    const { 
      page = 1, 
      limit = 20, 
      search = '', 
      sortBy = 'name', 
      sortOrder = 'asc' 
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // 검색 조건 구성
    let query = supabase
      .from('users')
      .select(`
        id,
        email,
        name,
        company,
        role,
        subscription_plan,
        total_logins,
        total_searches,
        total_reports,
        total_detail_views,
        last_login_at,
        created_at
      `)
      .is('deleted_at', null); // 삭제되지 않은 사용자만

    // 검색 필터 적용
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%`);
    }

    // 정렬 적용
    const validSortColumns = ['name', 'email', 'total_logins', 'total_searches', 'total_reports', 'created_at', 'last_login_at'];
    if (validSortColumns.includes(sortBy)) {
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });
    }

    // 페이지네이션 적용
    query = query.range(offset, offset + parseInt(limit) - 1);

    const { data: users, error: usersError } = await query;

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return res.status(500).json({ error: 'Failed to fetch user statistics' });
    }

    // 전체 사용자 수 조회 (페이지네이션용)
    let countQuery = supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .is('deleted_at', null);

    if (search) {
      countQuery = countQuery.or(`name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%`);
    }

    const { count: totalUsers, error: countError } = await countQuery;

    if (countError) {
      console.error('Error counting users:', countError);
      return res.status(500).json({ error: 'Failed to count users' });
    }

    // 전체 통계 계산
    const { data: totalStats, error: statsError } = await supabase
      .from('users')
      .select('total_logins, total_searches, total_reports')
      .is('deleted_at', null);

    if (statsError) {
      console.error('Error fetching total stats:', statsError);
      return res.status(500).json({ error: 'Failed to fetch total statistics' });
    }

    const totalLogins = totalStats.reduce((sum, user) => sum + (user.total_logins || 0), 0);
    const totalSearches = totalStats.reduce((sum, user) => sum + (user.total_searches || 0), 0);
    const totalReports = totalStats.reduce((sum, user) => sum + (user.total_reports || 0), 0);
    const activeUserCount = totalStats.length;

    // 평균 계산
    const averageLogins = activeUserCount > 0 ? (totalLogins / activeUserCount).toFixed(2) : 0;
    const averageSearches = activeUserCount > 0 ? (totalSearches / activeUserCount).toFixed(2) : 0;
    const averageReports = activeUserCount > 0 ? (totalReports / activeUserCount).toFixed(2) : 0;

    // 사용자 데이터 포맷팅
    const formattedUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      name: user.name || 'N/A',
      company: user.company || 'N/A',
      role: user.role || 'user',
      subscription_plan: user.subscription_plan || 'free',
      total_logins: user.total_logins || 0,
      total_searches: user.total_searches || 0,
      total_reports: user.total_reports || 0,
      total_detail_views: user.total_detail_views || 0,
      last_login_at: user.last_login_at,
      created_at: user.created_at,
      // 활동 점수 계산 (로그인 + 검색*2 + 리포트*3)
      activity_score: (user.total_logins || 0) + (user.total_searches || 0) * 2 + (user.total_reports || 0) * 3
    }));

    // 캐시 헤더 설정 (5분)
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');

    return res.status(200).json({
      success: true,
      data: {
        users: formattedUsers,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalUsers,
          totalPages: Math.ceil(totalUsers / parseInt(limit)),
          hasNext: offset + parseInt(limit) < totalUsers,
          hasPrev: parseInt(page) > 1
        },
        summary: {
          totalUsers: activeUserCount,
          totalLogins,
          totalSearches,
          totalReports,
          averageLogins: parseFloat(averageLogins),
          averageSearches: parseFloat(averageSearches),
          averageReports: parseFloat(averageReports)
        },
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error in user-stats API:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      message: error.message 
    });
  }
}