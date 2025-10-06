require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = async (req, res) => {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { pathname } = new URL(req.url, `http://${req.headers.host}`);
    const pathParts = pathname.split('/').filter(Boolean);
    
    // /api/main/... 형태로 라우팅
    if (pathParts[0] === 'api' && pathParts[1] === 'main') {
      const endpoint = pathParts.slice(2).join('/');
      
      switch (endpoint) {
        case 'health':
          return res.status(200).json({ 
            status: 'ok', 
            timestamp: new Date().toISOString(),
            message: 'API server is running'
          });

        case 'users/stats':
          return await handleUserStats(req, res);
          
        case 'search':
          return await handleSearch(req, res);
          
        case 'ai-analysis':
          return await handleAiAnalysis(req, res);
          
        case 'documents':
          return await handleDocuments(req, res);
          
        case 'generate-report':
          return await handleGenerateReport(req, res);
          
        default:
          return res.status(404).json({ error: 'Endpoint not found' });
      }
    }
    
    return res.status(404).json({ error: 'Not found' });
    
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// 사용자 통계 처리
async function handleUserStats(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const userId = url.searchParams.get('userId');

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    // 총 사용자 수
    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    // 활성 사용자 수 (최근 30일 내 로그인)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { count: activeUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('last_sign_in_at', thirtyDaysAgo.toISOString());

    // 오늘 가입한 사용자 수
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { count: newUsersToday } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString());

    // 총 검색 수
    const { count: totalSearches } = await supabase
      .from('search_history')
      .select('*', { count: 'exact', head: true });

    // 오늘 검색 수
    const { count: searchesToday } = await supabase
      .from('search_history')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString());

    // 총 리포트 수
    const { count: totalReports } = await supabase
      .from('reports')
      .select('*', { count: 'exact', head: true });

    // 오늘 리포트 수
    const { count: reportsToday } = await supabase
      .from('reports')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString());

    // 사용자별 요약 데이터
    const { data: summary } = await supabase
      .from('user_activity_summary')
      .select('*')
      .eq('user_id', userId)
      .single();

    // 최근 리포트
    const { data: recent_reports } = await supabase
      .from('reports')
      .select('id, title, created_at, status')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    // 검색 트렌드 (최근 7일)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { data: searchTrends } = await supabase
      .from('search_history')
      .select('created_at')
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: true });

    // 일별 검색 수 계산
    const dailyCounts = {};
    searchTrends?.forEach(search => {
      const date = new Date(search.created_at).toISOString().split('T')[0];
      dailyCounts[date] = (dailyCounts[date] || 0) + 1;
    });

    return res.status(200).json({
      totalUsers: totalUsers || 0,
      activeUsers: activeUsers || 0,
      newUsersToday: newUsersToday || 0,
      totalSearches: totalSearches || 0,
      searchesToday: searchesToday || 0,
      totalReports: totalReports || 0,
      reportsToday: reportsToday || 0,
      summary: summary || {},
      recent_reports: recent_reports || [],
      searchTrends: dailyCounts
    });

  } catch (error) {
    console.error('Error fetching user stats:', error);
    return res.status(500).json({ error: 'Failed to fetch user statistics' });
  }
}

// 검색 처리
async function handleSearch(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { query, userId, filters } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    // 검색 기록 저장
    if (userId) {
      await supabase
        .from('search_history')
        .insert({
          user_id: userId,
          query: query,
          filters: filters || {}
        });
    }

    // 실제 검색 로직은 여기에 구현
    // 현재는 더미 데이터 반환
    const results = [
      {
        id: '1',
        title: `검색 결과: ${query}`,
        description: '검색 결과 설명',
        relevance: 0.95
      }
    ];

    return res.status(200).json({
      results,
      total: results.length,
      query
    });

  } catch (error) {
    console.error('Search error:', error);
    return res.status(500).json({ error: 'Search failed' });
  }
}

// AI 분석 처리
async function handleAiAnalysis(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text, analysisType, userId } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    // AI 분석 로직 (더미 응답)
    const analysis = {
      summary: `${text}에 대한 AI 분석 결과`,
      keywords: ['키워드1', '키워드2', '키워드3'],
      sentiment: 'positive',
      confidence: 0.85
    };

    return res.status(200).json(analysis);

  } catch (error) {
    console.error('AI Analysis error:', error);
    return res.status(500).json({ error: 'AI analysis failed' });
  }
}

// 문서 처리
async function handleDocuments(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const userId = url.searchParams.get('userId');

    if (req.method === 'GET') {
      // 문서 목록 조회
      const { data: documents } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      return res.status(200).json(documents || []);
    }

    if (req.method === 'POST') {
      // 문서 업로드
      const { title, content, type } = req.body;

      const { data: document } = await supabase
        .from('documents')
        .insert({
          user_id: userId,
          title,
          content,
          type: type || 'text'
        })
        .select()
        .single();

      return res.status(201).json(document);
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Documents error:', error);
    return res.status(500).json({ error: 'Documents operation failed' });
  }
}

// 리포트 생성 처리
async function handleGenerateReport(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { title, data, userId } = req.body;

    if (!title || !userId) {
      return res.status(400).json({ error: 'Title and userId are required' });
    }

    // 리포트 생성
    const { data: report } = await supabase
      .from('reports')
      .insert({
        user_id: userId,
        title,
        content: data || {},
        status: 'completed'
      })
      .select()
      .single();

    return res.status(201).json(report);

  } catch (error) {
    console.error('Generate report error:', error);
    return res.status(500).json({ error: 'Report generation failed' });
  }
}