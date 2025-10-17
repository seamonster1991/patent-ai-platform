import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ 
      error: 'Database configuration error',
      details: 'Missing environment variables'
    });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { period = '30d' } = req.query;

    // 기간 계산
    const now = new Date();
    let periodStart;
    let days;
    
    switch (period) {
      case '7d':
        days = 7;
        periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        days = 30;
        periodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        days = 90;
        periodStart = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        days = 30;
        periodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // 일별 트렌드 데이터 생성
    const dailyTrends = [];
    
    for (let i = 0; i < days; i++) {
      const date = new Date(periodStart.getTime() + i * 24 * 60 * 60 * 1000);
      const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString();
      const dateEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1).toISOString();
      
      // 해당 날짜의 데이터 조회
      const [
        dailyLoginsResult,
        dailySearchesResult,
        dailyReportsResult,
        dailyUsersResult
      ] = await Promise.all([
        // 일별 로그인 수
        supabase
          .from('user_login_logs')
          .select('id', { count: 'exact' })
          .eq('login_success', true)
          .gte('created_at', dateStart)
          .lt('created_at', dateEnd),
        
        // 일별 검색 수
        supabase
          .from('search_history')
          .select('id', { count: 'exact' })
          .gte('created_at', dateStart)
          .lt('created_at', dateEnd),
        
        // 일별 리포트 생성 수
        supabase
          .from('reports')
          .select('id', { count: 'exact' })
          .gte('created_at', dateStart)
          .lt('created_at', dateEnd),
        
        // 일별 신규 사용자 수
        supabase
          .from('users')
          .select('id', { count: 'exact' })
          .gte('created_at', dateStart)
          .lt('created_at', dateEnd)
          .is('deleted_at', null)
      ]);

      dailyTrends.push({
        date: date.toISOString().split('T')[0],
        logins: dailyLoginsResult.count || 0,
        searches: dailySearchesResult.count || 0,
        reports: dailyReportsResult.count || 0,
        new_users: dailyUsersResult.count || 0
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        period,
        daily_trends: dailyTrends,
        generated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Admin trends error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
}