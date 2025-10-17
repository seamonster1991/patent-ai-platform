import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

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

    // 검색 로그에서 특허 관련 데이터 조회
    const { data: searchLogs, error: searchError } = await supabase
      .from('search_history')
      .select(`
        id,
        keyword,
        search_results,
        created_at,
        user_id
      `)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .not('search_results', 'is', null);

    if (searchError) {
      throw searchError;
    }

    // 리포트 생성 데이터도 조회 (인기도 측정용)
    const { data: reportLogs, error: reportError } = await supabase
      .from('reports')
      .select(`
        id,
        patent_id,
        report_type,
        created_at,
        user_id
      `)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .not('patent_id', 'is', null);

    if (reportError) {
      console.warn('Report logs error:', reportError);
    }

    // 특허 인기도 분석
    const patentPopularity = {};
    const patentDetails = {};

    // 검색 결과에서 특허 추출
    if (searchLogs) {
      searchLogs.forEach(log => {
        try {
          const results = typeof log.search_results === 'string' ? JSON.parse(log.search_results) : log.search_results;
          if (results && Array.isArray(results)) {
            results.forEach(patent => {
              if (patent && patent.id) {
                const patentId = patent.id;
                patentPopularity[patentId] = (patentPopularity[patentId] || 0) + 1;
                
                // 특허 상세 정보 저장
                if (!patentDetails[patentId]) {
                  patentDetails[patentId] = {
                    id: patentId,
                    title: patent.title || patent.invention_title || '제목 없음',
                    applicant: patent.applicant || patent.applicant_name || '출원인 정보 없음',
                    application_date: patent.application_date || patent.filing_date || null,
                    publication_number: patent.publication_number || patent.patent_number || null,
                    ipc_code: patent.ipc_code || patent.classification || null,
                    abstract: patent.abstract || patent.summary || null,
                    searchCount: 0,
                    reportCount: 0,
                    lastSearched: log.created_at
                  };
                }
                
                patentDetails[patentId].searchCount = patentPopularity[patentId];
                if (new Date(log.created_at) > new Date(patentDetails[patentId].lastSearched)) {
                  patentDetails[patentId].lastSearched = log.created_at;
                }
              }
            });
          }
        } catch (e) {
          console.warn('Error parsing search results:', e);
        }
      });
    }

    // 리포트에서 특허 추출
    if (reportLogs) {
      reportLogs.forEach(report => {
        try {
          const patentId = report.patent_id;
          if (patentId) {
            if (patentDetails[patentId]) {
              patentDetails[patentId].reportCount += 1;
            } else {
              // 리포트에만 있는 특허 (검색 결과에는 없음)
              patentDetails[patentId] = {
                id: patentId,
                title: `특허 ${patentId}`,
                applicant: '정보 없음',
                application_date: null,
                publication_number: patentId,
                ipc_code: null,
                abstract: null,
                searchCount: 0,
                reportCount: 1,
                lastSearched: report.created_at
              };
            }
          }
        } catch (e) {
          console.warn('Error processing report data:', e);
        }
      });
    }

    // 인기 특허 정렬 및 제한
    const popularPatents = Object.values(patentDetails)
      .sort((a, b) => {
        // 검색 횟수 우선, 리포트 생성 횟수 보조
        const scoreA = a.searchCount * 2 + a.reportCount;
        const scoreB = b.searchCount * 2 + b.reportCount;
        return scoreB - scoreA;
      })
      .slice(0, parseInt(limit))
      .map((patent, index) => ({
        rank: index + 1,
        ...patent,
        popularityScore: patent.searchCount * 2 + patent.reportCount,
        trend: calculatePatentTrend(patent, searchLogs, days)
      }));

    // 카테고리별 분류
    const categories = categorizePatents(popularPatents);

    // 통계 계산
    const totalSearches = searchLogs?.length || 0;
    const totalReports = reportLogs?.length || 0;
    const uniquePatents = Object.keys(patentDetails).length;

    // PRD 요구사항: 상위 10개 분석된 특허를 분석 횟수순으로 표시
    const top10Patents = popularPatents.slice(0, 10).map((patent, index) => ({
      rank: index + 1,
      patent_number: patent.publication_number || patent.id,
      title: patent.title,
      analysis_count: patent.reportCount + patent.searchCount, // 총 분석 횟수
      search_count: patent.searchCount,
      report_count: patent.reportCount,
      applicant: patent.applicant,
      last_analyzed: patent.lastSearched
    }));

    const result = {
      period: {
        days: parseInt(days),
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      },
      summary: {
        totalSearches,
        totalReports,
        uniquePatents,
        topPatentSearches: popularPatents[0]?.searchCount || 0,
        topPatentTitle: popularPatents[0]?.title || null
      },
      // PRD 요구사항: 상위 10개 특허 순위
      top_patents: top10Patents,
      // 추가 상세 데이터
      all_patents: popularPatents,
      categories,
      trends: {
        mostSearched: popularPatents.slice(0, 5),
        mostReported: popularPatents
          .sort((a, b) => b.reportCount - a.reportCount)
          .slice(0, 5),
        recentlyActive: popularPatents
          .sort((a, b) => new Date(b.lastSearched) - new Date(a.lastSearched))
          .slice(0, 5)
      }
    };

    res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Popular patents error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch popular patents'
    });
  }
}

// 특허 트렌드 계산 함수
function calculatePatentTrend(patent, searchLogs, days) {
  const halfPeriod = Math.floor(days / 2);
  const midDate = new Date(Date.now() - halfPeriod * 24 * 60 * 60 * 1000);
  
  let recentSearches = 0;
  let earlierSearches = 0;
  
  if (searchLogs) {
    searchLogs.forEach(log => {
      try {
        const results = typeof log.search_results === 'string' ? JSON.parse(log.search_results) : log.search_results;
        if (results && Array.isArray(results)) {
          const hasPatent = results.some(p => p && p.id === patent.id);
          if (hasPatent) {
            if (new Date(log.created_at) >= midDate) {
              recentSearches++;
            } else {
              earlierSearches++;
            }
          }
        }
      } catch (e) {
        // 무시
      }
    });
  }
  
  let direction = 'stable';
  let percentage = 0;
  
  if (earlierSearches > 0) {
    percentage = ((recentSearches - earlierSearches) / earlierSearches * 100);
    if (percentage > 20) direction = 'up';
    else if (percentage < -20) direction = 'down';
  } else if (recentSearches > 0) {
    direction = 'up';
    percentage = 100;
  }
  
  return {
    direction,
    percentage: Math.abs(percentage).toFixed(1)
  };
}

// 특허 카테고리 분류 함수
function categorizePatents(patents) {
  const categories = {
    'AI/소프트웨어': [],
    '통신/전자': [],
    '자동차/교통': [],
    '의료/바이오': [],
    '에너지/환경': [],
    '기타': []
  };
  
  const categoryKeywords = {
    'AI/소프트웨어': ['ai', 'artificial', 'intelligence', '인공지능', '머신러닝', 'machine', 'learning', '소프트웨어', 'software', '알고리즘', 'algorithm'],
    '통신/전자': ['통신', 'communication', '네트워크', 'network', '무선', 'wireless', '5g', '전자', 'electronic', '반도체', 'semiconductor'],
    '자동차/교통': ['자동차', 'vehicle', 'car', '전기차', 'electric', '자율주행', 'autonomous', '교통', 'transportation'],
    '의료/바이오': ['의료', 'medical', '바이오', 'bio', '헬스케어', 'healthcare', '제약', 'pharmaceutical', '진단', 'diagnosis'],
    '에너지/환경': ['에너지', 'energy', '배터리', 'battery', '태양광', 'solar', '풍력', 'wind', '환경', 'environment']
  };
  
  patents.forEach(patent => {
    let categorized = false;
    const searchText = `${patent.title} ${patent.abstract || ''} ${patent.ipc_code || ''}`.toLowerCase();
    
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(keyword => searchText.includes(keyword.toLowerCase()))) {
        categories[category].push(patent);
        categorized = true;
        break;
      }
    }
    
    if (!categorized) {
      categories['기타'].push(patent);
    }
  });
  
  return categories;
}