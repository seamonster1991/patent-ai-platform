const { createClient } = require('@supabase/supabase-js');

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

    // URL에서 userId 추출 또는 쿼리 파라미터에서 가져오기
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId가 필요합니다.'
      });
    }

    if (req.method === 'GET') {
      // 쿼리 파라미터 추출
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

      console.log('📊 리포트 조회 API 호출:', { 
        userId, 
        days, 
        sortBy, 
        sortOrder, 
        search,
        startDate,
        endDate,
        page,
        limit
      });

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

      const { data: reports, error, count } = await query;

      if (error) {
        console.error('리포트 조회 오류:', error);
        return res.status(500).json({
          success: false,
          error: '리포트 조회에 실패했습니다.'
        });
      }

      // 전체 개수 조회 (페이지네이션용)
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

      console.log('✅ 리포트 조회 성공:', processedReports?.length || 0, '개');

      return res.status(200).json({
        success: true,
        data: {
          reports: processedReports,
          pagination: {
            currentPage: pageNum,
            totalPages: Math.ceil((totalCount || 0) / limitNum),
            totalCount: totalCount || 0,
            limit: limitNum
          },
          filters: {
            days: parseInt(days),
            sortBy,
            sortOrder,
            search,
            startDate,
            endDate
          }
        }
      });

    } else if (req.method === 'POST') {
      // 리포트 생성
      console.log('📊 리포트 생성 API 호출:', { userId, body: req.body });

      const { patent_id, analysis_type, analysis_data } = req.body;

      if (!patent_id || !analysis_type || !analysis_data) {
        return res.status(400).json({
          success: false,
          error: '필수 데이터가 누락되었습니다.'
        });
      }

      const { data: report, error } = await supabase
        .from('ai_analysis_reports')
        .insert([{
          user_id: userId,
          patent_id,
          analysis_type,
          analysis_data,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        console.error('리포트 생성 오류:', error);
        return res.status(500).json({
          success: false,
          error: '리포트 생성에 실패했습니다.'
        });
      }

      console.log('✅ 리포트 생성 성공:', report.id);

      return res.status(201).json({
        success: true,
        data: report
      });

    } else {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed'
      });
    }

  } catch (error) {
    console.error('❌ 리포트 API 오류:', error);
    return res.status(500).json({
      success: false,
      error: '리포트 처리에 실패했습니다.'
    });
  }
}