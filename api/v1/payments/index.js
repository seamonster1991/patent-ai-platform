import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { pathname } = new URL(req.url, `http://${req.headers.host}`);
    
    if (pathname.endsWith('/stats')) {
      return await handlePaymentStats(req, res);
    } else {
      return await handlePaymentsList(req, res);
    }
  } catch (error) {
    console.error('Payment API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}

async function handlePaymentsList(req, res) {
  const { 
    page = 1, 
    per_page = 10, 
    search = '', 
    status = '', 
    user_id = '',
    start_date = '',
    end_date = ''
  } = req.query;

  const limit = Math.min(parseInt(per_page), 100);
  const offset = (parseInt(page) - 1) * limit;

  try {
    // Build the query for payment_transactions table
    let query = supabase
      .from('payment_transactions')
      .select(`
        *
      `, { count: 'exact' });

    // Apply filters
    if (search) {
      query = query.or(`transaction_id.ilike.%${search}%,pay_method.ilike.%${search}%`);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (user_id) {
      query = query.eq('user_id', user_id);
    }

    if (start_date) {
      query = query.gte('created_at', start_date);
    }

    if (end_date) {
      query = query.lte('created_at', end_date);
    }

    // Apply pagination and ordering
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: payments, error, count } = await query;

    if (error) {
      console.error('Supabase query error:', error);
      return res.status(500).json({ error: 'Failed to fetch payments' });
    }

    // Format the response data
    const formattedPayments = payments.map(payment => ({
      id: payment.id,
      transaction_id: payment.transaction_id,
      user_id: payment.user_id,
      user_email: 'N/A', // Will be populated separately if needed
      user_name: 'N/A', // Will be populated separately if needed
      amount: payment.amount,
      currency: payment.currency || 'KRW',
      status: payment.status,
      payment_method: payment.pay_method,
      description: payment.result_message || 'Payment transaction',
      created_at: payment.created_at,
      updated_at: payment.updated_at,
      metadata: payment.nicepay_response
    }));

    const totalPages = Math.ceil(count / limit);

    return res.status(200).json({
      data: formattedPayments,
      pagination: {
        page: parseInt(page),
        per_page: limit,
        total: count,
        total_pages: totalPages,
        has_next: parseInt(page) < totalPages,
        has_prev: parseInt(page) > 1
      }
    });

  } catch (error) {
    console.error('Payment list error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch payments',
      message: error.message 
    });
  }
}

async function handlePaymentStats(req, res) {
  try {
    const { period = '30d' } = req.query;
    
    // Calculate date range based on period
    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    // Get total revenue
    const { data: revenueData, error: revenueError } = await supabase
      .from('payment_transactions')
      .select('amount')
      .eq('status', 'success')
      .gte('created_at', startDate.toISOString());

    if (revenueError) {
      console.error('Revenue query error:', revenueError);
      return res.status(500).json({ error: 'Failed to fetch revenue data' });
    }

    const totalRevenue = revenueData.reduce((sum, payment) => sum + (payment.amount || 0), 0);

    // Get transaction count by status
    const { data: statusData, error: statusError } = await supabase
      .from('payment_transactions')
      .select('status')
      .gte('created_at', startDate.toISOString());

    if (statusError) {
      console.error('Status query error:', statusError);
      return res.status(500).json({ error: 'Failed to fetch status data' });
    }

    const statusCounts = statusData.reduce((acc, payment) => {
      acc[payment.status] = (acc[payment.status] || 0) + 1;
      return acc;
    }, {});

    // Get daily revenue for the period
    const { data: dailyData, error: dailyError } = await supabase
      .from('payment_transactions')
      .select('amount, created_at')
      .eq('status', 'success')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    if (dailyError) {
      console.error('Daily data query error:', dailyError);
      return res.status(500).json({ error: 'Failed to fetch daily data' });
    }

    // Group by date
    const dailyRevenue = {};
    dailyData.forEach(payment => {
      const date = new Date(payment.created_at).toISOString().split('T')[0];
      dailyRevenue[date] = (dailyRevenue[date] || 0) + (payment.amount || 0);
    });

    // Get payment method distribution
    const { data: methodData, error: methodError } = await supabase
      .from('payment_transactions')
      .select('pay_method')
      .gte('created_at', startDate.toISOString());

    if (methodError) {
      console.error('Method query error:', methodError);
      return res.status(500).json({ error: 'Failed to fetch method data' });
    }

    const methodCounts = methodData.reduce((acc, payment) => {
      const method = payment.pay_method || 'unknown';
      acc[method] = (acc[method] || 0) + 1;
      return acc;
    }, {});

    // Calculate growth rate (compare with previous period)
    const previousStartDate = new Date(startDate);
    const periodDays = Math.ceil((now - startDate) / (1000 * 60 * 60 * 24));
    previousStartDate.setDate(startDate.getDate() - periodDays);

    const { data: previousRevenueData, error: previousRevenueError } = await supabase
      .from('payment_transactions')
      .select('amount')
      .eq('status', 'success')
      .gte('created_at', previousStartDate.toISOString())
      .lt('created_at', startDate.toISOString());

    if (previousRevenueError) {
      console.error('Previous revenue query error:', previousRevenueError);
    }

    const previousRevenue = previousRevenueData?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;
    const growthRate = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;

    return res.status(200).json({
      period,
      total_revenue: totalRevenue,
      total_transactions: statusData.length,
      completed_transactions: statusCounts.success || 0,
      pending_transactions: statusCounts.pending || 0,
      failed_transactions: statusCounts.failed || 0,
      cancelled_transactions: statusCounts.cancelled || 0,
      growth_rate: Math.round(growthRate * 100) / 100,
      daily_revenue: dailyRevenue,
      payment_methods: methodCounts,
      status_distribution: statusCounts
    });

  } catch (error) {
    console.error('Payment stats error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch payment statistics',
      message: error.message 
    });
  }
}