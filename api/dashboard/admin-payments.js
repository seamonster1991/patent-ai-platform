import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ 
      error: 'Database configuration error',
      details: 'Missing environment variables'
    });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    switch (req.method) {
      case 'GET':
        return await handleGetPayments(supabase, req, res);
      case 'POST':
        return await handleProcessRefund(supabase, req, res);
      case 'PUT':
        return await handleUpdatePayment(supabase, req, res);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Admin payments API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
}

// 결제 내역 조회
async function handleGetPayments(supabase, req, res) {
  const { 
    page = 1, 
    limit = 20, 
    search = '', 
    status = 'all',
    date_from = '',
    date_to = '',
    sort_by = 'created_at',
    sort_order = 'desc'
  } = req.query;

  const offset = (parseInt(page) - 1) * parseInt(limit);

  // 기본 쿼리 구성
  let query = supabase
    .from('payment_transactions')
    .select(`
      id,
      user_id,
      payment_order_id,
      transaction_id,
      amount,
      currency,
      status,
      pay_method,
      card_company,
      transaction_type,
      created_at,
      updated_at
    `, { count: 'exact' });

  // 검색 조건 적용 (트랜잭션 ID로 검색)
  if (search) {
    query = query.or(`transaction_id.ilike.%${search}%,user_id.eq.${search}`);
  }

  // 상태 필터 적용
  if (status !== 'all') {
    query = query.eq('status', status);
  }

  // 날짜 범위 필터 적용
  if (date_from) {
    query = query.gte('created_at', date_from);
  }
  if (date_to) {
    query = query.lte('created_at', date_to);
  }

  // 정렬 적용
  query = query.order(sort_by, { ascending: sort_order === 'asc' });

  // 페이지네이션 적용
  query = query.range(offset, offset + parseInt(limit) - 1);

  const result = await query;

  if (result.error) {
    return res.status(500).json({ error: result.error.message });
  }

  // 사용자 정보를 별도로 조회
  const userIds = [...new Set(result.data.map(payment => payment.user_id))];
  const usersResult = await supabase
    .from('users')
    .select('id, email, name, company')
    .in('id', userIds);

  // 결제 데이터에 사용자 정보 추가
  const paymentsWithUsers = result.data.map(payment => {
    const user = usersResult.data?.find(u => u.id === payment.user_id);
    return {
      ...payment,
      user: user || { email: 'Unknown', name: 'Unknown', company: 'Unknown' }
    };
  });

  // 결제 통계 조회
  const statsQuery = supabase
    .from('payment_transactions')
    .select('status, amount');

  if (date_from) {
    statsQuery.gte('created_at', date_from);
  }
  if (date_to) {
    statsQuery.lte('created_at', date_to);
  }

  const statsResult = await statsQuery;
  
  const stats = {
    total_transactions: statsResult.data?.length || 0,
    successful_transactions: statsResult.data?.filter(p => p.status === 'success').length || 0,
    failed_transactions: statsResult.data?.filter(p => p.status === 'failed').length || 0,
    pending_transactions: statsResult.data?.filter(p => p.status === 'pending').length || 0,
    total_amount: statsResult.data?.filter(p => p.status === 'success').reduce((sum, p) => sum + (p.amount || 0), 0) || 0,
    refunded_amount: statsResult.data?.filter(p => p.status === 'refunded').reduce((sum, p) => sum + (p.amount || 0), 0) || 0
  };

  return res.status(200).json({
    success: true,
    data: {
      payments: paymentsWithUsers,
      stats,
      total_count: result.count,
      page: parseInt(page),
      limit: parseInt(limit),
      total_pages: Math.ceil(result.count / parseInt(limit))
    }
  });
}

// 환불 처리
async function handleProcessRefund(supabase, req, res) {
  const { transaction_id, refund_amount, refund_reason } = req.body;

  if (!transaction_id || !refund_amount || !refund_reason) {
    return res.status(400).json({ 
      error: 'Missing required fields',
      details: 'Transaction ID, refund amount, and refund reason are required'
    });
  }

  // 원본 거래 조회
  const originalTransaction = await supabase
    .from('payment_transactions')
    .select('*')
    .eq('id', transaction_id)
    .single();

  if (originalTransaction.error || !originalTransaction.data) {
    return res.status(404).json({ 
      error: 'Transaction not found',
      details: 'The specified transaction does not exist'
    });
  }

  const transaction = originalTransaction.data;

  // 환불 가능 여부 확인
  if (transaction.status !== 'success') {
    return res.status(400).json({ 
      error: 'Invalid transaction status',
      details: 'Only successful transactions can be refunded'
    });
  }

  if (refund_amount > transaction.amount) {
    return res.status(400).json({ 
      error: 'Invalid refund amount',
      details: 'Refund amount cannot exceed the original transaction amount'
    });
  }

  try {
    // 환불 기록 생성
    const refundResult = await supabase
      .from('refunds')
      .insert({
        original_transaction_id: transaction_id,
        user_id: transaction.user_id,
        refund_amount: refund_amount,
        refund_reason: refund_reason,
        status: 'processed',
        processed_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (refundResult.error) {
      throw refundResult.error;
    }

    // 원본 거래 상태 업데이트
    const updateResult = await supabase
      .from('payment_transactions')
      .update({
        status: refund_amount === transaction.amount ? 'refunded' : 'partial_refund',
        updated_at: new Date().toISOString()
      })
      .eq('id', transaction_id);

    if (updateResult.error) {
      throw updateResult.error;
    }

    // 사용자 포인트 차감 (필요한 경우)
    if (transaction.points_granted > 0) {
      const pointsToDeduct = Math.floor((refund_amount / transaction.amount) * transaction.points_granted);
      
      await supabase
        .from('user_point_balances')
        .update({
          balance: supabase.raw(`balance - ${pointsToDeduct}`),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', transaction.user_id);

      // 포인트 거래 기록
      await supabase
        .from('point_transactions')
        .insert({
          user_id: transaction.user_id,
          transaction_type: 'deduction',
          points: -pointsToDeduct,
          description: `Refund deduction for order ${transaction.order_id}`,
          created_at: new Date().toISOString()
        });
    }

    return res.status(200).json({
      success: true,
      message: 'Refund processed successfully',
      data: refundResult.data
    });

  } catch (error) {
    console.error('Refund processing error:', error);
    return res.status(500).json({
      error: 'Refund processing failed',
      details: error.message
    });
  }
}

// 결제 상태 업데이트
async function handleUpdatePayment(supabase, req, res) {
  const { transaction_id, status, notes } = req.body;

  if (!transaction_id || !status) {
    return res.status(400).json({ 
      error: 'Missing required fields',
      details: 'Transaction ID and status are required'
    });
  }

  const validStatuses = ['pending', 'success', 'failed', 'cancelled', 'refunded', 'partial_refund'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ 
      error: 'Invalid status',
      details: `Status must be one of: ${validStatuses.join(', ')}`
    });
  }

  const updateData = {
    status,
    updated_at: new Date().toISOString()
  };

  if (notes) {
    updateData.admin_notes = notes;
  }

  const result = await supabase
    .from('payment_transactions')
    .update(updateData)
    .eq('id', transaction_id)
    .select()
    .single();

  if (result.error) {
    return res.status(500).json({ error: result.error.message });
  }

  return res.status(200).json({
    success: true,
    message: 'Payment status updated successfully',
    data: result.data
  });
}