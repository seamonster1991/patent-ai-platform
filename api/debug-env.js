// 임시 디버깅용 환경변수 확인 엔드포인트
module.exports = async (req, res) => {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // 환경변수 확인
    const envVars = {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
      VERCEL_ENV: process.env.VERCEL_ENV,
      
      // Supabase 환경변수 (값은 마스킹)
      SUPABASE_URL: process.env.SUPABASE_URL ? 'SET' : 'NOT_SET',
      VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL ? 'SET' : 'NOT_SET',
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ? 'SET' : 'NOT_SET',
      VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY ? 'SET' : 'NOT_SET',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT_SET',
      
      // 기타 환경변수
      KIPRIS_API_KEY: process.env.KIPRIS_API_KEY ? 'SET' : 'NOT_SET',
      GEMINI_API_KEY: process.env.GEMINI_API_KEY ? 'SET' : 'NOT_SET',
      
      // 모든 SUPABASE 관련 환경변수 키 목록
      allSupabaseKeys: Object.keys(process.env).filter(key => key.includes('SUPABASE')),
      
      // 전체 환경변수 개수
      totalEnvVars: Object.keys(process.env).length
    };

    console.log('🔍 [Debug] 환경변수 상태:', envVars);

    return res.status(200).json({
      success: true,
      data: envVars,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [Debug] 환경변수 확인 실패:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to check environment variables',
      details: error.message
    });
  }
};