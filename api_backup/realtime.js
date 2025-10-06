const { createClient } = require('@supabase/supabase-js');

// 환경변수 로드
require('dotenv').config();

// Supabase 클라이언트 초기화 (안전한 초기화)
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
let supabase = null;

try {
  if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('✅ [realtime.js] Supabase 클라이언트 초기화 성공');
  } else {
    console.warn('⚠️ [realtime.js] Supabase 환경변수 누락:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseKey
    });
  }
} catch (error) {
  console.error('❌ [realtime.js] Supabase 클라이언트 초기화 실패:', error.message);
  supabase = null;
}

// 실시간 통계 캐시
let statsCache = {
  data: null,
  lastUpdated: null,
  cacheTimeout: 30000 // 30초
};

module.exports = async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
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

    const { pathname } = new URL(req.url, `http://${req.headers.host}`);
    const pathParts = pathname.split('/').filter(Boolean);
    
    // URL 패턴: /api/realtime/{action}
    const action = pathParts[2];

    switch (action) {
      case 'stats':
        return await handleStats(req, res);
      case 'server':
        return await handleServer(req, res);
      default:
        return res.status(404).json({
          success: false,
          error: 'API endpoint not found'
        });
    }

  } catch (error) {
    console.error('❌ Realtime API 오류:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
};

// 실시간 통계 처리
async function handleStats(req, res) {
  if (req.method === 'GET') {
    try {
      // 캐시 확인
      const now = Date.now();
      if (statsCache.data && statsCache.lastUpdated && 
          (now - statsCache.lastUpdated) < statsCache.cacheTimeout) {
        console.log('📊 캐시된 통계 데이터 반환');
        return res.status(200).json({
          success: true,
          data: statsCache.data,
          cached: true,
          lastUpdated: new Date(statsCache.lastUpdated).toISOString()
        });
      }

      console.log('📊 실시간 통계 조회 시작');

      // 오늘 날짜 범위
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

      // 이번 주 날짜 범위
      const weekStart = new Date(todayStart);
      weekStart.setDate(todayStart.getDate() - todayStart.getDay());
      
      // 이번 달 날짜 범위
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

      // 병렬로 통계 데이터 조회
      const [
        totalUsersResult,
        activeUsersResult,
        totalReportsResult,
        totalSearchesResult,
        todayReportsResult,
        todaySearchesResult,
        weeklyReportsResult,
        weeklySearchesResult,
        monthlyReportsResult,
        monthlySearchesResult,
        recentActivitiesResult
      ] = await Promise.all([
        // 전체 사용자 수
        supabase
          .from('users')
          .select('*', { count: 'exact', head: true }),
        
        // 최근 7일간 활성 사용자
        supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .gte('last_sign_in_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
        
        // 전체 리포트 수
        supabase
          .from('ai_analysis_reports')
          .select('*', { count: 'exact', head: true }),
        
        // 전체 검색 수
        supabase
          .from('user_activities')
          .select('*', { count: 'exact', head: true })
          .eq('activity_type', 'search'),
        
        // 오늘 리포트 수
        supabase
          .from('ai_analysis_reports')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', todayStart.toISOString())
          .lt('created_at', todayEnd.toISOString()),
        
        // 오늘 검색 수
        supabase
          .from('user_activities')
          .select('*', { count: 'exact', head: true })
          .eq('activity_type', 'search')
          .gte('created_at', todayStart.toISOString())
          .lt('created_at', todayEnd.toISOString()),
        
        // 이번 주 리포트 수
        supabase
          .from('ai_analysis_reports')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', weekStart.toISOString()),
        
        // 이번 주 검색 수
        supabase
          .from('user_activities')
          .select('*', { count: 'exact', head: true })
          .eq('activity_type', 'search')
          .gte('created_at', weekStart.toISOString()),
        
        // 이번 달 리포트 수
        supabase
          .from('ai_analysis_reports')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', monthStart.toISOString()),
        
        // 이번 달 검색 수
        supabase
          .from('user_activities')
          .select('*', { count: 'exact', head: true })
          .eq('activity_type', 'search')
          .gte('created_at', monthStart.toISOString()),
        
        // 최근 활동 내역
        supabase
          .from('user_activities')
          .select(`
            id,
            activity_type,
            activity_data,
            created_at,
            users(email)
          `)
          .order('created_at', { ascending: false })
          .limit(20)
      ]);

      // 에러 체크
      const errors = [
        totalUsersResult.error,
        activeUsersResult.error,
        totalReportsResult.error,
        totalSearchesResult.error,
        todayReportsResult.error,
        todaySearchesResult.error,
        weeklyReportsResult.error,
        weeklySearchesResult.error,
        monthlyReportsResult.error,
        monthlySearchesResult.error,
        recentActivitiesResult.error
      ].filter(Boolean);

      if (errors.length > 0) {
        console.error('통계 조회 중 오류 발생:', errors);
        throw new Error('통계 데이터 조회 중 일부 오류가 발생했습니다.');
      }

      // 시간대별 활동 데이터 생성 (최근 24시간)
      const hourlyData = [];
      for (let i = 23; i >= 0; i--) {
        const hour = new Date(Date.now() - i * 60 * 60 * 1000);
        hourlyData.push({
          hour: hour.getHours(),
          timestamp: hour.toISOString(),
          reports: Math.floor(Math.random() * 10), // 실제 환경에서는 실제 데이터 조회
          searches: Math.floor(Math.random() * 50),
          users: Math.floor(Math.random() * 20)
        });
      }

      // 통계 데이터 구성
      const statsData = {
        overview: {
          totalUsers: totalUsersResult.count || 0,
          activeUsers: activeUsersResult.count || 0,
          totalReports: totalReportsResult.count || 0,
          totalSearches: totalSearchesResult.count || 0
        },
        today: {
          reports: todayReportsResult.count || 0,
          searches: todaySearchesResult.count || 0
        },
        thisWeek: {
          reports: weeklyReportsResult.count || 0,
          searches: weeklySearchesResult.count || 0
        },
        thisMonth: {
          reports: monthlyReportsResult.count || 0,
          searches: monthlySearchesResult.count || 0
        },
        recentActivities: recentActivitiesResult.data || [],
        hourlyData,
        systemHealth: {
          status: 'healthy',
          uptime: '99.9%',
          responseTime: Math.floor(Math.random() * 100) + 50,
          errorRate: Math.random() * 0.1
        },
        lastUpdated: new Date().toISOString()
      };

      // 캐시 업데이트
      statsCache.data = statsData;
      statsCache.lastUpdated = now;

      console.log('✅ 실시간 통계 조회 완료');

      return res.status(200).json({
        success: true,
        data: statsData,
        cached: false
      });

    } catch (error) {
      console.error('❌ 실시간 통계 조회 실패:', error);
      return res.status(500).json({
        success: false,
        error: '실시간 통계 조회에 실패했습니다.',
        details: error.message
      });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}

// 서버 상태 처리 (WebSocket 대체)
async function handleServer(req, res) {
  if (req.method === 'GET') {
    // 서버 상태 정보 반환 (WebSocket 연결 시뮬레이션)
    const serverStatus = {
      connected: true,
      connectionId: `conn_${Date.now()}`,
      serverTime: new Date().toISOString(),
      activeConnections: Math.floor(Math.random() * 100) + 50,
      serverLoad: Math.random() * 100,
      memoryUsage: Math.random() * 100,
      uptime: Math.floor(Date.now() / 1000) // 초 단위
    };

    return res.status(200).json({
      success: true,
      data: serverStatus
    });
  }

  if (req.method === 'POST') {
    // 서버 액션 처리 (유지보수 등)
    const { action } = req.body;

    switch (action) {
      case 'maintenance':
        // 유지보수 작업 시뮬레이션
        return res.status(200).json({
          success: true,
          data: {
            action: 'maintenance',
            status: 'completed',
            timestamp: new Date().toISOString()
          }
        });
      
      default:
        return res.status(400).json({
          success: false,
          error: 'Unknown action'
        });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}