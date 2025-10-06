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

  return res.status(405).json({ success: false, error: 'Method not allowed' });
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

  // POST 요청만 허용
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed',
      message: 'Only GET method is allowed for search history'
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