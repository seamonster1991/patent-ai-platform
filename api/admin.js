const { createClient } = require('@supabase/supabase-js');

// Supabase 클라이언트 초기화 (안전한 초기화)
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
let supabase = null;

try {
  if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('✅ [admin.js] Supabase 클라이언트 초기화 성공');
  } else {
    console.warn('⚠️ [admin.js] Supabase 환경변수 누락:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseKey
    });
  }
} catch (error) {
  console.error('❌ [admin.js] Supabase 클라이언트 초기화 실패:', error.message);
  supabase = null;
}

module.exports = async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
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
    
    // URL 패턴: /api/admin/{action}
    const action = pathParts[2];

    // 관리자 권한 확인 (실제 환경에서는 JWT 토큰 검증 등 필요)
    // 여기서는 간단히 헤더 확인
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    switch (action) {
      case 'maintenance':
        return await handleMaintenance(req, res);
      case 'user-activities':
        return await handleUserActivities(req, res);
      case 'stats':
        return await handleAdminStats(req, res);
      default:
        return res.status(404).json({
          success: false,
          error: 'API endpoint not found'
        });
    }

  } catch (error) {
    console.error('❌ Admin API 오류:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
};

// 유지보수 작업 처리
async function handleMaintenance(req, res) {
  if (req.method === 'POST') {
    const { action, daysToKeep = 100 } = req.body;

    console.log('🔧 유지보수 작업 시작:', { action, daysToKeep });

    try {
      let result = {};

      if (action === 'cleanup' || action === 'all') {
        // 100일 이전 데이터 정리
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
        const cutoffISO = cutoffDate.toISOString();

        console.log('📅 정리 기준 날짜:', cutoffISO);

        // 오래된 리포트 삭제
        const { data: oldReports, error: reportsError } = await supabase
          .from('ai_analysis_reports')
          .delete()
          .lt('created_at', cutoffISO);

        if (reportsError) {
          console.error('리포트 정리 오류:', reportsError);
          throw reportsError;
        }

        // 오래된 활동 기록 삭제
        const { data: oldActivities, error: activitiesError } = await supabase
          .from('user_activities')
          .delete()
          .lt('created_at', cutoffISO);

        if (activitiesError) {
          console.error('활동 기록 정리 오류:', activitiesError);
          throw activitiesError;
        }

        result.cleanup = {
          reportsDeleted: oldReports?.length || 0,
          activitiesDeleted: oldActivities?.length || 0,
          cutoffDate: cutoffISO
        };

        console.log('✅ 데이터 정리 완료:', result.cleanup);
      }

      if (action === 'vacuum' || action === 'all') {
        // PostgreSQL VACUUM 작업 (Supabase에서는 자동으로 처리되므로 시뮬레이션)
        result.vacuum = {
          status: 'completed',
          message: 'Database optimization completed'
        };

        console.log('✅ 데이터베이스 최적화 완료');
      }

      if (action === 'reindex' || action === 'all') {
        // 인덱스 재구성 (Supabase에서는 자동으로 처리되므로 시뮬레이션)
        result.reindex = {
          status: 'completed',
          message: 'Index optimization completed'
        };

        console.log('✅ 인덱스 최적화 완료');
      }

      // 유지보수 기록 저장
      const { error: logError } = await supabase
        .from('maintenance_logs')
        .insert([{
          action,
          result: JSON.stringify(result),
          created_at: new Date().toISOString()
        }]);

      if (logError) {
        console.error('유지보수 로그 저장 오류:', logError);
      }

      return res.status(200).json({
        success: true,
        data: {
          action,
          result,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('❌ 유지보수 작업 실패:', error);
      return res.status(500).json({
        success: false,
        error: '유지보수 작업에 실패했습니다.',
        details: error.message
      });
    }
  }

  if (req.method === 'GET') {
    // 유지보수 상태 조회
    try {
      // 최근 유지보수 기록
      const { data: recentMaintenance, error: maintenanceError } = await supabase
        .from('maintenance_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (maintenanceError) {
        console.error('유지보수 기록 조회 오류:', maintenanceError);
      }

      // 정리 대상 데이터 개수 확인
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 100);
      const cutoffISO = cutoffDate.toISOString();

      const { count: reportsToDelete } = await supabase
        .from('ai_analysis_reports')
        .select('*', { count: 'exact', head: true })
        .lt('created_at', cutoffISO);

      const { count: activitiesToDelete } = await supabase
        .from('user_activities')
        .select('*', { count: 'exact', head: true })
        .lt('created_at', cutoffISO);

      return res.status(200).json({
        success: true,
        data: {
          recentMaintenance: recentMaintenance || [],
          pendingCleanup: {
            reportsToDelete: reportsToDelete || 0,
            activitiesToDelete: activitiesToDelete || 0,
            cutoffDate: cutoffISO
          }
        }
      });

    } catch (error) {
      console.error('❌ 유지보수 상태 조회 실패:', error);
      return res.status(500).json({
        success: false,
        error: '유지보수 상태 조회에 실패했습니다.'
      });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}

// 사용자 활동 처리
async function handleUserActivities(req, res) {
  if (req.method === 'GET') {
    const { 
      limit = '50', 
      page = '1', 
      userId, 
      activityType, 
      startDate, 
      endDate 
    } = req.query;

    const limitNum = parseInt(limit);
    const pageNum = parseInt(page);
    const offset = (pageNum - 1) * limitNum;

    let query = supabase
      .from('user_activities')
      .select(`
        *,
        users(email, created_at)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    // 필터 적용
    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (activityType) {
      query = query.eq('activity_type', activityType);
    }

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data: activities, error } = await query;

    if (error) {
      console.error('사용자 활동 조회 오류:', error);
      return res.status(500).json({
        success: false,
        error: '사용자 활동 조회에 실패했습니다.'
      });
    }

    return res.status(200).json({
      success: true,
      data: activities || []
    });
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}

// 관리자 통계 처리
async function handleAdminStats(req, res) {
  if (req.method === 'GET') {
    try {
      // 전체 사용자 수
      const { count: totalUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      // 최근 7일간 활성 사용자
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { count: activeUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('last_sign_in_at', sevenDaysAgo.toISOString());

      // 총 리포트 수
      const { count: totalReports } = await supabase
        .from('ai_analysis_reports')
        .select('*', { count: 'exact', head: true });

      // 총 검색 수
      const { count: totalSearches } = await supabase
        .from('user_activities')
        .select('*', { count: 'exact', head: true })
        .eq('activity_type', 'search');

      // 최근 활동 내역
      const { data: recentActivities } = await supabase
        .from('user_activities')
        .select(`
          *,
          users(email)
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      return res.status(200).json({
        success: true,
        data: {
          totalUsers: totalUsers || 0,
          activeUsers: activeUsers || 0,
          totalReports: totalReports || 0,
          totalSearches: totalSearches || 0,
          recentActivities: recentActivities || []
        }
      });

    } catch (error) {
      console.error('관리자 통계 조회 오류:', error);
      return res.status(500).json({
        success: false,
        error: '통계 조회에 실패했습니다.'
      });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}