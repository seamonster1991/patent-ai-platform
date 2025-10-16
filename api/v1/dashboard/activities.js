/**
 * Dashboard activities API endpoint for Vercel serverless
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
    const { limit = 10 } = req.query;
    
    // Get Supabase configuration
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase configuration not found');
    }

    const headers = {
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json'
    };

    // Helper function to query Supabase
    async function supabaseQuery(table, filters = {}) {
      const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
      
      Object.entries(filters).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });

      const response = await fetch(url.toString(), { headers });
      const data = await response.json();
      
      return {
        data: data || [],
        count: response.headers.get('content-range')?.split('/')[1] || data?.length || 0
      };
    }

    // Get recent activities from multiple tables
    const activities = [];

    // Get recent user registrations
    const usersResponse = await supabaseQuery('users', {
      'deleted_at': 'is.null',
      'order': 'created_at.desc',
      'limit': Math.ceil(limit / 3),
      'select': 'id,email,name,created_at'
    });

    if (usersResponse.data) {
      usersResponse.data.forEach(user => {
        activities.push({
          id: `user_${user.id}`,
          type: 'user_registration',
          description: `새 사용자 등록: ${user.name || user.email}`,
          timestamp: user.created_at,
          user: {
            id: user.id,
            email: user.email,
            name: user.name
          }
        });
      });
    }

    // Get recent payments
    const paymentsResponse = await supabaseQuery('payment_orders', {
      'order': 'created_at.desc',
      'limit': Math.ceil(limit / 3),
      'select': 'id,user_id,amount_krw,status,created_at,goods_name'
    });

    if (paymentsResponse.data) {
      paymentsResponse.data.forEach(payment => {
        activities.push({
          id: `payment_${payment.id}`,
          type: 'payment',
          description: `결제 ${payment.status}: ${payment.goods_name} (${payment.amount_krw}원)`,
          timestamp: payment.created_at,
          payment: {
            id: payment.id,
            user_id: payment.user_id,
            amount: payment.amount_krw,
            status: payment.status,
            goods_name: payment.goods_name
          }
        });
      });
    }

    // Get recent AI analysis reports
    const reportsResponse = await supabaseQuery('ai_analysis_reports', {
      'order': 'created_at.desc',
      'limit': Math.ceil(limit / 3),
      'select': 'id,user_id,title,created_at'
    });

    if (reportsResponse.data) {
      reportsResponse.data.forEach(report => {
        activities.push({
          id: `report_${report.id}`,
          type: 'ai_analysis',
          description: `AI 분석 보고서 생성: ${report.title}`,
          timestamp: report.created_at,
          report: {
            id: report.id,
            user_id: report.user_id,
            title: report.title
          }
        });
      });
    }

    // Sort activities by timestamp (most recent first)
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Limit the results
    const limitedActivities = activities.slice(0, parseInt(limit));

    res.status(200).json({
      activities: limitedActivities,
      total: activities.length
    });

  } catch (error) {
    console.error('Error in dashboard activities:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}