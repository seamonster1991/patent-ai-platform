import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// 공통 헤더 설정 함수
function setCommonHeaders(res) {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// 인기 키워드 조회 함수
async function getPopularKeywords(supabase, limit = 10) {
  try {
    const { data, error } = await supabase
      .from('search_history')
      .select('keyword')
      .not('keyword', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1000);

    if (error) {
      console.error('Error fetching search logs:', error);
      return [];
    }

    const keywordCounts = {};
    data?.forEach(log => {
      if (log.keyword) {
        keywordCounts[log.keyword] = (keywordCounts[log.keyword] || 0) + 1;
      }
    });

    return Object.entries(keywordCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit)
      .map(([keyword, count]) => ({ keyword, count }));
  } catch (error) {
    console.error('Error in getPopularKeywords:', error);
    return [];
  }
}

export default async function handler(req, res) {
  setCommonHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ 
      error: 'Database configuration error',
      details: 'Missing environment variables'
    });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { limit } = req.query;

    const keywords = await getPopularKeywords(supabase, parseInt(limit) || 10);
    return res.status(200).json({ success: true, data: keywords });

  } catch (error) {
    console.error('Popular keywords API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}