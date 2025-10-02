const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { query, page = 1, limit = 10 } = req.query;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Query parameter is required'
      });
    }

    const offset = (Number(page) - 1) * Number(limit);

    // Search patents in Supabase
    const { data: patents, error, count } = await supabase
      .from('patents')
      .select('*', { count: 'exact' })
      .or(`title.ilike.%${query}%, abstract.ilike.%${query}%, inventors.ilike.%${query}%, applicant.ilike.%${query}%`)
      .range(offset, offset + Number(limit) - 1)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database search error:', error);
      return res.status(500).json({
        success: false,
        message: 'Database search failed',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        patents: patents || [],
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: count || 0,
          totalPages: Math.ceil((count || 0) / Number(limit))
        }
      }
    });

  } catch (error) {
    console.error('Patent search error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};