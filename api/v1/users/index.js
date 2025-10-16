/**
 * Users list API endpoint for Vercel serverless
 */

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { page = 1, limit = 10, search, status } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // Get Supabase configuration
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase configuration not found');
    }

    const headers = {
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'count=exact'
    };

    // Build query parameters
    const queryParams = new URLSearchParams({
      'deleted_at': 'is.null',
      'order': 'created_at.desc',
      'offset': offset.toString(),
      'limit': limit.toString(),
      'select': 'id,username,email,role,status,created_at,last_login_at,subscription_type'
    });

    if (status) {
      queryParams.append('status', `eq.${status}`);
    }

    const url = `${SUPABASE_URL}/rest/v1/users?${queryParams.toString()}`;
    const response = await fetch(url, { headers });
    const data = await response.json();
    
    // Get total count from Content-Range header
    const contentRange = response.headers.get('content-range');
    const total = contentRange ? parseInt(contentRange.split('/')[1]) : 0;

    let users = [];
    if (data && Array.isArray(data)) {
      users = data.map(user => {
        // Apply search filter if needed
        if (search) {
          const searchLower = search.toLowerCase();
          const matchesSearch = 
            (user.email && user.email.toLowerCase().includes(searchLower)) ||
            (user.username && user.username.toLowerCase().includes(searchLower)) ||
            (user.full_name && user.full_name.toLowerCase().includes(searchLower));
          
          if (!matchesSearch) return null;
        }

        return {
          id: user.id,
          username: user.username || (user.email ? user.email.split('@')[0] : ''),
          email: user.email,
          role: user.role || 'user',
          status: user.status || 'active',
          createdAt: user.created_at,
          lastLogin: user.last_login_at,
          subscription: user.subscription_type || 'free'
        };
      }).filter(Boolean);
    }

    const totalPages = Math.ceil(total / parseInt(limit));

    res.status(200).json({
      users,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages
    });

  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}