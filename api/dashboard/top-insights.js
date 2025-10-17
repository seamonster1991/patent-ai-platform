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

    // 1. 상위 10개 검색어 조회
    const topSearchQueriesResult = await supabase
      .from('search_history')
      .select('keyword')
      .gte('created_at', periodStart)
      .not('keyword', 'is', null)
      .not('keyword', 'eq', '');

    // 검색어 빈도 계산
    const searchKeywordCounts = {};
    topSearchQueriesResult.data?.forEach(item => {
      const keyword = item.keyword.trim().toLowerCase();
      if (keyword) {
        searchKeywordCounts[keyword] = (searchKeywordCounts[keyword] || 0) + 1;
      }
    });

    // 상위 10개 검색어 정렬
    const topSearchQueries = Object.entries(searchKeywordCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([keyword, count], index) => ({
        rank: index + 1,
        keyword,
        search_count: count,
        percentage: Math.round((count / (topSearchQueriesResult.data?.length || 1)) * 10000) / 100
      }));

    // 2. 상위 10개 특허 분석 주제 조회
    // reports 테이블에서 patent_id를 기반으로 분석
    const topPatentAnalysisResult = await supabase
      .from('reports')
      .select('patent_id, metadata')
      .gte('created_at', periodStart)
      .not('patent_id', 'is', null)
      .not('patent_id', 'eq', '');

    // 특허 ID 빈도 계산
    const patentCounts = {};
    const patentMetadata = {};
    
    topPatentAnalysisResult.data?.forEach(item => {
      const patentId = item.patent_id;
      if (patentId) {
        patentCounts[patentId] = (patentCounts[patentId] || 0) + 1;
        
        // 메타데이터에서 특허 제목이나 기술 분야 추출
        if (item.metadata && typeof item.metadata === 'object') {
          patentMetadata[patentId] = {
            title: item.metadata.title || item.metadata.patent_title || patentId,
            technology_field: item.metadata.technology_field || item.metadata.ipc_code || 'Unknown',
            applicant: item.metadata.applicant || item.metadata.patent_applicant || 'Unknown'
          };
        } else {
          patentMetadata[patentId] = {
            title: patentId,
            technology_field: 'Unknown',
            applicant: 'Unknown'
          };
        }
      }
    });

    // 상위 10개 특허 분석 주제 정렬
    const topPatentAnalysis = Object.entries(patentCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([patentId, count], index) => ({
        rank: index + 1,
        patent_id: patentId,
        analysis_count: count,
        title: patentMetadata[patentId]?.title || patentId,
        technology_field: patentMetadata[patentId]?.technology_field || 'Unknown',
        applicant: patentMetadata[patentId]?.applicant || 'Unknown',
        percentage: Math.round((count / (topPatentAnalysisResult.data?.length || 1)) * 10000) / 100
      }));

    // 3. 기술 분야별 분석 (추가 인사이트)
    const technologyFieldCounts = {};
    topPatentAnalysisResult.data?.forEach(item => {
      if (item.metadata && item.metadata.technology_field) {
        const field = item.metadata.technology_field;
        technologyFieldCounts[field] = (technologyFieldCounts[field] || 0) + 1;
      }
    });

    const topTechnologyFields = Object.entries(technologyFieldCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([field, count], index) => ({
        rank: index + 1,
        technology_field: field,
        analysis_count: count,
        percentage: Math.round((count / (topPatentAnalysisResult.data?.length || 1)) * 10000) / 100
      }));

    // 4. 검색어와 특허 분석의 연관성 분석
    const searchToPatentCorrelation = [];
    
    // 검색 기록과 리포트 생성 연결 분석
    const correlationResult = await supabase
      .from('search_history')
      .select(`
        keyword,
        reports!inner(patent_id, metadata)
      `)
      .gte('created_at', periodStart)
      .not('keyword', 'is', null)
      .limit(100);

    const keywordToPatentMap = {};
    correlationResult.data?.forEach(item => {
      const keyword = item.keyword.trim().toLowerCase();
      if (keyword && item.reports) {
        item.reports.forEach(report => {
          if (report.patent_id) {
            if (!keywordToPatentMap[keyword]) {
              keywordToPatentMap[keyword] = new Set();
            }
            keywordToPatentMap[keyword].add(report.patent_id);
          }
        });
      }
    });

    // 응답 데이터 구성
    const response = {
      period,
      period_start: periodStart,
      period_end: now.toISOString(),
      top_search_queries: topSearchQueries,
      top_patent_analysis: topPatentAnalysis,
      top_technology_fields: topTechnologyFields,
      search_statistics: {
        total_unique_keywords: Object.keys(searchKeywordCounts).length,
        total_searches: topSearchQueriesResult.data?.length || 0,
        avg_searches_per_keyword: Object.keys(searchKeywordCounts).length > 0 ? 
          Math.round(((topSearchQueriesResult.data?.length || 0) / Object.keys(searchKeywordCounts).length) * 100) / 100 : 0
      },
      patent_statistics: {
        total_unique_patents: Object.keys(patentCounts).length,
        total_analyses: topPatentAnalysisResult.data?.length || 0,
        avg_analyses_per_patent: Object.keys(patentCounts).length > 0 ? 
          Math.round(((topPatentAnalysisResult.data?.length || 0) / Object.keys(patentCounts).length) * 100) / 100 : 0
      },
      generated_at: now.toISOString()
    };

    res.status(200).json(response);

  } catch (error) {
    console.error('Top insights API error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}