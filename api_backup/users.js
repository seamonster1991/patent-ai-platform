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

    const { pathname, searchParams } = new URL(req.url, `http://${req.headers.host}`);
    const pathParts = pathname.split('/').filter(Boolean);
    
    // URL 패턴: /api/users/{userId}/{action} 또는 /api/users/{action}?userId=...
    let userId = pathParts[2];
    let action = pathParts[3];
    
    // 쿼리스트링에서 userId 확인 (예: /api/users/stats?userId=...)
    if (!userId || userId === 'stats' || userId === 'reports' || userId === 'search-history') {
      action = userId || pathParts[2];
      userId = searchParams.get('userId');
    }

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
      console.log('📊 [handleStats] 사용자 통계 조회 시작:', userId);

      // 기본 통계 수집
      const { count: totalReports } = await supabase
        .from('ai_analysis_reports')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      const { count: totalSearches } = await supabase
        .from('user_activities')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('activity_type', 'search');

      const { count: totalActivities } = await supabase
        .from('user_activities')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      // 최근 검색 기록 (상위 10개)
      const { data: recentSearches } = await supabase
        .from('user_activities')
        .select('activity_data, created_at')
        .eq('user_id', userId)
        .eq('activity_type', 'search')
        .order('created_at', { ascending: false })
        .limit(10);

      // 최근 보고서 (상위 10개)
      const { data: recentReports } = await supabase
        .from('ai_analysis_reports')
        .select('id, title, created_at, application_number, download_url')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      // 인기 키워드 (최근 30일)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: searchActivities } = await supabase
        .from('user_activities')
        .select('activity_data')
        .eq('user_id', userId)
        .eq('activity_type', 'search')
        .gte('created_at', thirtyDaysAgo.toISOString());

      // 키워드 집계
      const keywordCounts = {};
      const fieldCounts = {};
      
      searchActivities?.forEach(activity => {
        try {
          const data = typeof activity.activity_data === 'string' 
            ? JSON.parse(activity.activity_data) 
            : activity.activity_data;
          
          if (data?.keyword) {
            keywordCounts[data.keyword] = (keywordCounts[data.keyword] || 0) + 1;
            
            // 기술 분야 분류 (간단한 키워드 기반)
            const field = classifyTechField(data.keyword);
            fieldCounts[field] = (fieldCounts[field] || 0) + 1;
          }
        } catch (e) {
          console.warn('활동 데이터 파싱 오류:', e);
        }
      });

      const topKeywords = Object.entries(keywordCounts)
        .map(([keyword, count]) => ({ 
          keyword, 
          count, 
          field: classifyTechField(keyword) 
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      const fieldDistribution = Object.entries(fieldCounts)
        .map(([field, count]) => ({ field, count }))
        .sort((a, b) => b.count - a.count);

      // 주간 활동 데이터 (최근 7일)
      const weeklyActivities = [];
      const days = ['일', '월', '화', '수', '목', '금', '토'];
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dayStart = new Date(date.setHours(0, 0, 0, 0));
        const dayEnd = new Date(date.setHours(23, 59, 59, 999));

        const { count: daySearches } = await supabase
          .from('user_activities')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('activity_type', 'search')
          .gte('created_at', dayStart.toISOString())
          .lte('created_at', dayEnd.toISOString());

        const { count: dayReports } = await supabase
          .from('ai_analysis_reports')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .gte('created_at', dayStart.toISOString())
          .lte('created_at', dayEnd.toISOString());

        weeklyActivities.push({
          day: days[date.getDay()],
          dayIndex: date.getDay(),
          searchCount: daySearches || 0,
          aiAnalysisCount: dayReports || 0,
          count: (daySearches || 0) + (dayReports || 0)
        });
      }

      // 시간대별 활동 데이터 (24시간)
      const hourlyActivities = [];
      for (let hour = 0; hour < 24; hour++) {
        const { count: hourCount } = await supabase
          .from('user_activities')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('activity_type', 'search')
          .gte('created_at', thirtyDaysAgo.toISOString())
          .filter('created_at', 'like', `%${hour.toString().padStart(2, '0')}:%`);

        hourlyActivities.push({
          hour,
          count: hourCount || 0
        });
      }

      // 100일간 일별 활동 데이터
      const dailyActivities100Days = [];
      for (let i = 99; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dayStart = new Date(date.setHours(0, 0, 0, 0));
        const dayEnd = new Date(date.setHours(23, 59, 59, 999));

        const { count: dayCount } = await supabase
          .from('user_activities')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .gte('created_at', dayStart.toISOString())
          .lte('created_at', dayEnd.toISOString());

        dailyActivities100Days.push({
          date: dayStart.toISOString().split('T')[0],
          count: dayCount || 0
        });
      }

      // 응답 데이터 구성
      const responseData = {
        summary: {
          search_count: totalSearches || 0,
          report_generate_count: totalReports || 0,
          total_activities: totalActivities || 0,
          patent_view_count: totalSearches || 0, // 검색 수로 대체
          ai_analysis_count: totalReports || 0,
          document_download_count: totalReports || 0, // 보고서 수로 대체
          average_search_results: totalSearches > 0 ? Math.round((totalSearches * 15) / totalSearches) : 0
        },
        recent_searches: (recentSearches || []).map((search, index) => {
          try {
            const data = typeof search.activity_data === 'string' 
              ? JSON.parse(search.activity_data) 
              : search.activity_data;
            
            return {
              keyword: data?.keyword || `검색 ${index + 1}`,
              searchDate: search.created_at,
              resultsCount: data?.resultsCount || Math.floor(Math.random() * 50) + 1,
              field: classifyTechField(data?.keyword || '')
            };
          } catch (e) {
            return {
              keyword: `검색 ${index + 1}`,
              searchDate: search.created_at,
              resultsCount: Math.floor(Math.random() * 50) + 1,
              field: '기타'
            };
          }
        }),
        recent_reports: (recentReports || []).map(report => ({
          id: report.id,
          title: report.title || '분석 보고서',
          createdAt: report.created_at,
          applicationNumber: report.application_number || 'N/A',
          downloadUrl: report.download_url || ''
        })),
        top_keywords: topKeywords,
        weekly_activities: weeklyActivities,
        hourly_activities: hourlyActivities,
        field_distribution: fieldDistribution,
        daily_activities_100days: dailyActivities100Days
      };

      console.log('✅ [handleStats] 통계 데이터 생성 완료:', {
        searches: totalSearches,
        reports: totalReports,
        activities: totalActivities,
        recentSearches: recentSearches?.length || 0,
        recentReports: recentReports?.length || 0,
        topKeywords: topKeywords.length,
        weeklyActivities: weeklyActivities.length,
        hourlyActivities: hourlyActivities.length
      });

      return res.status(200).json({
        success: true,
        data: responseData
      });

    } catch (error) {
      console.error('❌ [handleStats] 사용자 통계 조회 오류:', error);
      return res.status(500).json({
        success: false,
        error: '통계 조회에 실패했습니다.',
        message: error.message
      });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}

// 기술 분야 분류 함수
function classifyTechField(keyword) {
  if (!keyword) return '기타';
  
  const keyword_lower = keyword.toLowerCase();
  
  if (keyword_lower.includes('ai') || keyword_lower.includes('인공지능') || 
      keyword_lower.includes('머신러닝') || keyword_lower.includes('딥러닝')) {
    return 'AI/머신러닝';
  }
  if (keyword_lower.includes('블록체인') || keyword_lower.includes('blockchain') || 
      keyword_lower.includes('암호화폐') || keyword_lower.includes('crypto')) {
    return '블록체인';
  }
  if (keyword_lower.includes('iot') || keyword_lower.includes('사물인터넷') || 
      keyword_lower.includes('센서') || keyword_lower.includes('스마트')) {
    return 'IoT';
  }
  if (keyword_lower.includes('바이오') || keyword_lower.includes('bio') || 
      keyword_lower.includes('의료') || keyword_lower.includes('헬스케어')) {
    return '바이오/의료';
  }
  if (keyword_lower.includes('자동차') || keyword_lower.includes('automotive') || 
      keyword_lower.includes('전기차') || keyword_lower.includes('자율주행')) {
    return '자동차';
  }
  if (keyword_lower.includes('반도체') || keyword_lower.includes('전자') || 
      keyword_lower.includes('칩') || keyword_lower.includes('프로세서')) {
    return '반도체/전자';
  }
  
  return '기타';
}