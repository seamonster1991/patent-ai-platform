// 사용자 키워드 분석 통계 API
const { createClient } = require('@supabase/supabase-js');

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

let supabase = null;
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
}

// 기간별 날짜 계산
function getDateRange(period) {
  const endDate = new Date();
  const startDate = new Date();
  
  switch (period) {
    case '7d':
      startDate.setDate(endDate.getDate() - 7);
      break;
    case '30d':
      startDate.setDate(endDate.getDate() - 30);
      break;
    case '90d':
      startDate.setDate(endDate.getDate() - 90);
      break;
    default:
      startDate.setDate(endDate.getDate() - 30);
  }
  
  return {
    start: startDate.toISOString().split('T')[0],
    end: endDate.toISOString().split('T')[0]
  };
}

// 분야별 분포 데이터 조회
async function getFieldDistribution(userId, period = '30d', field = null) {
  if (!supabase) {
    throw new Error('Supabase not initialized');
  }

  const { start, end } = getDateRange(period);
  
  let query = supabase
    .from('search_keyword_analytics')
    .select('technology_field, search_count')
    .eq('user_id', userId)
    .gte('analytics_date', start)
    .lte('analytics_date', end);

  if (field) {
    query = query.eq('technology_field', field);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Database error: ${error.message}`);
  }

  // 분야별 합계 계산
  const distribution = {};
  data.forEach(item => {
    const field = item.technology_field || 'Other';
    distribution[field] = (distribution[field] || 0) + (item.search_count || 0);
  });

  // 객체를 배열로 변환하고 percentage 계산
  const totalCount = Object.values(distribution).reduce((sum, count) => sum + count, 0);
  const distributionArray = Object.entries(distribution).map(([field, count]) => ({
    field,
    count,
    percentage: totalCount > 0 ? (count / totalCount) * 100 : 0
  }));

  return distributionArray;
}

// 시간별 검색 트렌드 데이터 조회
async function getTrendData(userId, period = '30d') {
  if (!supabase) {
    throw new Error('Supabase not initialized');
  }

  const { start, end } = getDateRange(period);
  
  const { data, error } = await supabase
    .from('search_keyword_analytics')
    .select('analytics_date, search_count')
    .eq('user_id', userId)
    .gte('analytics_date', start)
    .lte('analytics_date', end)
    .order('analytics_date', { ascending: true });

  if (error) {
    throw new Error(`Database error: ${error.message}`);
  }

  // 날짜별 합계 계산
  const trendMap = {};
  data.forEach(item => {
    const date = item.analytics_date;
    trendMap[date] = (trendMap[date] || 0) + (item.search_count || 0);
  });

  // 배열 형태로 변환
  const trendData = Object.entries(trendMap).map(([date, count]) => ({
    date,
    count
  }));

  return trendData;
}

// 인기 키워드 TOP 10 조회
async function getTopKeywords(userId, period = '30d') {
  if (!supabase) {
    throw new Error('Supabase not initialized');
  }

  const { start, end } = getDateRange(period);
  
  const { data, error } = await supabase
    .from('search_keyword_analytics')
    .select('keyword, technology_field, search_count')
    .eq('user_id', userId)
    .gte('analytics_date', start)
    .lte('analytics_date', end)
    .order('search_count', { ascending: false })
    .limit(10);

  if (error) {
    throw new Error(`Database error: ${error.message}`);
  }

  return data.map(item => ({
    keyword: item.keyword,
    field: item.technology_field,
    count: item.search_count
  }));
}

// 기본 테스트 데이터 생성
function createDefaultAnalytics() {
  const fieldData = {
    'AI': 25,
    'IoT': 18,
    'Bio': 12,
    'Auto': 15,
    'Semiconductor': 20,
    'Energy': 8,
    'Other': 2
  };
  
  // 총 개수 계산
  const totalCount = Object.values(fieldData).reduce((sum, count) => sum + count, 0);
  
  // 배열 형태로 변환하고 percentage 계산
  const fieldDistribution = Object.entries(fieldData).map(([field, count]) => ({
    field,
    count,
    percentage: (count / totalCount) * 100
  }));

  return {
    fieldDistribution,
    searchTrends: [
      { date: '2025-01-20', count: 5 },
      { date: '2025-01-21', count: 8 },
      { date: '2025-01-22', count: 12 },
      { date: '2025-01-23', count: 7 },
      { date: '2025-01-24', count: 15 },
      { date: '2025-01-25', count: 10 },
      { date: '2025-01-26', count: 18 },
      { date: '2025-01-27', count: 14 }
    ],
    topKeywords: [
      { keyword: '딥러닝', field: 'AI', count: 15 },
      { keyword: '반도체', field: 'Semiconductor', count: 12 },
      { keyword: '자율주행', field: 'Auto', count: 10 },
      { keyword: '센서', field: 'IoT', count: 8 },
      { keyword: '바이오센서', field: 'Bio', count: 7 },
      { keyword: '머신러닝', field: 'AI', count: 6 },
      { keyword: '전기차', field: 'Auto', count: 5 },
      { keyword: '스마트홈', field: 'IoT', count: 4 },
      { keyword: '태양광', field: 'Energy', count: 3 },
      { keyword: '유전자', field: 'Bio', count: 2 }
    ]
  };
}

module.exports = async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, period = '30d', field } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // 실제 데이터 조회 시도
    try {
      const [fieldDistribution, trendData, topKeywords] = await Promise.all([
        getFieldDistribution(userId, period, field),
        getTrendData(userId, period),
        getTopKeywords(userId, period)
      ]);

      // 데이터가 없으면 기본 데이터 사용
      if (fieldDistribution.length === 0 && trendData.length === 0) {
        console.log('No analytics data found, using default data');
        return res.status(200).json(createDefaultAnalytics());
      }

      return res.status(200).json({
        fieldDistribution,
        searchTrends: trendData,
        topKeywords,
        period,
        timestamp: new Date().toISOString()
      });

    } catch (dbError) {
      console.error('Database query error:', dbError);
      // 데이터베이스 오류 시 기본 데이터 반환
      return res.status(200).json(createDefaultAnalytics());
    }

  } catch (error) {
    console.error('Keyword analytics API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}