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
    console.log('✅ [reports.js] Supabase 클라이언트 초기화 성공');
  } else {
    console.warn('⚠️ [reports.js] Supabase 환경변수 누락:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseKey
    });
  }
} catch (error) {
  console.error('❌ [reports.js] Supabase 클라이언트 초기화 실패:', error.message);
  supabase = null;
}

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

module.exports = handleReports;