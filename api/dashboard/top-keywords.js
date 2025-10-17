import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 검색어 순위 10개 가져오기
    const { data: searchData, error: searchError } = await supabase
      .from('search_history')
      .select('keyword')
      .not('keyword', 'is', null)
      .not('keyword', 'eq', '');

    if (searchError) {
      throw searchError;
    }

    // 검색어 빈도 계산
    const keywordCount = {};
    searchData.forEach(item => {
      const keyword = item.keyword.trim().toLowerCase();
      if (keyword) {
        keywordCount[keyword] = (keywordCount[keyword] || 0) + 1;
      }
    });

    // 상위 10개 검색어 정렬
    const topKeywords = Object.entries(keywordCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([keyword, count], index) => ({
        rank: index + 1,
        keyword,
        count
      }));

    return res.status(200).json({
      success: true,
      data: topKeywords
    });

  } catch (error) {
    console.error('Top keywords error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
}