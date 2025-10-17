import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { limit = 10 } = req.query;

    // 최근 활동 데이터 조회 (검색, 리포트 생성, 사용자 가입)
    const [
      recentSearches,
      recentReports,
      recentUsers
    ] = await Promise.all([
      // 최근 검색 활동
      supabase
        .from('search_history')
        .select(`
          id,
          keyword,
          created_at,
          user_id,
          users!inner(email, name)
        `)
        .order('created_at', { ascending: false })
        .limit(Math.floor(limit / 3)),

      // 최근 리포트 생성
      supabase
        .from('ai_analysis_reports')
        .select(`
          id,
          invention_title,
          created_at,
          user_id,
          users!inner(email, name)
        `)
        .order('created_at', { ascending: false })
        .limit(Math.floor(limit / 3)),

      // 최근 사용자 가입
      supabase
        .from('users')
        .select('id, email, name, created_at')
        .order('created_at', { ascending: false })
        .limit(Math.floor(limit / 3))
    ]);

    // 활동 데이터 통합 및 정렬
    const activities = [];

    // 검색 활동 추가
    if (recentSearches.data) {
      recentSearches.data.forEach(search => {
        activities.push({
          id: `search_${search.id}`,
          type: 'search',
          title: `검색: "${search.keyword}"`,
          description: `사용자가 "${search.keyword}" 키워드로 특허를 검색했습니다.`,
          user: search.users?.name || search.users?.email || '익명',
          timestamp: search.created_at,
          icon: 'search'
        });
      });
    }

    // 리포트 생성 활동 추가
    if (recentReports.data) {
      recentReports.data.forEach(report => {
        activities.push({
          id: `report_${report.id}`,
          type: 'report',
          title: `리포트 생성: "${report.invention_title || '제목 없음'}"`,
          description: `사용자가 새로운 특허 분석 리포트를 생성했습니다.`,
          user: report.users?.name || report.users?.email || '익명',
          timestamp: report.created_at,
          icon: 'document'
        });
      });
    }

    // 사용자 가입 활동 추가
    if (recentUsers.data) {
      recentUsers.data.forEach(user => {
        activities.push({
          id: `user_${user.id}`,
          type: 'signup',
          title: '새 사용자 가입',
          description: `새로운 사용자가 플랫폼에 가입했습니다.`,
          user: user.name || user.email || '익명',
          timestamp: user.created_at,
          icon: 'user-plus'
        });
      });
    }

    // 시간순으로 정렬하고 제한
    const sortedActivities = activities
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, parseInt(limit));

    res.status(200).json({
      success: true,
      data: sortedActivities
    });

  } catch (error) {
    console.error('Recent activities error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recent activities'
    });
  }
}