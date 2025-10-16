// Patent-AI 통합 결제 API
// 경로: /api/billing
// 설명: 포인트 충전, 정기 구독 등 모든 결제 관련 기능을 통합

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 정기 구독 설정
const MONTHLY_SUBSCRIPTION = {
  amount_krw: 10000,  // VAT 별도
  base_points: 10000,
  bonus_points: 0,    // 정기구독에는 보너스 없음 (매월 1,500P는 별도 지급)
  expiration_months: 1
};

export default async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Authorization 헤더에서 토큰 추출
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.split(' ')[1];
    
    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token or user not found' });
    }

    const userId = user.id;
    const { action } = req.query;

    // GET 요청 처리
    if (req.method === 'GET') {
      if (action === 'subscription-info') {
        return res.status(200).json({
          subscription_info: MONTHLY_SUBSCRIPTION,
          description: "월간 정기 구독 - 10,000 포인트 + 1,500 보너스 포인트 (1개월 만료)"
        });
      }
      return res.status(400).json({ error: 'Invalid action for GET request' });
    }

    // POST 요청 처리
    if (req.method === 'POST') {
      if (action === 'charge-points') {
        return await handleChargePoints(req, res, userId);
      } else if (action === 'monthly-subscription') {
        return await handleMonthlySubscription(req, res, userId);
      } else {
        return res.status(400).json({ error: 'Invalid action for POST request' });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Billing API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}

// 포인트 충전 처리
async function handleChargePoints(req, res, userId) {
  const { amount_krw, payment_type, payment_id } = req.body;

  // 입력 검증
  if (!amount_krw || amount_krw <= 0) {
    return res.status(400).json({ error: 'Invalid amount_krw' });
  }

  if (!payment_type || !['monthly', 'addon'].includes(payment_type)) {
    return res.status(400).json({ 
      error: 'Invalid payment_type. Must be monthly or addon' 
    });
  }

  if (!payment_id) {
    return res.status(400).json({ error: 'Missing payment_id' });
  }

  // 중복 결제 확인
  const { data: existingPayment, error: checkError } = await supabase
    .from('payment_logs')
    .select('id, status')
    .eq('payment_id', payment_id)
    .eq('user_id', userId)
    .single();

  if (checkError && checkError.code !== 'PGRST116') {
    console.error('Payment check error:', checkError);
    return res.status(500).json({ error: 'Failed to check payment status' });
  }

  if (existingPayment && existingPayment.status === 'completed') {
    return res.status(400).json({ 
      error: 'Payment already processed',
      payment_id: payment_id 
    });
  }

  // 포인트 충전 실행
  const { data: chargeResult, error: chargeError } = await supabase
    .rpc('charge_points', {
      p_user_id: userId,
      p_amount_krw: amount_krw,
      p_payment_type: payment_type,
      p_payment_id: payment_id
    });

  if (chargeError) {
    console.error('Point charge error:', chargeError);
    return res.status(500).json({ 
      error: 'Failed to charge points',
      details: chargeError.message 
    });
  }

  const result = chargeResult[0];

  if (!result.success) {
    return res.status(400).json({
      success: false,
      error: result.error_message || 'Charge failed'
    });
  }

  // 충전 성공 응답
  const responseData = {
    success: true,
    payment_id: payment_id,
    amount_krw: amount_krw,
    payment_type: payment_type,
    base_points: result.base_points,
    bonus_points: result.bonus_points,
    total_points: result.total_points,
    expires_at: result.expires_at,
    charged_at: new Date().toISOString()
  };

  return res.status(200).json(responseData);
}

// 정기 구독 처리
async function handleMonthlySubscription(req, res, userId) {
  const { payment_id, stripe_subscription_id } = req.body;

  // 입력 검증
  if (!payment_id) {
    return res.status(400).json({ error: 'Missing payment_id' });
  }

  // 중복 결제 확인
  const { data: existingPayment, error: checkError } = await supabase
    .from('payment_logs')
    .select('id, status')
    .eq('payment_id', payment_id)
    .eq('user_id', userId)
    .single();

  if (checkError && checkError.code !== 'PGRST116') {
    console.error('Payment check error:', checkError);
    return res.status(500).json({ error: 'Failed to check payment status' });
  }

  if (existingPayment && existingPayment.status === 'completed') {
    return res.status(400).json({ 
      error: 'Payment already processed',
      payment_id: payment_id 
    });
  }

  // 정기 구독 포인트 충전
  const { data: chargeResult, error: chargeError } = await supabase
    .rpc('charge_points', {
      p_user_id: userId,
      p_amount_krw: MONTHLY_SUBSCRIPTION.amount_krw,
      p_payment_type: 'monthly',
      p_payment_id: payment_id
    });

  if (chargeError) {
    console.error('Monthly subscription charge error:', chargeError);
    return res.status(500).json({ 
      error: 'Failed to process monthly subscription',
      details: chargeError.message 
    });
  }

  const result = chargeResult[0];

  if (!result.success) {
    return res.status(400).json({
      success: false,
      error: result.error_message || 'Subscription charge failed'
    });
  }

  // Stripe 구독 ID 저장 (있는 경우)
  if (stripe_subscription_id) {
    try {
      await supabase
        .from('payment_logs')
        .update({ 
          stripe_subscription_id: stripe_subscription_id,
          metadata: { subscription_type: 'monthly' }
        })
        .eq('payment_id', payment_id)
        .eq('user_id', userId);
    } catch (updateError) {
      console.error('Stripe subscription ID update error:', updateError);
    }
  }

  // 성공 응답
  const responseData = {
    success: true,
    subscription_type: 'monthly',
    payment_id: payment_id,
    amount_krw: MONTHLY_SUBSCRIPTION.amount_krw,
    base_points: MONTHLY_SUBSCRIPTION.base_points,
    bonus_points: MONTHLY_SUBSCRIPTION.bonus_points,
    total_points: MONTHLY_SUBSCRIPTION.base_points + MONTHLY_SUBSCRIPTION.bonus_points,
    expires_at: result.expires_at,
    processed_at: new Date().toISOString()
  };

  if (stripe_subscription_id) {
    responseData.stripe_subscription_id = stripe_subscription_id;
  }

  return res.status(200).json(responseData);
}