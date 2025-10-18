// NicePay API 엔드포인트
// 경로: /api/nicepay
// 설명: NicePay 결제 시스템 통합 API

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// NicePay 설정 (환경변수에서 가져오기)
const NICEPAY_CONFIG = {
  merchantId: process.env.NICEPAY_MERCHANT_ID || 'nicepay00m',
  merchantKey: process.env.NICEPAY_MERCHANT_KEY || 'nicepaykey123',
  apiUrl: process.env.NICEPAY_API_URL || 'https://sandbox-api.nicepay.co.kr',
  returnUrl: process.env.NICEPAY_RETURN_URL || 'http://localhost:5174/payment/success',
  cancelUrl: process.env.NICEPAY_CANCEL_URL || 'http://localhost:5174/payment/cancel'
};

// 공통 헤더 설정
function setCommonHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');
}

// 서명 생성 함수
function generateSignature(data, merchantKey) {
  const sortedKeys = Object.keys(data).sort();
  const signString = sortedKeys.map(key => `${key}=${data[key]}`).join('&');
  return crypto.createHmac('sha256', merchantKey).update(signString).digest('hex');
}

// 주문 ID 생성
function generateOrderId() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `ORDER_${timestamp}_${random}`;
}

// JWT 토큰 검증 함수
async function verifyAuthToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    // Custom JWT 토큰 검증
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'patent-ai-admin-jwt-secret-key-2024-development');
    
    if (!decoded || !decoded.userId) {
      return null;
    }
    
    // 사용자 정보를 데이터베이스에서 조회
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', decoded.userId)
      .single();
      
    if (error || !user) {
      console.error('사용자 조회 오류:', error);
      return null;
    }
    
    return { id: user.id, email: user.email, ...user };
  } catch (error) {
    console.error('토큰 검증 오류:', error);
    return null;
  }
}

// 주문 생성 처리
async function handleCreateOrder(req, res) {
  try {
    // 인증 확인
    const user = await verifyAuthToken(req);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: '인증이 필요합니다.'
      });
    }

    const { amount, productName, goodsName, buyerName, buyerEmail, buyerTel, userId, paymentType } = req.body;
    
    // 사용자 ID 검증 (토큰의 사용자와 요청의 사용자가 일치하는지 확인)
    if (userId && userId !== user.id) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: '권한이 없습니다.'
      });
    }

    // 실제 사용자 ID 사용 (토큰에서 가져온 것)
    const actualUserId = user.id;
    const actualProductName = productName || goodsName;

    // 필수 파라미터 검증
    if (!amount || !actualProductName) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters',
        message: '필수 파라미터가 누락되었습니다.'
      });
    }

    // 사용자 정보 기본값 설정
    const finalBuyerName = buyerName || user.user_metadata?.name || user.email?.split('@')[0] || '사용자';
    const finalBuyerEmail = buyerEmail || user.email || '';
    const finalBuyerTel = buyerTel || '';

    // 금액 검증 (최소 1000원)
    if (amount < 1000) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount',
        message: '최소 결제 금액은 1,000원입니다.'
      });
    }

    const orderId = generateOrderId();
    const timestamp = new Date().toISOString();

    // Supabase에 주문 정보 저장
    const { data: orderData, error: orderError } = await supabase
      .from('payment_orders')
      .insert({
        order_id: orderId,
        user_id: actualUserId,
        amount_krw: amount,
        payment_type: paymentType || 'addon',
        goods_name: actualProductName,
        status: 'pending',
        nicepay_data: {
          buyer_name: finalBuyerName,
          buyer_email: finalBuyerEmail,
          buyer_tel: finalBuyerTel
        }
      })
      .select()
      .single();

    if (orderError) {
      console.error('주문 저장 오류:', orderError);
      return res.status(500).json({
        success: false,
        error: 'Database error',
        message: '주문 정보 저장에 실패했습니다.'
      });
    }

    // NicePay 결제 요청 데이터 준비
    const paymentData = {
      merchantId: NICEPAY_CONFIG.merchantId,
      orderId: orderId,
      amount: amount,
      goodsName: actualProductName,
      buyerName: finalBuyerName,
      buyerEmail: finalBuyerEmail,
      buyerTel: finalBuyerTel,
      returnUrl: NICEPAY_CONFIG.returnUrl,
      cancelUrl: NICEPAY_CONFIG.cancelUrl,
      timestamp: timestamp
    };

    // 서명 생성
    const signature = generateSignature(paymentData, NICEPAY_CONFIG.merchantKey);
    paymentData.signature = signature;

    // 성공 응답
    return res.status(200).json({
      success: true,
      data: {
        orderId: orderId,
        paymentData: paymentData,
        nicepayConfig: {
          merchantId: NICEPAY_CONFIG.merchantId,
          apiUrl: NICEPAY_CONFIG.apiUrl
        }
      },
      message: '주문이 성공적으로 생성되었습니다.'
    });

  } catch (error) {
    console.error('주문 생성 오류:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: '주문 생성 중 오류가 발생했습니다.',
      details: error.message
    });
  }
}

// 결제 상태 확인
async function handlePaymentStatus(req, res) {
  try {
    const { orderId } = req.query;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: 'Missing orderId',
        message: '주문 ID가 필요합니다.'
      });
    }

    // Supabase에서 주문 상태 조회
    const { data: orderData, error: orderError } = await supabase
      .from('payment_orders')
      .select('*')
      .eq('order_id', orderId)
      .single();

    if (orderError || !orderData) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
        message: '주문을 찾을 수 없습니다.'
      });
    }

    return res.status(200).json({
      success: true,
      data: orderData
    });

  } catch (error) {
    console.error('결제 상태 확인 오류:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: '결제 상태 확인 중 오류가 발생했습니다.'
    });
  }
}

// 결제 내역 조회 (payment.js에서 이동)
async function handlePaymentHistory(req, res) {
  try {
    const user = await verifyAuthToken(req);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: '인증이 필요합니다.'
      });
    }

    const { 
      userId, 
      page = 1, 
      limit = 10, 
      status,
      startDate,
      endDate
    } = req.query;

    // 사용자 ID 검증
    if (userId && userId !== user.id) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: '권한이 없습니다.'
      });
    }

    const actualUserId = user.id;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('payment_orders')
      .select(`
        *,
        payment_transactions(*)
      `, { count: 'exact' })
      .eq('user_id', actualUserId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data: payments, error: queryError, count } = await query;

    if (queryError) {
      console.error('Payment history query error:', queryError);
      return res.status(500).json({
        success: false,
        error: 'Database error',
        message: '결제 내역 조회 중 오류가 발생했습니다.'
      });
    }

    return res.status(200).json({
      success: true,
      data: payments,
      pagination: {
        current_page: parseInt(page),
        per_page: parseInt(limit),
        total_count: count,
        total_pages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    console.error('Payment history error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: '결제 내역 조회 중 오류가 발생했습니다.'
    });
  }
}

// 결제 승인 처리
async function handlePaymentApprove(req, res) {
  try {
    const { tid, orderId, amount, signature } = req.body;

    if (!tid || !orderId || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters',
        message: 'tid, orderId, amount는 필수입니다.'
      });
    }

    // 주문 정보 조회
    const { data: orderData, error: orderError } = await supabase
      .from('payment_orders')
      .select('*')
      .eq('order_id', orderId)
      .single();

    if (orderError || !orderData) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
        message: '주문 정보를 찾을 수 없습니다.'
      });
    }

    // 금액 검증
    if (parseInt(amount) !== orderData.amount_krw) {
      return res.status(400).json({
        success: false,
        error: 'Amount mismatch',
        message: '결제 금액이 일치하지 않습니다.'
      });
    }

    // 결제 승인 처리 (실제 환경에서는 NicePay API 호출)
    // 샌드박스 환경에서는 시뮬레이션
    const approvalResult = {
      resultCode: '0000',
      resultMsg: 'SUCCESS',
      tid: tid,
      orderId: orderId,
      amount: amount,
      approvedAt: new Date().toISOString()
    };

    // 결제 상태 업데이트
    const { data: updatedPayment, error: updateError } = await supabase
      .from('payment_orders')
      .update({
        status: 'completed',
        nicepay_data: {
          ...orderData.nicepay_data,
          tid: tid,
          result_code: approvalResult.resultCode,
          result_message: approvalResult.resultMsg
        },
        updated_at: approvalResult.approvedAt
      })
      .eq('order_id', orderId)
      .select()
      .single();

    if (updateError) {
      console.error('결제 상태 업데이트 오류:', updateError);
      return res.status(500).json({
        success: false,
        error: 'Database error',
        message: '결제 상태 업데이트에 실패했습니다.'
      });
    }

    // 포인트 충전 처리
    try {
      const pointsResponse = await fetch(`${process.env.VITE_API_BASE_URL}/api/points?action=charge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: orderData.user_id,
          amount: orderData.amount_krw,
          orderId: orderId,
          paymentType: 'addon',
          description: `결제 완료 - ${orderData.goods_name}`,
          expires_in_days: 365 // 결제로 충전한 포인트는 1년 유효
        })
      });

      const pointsResult = await pointsResponse.json();
      
      if (!pointsResult.success) {
        console.error('포인트 충전 실패:', pointsResult.error);
        // 포인트 충전 실패해도 결제는 성공으로 처리
      } else {
        console.log('포인트 충전 성공:', pointsResult);
      }
    } catch (pointsError) {
      console.error('포인트 충전 오류:', pointsError);
      // 포인트 충전 실패해도 결제는 성공으로 처리
    }

    return res.status(200).json({
      success: true,
      data: {
        ...approvalResult,
        payment: updatedPayment
      }
    });

  } catch (error) {
    console.error('결제 승인 처리 오류:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: '결제 승인 처리 중 오류가 발생했습니다.'
    });
  }
}

// 결제 결과 처리 (payment.js에서 이동)
async function handlePaymentResult(req, res) {
  try {
    const { orderId, status, message } = req.body;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: 'Missing orderId',
        message: '주문 ID가 필요합니다.'
      });
    }

    // 주문 상태 업데이트
    const { data: orderData, error: updateError } = await supabase
      .from('payment_orders')
      .update({
        status: status || 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('order_id', orderId)
      .select()
      .single();

    if (updateError) {
      console.error('Order update error:', updateError);
      return res.status(500).json({
        success: false,
        error: 'Database error',
        message: '주문 상태 업데이트에 실패했습니다.'
      });
    }

    return res.status(200).json({
      success: true,
      message: message || '결제가 완료되었습니다.',
      data: orderData
    });

  } catch (error) {
    console.error('Payment result error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: '결제 결과 처리 중 오류가 발생했습니다.'
    });
  }
}

// 웹훅 처리 (webhook-payment-completed.js에서 이동)
async function handlePaymentWebhook(req, res) {
  try {
    console.log('Payment webhook received:', req.body);
    
    const { orderId, status, amount, transactionId } = req.body;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: 'Missing orderId'
      });
    }

    // 주문 상태 업데이트
    const { error: updateError } = await supabase
      .from('payment_orders')
      .update({
        status: status,
        updated_at: new Date().toISOString()
      })
      .eq('order_id', orderId);

    if (updateError) {
      console.error('Webhook order update error:', updateError);
      return res.status(500).json({
        success: false,
        error: 'Database error'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Webhook processed successfully'
    });

  } catch (error) {
    console.error('Payment webhook error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

// 메인 핸들러
async function handler(req, res) {
  setCommonHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { action } = req.query;

  try {
    switch (action) {
      case 'config':
        if (req.method !== 'GET') {
          return res.status(405).json({
            success: false,
            error: 'Method not allowed',
            message: 'GET method required for config'
          });
        }
        return res.status(200).json({
          success: true,
          config: {
            clientId: NICEPAY_CONFIG.merchantId,
            apiUrl: NICEPAY_CONFIG.apiUrl,
            returnUrl: NICEPAY_CONFIG.returnUrl,
            cancelUrl: NICEPAY_CONFIG.cancelUrl,
            environment: 'sandbox'
          }
        });

      case 'create-order':
        if (req.method !== 'POST') {
          return res.status(405).json({
            success: false,
            error: 'Method not allowed',
            message: 'POST method required for create-order'
          });
        }
        return await handleCreateOrder(req, res);

      case 'status':
        if (req.method !== 'GET') {
          return res.status(405).json({
            success: false,
            error: 'Method not allowed',
            message: 'GET method required for status'
          });
        }
        return await handlePaymentStatus(req, res);

      case 'history':
        if (req.method !== 'GET') {
          return res.status(405).json({
            success: false,
            error: 'Method not allowed',
            message: 'GET method required for history'
          });
        }
        return await handlePaymentHistory(req, res);

      case 'approve':
        if (req.method !== 'POST') {
          return res.status(405).json({
            success: false,
            error: 'Method not allowed',
            message: 'POST method required for approve'
          });
        }
        return await handlePaymentApprove(req, res);

      case 'result':
        if (req.method !== 'POST') {
          return res.status(405).json({
            success: false,
            error: 'Method not allowed',
            message: 'POST method required for result'
          });
        }
        return await handlePaymentResult(req, res);

      case 'webhook':
        if (req.method !== 'POST') {
          return res.status(405).json({
            success: false,
            error: 'Method not allowed',
            message: 'POST method required for webhook'
          });
        }
        return await handlePaymentWebhook(req, res);

      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid action',
          message: 'Valid actions: config, create-order, approve, status, history, result, webhook'
        });
    }

  } catch (error) {
    console.error('NicePay API 오류:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'API 처리 중 오류가 발생했습니다.'
    });
  }
}

export default handler;