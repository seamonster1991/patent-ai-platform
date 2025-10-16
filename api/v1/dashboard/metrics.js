/**
 * Dashboard metrics API endpoint for Vercel serverless
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
    const { date_range } = req.query;
    
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

    // Calculate date range
    const now = new Date();
    let startDate, endDate;
    
    switch (date_range) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    
    endDate = now;

    // Get total users count
    const usersResponse = await supabaseQuery('users', {
      'deleted_at': 'is.null',
      'select': 'count'
    });
    const totalUsers = parseInt(usersResponse.count) || 0;

    // Get active users (users who logged in within the date range)
    const activeUsersResponse = await supabaseQuery('users', {
      'deleted_at': 'is.null',
      'last_login_at': `gte.${startDate.toISOString()}`,
      'select': 'count'
    });
    const activeUsers = parseInt(activeUsersResponse.count) || 0;

    // Get total revenue from payment_orders
    const paymentsResponse = await supabaseQuery('payment_orders', {
      'status': 'eq.completed',
      'select': 'amount_krw'
    });
    
    let totalRevenue = 0;
    if (paymentsResponse.data && paymentsResponse.data.length > 0) {
      totalRevenue = paymentsResponse.data.reduce((sum, payment) => {
        return sum + (payment.amount_krw || 0);
      }, 0);
    }

    // Get monthly revenue
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyPaymentsResponse = await supabaseQuery('payment_orders', {
      'status': 'eq.completed',
      'created_at': `gte.${monthStart.toISOString()}`,
      'select': 'amount_krw'
    });
    
    let monthlyRevenue = 0;
    if (monthlyPaymentsResponse.data && monthlyPaymentsResponse.data.length > 0) {
      monthlyRevenue = monthlyPaymentsResponse.data.reduce((sum, payment) => {
        return sum + (payment.amount_krw || 0);
      }, 0);
    }

    // Get AI analysis reports count
    const reportsResponse = await supabaseQuery('ai_analysis_reports', {
      'select': 'count'
    });
    const aiAnalysisReports = parseInt(reportsResponse.count) || 0;

    const metrics = {
      totalUsers,
      activeUsers,
      totalRevenue,
      monthlyRevenue,
      aiAnalysisReports,
      conversionRate: totalUsers > 0 ? ((activeUsers / totalUsers) * 100).toFixed(2) : 0,
      averageRevenuePerUser: totalUsers > 0 ? (totalRevenue / totalUsers).toFixed(2) : 0
    };

    res.status(200).json(metrics);

  } catch (error) {
    console.error('Error in dashboard metrics:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }