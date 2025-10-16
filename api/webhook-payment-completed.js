// Patent-AI PG사 Webhook API
// 경로: /api/webhook/payment-completed
// 설명: Stripe 등 PG사에서 결제 완료 시 호출하는 Webhook

import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Stripe 초기화 (환경변수에서 키 로드)
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

export default async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, stripe-signature');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let event;
    const signature = req.headers['stripe-signature'];

    // Stripe Webhook 검증
    if (stripe && signature && process.env.STRIPE_WEBHOOK_SECRET) {
      try {
        event = stripe.webhooks.constructEvent(
          req.body,
          signature,
          process.env.STRIPE_WEBHOOK_SECRET
        );
      } catch (err) {
        console.error('Stripe webhook signature verification failed:', err.message);
        return res.status(400).json({ error: 'Invalid signature' });
      }
    } else {
      // 일반 Webhook (다른 PG사 또는 테스트용)
      event = req.body;
    }

    // 이벤트 타입별 처리
    switch (event.type) {
      case 'payment_intent.succeeded':
      case 'checkout.session.completed':
        await handlePaymentSuccess(event.data.object);
        break;
      
      case 'invoice.payment_succeeded':
        await handleSubscriptionPayment(event.data.object);
        break;
      
      case 'payment_intent.payment_failed':
        await handlePaymentFailure(event.data.object);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return res.status(200).json({ received: true });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return res.status(500).json({ 
      error: 'Webhook processing failed',
      details: error.message 
    });
  }
}

// 결제 성공 처리
async function handlePaymentSuccess(paymentObject) {
  try {
    const paymentId = paymentObject.id;
    const amountKrw = Math.round(paymentObject.amount / 100); // cents to KRW
    const userId = paymentObject.metadata?.user_id;
    const paymentType = paymentObject.metadata?.payment_type || 'addon';

    if (!userId) {
      console.error('Missing user_id in payment metadata');
      return;
    }

    // 결제 로그 업데이트
    const { error: logError } = await supabase
      .from('payment_logs')
      .upsert({
        user_id: userId,
        payment_id: paymentId,
        amount_krw: amountKrw,
        payment_type: paymentType,
        status: 'completed',
        pg_response: paymentObject,
        completed_at: new Date().toISOString()
      });

    if (logError) {
      console.error('Payment log update error:', logError);
      return;
    }

    // 포인트 충전 실행
    const { data: chargeResult, error: chargeError } = await supabase
      .rpc('charge_points', {
        p_user_id: userId,
        p_amount_krw: amountKrw,
        p_payment_type: paymentType,
        p_payment_id: paymentId
      });

    if (chargeError) {
      console.error('Point charge error in webhook:', chargeError);
      return;
    }

    const result = chargeResult[0];

    if (!result.success) {
      console.error('Point charge failed in webhook:', result.error_message);
      return;
    }

    // 정기구독에는 별도 보너스 없음 (매월 1,500P는 monthly-free API에서 처리)

    console.log(`Payment processed successfully: ${paymentId}, User: ${userId}, Amount: ${amountKrw}KRW`);

  } catch (error) {
    console.error('Payment success handling error:', error);
  }
}

// 구독 결제 처리
async function handleSubscriptionPayment(invoiceObject) {
  try {
    const subscriptionId = invoiceObject.subscription;
    const paymentId = invoiceObject.payment_intent;
    const amountKrw = Math.round(invoiceObject.amount_paid / 100);
    const userId = invoiceObject.metadata?.user_id;

    if (!userId) {
      console.error('Missing user_id in subscription metadata');
      return;
    }

    // 구독 결제 로그
    const { error: logError } = await supabase
      .from('payment_logs')
      .upsert({
        user_id: userId,
        payment_id: paymentId,
        amount_krw: amountKrw,
        payment_type: 'monthly',
        status: 'completed',
        stripe_subscription_id: subscriptionId,
        pg_response: invoiceObject,
        completed_at: new Date().toISOString()
      });

    if (logError) {
      console.error('Subscription payment log error:', logError);
      return;
    }

    // 월간 구독 포인트 충전
    await handlePaymentSuccess({
      id: paymentId,
      amount: invoiceObject.amount_paid,
      metadata: {
        user_id: userId,
        payment_type: 'monthly'
      }
    });

    console.log(`Subscription payment processed: ${subscriptionId}, User: ${userId}`);

  } catch (error) {
    console.error('Subscription payment handling error:', error);
  }
}

// 결제 실패 처리
async function handlePaymentFailure(paymentObject) {
  try {
    const paymentId = paymentObject.id;
    const userId = paymentObject.metadata?.user_id;

    if (!userId) {
      console.error('Missing user_id in failed payment metadata');
      return;
    }

    // 실패 로그 업데이트
    const { error: logError } = await supabase
      .from('payment_logs')
      .upsert({
        user_id: userId,
        payment_id: paymentId,
        status: 'failed',
        pg_response: paymentObject,
        failed_at: new Date().toISOString()
      });

    if (logError) {
      console.error('Payment failure log error:', logError);
    }

    console.log(`Payment failed: ${paymentId}, User: ${userId}`);

  } catch (error) {
    console.error('Payment failure handling error:', error);
  }
}