const axios = require('axios');

module.exports = async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // OPTIONS 요청 처리
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // POST 요청만 허용
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  try {
    // 환경변수에서 KIPRIS API 키 가져오기
    const kiprisApiKey = process.env.KIPRIS_API_KEY;
    
    if (!kiprisApiKey) {
      return res.status(500).json({
        success: false,
        error: 'KIPRIS API key not configured'
      });
    }

    const { word, pageNo = 1, numOfRows = 10 } = req.body;
    
    if (!word) {
      return res.status(400).json({
        success: false,
        error: 'Search word is required'
      });
    }

    // KIPRIS API 호출
    const kiprisUrl = 'http://plus.kipris.or.kr/kipo-api/kipi/patUtiModInfoSearchSevice/getWordSearch';
    
    const response = await axios.get(kiprisUrl, {
      params: {
        word: word,
        pageNo: pageNo,
        numOfRows: numOfRows,
        ServiceKey: kiprisApiKey
      },
      timeout: 10000
    });

    // 성공 응답
    return res.status(200).json({
      success: true,
      data: response.data,
      searchParams: { word, pageNo, numOfRows }
    });

  } catch (error) {
    console.error('KIPRIS API Error:', error.message);
    
    return res.status(500).json({
      success: false,
      error: 'Search failed',
      message: error.message
    });
  }
};