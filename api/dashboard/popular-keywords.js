import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Service Role Key 사용

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { days = 30, limit = 20 } = req.query;

    // 날짜 범위 계산
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - parseInt(days) * 24 * 60 * 60 * 1000);

    // 검색 로그에서 키워드 데이터 조회
    const { data: searchLogs, error } = await supabase
      .from('search_history')
      .select('keyword, created_at')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .not('keyword', 'is', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    console.log('Search logs found:', searchLogs?.length || 0);

    // 키워드 빈도 분석
    const keywordFrequency = {};
    const keywordTrends = {};

    if (searchLogs && searchLogs.length > 0) {
      searchLogs.forEach(log => {
        if (log.keyword) {
          // 전체 키워드를 하나의 키워드로 처리
          const fullKeyword = log.keyword.trim().toLowerCase();
          if (fullKeyword.length > 0) {
            keywordFrequency[fullKeyword] = (keywordFrequency[fullKeyword] || 0) + 1;
            
            // 일별 트렌드 데이터
            const date = new Date(log.created_at).toISOString().split('T')[0];
            if (!keywordTrends[fullKeyword]) {
              keywordTrends[fullKeyword] = {};
            }
            keywordTrends[fullKeyword][date] = (keywordTrends[fullKeyword][date] || 0) + 1;
          }

          // 개별 단어도 분석 (2글자 이상)
          const words = log.keyword.toLowerCase().split(/[\s,]+/).filter(word => word.length > 1);
          words.forEach(word => {
            if (word.length > 1) {
              const cleanWord = word.replace(/[^\w가-힣]/g, '');
              if (cleanWord.length > 1) {
                keywordFrequency[cleanWord] = (keywordFrequency[cleanWord] || 0) + 1;
                
                const date = new Date(log.created_at).toISOString().split('T')[0];
                if (!keywordTrends[cleanWord]) {
                  keywordTrends[cleanWord] = {};
                }
                keywordTrends[cleanWord][date] = (keywordTrends[cleanWord][date] || 0) + 1;
              }
            }
          });
        }
      });
    }

    // 상위 키워드 정렬
    const popularKeywords = Object.entries(keywordFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, parseInt(limit))
      .map(([keyword, count], index) => {
        // 트렌드 계산 (최근 7일 vs 이전 7일)
        const recent7Days = [];
        const previous7Days = [];
        
        for (let i = 0; i < 7; i++) {
          const recentDate = new Date(endDate.getTime() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          const previousDate = new Date(endDate.getTime() - (i + 7) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          
          recent7Days.push(keywordTrends[keyword]?.[recentDate] || 0);
          previous7Days.push(keywordTrends[keyword]?.[previousDate] || 0);
        }

        const recentSum = recent7Days.reduce((sum, val) => sum + val, 0);
        const previousSum = previous7Days.reduce((sum, val) => sum + val, 0);
        
        let trendDirection = 'stable';
        let trendPercentage = 0;
        
        if (previousSum > 0) {
          trendPercentage = ((recentSum - previousSum) / previousSum * 100);
          if (trendPercentage > 10) trendDirection = 'up';
          else if (trendPercentage < -10) trendDirection = 'down';
        } else if (recentSum > 0) {
          trendDirection = 'up';
          trendPercentage = 100;
        }

        return {
          rank: index + 1,
          keyword,
          count,
          percentage: searchLogs.length > 0 ? ((count / searchLogs.length) * 100).toFixed(2) : '0.00',
          trend: {
            direction: trendDirection,
            percentage: Math.abs(trendPercentage).toFixed(1)
          },
          dailyData: keywordTrends[keyword] || {}
        };
      });

    // 카테고리별 분류 (간단한 분류)
    const categories = {
      'AI/기술': ['ai', 'artificial', 'intelligence', '인공지능', '머신러닝', 'machine', 'learning', '딥러닝', 'deep'],
      '통신/전자': ['통신', '네트워크', 'network', '무선', 'wireless', '5g', '전자', 'electronic'],
      '자동차': ['자동차', 'vehicle', 'car', '전기차', 'electric', '자율주행', 'autonomous'],
      '의료/바이오': ['의료', 'medical', '바이오', 'bio', '헬스케어', 'healthcare', '제약', 'pharmaceutical'],
      '에너지': ['에너지', 'energy', '배터리', 'battery', '태양광', 'solar', '풍력', 'wind']
    };

    const categorizedKeywords = {};
    Object.keys(categories).forEach(category => {
      categorizedKeywords[category] = popularKeywords.filter(item => 
        categories[category].some(term => 
          item.keyword.toLowerCase().includes(term.toLowerCase())
        )
      );
    });

    // 기타 카테고리
    const categorizedKeywordsList = Object.values(categorizedKeywords).flat();
    categorizedKeywords['기타'] = popularKeywords.filter(item => 
      !categorizedKeywordsList.some(categorized => categorized.keyword === item.keyword)
    );

    // PRD 요구사항: 상위 10개 검색어를 빈도순으로 표시
    const top10Keywords = popularKeywords.slice(0, 10).map((item, index) => ({
      rank: index + 1,
      keyword: item.keyword,
      count: item.count,
      percentage: item.percentage
    }));

    const result = {
      period: {
        days: parseInt(days),
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      },
      summary: {
        totalSearches: searchLogs?.length || 0,
        uniqueKeywords: Object.keys(keywordFrequency).length,
        topKeywordCount: popularKeywords[0]?.count || 0,
        topKeyword: popularKeywords[0]?.keyword || null
      },
      // PRD 요구사항: 상위 10개 검색어 순위
      top_keywords: top10Keywords,
      // 추가 상세 데이터
      all_keywords: popularKeywords,
      categorized_keywords: categorizedKeywords,
      trends: {
        rising: popularKeywords.filter(k => k.trend.direction === 'up').slice(0, 5),
        falling: popularKeywords.filter(k => k.trend.direction === 'down').slice(0, 5)
      }
    };

    console.log('Returning result with', top10Keywords.length, 'top keywords');

    res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Popular keywords error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch popular keywords',
      details: error.message
    });
  }
}