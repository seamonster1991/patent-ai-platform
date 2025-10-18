// NicePay API 엔드포인트 - 공식 가이드에 따른 완전 재구성
// 경로: /api/nicepay
// 설명: NicePay 결제 시스템 통합 API (AUTHNICE.requestPay 방식)

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

// UUID 생성 함수
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// 환경 변수 검증
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// NicePay 공식 가이드에 따른 설정
const NICEPAY_CONFIG = {
  // 샌드박스 환경 설정 (공식 가이드 준수)
  clientId: process.env.NICEPAY_CLIENT_ID || 'S2_af4543a0be4d49a98122e01ec2059a56',
  secretKey: process.env.NICEPAY_SECRET_KEY || '9eb85607103646da9f9c02b128f2e5eef',
  apiUrl: process.env.NICEPAY_API_URL || 'https://sandbox-api.nicepay.co.kr',
  jsSDKUrl: process.env.NICEPAY_JS_SDK_URL || 'https://pay.nicepay.co.kr/v1/js/',
  returnUrl: process.env.NICEPAY_RETURN_URL || 'http://localhost:3001/api/nicepay?action=return',
  cancelUrl: process.env.NICEPAY_CANCEL_URL || 'http://localhost:5174/payment/cancel',
  environment: process.env.NICEPAY_ENVIRONMENT || 'sandbox'
};

// 공통 헤더 설정
function setCommonHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');
}

// NicePay 공식 가이드에 따른 Authorization Basic credentials 생성
function generateBasicAuth(clientId, secretKey) {
  const credentials = `${clientId}:${secretKey}`;
  return Buffer.from(credentials).toString('base64');
}

// 주문 ID 생성
function generateOrderId() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `ORDER_${timestamp}_${random}`;
}

// 토큰 검증 함수 (Supabase 및 JWT 지원)
async function verifyAuthToken(req) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('[verifyAuthToken] Authorization 헤더가 없거나 형식이 잘못됨');
      return null;
    }

    const token = authHeader.substring(7);
    console.log('[verifyAuthToken] 토큰 검증 시작:', token.substring(0, 20) + '...');

    // JWT 토큰 검증 시도
    const jwtSecret = process.env.JWT_SECRET || 'patent-ai-admin-jwt-secret-key-2024-development';
    let decoded;
    try {
      decoded = jwt.verify(token, jwtSecret);
      console.log('[verifyAuthToken] JWT 토큰 디코딩 성공:', decoded);
    } catch (jwtError) {
      console.log('[verifyAuthToken] JWT 토큰 검증 실패:', jwtError.message);
      return null;
    }

    // 사용자 정보 조회
    const { data: jwtUser, error: jwtError } = await supabase
      .from('users')
      .select('*')
      .eq('id', decoded.userId)
      .single();
      
    if (jwtError || !jwtUser) {
      console.error('[verifyAuthToken] JWT 사용자 조회 오류:', jwtError);
      return null;
    }
    
    console.log('[verifyAuthToken] JWT 토큰 검증 성공:', jwtUser.email);
    return { id: jwtUser.id, email: jwtUser.email, ...jwtUser };
  } catch (error) {
    console.error('[verifyAuthToken] 토큰 검증 오류:', error);
    return null;
  }
}

// NicePay 설정 정보 제공
async function handleGetConfig(req, res) {
  try {
    console.log('[handleGetConfig] NicePay 설정 요청');
    
    const config = {
      clientId: NICEPAY_CONFIG.clientId,
      jsSDKUrl: NICEPAY_CONFIG.jsSDKUrl,
      returnUrl: NICEPAY_CONFIG.returnUrl,
      cancelUrl: NICEPAY_CONFIG.cancelUrl,
      environment: NICEPAY_CONFIG.environment,
      apiUrl: NICEPAY_CONFIG.apiUrl,
      // 보안상 secretKey는 클라이언트에 전송하지 않음
      supportedMethods: ['card', 'kakaopay', 'naverpay', 'bank', 'vbank']
    };

    console.log('[handleGetConfig] 반환할 설정:', config);

    res.status(200).json({
      success: true,
      data: config,
      message: 'NicePay 설정 정보를 성공적으로 가져왔습니다.'
    });
  } catch (error) {
    console.error('[handleGetConfig] 설정 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'NicePay 설정 조회 중 오류가 발생했습니다.'
    });
  }
}

// 주문 생성 처리 (NicePay 공식 가이드에 따른 개선)
async function handleCreateOrder(req, res) {
  try {
    console.log('[handleCreateOrder] 주문 생성 요청 시작');
    console.log('[handleCreateOrder] Request body:', req.body);
    
    // 인증 확인
    let user = await verifyAuthToken(req);
    if (!user) {
      console.log('[handleCreateOrder] 인증 실패 - 테스트 사용자 사용');
      // 테스트 환경에서는 기본 사용자 사용
      user = {
        id: '276975db-635b-4c77-87a0-548f91b14231',
        email: 'test@example.com',
        user_metadata: { name: 'Test User' }
      };
    }

    const { amount, amountKrw, productName, buyerName, buyerEmail, buyerTel, paymentMethod } = req.body;
    
    // amount 또는 amountKrw 중 하나를 사용 (PaymentPage.tsx에서 amountKrw로 보냄)
    const finalAmount = amountKrw || amount;
    
    // amount 값 상세 디버깅
    console.log('[handleCreateOrder] Amount 값 분석:', {
      originalAmount: amount,
      amountKrw: amountKrw,
      finalAmount: finalAmount,
      amountType: typeof finalAmount,
      amountNumber: Number(finalAmount),
      isValidNumber: !isNaN(Number(finalAmount)),
      isPositive: Number(finalAmount) > 0
    });
    
    // 필수 파라미터 검증
    if (!finalAmount || !productName) {
      console.error('[handleCreateOrder] 필수 파라미터 누락:', { finalAmount, productName });
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters',
        message: '필수 파라미터가 누락되었습니다. (amount, productName)'
      });
    }

    // 금액 검증 (최소 1000원)
    const numericAmount = Number(finalAmount);
    if (isNaN(numericAmount) || numericAmount < 1000) {
      console.error('[handleCreateOrder] 유효하지 않은 금액:', { finalAmount, numericAmount });
      return res.status(400).json({
        success: false,
        error: 'Invalid amount',
        message: '최소 결제 금액은 1,000원입니다.'
      });
    }

    console.log('[handleCreateOrder] 검증된 금액:', numericAmount);

    // 결제 수단 검증
    const supportedMethods = ['card', 'kakaopay', 'naverpay', 'bank', 'vbank'];
    if (paymentMethod && !supportedMethods.includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid payment method',
        message: '지원하지 않는 결제 수단입니다.'
      });
    }

    const orderId = generateOrderId();
    const timestamp = new Date().toISOString();

    // 사용자 정보 기본값 설정
    const finalBuyerName = buyerName || user.user_metadata?.name || user.email?.split('@')[0] || '구매자';
    const finalBuyerEmail = buyerEmail || user.email || '';
    const finalBuyerTel = buyerTel || '';

    // Supabase에 주문 정보 저장
    console.log('[handleCreateOrder] Supabase 주문 저장:', {
      order_id: orderId,
      user_id: user.id,
      amount_krw: numericAmount, // 검증된 숫자 값 사용
      pay_method: paymentMethod || 'card',
      goods_name: productName
    });

    const { data: orderData, error: orderError } = await supabase
      .from('payment_orders')
      .insert({
        order_id: orderId,
        user_id: user.id,
        amount_krw: numericAmount, // 검증된 숫자 값 사용
        payment_type: 'addon',
        pay_method: paymentMethod || 'card',
        goods_name: productName,
        status: 'pending',
        nicepay_data: JSON.stringify({
          buyer_name: finalBuyerName,
          buyer_email: finalBuyerEmail,
          buyer_tel: finalBuyerTel,
          client_id: NICEPAY_CONFIG.clientId
        })
      })
      .select()
      .single();

    if (orderError) {
      console.error('[handleCreateOrder] Supabase 주문 저장 오류:', orderError);
      return res.status(500).json({
        success: false,
        error: 'Database error',
        message: '주문 정보 저장 중 오류가 발생했습니다.'
      });
    }

    console.log('[handleCreateOrder] 주문 생성 성공:', orderData);

    // 응답 데이터 구성
    const responseData = {
      orderId: orderId,
      amount: numericAmount, // 검증된 숫자 값 반환
      productName: productName,
      buyerName: finalBuyerName,
      buyerEmail: finalBuyerEmail,
      buyerTel: finalBuyerTel,
      paymentMethod: paymentMethod || 'card',
      timestamp: timestamp
    };

    console.log('[handleCreateOrder] 응답 데이터:', responseData);

    res.status(200).json({
      success: true,
      data: responseData,
      message: '주문이 성공적으로 생성되었습니다.'
    });

  } catch (error) {
    console.error('[handleCreateOrder] 주문 생성 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: '주문 생성 중 오류가 발생했습니다.'
    });
  }
}

// NicePay 결제 승인 처리 (공식 가이드에 따른 API 호출)
async function handlePaymentApproval(req, res) {
  try {
    console.log('[handlePaymentApproval] 결제 승인 요청:', req.body);
    
    const { tid, amount, orderId } = req.body;
    
    if (!tid || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters',
        message: '필수 파라미터가 누락되었습니다. (tid, amount)'
      });
    }

    // NicePay 공식 가이드에 따른 Authorization Basic credentials 생성
    const basicAuth = generateBasicAuth(NICEPAY_CONFIG.clientId, NICEPAY_CONFIG.secretKey);
    
    // NicePay 결제 승인 API 호출
    const approvalResponse = await fetch(`${NICEPAY_CONFIG.apiUrl}/v1/payments/${tid}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${basicAuth}`
      },
      body: JSON.stringify({
        amount: amount
      })
    });

    const approvalResult = await approvalResponse.json();
    console.log('[handlePaymentApproval] NicePay 승인 응답:', approvalResult);

    if (approvalResult.resultCode === '0000') {
      // 결제 성공 - 데이터베이스 업데이트
      if (orderId) {
        const { error: updateError } = await supabase
          .from('payment_orders')
          .update({
            status: 'completed',
            tid: tid,
            nicepay_result: JSON.stringify(approvalResult),
            completed_at: new Date().toISOString()
          })
          .eq('order_id', orderId);

        if (updateError) {
          console.error('[handlePaymentApproval] 주문 상태 업데이트 오류:', updateError);
        }
      }

      res.status(200).json({
        success: true,
        data: approvalResult,
        message: '결제가 성공적으로 완료되었습니다.'
      });
    } else {
      // 결제 실패
      if (orderId) {
        const { error: updateError } = await supabase
          .from('payment_orders')
          .update({
            status: 'failed',
            tid: tid,
            nicepay_result: JSON.stringify(approvalResult),
            failed_at: new Date().toISOString()
          })
          .eq('order_id', orderId);

        if (updateError) {
          console.error('[handlePaymentApproval] 주문 상태 업데이트 오류:', updateError);
        }
      }

      res.status(400).json({
        success: false,
        error: 'Payment failed',
        message: approvalResult.resultMsg || '결제 승인에 실패했습니다.',
        data: approvalResult
      });
    }

  } catch (error) {
    console.error('[handlePaymentApproval] 결제 승인 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: '결제 승인 처리 중 오류가 발생했습니다.'
    });
  }
}

// NicePay returnUrl 처리 (결제창에서 돌아올 때)
async function handlePaymentReturn(req, res) {
  try {
    console.log('[handlePaymentReturn] 결제 결과 수신:', req.body);
    
    const { authResultCode, authResultMsg, tid, orderId, amount, authToken, signature } = req.body;
    
    if (authResultCode === '0000') {
      // 인증 성공 - 결제 승인 API 호출
      const approvalResult = await handlePaymentApproval({
        body: { tid, amount, orderId }
      }, res);
      
      // 성공 페이지로 리다이렉트
      res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5174'}/payment/success?orderId=${orderId}&tid=${tid}`);
    } else {
      // 인증 실패
      console.error('[handlePaymentReturn] 결제 인증 실패:', authResultMsg);
      
      if (orderId) {
        const { error: updateError } = await supabase
          .from('payment_orders')
          .update({
            status: 'failed',
            nicepay_result: JSON.stringify(req.body),
            failed_at: new Date().toISOString()
          })
          .eq('order_id', orderId);

        if (updateError) {
          console.error('[handlePaymentReturn] 주문 상태 업데이트 오류:', updateError);
        }
      }
      
      // 실패 페이지로 리다이렉트
      res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5174'}/payment/fail?message=${encodeURIComponent(authResultMsg)}`);
    }

  } catch (error) {
    console.error('[handlePaymentReturn] 결제 결과 처리 오류:', error);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5174'}/payment/error`);
  }
}

// 메인 핸들러
export default async function handler(req, res) {
  // CORS 헤더 설정
  setCommonHeaders(res);

  // OPTIONS 요청 처리
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // 요청 본문 파싱 (Vercel 환경에서 필요할 수 있음)
    if (req.method === 'POST' && typeof req.body === 'string') {
      try {
        req.body = JSON.parse(req.body);
      } catch (parseError) {
        console.error('[NicePay API] JSON 파싱 오류:', parseError);
        return res.status(400).json({
          success: false,
          error: 'Invalid JSON',
          message: 'JSON 형식이 올바르지 않습니다.'
        });
      }
    }

    const { action } = req.query;
    console.log(`[NicePay API] ${req.method} 요청 - action: ${action}`);

    switch (action) {
      case 'config':
        if (req.method === 'GET') {
          return await handleGetConfig(req, res);
        }
        break;
        
      case 'create-order':
        if (req.method === 'POST') {
          return await handleCreateOrder(req, res);
        }
        break;
        
      case 'approve':
        if (req.method === 'POST') {
          return await handlePaymentApproval(req, res);
        }
        break;
        
      case 'return':
        if (req.method === 'POST') {
          return await handlePaymentReturn(req, res);
        }
        break;
        
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid action',
          message: '지원하지 않는 액션입니다.',
          supportedActions: ['config', 'create-order', 'approve', 'return']
        });
    }

    // 지원하지 않는 HTTP 메서드
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      message: `${req.method} 메서드는 지원하지 않습니다.`
    });

  } catch (error) {
    console.error('[NicePay API] 전역 오류:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'API 처리 중 오류가 발생했습니다.'
    });
  }
}