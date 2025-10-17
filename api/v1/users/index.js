/**
 * Users list API endpoint for Vercel serverless
 */

export default async function handler(req, res) {
  console.log('Users API handler called:', req.method, req.url);
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
    const { page = 1, per_page = 10, limit, search, status } = req.query;
    const actualLimit = limit || per_page;
    const offset = (parseInt(page) - 1) * parseInt(actualLimit);
    
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
      'limit': actualLimit.toString(),
      'select': 'id,name,email,role,created_at,last_login_at,subscription_plan'
    });

    if (status) {
      queryParams.append('status', `eq.${status}`);
    }

    const url = `${SUPABASE_URL}/rest/v1/users?${queryParams.toString()}`;
    console.log('Users API - URL:', url);
    console.log('Users API - Headers:', headers);
    const response = await fetch(url, { headers });
    const data = await response.json();
    console.log('Users API - Response status:', response.status);
    console.log('Users API - Response data:', data);
    
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
            (user.name && user.name.toLowerCase().includes(searchLower));
          
          if (!matchesSearch) return null;
        }

        return {
          id: user.id,
          username: user.name || (user.email ? user.email.split('@')[0] : ''),
          email: user.email,
          role: user.role || 'user',
          status: 'active', // Default status since table doesn't have status column
          createdAt: user.created_at,
          lastLogin: user.last_login_at,
          subscription: user.subscription_plan || 'free'
        };
      }).filter(Boolean);
    }

    const totalPages = Math.ceil(total / parseInt(actualLimit));

    res.status(200).json({
      users,
      total,
      page: parseInt(page),
      limit: parseInt(actualLimit),
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