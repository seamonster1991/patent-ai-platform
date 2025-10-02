module.exports = async function handler(req, res) {
  console.log('Test API called');
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    return res.status(200).json({
      success: true,
      message: 'Test API is working',
      method: req.method,
      body: req.body,
      env: {
        hasKiprisKey: !!process.env.KIPRIS_API_KEY,
        hasSupabaseUrl: !!process.env.SUPABASE_URL,
        hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
      }
    });
  } catch (error) {
    console.error('Test API Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Test API failed',
      error: error.message
    });
  }
}