export default async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // OPTIONS 요청 처리
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    console.log('Test API called');
    console.log('Method:', req.method);
    console.log('Body:', req.body);
    console.log('Environment variables:');
    console.log('- KIPRIS_API_KEY:', process.env.KIPRIS_API_KEY ? 'Set' : 'Not set');
    console.log('- NODE_ENV:', process.env.NODE_ENV);

    return res.status(200).json({
      success: true,
      message: 'Test API working',
      method: req.method,
      body: req.body,
      env: {
        hasKiprisKey: !!process.env.KIPRIS_API_KEY,
        nodeEnv: process.env.NODE_ENV
      }
    });
  } catch (error) {
    console.error('Test API Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}