/**
 * Admin Maintenance API
 * Handles database cleanup operations and system maintenance
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Supabase 환경 변수가 설정되지 않았습니다.');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

module.exports = async (req, res) => {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    console.log('🔧 [Maintenance] API 호출:', req.method, req.url);

    // 관리자 권한 확인
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authorization header required'
      });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }

    // 관리자 권한 확인 (이메일 기반)
    const adminEmails = ['admin@patent-ai.com', 'support@patent-ai.com'];
    if (!adminEmails.includes(user.email)) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    if (req.method === 'GET') {
      // 시스템 상태 및 통계 조회
      const action = req.query.action;

      if (action === 'stats') {
        return await getMaintenanceStats(req, res);
      } else if (action === 'cleanup-preview') {
        return await getCleanupPreview(req, res);
      } else {
        return await getSystemStatus(req, res);
      }
    }

    if (req.method === 'POST') {
      // 유지보수 작업 실행
      const { action, confirm } = req.body;

      if (!action) {
        return res.status(400).json({
          success: false,
          error: 'Action parameter required'
        });
      }

      switch (action) {
        case 'cleanup':
          return await runCleanup(req, res, confirm);
        case 'optimize':
          return await runOptimization(req, res);
        case 'vacuum':
          return await runVacuum(req, res);
        default:
          return res.status(400).json({
            success: false,
            error: 'Invalid action'
          });
      }
    }

    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });

  } catch (error) {
    console.error('❌ [Maintenance] API 오류:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
};

// 시스템 상태 조회
async function getSystemStatus(req, res) {
  try {
    // AI 리포트 통계 조회
    const { data: reportStats, error: reportError } = await supabase
      .from('ai_reports_statistics')
      .select('*')
      .single();

    if (reportError) {
      console.error('리포트 통계 조회 오류:', reportError);
    }

    // 사용자 활동 통계
    const { data: activityStats, error: activityError } = await supabase
      .rpc('get_activity_statistics');

    if (activityError) {
      console.error('활동 통계 조회 오류:', activityError);
    }

    // 데이터베이스 크기 정보
    const { data: dbSize, error: dbError } = await supabase
      .rpc('get_database_size');

    if (dbError) {
      console.error('DB 크기 조회 오류:', dbError);
    }

    return res.status(200).json({
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        report_statistics: reportStats || {},
        activity_statistics: activityStats || {},
        database_size: dbSize || {},
        system_health: 'healthy'
      }
    });

  } catch (error) {
    console.error('시스템 상태 조회 오류:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get system status',
      message: error.message
    });
  }
}

// 유지보수 통계 조회
async function getMaintenanceStats(req, res) {
  try {
    // 최근 클린업 작업 내역 조회
    const { data: cleanupHistory, error: cleanupError } = await supabase
      .from('user_activities')
      .select('*')
      .eq('activity_type', 'system_cleanup')
      .order('created_at', { ascending: false })
      .limit(10);

    if (cleanupError) {
      console.error('클린업 내역 조회 오류:', cleanupError);
    }

    // 테이블별 레코드 수 조회
    const { count: reportsCount } = await supabase
      .from('ai_analysis_reports')
      .select('*', { count: 'exact', head: true });

    const { count: activitiesCount } = await supabase
      .from('user_activities')
      .select('*', { count: 'exact', head: true });

    const { count: usersCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    return res.status(200).json({
      success: true,
      data: {
        cleanup_history: cleanupHistory || [],
        table_counts: {
          ai_analysis_reports: reportsCount || 0,
          user_activities: activitiesCount || 0,
          users: usersCount || 0
        },
        last_updated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('유지보수 통계 조회 오류:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get maintenance stats',
      message: error.message
    });
  }
}

// 클린업 미리보기
async function getCleanupPreview(req, res) {
  try {
    // 100일 이전 리포트 수 조회
    const { count: oldReportsCount } = await supabase
      .from('ai_analysis_reports')
      .select('*', { count: 'exact', head: true })
      .lt('created_at', new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString());

    // 1년 이전 활동 수 조회
    const { count: oldActivitiesCount } = await supabase
      .from('user_activities')
      .select('*', { count: 'exact', head: true })
      .lt('created_at', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString())
      .neq('activity_type', 'system_cleanup');

    return res.status(200).json({
      success: true,
      data: {
        reports_to_delete: oldReportsCount || 0,
        activities_to_delete: oldActivitiesCount || 0,
        retention_policies: {
          ai_reports: '100 days',
          user_activities: '365 days'
        },
        preview_date: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('클린업 미리보기 오류:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get cleanup preview',
      message: error.message
    });
  }
}

// 클린업 실행
async function runCleanup(req, res, confirm = false) {
  try {
    if (!confirm) {
      return res.status(400).json({
        success: false,
        error: 'Confirmation required for cleanup operation'
      });
    }

    console.log('🧹 [Maintenance] 클린업 작업 시작');

    // 유지보수 클린업 함수 실행
    const { data: cleanupResults, error: cleanupError } = await supabase
      .rpc('run_maintenance_cleanup');

    if (cleanupError) {
      console.error('클린업 실행 오류:', cleanupError);
      return res.status(500).json({
        success: false,
        error: 'Cleanup operation failed',
        message: cleanupError.message
      });
    }

    console.log('✅ [Maintenance] 클린업 작업 완료:', cleanupResults);

    return res.status(200).json({
      success: true,
      data: {
        cleanup_results: cleanupResults,
        execution_time: new Date().toISOString(),
        message: 'Cleanup operation completed successfully'
      }
    });

  } catch (error) {
    console.error('클린업 실행 오류:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to run cleanup',
      message: error.message
    });
  }
}

// 데이터베이스 최적화
async function runOptimization(req, res) {
  try {
    console.log('⚡ [Maintenance] 데이터베이스 최적화 시작');

    // 통계 업데이트 (PostgreSQL ANALYZE)
    const { error: analyzeError } = await supabase
      .rpc('analyze_tables');

    if (analyzeError) {
      console.error('ANALYZE 실행 오류:', analyzeError);
    }

    return res.status(200).json({
      success: true,
      data: {
        optimization_completed: true,
        execution_time: new Date().toISOString(),
        message: 'Database optimization completed'
      }
    });

  } catch (error) {
    console.error('최적화 실행 오류:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to run optimization',
      message: error.message
    });
  }
}

// VACUUM 실행
async function runVacuum(req, res) {
  try {
    console.log('🧽 [Maintenance] VACUUM 작업 시작');

    // VACUUM 작업은 보통 관리자 권한이 필요하므로 로그만 남김
    console.log('VACUUM 작업은 데이터베이스 관리자가 수동으로 실행해야 합니다.');

    return res.status(200).json({
      success: true,
      data: {
        vacuum_requested: true,
        execution_time: new Date().toISOString(),
        message: 'VACUUM operation requested (requires manual execution by DB admin)'
      }
    });

  } catch (error) {
    console.error('VACUUM 요청 오류:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to request vacuum',
      message: error.message
    });
  }
}