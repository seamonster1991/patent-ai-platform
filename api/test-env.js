// 환경 변수 테스트 API
module.exports = async function handler(req, res) {
  try {
    // CORS 헤더 설정
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    
    const envCheck = {
      VERCEL: !!process.env.VERCEL,
      GEMINI_API_KEY: process.env.GEMINI_API_KEY ? 'SET' : 'NOT_SET',
      GEMINI_API_KEY_LENGTH: process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.length : 0,
      SUPABASE_URL: process.env.SUPABASE_URL ? 'SET' : 'NOT_SET',
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ? 'SET' : 'NOT_SET',
      NODE_ENV: process.env.NODE_ENV || 'undefined',
      timestamp: new Date().toISOString()
    };
    
    return res.status(200).json({
      success: true,
      environment: envCheck
    });
    
  } catch (error) {
    console.error('Environment test error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};