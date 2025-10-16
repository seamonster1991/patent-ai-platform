// Payment history API for users
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import { paymentSecurity } from '../middleware/payment-security.js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key';

export default async function handler(req, res) {
  // Apply security middleware
  await new Promise((resolve, reject) => {
    const middlewares = paymentSecurity({
      requireAuth: true,
      requireAdmin: false,
      rateLimitType: 'DEFAULT'
    });
    
    let index = 0;
    function runNext(error) {
      if (error) return reject(error);
      if (index >= middlewares.length) return resolve();
      
      const middleware = middlewares[index++];
      middleware(req, res, runNext);
    }
    
    runNext();
  });
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      userId, 
      page = 1, 
      limit = 10, 
      status, 
      paymentType, 
      startDate, 
      endDate,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId parameter' });
    }

    // 페이지네이션 계산
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // 기본 쿼리 구성
    let query = supabase
      .from('payment_orders')
      .select(`
        *,
        payment_transactions (
          transaction_id,
          pay_method,
          card_company,
          card_number,
          installment,
          status,
          points_granted,
          base_points,
          bonus_points,
          approved_at,
          completed_at,
          cancelled_at,
          refunded_at
        )
      `)
      .eq('user_id', userId);

    // 필터 적용
    if (status) {
      query = query.eq('status', status);
    }

    if (paymentType) {
      query = query.eq('payment_type', paymentType);
    }

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    // 정렬 적용
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // 총 개수 조회 (페이지네이션용)
    const { count, error: countError } = await supabase
      .from('payment_orders')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (countError) {
      console.error('Count query error:', countError);
      return res.status(500).json({ error: 'Failed to get payment count' });
    }

    // 페이지네이션 적용하여 데이터 조회
    const { data: payments, error: paymentsError } = await query
      .range(offset, offset + parseInt(limit) - 1);

    if (paymentsError) {
      console.error('Payments query error:', paymentsError);
      return res.status(500).json({ error: 'Failed to fetch payment history' });
    }

    // 결과 포맷팅
    const formattedPayments = payments.map(payment => ({
      id: payment.id,
      orderId: payment.order_id,
      amount: payment.amount_krw,
      paymentType: payment.payment_type,
      goodsName: payment.goods_name,
      status: payment.status,
      createdAt: payment.created_at,
      completedAt: payment.completed_at,
      cancelledAt: payment.cancelled_at,
      transaction: payment.payment_transactions?.[0] ? {
        transactionId: payment.payment_transactions[0].transaction_id,
        payMethod: payment.payment_transactions[0].pay_method,
        cardCompany: payment.payment_transactions[0].card_company,
        cardNumber: payment.payment_transactions[0].card_number,
        installment: payment.payment_transactions[0].installment,
        status: payment.payment_transactions[0].status,
        pointsGranted: payment.payment_transactions[0].points_granted,
        basePoints: payment.payment_transactions[0].base_points,
        bonusPoints: payment.payment_transactions[0].bonus_points,
        approvedAt: payment.payment_transactions[0].approved_at,
        completedAt: payment.payment_transactions[0].completed_at,
        cancelledAt: payment.payment_transactions[0].cancelled_at,
        refundedAt: payment.payment_transactions[0].refunded_at
      } : null
    }));

    // 페이지네이션 정보
    const totalPages = Math.ceil(count / parseInt(limit));
    const hasNextPage = parseInt(page) < totalPages;
    const hasPrevPage = parseInt(page) > 1;

    return res.status(200).json({
      success: true,
      data: formattedPayments,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: count,
        itemsPerPage: parseInt(limit),
        hasNextPage,
        hasPrevPage
      }
    });

  } catch (error) {
    console.error('Payment history API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred'
    });
  }
}