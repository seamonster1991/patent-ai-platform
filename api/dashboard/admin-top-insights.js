import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ 
      error: 'Database configuration error',
      details: 'Missing environment variables'
    });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { period = '30d' } = req.query;

    // 기간 계산
    const now = new Date();
    let periodStart;
    
    switch (period) {
      case '7d':
        periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        break;
      case '30d':
        periodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
        break;
      case '90d':
        periodStart = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
        break;
      default:
        periodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    }

    // 1. 상위 검색어 조회 (검색 기록에서)
    const topSearchQueriesResult = await supabase
      .from('search_history')
      .select('search_query')
      .gte('created_at', periodStart)
      .not('search_query', 'is', null)
      .not('search_query', 'eq', '');

    // 검색어 빈도 계산
    const searchQueryCounts = {};
    topSearchQueriesResult.data?.forEach(item => {
      const query = item.search_query?.trim().toLowerCase();
      if (query && query.length > 0) {
        searchQueryCounts[query] = (searchQueryCounts[query] || 0) + 1;
      }
    });

    // 상위 10개 검색어 정렬
    const topSearchQueries = Object.entries(searchQueryCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([query, count], index) => ({
        rank: index + 1,
        query,
        count
      }));

    // 2. 상위 특허 분석 주제 조회 (리포트에서)
    const topPatentAnalysisResult = await supabase
      .from('reports')
      .select('title, content, search_keywords')
      .gte('created_at', periodStart)
      .not('title', 'is', null)
      .not('title', 'eq', '');

    // 특허 분석 주제 빈도 계산 (제목과 키워드에서 추출)
    const patentTopicCounts = {};
    
    topPatentAnalysisResult.data?.forEach(item => {
      // 제목에서 키워드 추출
      if (item.title) {
        const titleWords = item.title.toLowerCase()
          .replace(/[^\w\s가-힣]/g, ' ')
          .split(/\s+/)
          .filter(word => word.length > 2);
        
        titleWords.forEach(word => {
          patentTopicCounts[word] = (patentTopicCounts[word] || 0) + 1;
        });
      }

      // 검색 키워드에서 추출
      if (item.search_keywords) {
        try {
          const keywords = typeof item.search_keywords === 'string' 
            ? JSON.parse(item.search_keywords) 
            : item.search_keywords;
          
          if (Array.isArray(keywords)) {
            keywords.forEach(keyword => {
              if (typeof keyword === 'string' && keyword.length > 2) {
                const cleanKeyword = keyword.toLowerCase().trim();
                patentTopicCounts[cleanKeyword] = (patentTopicCounts[cleanKeyword] || 0) + 1;
              }
            });
          }
        } catch (e) {
          // JSON 파싱 실패 시 무시
        }
      }
    });

    // 상위 10개 특허 분석 주제 정렬
    const topPatentTopics = Object.entries(patentTopicCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([topic, count], index) => ({
        rank: index + 1,
        topic,
        count
      }));

    // 3. 기술 분야별 분석 (technology_field_analysis 테이블 활용)
    const technologyFieldsResult = await supabase
      .from('technology_field_analysis')
      .select('field_name, analysis_count')
      .gte('created_at', periodStart)
      .order('analysis_count', { ascending: false })
      .limit(10);

    const topTechnologyFields = technologyFieldsResult.data?.map((item, index) => ({
      rank: index + 1,
      field: item.field_name,
      count: item.analysis_count || 0
    })) || [];

    // 4. 인기 특허 조회 (patent_views 테이블 활용)
    const popularPatentsResult = await supabase
      .from('patent_views')
      .select('patent_number, view_count')
      .gte('created_at', periodStart)
      .order('view_count', { ascending: false })
      .limit(10);

    const topPatents = popularPatentsResult.data?.map((item, index) => ({
      rank: index + 1,
      patent_number: item.patent_number,
      views: item.view_count || 0
    })) || [];

    return res.status(200).json({
      success: true,
      data: {
        period,
        top_search_queries: topSearchQueries,
        top_patent_topics: topPatentTopics,
        top_technology_fields: topTechnologyFields,
        top_patents: topPatents,
        generated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Admin top insights error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
}