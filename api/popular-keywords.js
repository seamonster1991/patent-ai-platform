// 인기 키워드 API
export default async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    try {
      // 임시 인기 키워드 데이터
      const popularKeywords = [
        { keyword: '인공지능', count: 1250 },
        { keyword: '블록체인', count: 980 },
        { keyword: '사물인터넷', count: 850 },
        { keyword: '빅데이터', count: 720 },
        { keyword: '클라우드', count: 650 },
        { keyword: '머신러닝', count: 580 },
        { keyword: '로봇', count: 520 },
        { keyword: '드론', count: 480 },
        { keyword: '가상현실', count: 420 },
        { keyword: '증강현실', count: 380 }
      ];

      return res.status(200).json({
        success: true,
        data: popularKeywords
      });
    } catch (error) {
      console.error('Popular keywords error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  return res.status(405).json({
    success: false,
    error: 'Method not allowed'
  });
}