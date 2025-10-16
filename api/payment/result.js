// Payment result API for success/failure pages
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
    const { orderId, tid } = req.query;

    if (!orderId || !tid) {
      return res.status(400).json({ error: 'Missing orderId or tid parameter' });
    }

    // 주문 정보 조회
    const { data: orderData, error: orderError } = await supabase
      .from('payment_orders')
      .select('*')
      .eq('order_id', orderId)
      .single();

    if (orderError || !orderData) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // 거래 정보 조회
    const { data: transactionData, error: transactionError } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('payment_order_id', orderData.id)
      .eq('transaction_id', tid)
      .single();

    if (transactionError || !transactionData) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // 결제 결과 정보 구성
    const paymentResult = {
      orderId: orderData.order_id,
      transactionId: transactionData.transaction_id,
      amount: orderData.amount_krw,
      pointsGranted: transactionData.points_granted || 0,
      basePoints: transactionData.base_points || 0,
      bonusPoints: transactionData.bonus_points || 0,
      paymentType: orderData.payment_type,
      goodsName: orderData.goods_name,
      approvedAt: transactionData.approved_at,
      status: transactionData.status,
      pointsExpiresAt: transactionData.points_expires_at
    };

    return res.status(200).json({
      success: true,
      result: paymentResult
    });

  } catch (error) {
    console.error('Payment result API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred'
    });
  }
}