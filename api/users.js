const { createClient } = require('@supabase/supabase-js');

// Supabase 클라이언트 초기화 (안전한 초기화)
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
let supabase = null;

try {
  if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('✅ [users.js] Supabase 클라이언트 초기화 성공');
  } else {
    console.warn('⚠️ [users.js] Supabase 환경변수 누락:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseKey
    });
  }
} catch (error) {
  console.error('❌ [users.js] Supabase 클라이언트 초기화 실패:', error.message);
  supabase = null;
}

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
    
    // URL 패턴: /api/users/{userId}/{action}
    const userId = pathParts[2];
    const action = pathParts[3];

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId가 필요합니다.'
      });
    }

    // 사용자 리포트 관련 API
    if (action === 'reports') {
      return await handleReports(req, res, userId);
    }
    
    // 사용자 검색 기록 관련 API
    if (action === 'search-history') {
      return await handleSearchHistory(req, res, userId);
    }
    
    // 사용자 통계 관련 API
    if (action === 'stats') {
      return await handleStats(req, res, userId);
    }

    return res.status(404).json({
      success: false,
      error: 'API endpoint not found'
    });

  } catch (error) {
    console.error('❌ API 오류:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
};

// 사용자 리포트 처리
async function handleReports(req, res, userId) {
  if (req.method === 'GET') {
    const { 
      days = '100',
      sortBy = 'created_at',
      sortOrder = 'desc',
      search = '',
      startDate,
      endDate,
      page = '1',
      limit = '50'
    } = req.query;

    // 날짜 범위 계산
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        gte: startDate,
        lte: endDate
      };
    } else {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(days));
      dateFilter = {
        gte: daysAgo.toISOString()
      };
    }

    // 기본 쿼리 구성
    let query = supabase
      .from('ai_analysis_reports')
      .select('id, invention_title, application_number, created_at, updated_at')
      .eq('user_id', userId)
      .gte('created_at', dateFilter.gte);

    if (dateFilter.lte) {
      query = query.lte('created_at', dateFilter.lte);
    }

    // 검색 필터 적용
    if (search) {
      query = query.or(`invention_title.ilike.%${search}%,application_number.ilike.%${search}%`);
    }

    // 정렬 적용
    const ascending = sortOrder === 'asc';
    if (sortBy === 'title') {
      query = query.order('invention_title', { ascending });
    } else {
      query = query.order('created_at', { ascending });
    }

    // 페이지네이션 적용
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;
    
    query = query.range(offset, offset + limitNum - 1);

    const { data: reports, error } = await query;

    if (error) {
      console.error('리포트 조회 오류:', error);
      return res.status(500).json({
        success: false,
        error: '리포트 조회에 실패했습니다.'
      });
    }

    // 전체 개수 조회
    const { count: totalCount, error: countError } = await supabase
      .from('ai_analysis_reports')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', dateFilter.gte);

    if (countError) {
      console.error('리포트 개수 조회 오류:', countError);
    }

    // 리포트 데이터 가공
    const processedReports = (reports || []).map(report => ({
      id: report.id,
      title: report.invention_title,
      applicationNumber: report.application_number,
      createdAt: report.created_at,
      updatedAt: report.updated_at,
      downloadUrl: `/api/generate-report?reportId=${report.id}&format=pdf`
    }));

    return res.status(200).json({
      success: true,
      data: {
        reports: processedReports,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil((totalCount || 0) / limitNum),
          totalCount: totalCount || 0,
          limit: limitNum
        }
      }
    });
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}

// 사용자 검색 기록 처리
async function handleSearchHistory(req, res, userId) {
  if (req.method === 'GET') {
    const { limit = '20', page = '1' } = req.query;
    const limitNum = parseInt(limit);
    const pageNum = parseInt(page);
    const offset = (pageNum - 1) * limitNum;

    const { data: searchHistory, error } = await supabase
      .from('user_activities')
      .select('id, activity_type, activity_data, created_at')
      .eq('user_id', userId)
      .eq('activity_type', 'search')
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    if (error) {
      console.error('검색 기록 조회 오류:', error);
      return res.status(500).json({
        success: false,
        error: '검색 기록 조회에 실패했습니다.'
      });
    }

    return res.status(200).json({
      success: true,
      data: searchHistory || []
    });
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}

// 사용자 통계 처리
async function handleStats(req, res, userId) {
  if (req.method === 'GET') {
    try {
      // 총 리포트 수
      const { count: totalReports } = await supabase
        .from('ai_analysis_reports')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      // 총 검색 수
      const { count: totalSearches } = await supabase
        .from('user_activities')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('activity_type', 'search');

      // 최근 30일 활동
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { count: recentReports } = await supabase
        .from('ai_analysis_reports')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', thirtyDaysAgo.toISOString());

      const { count: recentSearches } = await supabase
        .from('user_activities')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('activity_type', 'search')
        .gte('created_at', thirtyDaysAgo.toISOString());

      return res.status(200).json({
        success: true,
        data: {
          totalReports: totalReports || 0,
          totalSearches: totalSearches || 0,
          recentReports: recentReports || 0,
          recentSearches: recentSearches || 0
        }
      });

    } catch (error) {
      console.error('사용자 통계 조회 오류:', error);
      return res.status(500).json({
        success: false,
        error: '통계 조회에 실패했습니다.'
      });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}