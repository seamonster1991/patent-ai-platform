const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
let supabase = null;
try {
  if (supabaseUrl && supabaseServiceKey) {
    supabase = createClient(supabaseUrl, supabaseServiceKey);
  } else {
    console.warn('[search-history.js] Supabase 환경변수가 누락되어 활동 로그를 건너뜁니다.', {
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
    });
  }
} catch (e) {
  console.warn('[search-history.js] Supabase 클라이언트 초기화 실패, 활동 로그를 건너뜁니다:', e?.message || e);
  supabase = null;
}

async function handleSearchHistory(req, res, userId) {
  if (!supabase) {
    return res.status(500).json({ success: false, error: 'Supabase client not initialized' });
  }

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

  if (req.method === 'POST') {
    const { keyword, filters, results_count, technology_field, field_confidence } = req.body;

    if (!keyword) {
      return res.status(400).json({
        success: false,
        error: '키워드가 필요합니다.'
      });
    }

    try {
      console.log('🔍 [search-history] POST 요청 처리:', { userId, keyword, results_count });

      // user_activities 테이블에 검색 기록 저장
      const { data: activityData, error: activityError } = await supabase
        .from('user_activities')
        .insert({
          user_id: userId,
          activity_type: 'search',
          activity_data: {
            keyword: keyword,
            filters: filters || {},
            results_count: results_count || 0,
            technology_field: technology_field,
            field_confidence: field_confidence,
            timestamp: new Date().toISOString()
          }
        })
        .select();

      if (activityError) {
        console.error('user_activities 저장 오류:', activityError);
        return res.status(500).json({
          success: false,
          error: 'user_activities 저장에 실패했습니다.'
        });
      }

      // search_history 테이블에도 저장 (기존 테이블 호환성)
      const { data: historyData, error: historyError } = await supabase
        .from('search_history')
        .insert({
          user_id: userId,
          keyword: keyword,
          results_count: results_count || 0,
          technology_field: technology_field,
          field_confidence: field_confidence
        })
        .select();

      if (historyError) {
        console.warn('search_history 저장 경고 (무시 가능):', historyError);
        // search_history 저장 실패는 무시하고 계속 진행
      }

      console.log('✅ [search-history] 검색 기록 저장 완료');

      return res.status(200).json({
        success: true,
        data: {
          activity: activityData?.[0],
          history: historyData?.[0]
        }
      });
    } catch (error) {
      console.error('검색 기록 저장 중 오류:', error);
      return res.status(500).json({
        success: false,
        error: '검색 기록 저장 중 오류가 발생했습니다.'
      });
    }
  }

  if (req.method === 'PATCH') {
    const { keyword, technology_field, field_confidence } = req.body;

    if (!keyword) {
      return res.status(400).json({
        success: false,
        error: '키워드가 필요합니다.'
      });
    }

    try {
      // search_history 테이블에서 최근 검색 기록 업데이트
      const { data: updatedHistory, error: historyError } = await supabase
        .from('search_history')
        .update({
          technology_field,
          field_confidence
        })
        .eq('user_id', userId)
        .eq('keyword', keyword)
        .order('created_at', { ascending: false })
        .limit(1)
        .select();

      if (historyError) {
        console.error('검색 기록 업데이트 오류:', historyError);
        return res.status(500).json({
          success: false,
          error: '검색 기록 업데이트에 실패했습니다.'
        });
      }

      return res.status(200).json({
        success: true,
        data: updatedHistory
      });
    } catch (error) {
      console.error('검색 기록 업데이트 중 오류:', error);
      return res.status(500).json({
        success: false,
        error: '검색 기록 업데이트 중 오류가 발생했습니다.'
      });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}

module.exports = async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // OPTIONS 요청 처리
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET, POST, PATCH 요청만 허용
  if (req.method !== 'GET' && req.method !== 'POST' && req.method !== 'PATCH') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed',
      message: 'Only GET, POST and PATCH methods are allowed for search history'
    });
  }

  try {
    const pathParts = req.url.split('/').filter(Boolean);
    const userId = pathParts[pathParts.length - 1]; // URL의 마지막 부분이 userId라고 가정

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId가 필요합니다.'
      });
    }

    return await handleSearchHistory(req, res, userId);
  } catch (error) {
    console.error('❌ API 오류:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
};