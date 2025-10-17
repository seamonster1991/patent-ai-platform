import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 리포트 분야별 생성 수 가져오기
    const { data: reportData, error: reportError } = await supabase
      .from('reports')
      .select('report_type')
      .not('report_type', 'is', null);

    if (reportError) {
      throw reportError;
    }

    // 리포트 분야별 카운트 계산
    const categoryCount = {};
    reportData.forEach(item => {
      const category = item.report_type;
      if (category) {
        categoryCount[category] = (categoryCount[category] || 0) + 1;
      }
    });

    // 분야명 매핑
    const categoryNames = {
      'market': '시장분석',
      'business': '비즈니스인사이트',
      'patent': '특허분석',
      'technology': '기술동향',
      'competitor': '경쟁사분석',
      'trend': '트렌드분석',
      'investment': '투자분석',
      'regulation': '규제분석'
    };

    // 상위 10개 분야 정렬
    const topCategories = Object.entries(categoryCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([category, count], index) => ({
        rank: index + 1,
        category,
        category_name: categoryNames[category] || category,
        count
      }));

    return res.status(200).json({
      success: true,
      data: topCategories
    });

  } catch (error) {
    console.error('Top report categories error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
}